import polars as pl
import numpy as np
from sklearn.cluster import DBSCAN
import os
from celery_app import celery_app

@celery_app.task
def process_data_task(file_path: str):
    try:
        # Load data
        if file_path.endswith('.csv'):
            df = pl.read_csv(file_path)
        elif file_path.endswith('.xlsx'):
            df = pl.read_excel(file_path)
        else:
            return {"error": "Unsupported file format"}

        # Basic cleaning
        if "Accident_ID" in df.columns:
            df = df.unique(subset=["Accident_ID"])
            
        # Drop rows without coordinates
        if "Latitude" in df.columns and "Longitude" in df.columns:
            df = df.filter(pl.col("Latitude").is_not_null() & pl.col("Longitude").is_not_null())
            
            # DBSCAN Setup
            coords = df.select(["Latitude", "Longitude"]).to_numpy()
            coords_rad = np.radians(coords)
            
            # Epsilon = 50m / 6371000m
            epsilon = 50 / 6371000.0 
            
            db = DBSCAN(eps=epsilon, min_samples=5, algorithm='ball_tree', metric='haversine')
            clusters = db.fit_predict(coords_rad)
            
            # Append clusters back to the dataset
            df = df.with_columns(pl.Series(name="Cluster_ID", values=clusters))
            
            # Identify Blackspots
            blackspots = df.filter(pl.col("Cluster_ID") != -1)
            
            # Save results
            os.makedirs("processed", exist_ok=True)
            df.write_parquet("processed/master_dataset.parquet")
            blackspots.write_parquet("processed/blackspots.parquet")
            
            return {"status": "success", "message": "Data processed successfully", "total_records": len(df), "blackspots_found": len(blackspots)}
        else:
            return {"error": "Dataset missing Latitude or Longitude"}
            
    except Exception as e:
        return {"error": str(e)}
