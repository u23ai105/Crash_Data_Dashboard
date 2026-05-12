from fastapi import FastAPI, UploadFile, File, Form, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import polars as pl
from tasks import process_data_task
import json
import uuid
import database

app = FastAPI(title="Crash Data Analysis API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
os.makedirs("processed", exist_ok=True)

from pydantic import BaseModel
class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/api/login")
async def login(req: LoginRequest):
    conn = database.get_db()
    user = conn.execute("SELECT * FROM users WHERE username = ? AND password = ?", (req.username, req.password)).fetchone()
    conn.close()
    if user:
        return {"username": user["username"], "role": user["role"]}
    raise HTTPException(status_code=401, detail="Invalid credentials")

class SignupRequest(BaseModel):
    username: str
    password: str

@app.post("/api/signup")
async def signup(req: SignupRequest):
    if len(req.username) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    if len(req.password) < 4:
        raise HTTPException(status_code=400, detail="Password must be at least 4 characters")
    conn = database.get_db()
    existing = conn.execute("SELECT id FROM users WHERE username = ?", (req.username,)).fetchone()
    if existing:
        conn.close()
        raise HTTPException(status_code=409, detail="Username already exists")
    conn.execute("INSERT INTO users (username, password, role) VALUES (?, ?, 'user')", (req.username, req.password))
    conn.commit()
    conn.close()
    return {"username": req.username, "role": "user"}

@app.get("/api/datasets")
async def list_datasets():
    conn = database.get_db()
    datasets = conn.execute("SELECT * FROM datasets ORDER BY uploaded_at DESC").fetchall()
    conn.close()
    return [dict(d) for d in datasets]

@app.delete("/api/datasets/{dataset_id}")
async def delete_dataset(dataset_id: int):
    conn = database.get_db()
    ds = conn.execute("SELECT * FROM datasets WHERE id = ?", (dataset_id,)).fetchone()
    if not ds:
        conn.close()
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    conn.execute("DELETE FROM datasets WHERE id = ?", (dataset_id,))
    conn.commit()
    conn.close()
    
    # Clean up files
    import shutil
    if os.path.exists(ds["processed_dir"]):
        shutil.rmtree(ds["processed_dir"])
    if os.path.exists(ds["file_path"]):
        os.remove(ds["file_path"])
        
    return {"message": "Deleted successfully"}

@app.post("/api/upload")
async def upload_file(background_tasks: BackgroundTasks, dataset_name: str = Form(...), file: UploadFile = File(...)):
    file_path = f"uploads/{uuid.uuid4()}_{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    conn = database.get_db()
    cursor = conn.cursor()
    cursor.execute("INSERT INTO datasets (name, file_path, processed_dir) VALUES (?, ?, ?)", 
                  (dataset_name, file_path, ""))
    dataset_id = cursor.lastrowid
    processed_dir = f"processed/{dataset_id}"
    os.makedirs(processed_dir, exist_ok=True)
    cursor.execute("UPDATE datasets SET processed_dir = ? WHERE id = ?", (processed_dir, dataset_id))
    conn.commit()
    conn.close()
    
    task_id = str(dataset_id)
    background_tasks.add_task(process_data_task, file_path, str(dataset_id), processed_dir)
    return {"message": "File uploaded successfully", "task_id": task_id, "dataset_id": dataset_id}

@app.get("/api/status/{task_id}")
async def get_status(task_id: str):
    # task_id is now dataset_id
    status_file = f"processed/{task_id}/status.json"
    if os.path.exists(status_file):
        with open(status_file, "r") as f:
            return json.load(f)
    return {"status": "PENDING", "result": None}

class ReclusterRequest(BaseModel):
    dataset_id: int
    epsilon: float
    min_samples: int

@app.post("/api/recluster")
async def api_recluster(req: ReclusterRequest):
    from recluster import recluster_data
    return recluster_data(req.dataset_id, req.epsilon, req.min_samples)

@app.get("/api/dashboard-data")
async def get_dashboard_data(dataset_id: int = 0, severity: str = "All"):
    """Serve analytics for a specific dataset."""
    # If no dataset_id passed, try to use the most recent one
    if dataset_id == 0:
        conn = database.get_db()
        ds = conn.execute("SELECT id FROM datasets ORDER BY uploaded_at DESC LIMIT 1").fetchone()
        conn.close()
        if ds:
            dataset_id = ds["id"]
        else:
            return {"error": "No datasets available"}
            
    processed_dir = f"processed/{dataset_id}"
    cache_file = f"{processed_dir}/analytics_cache.json"
    parquet_file = f"{processed_dir}/master_dataset.parquet"
    
    # Fast path: No filter, use cached JSON
    if severity == "All" and os.path.exists(cache_file):
        with open(cache_file, "r") as f:
            return json.load(f)
            
    # Filter path: Load parquet, filter, build analytics live
    if os.path.exists(parquet_file):
        from tasks import _build_analytics
        df = pl.read_parquet(parquet_file)
        
        if severity != "All" and "Severity" in df.columns:
            df = df.filter(pl.col("Severity") == severity)
            
        blackspots = pl.DataFrame()
        noise_points = pl.DataFrame()
        if "Cluster_ID" in df.columns:
            blackspots = df.filter(pl.col("Cluster_ID") != -1)
            noise_points = df.filter(pl.col("Cluster_ID") == -1)
            
        old_cache = {}
        if os.path.exists(cache_file):
            with open(cache_file, "r") as f:
                old_cache = json.load(f)
                
        return _build_analytics(df, blackspots, noise_points, old_cache.get("blackspot_rankings", []), old_cache.get("cleaning", {}))

    return {"error": "No processed data available for this dataset"}

@app.get("/api/export/dataset")
async def export_dataset(dataset_id: int):
    parquet_file = f"processed/{dataset_id}/master_dataset.parquet"
    csv_file = f"processed/{dataset_id}/master_dataset.csv"
    if not os.path.exists(parquet_file):
        return {"error": "No data"}
    df = pl.read_parquet(parquet_file)
    df.write_csv(csv_file)
    return FileResponse(csv_file, filename="crash_dataset_processed.csv")

@app.get("/api/export/blackspots")
async def export_blackspots(dataset_id: int):
    parquet_file = f"processed/{dataset_id}/blackspots.parquet"
    csv_file = f"processed/{dataset_id}/blackspots.csv"
    if not os.path.exists(parquet_file):
        return {"error": "No data"}
    df = pl.read_parquet(parquet_file)
    df.write_csv(csv_file)
    return FileResponse(csv_file, filename="blackspots_identified.csv")

@app.get("/api/export/report")
async def export_report(dataset_id: int):
    """Generate a PDF report from cached analytics."""
    cache_file = f"processed/{dataset_id}/analytics_cache.json"
    if not os.path.exists(cache_file):
        return {"error": "No data"}
    
    with open(cache_file, "r") as f:
        data = json.load(f)

    pdf_path = f"processed/{dataset_id}/crash_analysis_report.pdf"
    _generate_pdf_report(data, pdf_path)
    return FileResponse(pdf_path, filename="Crash_Analysis_Report.pdf")


def _generate_pdf_report(data: dict, output_path: str):
    """Build a structured PDF report using ReportLab."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

    doc = SimpleDocTemplate(output_path, pagesize=A4, topMargin=20*mm, bottomMargin=20*mm)
    styles = getSampleStyleSheet()
    story = []

    # Custom styles
    title_style = ParagraphStyle('Title2', parent=styles['Title'], fontSize=22, textColor=colors.HexColor('#1a365d'))
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor('#2c5282'), spaceAfter=8)
    body_style = styles['Normal']

    stats = data.get("stats", {})
    cleaning = data.get("cleaning", {})
    rankings = data.get("blackspot_rankings", [])
    trends = data.get("trends", {})

    # ── Title ──
    story.append(Paragraph("Crash Data Analysis Report", title_style))
    story.append(Spacer(1, 6*mm))

    # ── Executive Summary ──
    story.append(Paragraph("1. Executive Summary", heading_style))
    summary_points = [
        f"Analyzed <b>{stats.get('total_crashes', 0)}</b> crash records after data cleaning.",
        f"Data Quality Score: <b>{stats.get('quality_score', 0)}%</b>.",
        f"DBSCAN identified <b>{stats.get('clusters_count', 0)}</b> spatial clusters containing <b>{stats.get('blackspots_count', 0)}</b> crash points.",
        f"Fatal crashes: <b>{stats.get('fatal_count', 0)}</b>, Grievous: <b>{stats.get('grievous_count', 0)}</b>, Minor: <b>{stats.get('minor_count', 0)}</b>.",
        f"Weighted Severity Index (WSI): <b>{stats.get('severity_index', 0)}</b> / 6.0.",
    ]
    for point in summary_points:
        story.append(Paragraph(f"• {point}", body_style))
    story.append(Spacer(1, 4*mm))

    # ── Data Cleaning Summary ──
    story.append(Paragraph("2. Data Cleaning Summary", heading_style))
    cl_data = [
        ["Metric", "Value"],
        ["Original Rows", str(cleaning.get("original_rows", "—"))],
        ["Rows After Cleaning", str(cleaning.get("final_rows", "—"))],
        ["Duplicates Removed", str(cleaning.get("duplicates_removed", 0))],
        ["Null Coordinates Dropped", str(cleaning.get("null_coords_dropped", 0))],
        ["Outlier Coordinates Flagged", str(cleaning.get("outlier_coords_flagged", 0))],
        ["Data Quality Score", f"{cleaning.get('quality_score', 0)}%"],
    ]
    t = Table(cl_data, colWidths=[120*mm, 40*mm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f7fafc')]),
        ('ALIGN', (1, 0), (1, -1), 'CENTER'),
    ]))
    story.append(t)
    story.append(Spacer(1, 4*mm))

    # ── DBSCAN Methodology ──
    story.append(Paragraph("3. Spatial Clustering Methodology", heading_style))
    story.append(Paragraph(
        "The platform utilizes <b>Adaptive DBSCAN</b> spatial clustering to identify high-risk zones. "
        "Unlike fixed-radius methods, the epsilon (ε) parameter is dynamically calculated using a "
        "K-Nearest-Neighbor (k-dist) elbow detection algorithm based on dataset density. "
        "The system adheres to <b>MoRTH (Ministry of Road Transport and Highways)</b> standards, "
        "defining a blackspot as a cluster with at least <b>min_samples = 5</b> accidents.",
        body_style
    ))
    story.append(Spacer(1, 4*mm))

    # ── Top Blackspot Rankings ──
    if rankings:
        story.append(Paragraph("4. Top Blackspot Rankings (MoRTH WSI Ranked)", heading_style))
        bs_header = ["Rank", "Crashes", "Severity", "Lat", "Lon", "Recommendation"]
        bs_rows = [bs_header]
        for bs in rankings[:15]:
            bs_rows.append([
                str(bs["rank"]),
                str(bs["crash_count"]),
                bs["dominant_severity"],
                str(bs["latitude"]),
                str(bs["longitude"]),
                bs["recommendation"][:50],
            ])
        t2 = Table(bs_rows, colWidths=[12*mm, 16*mm, 18*mm, 22*mm, 22*mm, 70*mm])
        t2.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#c53030')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#fff5f5')]),
            ('ALIGN', (0, 0), (2, -1), 'CENTER'),
        ]))
        story.append(t2)
        story.append(Spacer(1, 4*mm))

    # ── Environmental & Temporal Trends ──
    story.append(Paragraph("5. Environmental & Temporal Trends", heading_style))
    
    def add_trend_table(title, trend_list):
        if not trend_list: return
        story.append(Paragraph(f"<b>{title} Breakdown</b>", body_style))
        rows = [["Category", "Count"]]
        for item in trend_list:
            rows.append([item["name"], str(item["value"])])
        tbl = Table(rows, colWidths=[100*mm, 40*mm])
        tbl.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d3748')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e0')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#edf2f7')]),
        ]))
        story.append(tbl)
        story.append(Spacer(1, 3*mm))

    if trends.get("severity"): add_trend_table("Severity", trends["severity"])
    if trends.get("weather"): add_trend_table("Weather Condition", trends["weather"])
    if trends.get("light_conditions"): add_trend_table("Light Condition", trends["light_conditions"])
    if trends.get("road_types"): add_trend_table("Road Type", trends["road_types"])
    if trends.get("vehicle_types"): add_trend_table("Vehicle Type", trends["vehicle_types"])
    if trends.get("hours"): add_trend_table("Hourly Distribution", trends["hours"])
    if trends.get("days"): add_trend_table("Day of Week Distribution", trends["days"])

    # ── Footer ──
    story.append(Spacer(1, 10*mm))
    story.append(Paragraph(
        "<i>Report auto-generated by the Crash Data Intelligence Platform. "
        "MoRTH/IRC standard 6:3:1 weighting applied. Adaptive DBSCAN for spatial clustering.</i>",
        ParagraphStyle('Footer', parent=body_style, fontSize=8, textColor=colors.grey)
    ))

    doc.build(story)
