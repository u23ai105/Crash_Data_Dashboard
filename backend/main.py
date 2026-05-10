from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import shutil
import os
import polars as pl
from celery_app import celery_app
from tasks import process_data_task
import json

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

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    file_path = f"uploads/{file.filename}"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Trigger celery task
    task = process_data_task.delay(file_path)
    
    return {"message": "File uploaded successfully", "task_id": task.id}

@app.get("/api/status/{task_id}")
async def get_status(task_id: str):
    task_result = celery_app.AsyncResult(task_id)
    return {"status": task_result.status, "result": task_result.result}

@app.get("/api/dashboard-data")
async def get_dashboard_data():
    if not os.path.exists("processed/master_dataset.parquet"):
        return {"error": "No processed data available"}
        
    df = pl.read_parquet("processed/master_dataset.parquet")
    
    # Generate summary stats
    total_crashes = len(df)
    
    # Prepare map data (return as JSON for Deck.gl)
    map_data = df.select(["Latitude", "Longitude", "Cluster_ID", "Severity"]).to_dicts()
    
    # Blackspots data
    if os.path.exists("processed/blackspots.parquet"):
        blackspots_df = pl.read_parquet("processed/blackspots.parquet")
        blackspots_data = blackspots_df.select(["Latitude", "Longitude", "Cluster_ID"]).to_dicts()
    else:
        blackspots_data = []
        
    # Severity distribution
    severity_counts = []
    if "Severity" in df.columns:
        counts = df.group_by("Severity").len().to_dicts()
        severity_counts = [{"name": row["Severity"], "value": row["len"]} for row in counts if row["Severity"]]

    # Collision Type distribution
    collision_counts = []
    if "Collision_Type" in df.columns:
        counts = df.group_by("Collision_Type").len().to_dicts()
        collision_counts = [{"name": row["Collision_Type"], "value": row["len"]} for row in counts if row["Collision_Type"]]

    return {
        "stats": {
            "total_crashes": total_crashes,
            "blackspots_count": len(blackspots_data)
        },
        "map_data": map_data,
        "blackspots": blackspots_data,
        "trends": {
            "severity": severity_counts,
            "collision_types": collision_counts
        }
    }
