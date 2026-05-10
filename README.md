# Crash Data Intelligence Dashboard

A comprehensive, full-stack crash data analysis platform built for spatial intelligence, trend analysis, and blackspot identification using Machine Learning (DBSCAN & KDE).

## 🚀 System Architecture

This project uses a decoupled, highly scalable architecture suitable for large tabular spatial datasets.

```
Frontend (Next.js)  <--REST API-->  Backend (FastAPI)
      |                                  |
      v                                  v
(Deck.gl Maps)                     (Celery Workers) <--> Redis
                                         |
                                         v
                              Polars (Data Processing)
                              Scikit-learn (DBSCAN Clustering)
                                         |
                                         v
                                Parquet Storage / DB
```

### Tech Stack:
- **Frontend**: Next.js (React), Tailwind CSS, Framer Motion, Deck.gl, Mapbox (Carto), Apache ECharts.
- **Backend**: FastAPI, Celery, Redis.
- **Data Engineering & ML**: Polars (hyper-fast Rust-based processing), Scikit-Learn (DBSCAN), SciPy.

## 🧠 Methodology: Why DBSCAN over K-Means?
When identifying crash "Blackspots", we want to group accidents that are densely packed geographically. 
- **K-Means** requires pre-defining `k` (number of clusters) and assumes clusters are spherical, which fails for real-world road networks.
- **DBSCAN** (Density-Based Spatial Clustering of Applications with Noise) does not require `k`. It groups points closely packed together and marks outliers as noise. We use the Haversine metric to calculate true geographic distances. Combined with Kernel Density Estimation (KDE), it gives an accurate representation of crash intensity zones.

## 🛠 Setup Instructions

This project uses `docker-compose` to spin up the entire ecosystem simultaneously.

1. Ensure you have Docker and Docker Compose installed.
2. Run the following command in the root directory:
```bash
docker-compose up --build
```
3. Access the applications:
   - **Frontend Dashboard**: `http://localhost:3000`
   - **Backend API Docs**: `http://localhost:8000/docs`

## 📊 Usage Guide
1. Navigate to the **Admin Panel** (`/admin/upload`).
2. Upload the `accident_dummy_data.xlsx` or any similar `.csv/.xlsx` dataset.
3. Wait for the background Celery task to process the data (Polars cleaning + DBSCAN clustering).
4. Navigate to the **Spatial Map** (`/dashboard`) to view KDE Heatmaps and Blackspot clusters using Deck.gl.
5. Navigate to **Trend Analysis** (`/dashboard/trends`) to analyze the safety metrics and severity distributions.
