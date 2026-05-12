import polars as pl
import numpy as np
from sklearn.cluster import DBSCAN
import os
import json

def process_data_task(file_path: str, dataset_id: str, processed_dir: str):
    status_file = f"{processed_dir}/status.json"
    
    def update_status(status_str, result=None):
        os.makedirs(processed_dir, exist_ok=True)
        with open(status_file, "w") as f:
            json.dump({"status": status_str, "result": result}, f)

    update_status("PROCESSING")

    try:
        # ═══════════════════════════════════════════════
        # PHASE 1: LOAD DATA
        # ═══════════════════════════════════════════════
        if file_path.endswith('.csv'):
            df = pl.read_csv(file_path, infer_schema_length=5000)
        elif file_path.endswith('.xlsx'):
            df = pl.read_excel(file_path)
        else:
            update_status("FAILURE", {"error": "Unsupported file format. Use .csv or .xlsx"})
            return

        original_row_count = len(df)
        original_col_count = len(df.columns)

        # ═══════════════════════════════════════════════
        # PHASE 2: DATA CLEANING WITH QUALITY METRICS
        # ═══════════════════════════════════════════════
        cleaning_log = {
            "original_rows": original_row_count,
            "original_columns": original_col_count,
            "duplicates_removed": 0,
            "null_coords_dropped": 0,
            "outlier_coords_flagged": 0,
            "columns_missing_pct": {},
        }

        # ── Missing value analysis per column ──
        for col in df.columns:
            null_count = df[col].null_count()
            pct = round((null_count / len(df)) * 100, 1) if len(df) > 0 else 0
            cleaning_log["columns_missing_pct"][col] = pct

        # ── Deduplicate ──
        if "Accident_ID" in df.columns:
            before = len(df)
            df = df.unique(subset=["Accident_ID"])
            cleaning_log["duplicates_removed"] = before - len(df)

        # ── Parse datetime ──
        if "Accident_DateTime" in df.columns:
            try:
                df = df.with_columns(
                    pl.col("Accident_DateTime").str.to_datetime(strict=False).alias("Parsed_DateTime")
                )
                df = df.with_columns([
                    pl.col("Parsed_DateTime").dt.month().alias("Month"),
                    pl.col("Parsed_DateTime").dt.hour().alias("Hour"),
                    pl.col("Parsed_DateTime").dt.weekday().alias("DayOfWeek"),
                    pl.col("Parsed_DateTime").dt.year().alias("Year"),
                ])
            except Exception as e:
                print("Could not parse datetime:", e)

        # ── Validate & clean coordinates ──
        if "Latitude" not in df.columns or "Longitude" not in df.columns:
            update_status("FAILURE", {"error": "Dataset missing Latitude or Longitude columns"})
            return

        before = len(df)
        df = df.filter(pl.col("Latitude").is_not_null() & pl.col("Longitude").is_not_null())
        cleaning_log["null_coords_dropped"] = before - len(df)

        # Flag outlier coordinates (outside valid range)
        outlier_mask = (
            (pl.col("Latitude") < -90) | (pl.col("Latitude") > 90) |
            (pl.col("Longitude") < -180) | (pl.col("Longitude") > 180)
        )
        outlier_count = len(df.filter(outlier_mask))
        cleaning_log["outlier_coords_flagged"] = outlier_count
        df = df.filter(~outlier_mask)

        if len(df) == 0:
            update_status("FAILURE", {"error": "No valid rows after cleaning"})
            return

        # Compute data quality score
        total_cells = original_row_count * original_col_count
        total_nulls = sum(df[col].null_count() for col in df.columns)
        quality_score = round(((total_cells - total_nulls) / total_cells) * 100, 1) if total_cells > 0 else 0
        cleaning_log["quality_score"] = quality_score
        cleaning_log["final_rows"] = len(df)

        # ═══════════════════════════════════════════════
        # PHASE 3: DBSCAN SPATIAL CLUSTERING
        # ═══════════════════════════════════════════════
        coords = df.select(["Latitude", "Longitude"]).to_numpy()
        coords_rad = np.radians(coords)
        
        # ── Adaptive epsilon calculation ──
        # Use k-nearest-neighbor distances to find a natural clustering radius
        from sklearn.neighbors import NearestNeighbors
        min_samples = 5  # MoRTH standard: minimum 5 accidents to qualify as blackspot
        k = min(min_samples, len(coords_rad) - 1)
        nn = NearestNeighbors(n_neighbors=k, metric='haversine')
        nn.fit(coords_rad)
        distances, _ = nn.kneighbors(coords_rad)
        kth_distances = distances[:, -1] * 6371000  # Convert radians to meters
        
        # Sort and find the "elbow" — use the 90th percentile as a robust epsilon
        kth_sorted = np.sort(kth_distances)
        auto_eps_meters = kth_sorted[int(len(kth_sorted) * 0.90)]
        
        # Clamp epsilon to a sane range (minimum 100m, maximum 50km)
        auto_eps_meters = max(100, min(auto_eps_meters, 50000))
        
        epsilon = auto_eps_meters / 6371000.0  # Convert to radians for haversine
        print(f"[DBSCAN] Auto-calculated epsilon: {auto_eps_meters:.0f}m, min_samples: {min_samples}")
        
        db = DBSCAN(eps=epsilon, min_samples=min_samples, algorithm='ball_tree', metric='haversine')
        clusters = db.fit_predict(coords_rad)
        
        n_clusters_found = len(set(clusters)) - (1 if -1 in clusters else 0)
        n_noise = list(clusters).count(-1)
        print(f"[DBSCAN] Found {n_clusters_found} clusters, {n_noise} noise points out of {len(clusters)} total")
        
        df = df.with_columns(pl.Series(name="Cluster_ID", values=clusters))
        
        blackspots = df.filter(pl.col("Cluster_ID") != -1)
        noise_points = df.filter(pl.col("Cluster_ID") == -1)

        # ═══════════════════════════════════════════════
        # PHASE 4: BLACKSPOT RANKING TABLE
        # ═══════════════════════════════════════════════
        blackspot_rankings = []
        if len(blackspots) > 0 and "Cluster_ID" in blackspots.columns:
            cluster_ids = blackspots["Cluster_ID"].unique().to_list()
            for cid in sorted(cluster_ids):
                cluster_df = blackspots.filter(pl.col("Cluster_ID") == cid)
                avg_lat = cluster_df["Latitude"].mean()
                avg_lon = cluster_df["Longitude"].mean()
                count = len(cluster_df)
                
                # Severity scoring
                severity_map = {"Fatal": 6, "Grievous": 3, "Minor": 1}  # MoRTH/IRC WSI standard (6:3:1)
                avg_severity = 0
                dominant_severity = "Unknown"
                if "Severity" in cluster_df.columns:
                    sev_counts = cluster_df.group_by("Severity").len().sort("len", descending=True).to_dicts()
                    if sev_counts:
                        dominant_severity = str(sev_counts[0]["Severity"])
                    severities = cluster_df["Severity"].to_list()
                    scores = [severity_map.get(str(s), 1) for s in severities]
                    avg_severity = round(sum(scores) / len(scores), 2) if scores else 0

                # Auto-generated recommendation
                recommendation = "Monitor area closely"
                if dominant_severity == "Fatal":
                    recommendation = "Critical: Conduct immediate road safety audit, add warning signs"
                elif dominant_severity == "Grievous":
                    recommendation = "High priority: Review road design, speed limits, and lighting"
                elif count >= 10:
                    recommendation = "Install traffic calming measures, improve signage"

                blackspot_rankings.append({
                    "rank": 0,  # Will be assigned after sorting
                    "cluster_id": int(cid),
                    "latitude": round(avg_lat, 5),
                    "longitude": round(avg_lon, 5),
                    "crash_count": count,
                    "avg_severity_score": avg_severity,
                    "dominant_severity": dominant_severity,
                    "recommendation": recommendation,
                })

            # Sort by severity score × crash count (composite danger score)
            blackspot_rankings.sort(key=lambda x: x["avg_severity_score"] * x["crash_count"], reverse=True)
            for i, bs in enumerate(blackspot_rankings):
                bs["rank"] = i + 1

        # ═══════════════════════════════════════════════
        # PHASE 5: SAVE FILES
        # ═══════════════════════════════════════════════
        os.makedirs(processed_dir, exist_ok=True)
        df.write_parquet(f"{processed_dir}/master_dataset.parquet")
        blackspots.write_parquet(f"{processed_dir}/blackspots.parquet")

        # ═══════════════════════════════════════════════
        # PHASE 6: PRE-COMPUTE ALL ANALYTICS
        # ═══════════════════════════════════════════════
        analytics = _build_analytics(df, blackspots, noise_points, blackspot_rankings, cleaning_log)
        with open(f"{processed_dir}/analytics_cache.json", "w") as f:
            json.dump(analytics, f)
            
        update_status("SUCCESS", {
            "message": "Data processed successfully",
            "total_records": len(df),
            "blackspots_found": len(blackspots),
            "clusters_found": int(clusters.max()) + 1 if clusters.max() >= 0 else 0,
            "quality_score": quality_score,
        })
            
    except Exception as e:
        import traceback
        update_status("FAILURE", {"error": str(e), "trace": traceback.format_exc()})


