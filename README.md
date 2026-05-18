<div align="center">
  <h1>🚨 CrashIntel: Advanced Crash Data Intelligence Platform</h1>
  
  <p>
    <strong>A high-performance, industry-grade analytics platform designed to transform raw accident datasets into actionable road safety insights.</strong>
  </p>

  [![Live Demo](https://img.shields.io/badge/Live_Demo-Vercel-000000?style=for-the-badge&logo=vercel)](https://crash-data-dashboard.vercel.app/)
  [![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?style=for-the-badge&logo=render)](https://crash-data-dashboard.onrender.com)
  [![Database](https://img.shields.io/badge/Database-Supabase-3ECF8E?style=for-the-badge&logo=supabase)](https://supabase.com/)

</div>

<br />

## 🌐 Live Application
- **Frontend Dashboard**: [https://crash-data-dashboard.vercel.app/](https://crash-data-dashboard.vercel.app/)
- **Backend API Docs**: [https://crash-data-dashboard.onrender.com/docs](https://crash-data-dashboard.onrender.com/docs) *(Swagger UI)*

> **Demo Login Credentials**
> - **Username**: `admin`
> - **Password**: `admin123`

---

## 📖 Overview

CrashIntel provides an end-to-end pipeline for **spatial clustering, trend analysis, and blackspot identification**. Built using **Next.js 15**, **FastAPI**, and **Polars**, the system processes massive crash datasets in milliseconds to output automated safety recommendations.

---

## ✨ Key Features

### 📊 Descriptive & Trend Analysis
- **Summary Metrics**: Real-time tracking of Total Crashes, Fatalities, and the **Weighted Severity Index (WSI)**.
- **Temporal Trends**: Interactive Year-over-Year, Seasonal, Hourly, and Daily distribution charts.
- **Environmental Context**: Breakdown by Weather, Light Conditions, Road Type, and Vehicle Involvement.

### 🗺️ Spatial Intelligence
- **Adaptive DBSCAN Clustering**: Automatically identifies accident hotspots using a density-based spatial clustering algorithm with an adaptive radius ($\epsilon$) based on geographic data density.
- **Interactive Map**: High-performance interactive map featuring custom terrain tiles, hoverable incident pins, and cluster boundary visualization.

### 🎯 Blackspot Identification (MoRTH/IRC Standard)
- **Standard Alignment**: Adheres strictly to Indian Ministry of Road Transport & Highways (MoRTH) standards (minimum 5 accidents in a cluster).
- **WSI Ranking**: Blackspots are ranked using a 6:3:1 weighted scale (Fatal : Grievous : Minor).
- **Safety Recommendations**: Automated engineering recommendations are generated for every identified blackspot.

### 🛡️ Data Pipeline & Security
- **Multi-Dataset Support**: Upload and manage multiple CSV/Excel datasets independently.
- **Secure Authentication**: Role-based access control (Admin for uploads/deletion, User for read-only analytics).
- **Automated Cleaning**: Background tasks handle duplicate removal, outlier detection, and coordinate normalization instantly.
- **PDF Report Generation**: Export full analytical reports with a single click.

---

## 💻 Technology Stack

### Frontend
- **Framework**: Next.js 15 (React 19)
- **Styling**: TailwindCSS, Framer Motion
- **Visualization**: ECharts, Leaflet, React-Map-GL

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Data Processing**: Polars (Multi-threaded data frames)
- **Machine Learning**: Scikit-learn (DBSCAN Clustering)
- **File Handling**: FastExcel

### Database & Deployment
- **Database**: PostgreSQL (via Supabase) / SQLite (Local fallback)
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Render

---

## 🚀 Getting Started (Local Development)

It is extremely easy to run this project locally. You can run the frontend and backend manually, or simply use Docker.

### Prerequisites
- Node.js (v18+)
- Python (v3.11+)
- Git

### Option 1: Manual Setup

**1. Clone the repository**
```bash
git clone https://github.com/u23ai105/Crash_Data_Dashboard.git
cd Crash_Data_Dashboard
```

**2. Setup Backend (FastAPI)**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows use: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
*The backend is now running at `http://localhost:8000`*

**3. Setup Frontend (Next.js)**
Open a **new terminal tab**:
```bash
cd frontend
npm install
npm run dev
```
*The frontend is now running at `http://localhost:3000`*

---

## ⚙️ Environment Configuration (`.env`)

To configure the application (especially for cloud deployment), create a `.env` file in the **root** and/or **frontend** directory:

**For the Backend:**
```ini
# backend/.env (Optional: Uses SQLite if not provided)
DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:6543/postgres"
```

**For the Frontend:**
```ini
# frontend/.env.local
NEXT_PUBLIC_API_URL="http://localhost:8000" # Change to your live backend URL in production
```

---

## ☁️ Deployment Guide

### Deploying the Backend to Render
1. Create a [Render](https://render.com/) account.
2. Create a new **Web Service** and connect this GitHub repository.
3. Set the **Language** to `Docker` and **Root Directory** to `backend`.
4. Add the `DATABASE_URL` Environment Variable pointing to your PostgreSQL instance (e.g., Supabase).
5. Deploy.

### Deploying the Frontend to Vercel
1. Create a [Vercel](https://vercel.com/) account.
2. Click **Import Project** and select this repository.
3. Set the **Root Directory** to `frontend`.
4. Add an Environment Variable: `NEXT_PUBLIC_API_URL` pointing to your Render backend URL (e.g., `https://crash-data-dashboard.onrender.com`).
5. Deploy.

---

## 🧮 Methodology

- **Clustering**: We use **Adaptive DBSCAN**. The system calculates the k-distance (k=5) and uses the elbow method to determine the optimal clustering radius ($\epsilon$) for your specific geography. This prevents the "fixed-radius" problem common in standard map clustering.
- **Severity Ranking**: Locations are scored using the official formula:  
  `Score = (6 × Fatal) + (3 × Grievous) + (1 × Minor)`
- **Data Cleaning**: Rows with coordinates outside valid geographic ranges (-90 to 90 lat, -180 to 180 lon) or missing critical values are automatically flagged or imputed to ensure a 90%+ Quality Score.

---

<div align="center">
  <i>Built for Road Safety Engineers, Data Scientists, and Urban Planners.</i>
</div>
