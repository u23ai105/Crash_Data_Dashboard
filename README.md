#  CrashIntel: Advanced Crash Data Intelligence Platform

CrashIntel is a high-performance, industry-grade analytics platform designed to transform raw accident datasets into actionable safety insights. Built using **Next.js 15**, **FastAPI**, **Polars**, and **Scikit-learn**, it provides a seamless end-to-end pipeline for spatial clustering, trend analysis, and blackspot identification.

##  Key Features

###  Descriptive & Trend Analysis
- **Summary Metrics**: Real-time tracking of Total Crashes, Fatalities, and the **Weighted Severity Index (WSI)**.
- **Temporal Trends**: Year-over-Year, Seasonal, Hourly, and Daily distribution charts.
- **Environmental Context**: Breakdown by Weather, Light Conditions, Road Type, and Vehicle Involvement.

###  Spatial Intelligence
- **Adaptive DBSCAN Clustering**: Automatically identifies accident hotspots using a density-based spatial clustering algorithm with an adaptive epsilon (radius) based on data density.
- **Kernel Density Estimation (KDE)**: High-resolution heatmap overlay for continuous risk visualization.
- **Interactive Map**: Built with Leaflet, featuring custom terrain tiles, hoverable incident pins, and cluster boundary visualization.

###  Blackspot Identification (MoRTH/IRC Standard)
- **Standard Alignment**: Adheres to Indian Ministry of Road Transport & Highways (MoRTH) standards (minimum 5 accidents in a cluster).
- **WSI Ranking**: Blackspots are ranked using a 6:3:1 weighted scale (Fatal:Grievous:Minor).
- **Safety Recommendations**: Automated engineering recommendations generated for every identified blackspot.

###  Data Pipeline & Security
- **Multi-Dataset Support**: Upload and manage multiple datasets independently.
- **Secure Auth**: Role-based access control (Admin for uploads/deletion, User for read-only analytics).
- **Automated Cleaning**: Duplicate removal, outlier detection, and coordinate normalization.

##  Technology Stack
- **Frontend**: Next.js 15, TailwindCSS, Framer Motion, ECharts, Leaflet.
- **Backend**: FastAPI (Python), Polars (High-speed data processing), Scikit-learn (DBSCAN).
- **Database**: SQLite (User management & Dataset tracking).

##  How to Use

### 1. Installation & Setup
```bash
# Clone the repository
git clone https://github.com/u23ai105/Crash_Data_Dashboard.git
cd Crash_Data_Dashboard

# Setup Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload

# Setup Frontend
cd ../frontend
npm install
npm run dev
```

### 2. Workflow
1. **Login**: Use the default credentials (Admin: `admin/admin123`).
2. **Upload**: Navigate to the **Admin Pipeline** and upload a CSV/XLSX file. Ensure it contains `Latitude`, `Longitude`, and `Severity` columns.
3. **Analyze**: Explore the **Map Dashboard** for spatial clusters and the **Trends Page** for temporal patterns.
4. **Export**: Generate a professional **PDF Report** or download the cleaned **CSV** dataset for external use.

##  Methodology
- **Clustering**: We use **Adaptive DBSCAN**. The system calculates the k-distance (k=5) and uses the elbow method to determine the optimal clustering radius ($\epsilon$) for your specific geography.
- **Severity Ranking**: Locations are scored using:  
  $Score = (6 \times Fatal) + (3 \times Grievous) + (1 \times Minor)$
- **Data Cleaning**: Rows with coordinates outside valid geographic ranges or missing critical values are automatically flagged or imputed to ensure a 90%+ Quality Score.

---
<!-- *Built for Road Safety Engineers and Urban Planners.* -->