def _build_analytics(df, blackspots, noise_points, blackspot_rankings, cleaning_log):
    """Pre-compute every dashboard metric and store as JSON."""
    total = len(df)

    # ── Map data ──
    map_cols = ["Latitude", "Longitude", "Cluster_ID"]
    if "Severity" in df.columns:
        map_cols.append("Severity")
    map_data = df.select(map_cols).to_dicts()

    # ── Blackspot map data ──
    bs_cols = ["Latitude", "Longitude", "Cluster_ID"]
    if "Severity" in blackspots.columns:
        bs_cols.append("Severity")
    blackspots_data = blackspots.select(bs_cols).to_dicts() if len(blackspots) > 0 else []

    # ── Noise points for map ──
    noise_cols = ["Latitude", "Longitude"]
    noise_data = noise_points.select(noise_cols).to_dicts() if len(noise_points) > 0 else []

    # ── Counts ──
    n_clusters = blackspots["Cluster_ID"].n_unique() if len(blackspots) > 0 else 0
    fatal_count = len(df.filter(pl.col("Severity") == "Fatal")) if "Severity" in df.columns else 0
    grievous_count = len(df.filter(pl.col("Severity") == "Grievous")) if "Severity" in df.columns else 0
    minor_count = len(df.filter(pl.col("Severity") == "Minor")) if "Severity" in df.columns else 0

    # Weighted Severity Index (WSI) per MoRTH/IRC: Fatal=6, Grievous=3, Minor=1
    severity_index = 0
    if "Severity" in df.columns:
        smap = {"Fatal": 6, "Grievous": 3, "Minor": 1}  # MoRTH/IRC WSI standard (6:3:1)
        scores = [smap.get(str(s), 1) for s in df["Severity"].to_list()]
        severity_index = round(sum(scores) / len(scores), 2) if scores else 0

    def _group_counts(col_name):
        if col_name not in df.columns:
            return []
        counts = df.group_by(col_name).len().to_dicts()
        return [{"name": str(r[col_name]), "value": r["len"]} for r in counts if r[col_name] is not None]

    def _group_counts_sorted(col_name, sort_col=None):
        if col_name not in df.columns:
            return []
        counts = df.group_by(col_name).len().sort(sort_col or col_name).to_dicts()
        return counts

    # ── Distribution analytics ──
    severity_counts = _group_counts("Severity")
    collision_counts = _group_counts("Collision_Type")
    weather_counts = _group_counts("Weather_Condition")
    road_counts = _group_counts("Road_Type")
    light_counts = _group_counts("Light_Condition") if "Light_Condition" in df.columns else []
    vehicle_counts = _group_counts("Vehicle_Type") if "Vehicle_Type" in df.columns else []

    # ── Time-based analytics ──
    hour_counts = []
    if "Hour" in df.columns:
        raw = _group_counts_sorted("Hour")
        hour_counts = [{"name": str(r["Hour"]), "value": r["len"]} for r in raw if r["Hour"] is not None]

    day_counts = []
    if "DayOfWeek" in df.columns:
        day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        raw = _group_counts_sorted("DayOfWeek")
        day_counts = [
            {"name": day_names[r["DayOfWeek"] - 1] if 1 <= r["DayOfWeek"] <= 7 else str(r["DayOfWeek"]), "value": r["len"]}
            for r in raw if r["DayOfWeek"] is not None
        ]

    month_counts = []
    quarter_counts = []
    if "Month" in df.columns:
        month_names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        raw = _group_counts_sorted("Month")
        month_counts = [
            {"name": month_names[r["Month"] - 1] if 1 <= r["Month"] <= 12 else str(r["Month"]), "value": r["len"]}
            for r in raw if r["Month"] is not None
        ]
        
        # Build quarters from months
        q_dict = {1: 0, 2: 0, 3: 0, 4: 0}
        for r in raw:
            if r["Month"] is not None and 1 <= r["Month"] <= 12:
                q = (r["Month"] - 1) // 3 + 1
                q_dict[q] += r["len"]
        quarter_counts = [{"name": f"Q{q}", "value": q_dict[q]} for q in range(1, 5)]

    year_counts = []
    if "Year" in df.columns:
        raw_yr = _group_counts_sorted("Year")
        year_counts = [{"name": str(int(r["Year"])), "value": r["len"]} for r in raw_yr if r["Year"] is not None]

    # ── Time-of-day heatmap (Hour × DayOfWeek matrix) ──
    time_heatmap = []
    if "Hour" in df.columns and "DayOfWeek" in df.columns:
        hm = df.group_by(["Hour", "DayOfWeek"]).len().to_dicts()
        time_heatmap = [
            [r["DayOfWeek"] - 1 if r["DayOfWeek"] else 0, r["Hour"] if r["Hour"] is not None else 0, r["len"]]
            for r in hm if r["Hour"] is not None and r["DayOfWeek"] is not None
        ]

    # ── Cluster size distribution ──
    cluster_sizes = []
    if len(blackspots) > 0:
        csizes = blackspots.group_by("Cluster_ID").len().sort("len", descending=True).to_dicts()
        cluster_sizes = [{"name": f"Cluster {r['Cluster_ID']}", "value": r["len"]} for r in csizes]

    return {
        "stats": {
            "total_crashes": total,
            "fatal_count": fatal_count,
            "grievous_count": grievous_count,
            "minor_count": minor_count,
            "blackspots_count": len(blackspots_data),
            "clusters_count": n_clusters,
            "noise_count": len(noise_data),
            "severity_index": severity_index,
            "quality_score": cleaning_log.get("quality_score", 0),
        },
        "cleaning": cleaning_log,
        "map_data": map_data,
        "blackspots": blackspots_data,
        "noise_points": noise_data,
        "blackspot_rankings": blackspot_rankings,
        "cluster_sizes": cluster_sizes,
        "trends": {
            "severity": severity_counts,
            "collision_types": collision_counts,
            "weather": weather_counts,
            "road_types": road_counts,
            "light_conditions": light_counts,
            "vehicle_types": vehicle_counts,
            "hours": hour_counts,
            "days": day_counts,
            "months": month_counts,
            "quarters": quarter_counts,
            "years": year_counts,
            "time_heatmap": time_heatmap,
        }
    }
