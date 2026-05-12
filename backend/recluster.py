def recluster_data(dataset_id: int, epsilon: float, min_samples: int):
    """Re-run DBSCAN on the cleaned dataset with new parameters and update cache."""
    import os
    import json
    import polars as pl
    import numpy as np
    from sklearn.cluster import DBSCAN
    from tasks import _build_analytics

    processed_dir = f"processed/{dataset_id}"
    parquet_path = f"{processed_dir}/master_dataset.parquet"
    cache_path = f"{processed_dir}/analytics_cache.json"

    if not os.path.exists(parquet_path):
        return {"error": "No cleaned dataset found to recluster."}

    df = pl.read_parquet(parquet_path)

    # Drop old cluster ID if it exists
    if "Cluster_ID" in df.columns:
        df = df.drop("Cluster_ID")

    coords = df.select(["Latitude", "Longitude"]).to_numpy()
    coords_rad = np.radians(coords)
    
    eps_rad = epsilon / 6371000.0  # meters to radians
    db = DBSCAN(eps=eps_rad, min_samples=min_samples, algorithm='ball_tree', metric='haversine')
    clusters = db.fit_predict(coords_rad)
    
    df = df.with_columns(pl.Series(name="Cluster_ID", values=clusters))
    
    blackspots = df.filter(pl.col("Cluster_ID") != -1)
    noise_points = df.filter(pl.col("Cluster_ID") == -1)

    # ═══════════════════════════════════════════════
    # BLACKSPOT RANKING TABLE
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
                "rank": 0,
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

    df.write_parquet(parquet_path)
    blackspots.write_parquet(f"{processed_dir}/blackspots.parquet")

    # We need to preserve the cleaning log from the cache
    cleaning_log = {}
    if os.path.exists(cache_path):
        with open(cache_path, "r") as f:
            old_cache = json.load(f)
            cleaning_log = old_cache.get("cleaning", {})

    analytics = _build_analytics(df, blackspots, noise_points, blackspot_rankings, cleaning_log)
    with open(cache_path, "w") as f:
        json.dump(analytics, f)

    return {"message": "Re-clustered successfully", "clusters_found": int(clusters.max()) + 1 if clusters.max() >= 0 else 0}
