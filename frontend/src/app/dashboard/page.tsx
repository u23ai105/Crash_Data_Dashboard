"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import api, { API_URL } from "@/lib/api";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Activity, MapPin, AlertTriangle, Download, BarChart3, Eye, EyeOff,
  Layers, ChevronRight, Shield, FileText, Zap, Database, Settings2, LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DeckMap = dynamic(() => import("../../components/DeckMap"), { ssr: false });

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [legendOpen, setLegendOpen] = useState(true);
  const [statsPanelOpen, setStatsPanelOpen] = useState(true);
  const [qualityPanelOpen, setQualityPanelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"map" | "blackspots">("map");
  
  // ML Parameters
  const [controlsOpen, setControlsOpen] = useState(false);
  const [epsilon, setEpsilon] = useState(5000);
  const [minPts, setMinPts] = useState(5);
  const [kdeRadius, setKdeRadius] = useState(20);
  const [kdeBlur, setKdeBlur] = useState(22);
  const [severityFilter, setSeverityFilter] = useState("All");
  const [datasetId, setDatasetId] = useState<number>(0);
  const [datasets, setDatasets] = useState<any[]>([]);
  const [isReclustering, setIsReclustering] = useState(false);

  useEffect(() => {
    // Security Check: Redirect if not logged in
    const user = localStorage.getItem("user");
    if (!user) {
      router.push("/login");
      return;
    }

    // Fetch available datasets on mount
    api.get("/api/datasets").then(res => {
      setDatasets(res.data);
      if (res.data.length > 0) {
        setDatasetId(res.data[0].id);
      } else {
        setLoading(false); // No data
      }
    }).catch(e => {
      console.error(e);
      setLoading(false);
    });
  }, []);

  const fetchData = async () => {
    if (datasetId === 0) return;
    setLoading(true);
    try {
      const res = await api.get(`/api/dashboard-data?dataset_id=${datasetId}&severity=${severityFilter}`);
      setData(res.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [severityFilter, datasetId]);

  const handleRecluster = async () => {
    setIsReclustering(true);
    try {
      await api.post("/api/recluster", { dataset_id: datasetId, epsilon, min_samples: minPts });
      await fetchData();
    } catch (e) {
      console.error("Failed to recluster", e);
    } finally {
      setIsReclustering(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="h-screen bg-gray-50 text-gray-900 flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
          <div className="w-14 h-14 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-[0.2em]">Initializing Dashboard</h2>
        </motion.div>
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="h-screen bg-gray-50 text-gray-900 flex flex-col items-center justify-center px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <div className="w-16 h-16 bg-amber-100 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <AlertTriangle className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">No Processed Data</h2>
          <p className="text-gray-500 mb-6 max-w-sm text-sm">Upload a crash dataset to populate the dashboard.</p>
          <Link href="/admin/upload" className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all shadow-md">
            Upload Dataset
          </Link>
        </motion.div>
      </div>
    );
  }

  const stats = data.stats || {};
  const cleaning = data.cleaning || {};
  const severityBreakdown = data.trends?.severity || [];
  const topCollisions = (data.trends?.collision_types || []).sort((a: any, b: any) => b.value - a.value).slice(0, 5);
  const blackspotRankings = data.blackspot_rankings || [];
  const qualityScore = stats.quality_score || 0;

  return (
    <div className="h-screen bg-gray-50 text-gray-900 flex overflow-hidden font-sans">
      {/* ═══ LEFT SIDEBAR ═══ */}
      <div className="w-[52px] bg-white border-r border-gray-200 flex flex-col items-center py-3 z-30 flex-shrink-0 shadow-sm">
        <Link href="/" className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center mb-6 shadow-md shadow-indigo-500/20">
          <Shield className="w-4 h-4 text-white" />
        </Link>

        <nav className="flex flex-col gap-1 flex-grow">
          <button onClick={() => setActiveTab("map")} title="Spatial Map"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${activeTab === "map" ? "bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"}`}>
            <MapPin className="w-[14px] h-[14px]" />
          </button>
          <button onClick={() => setActiveTab("blackspots")} title="Blackspots"
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${activeTab === "blackspots" ? "bg-rose-50 text-rose-600 shadow-sm border border-rose-100" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"}`}>
            <AlertTriangle className="w-[14px] h-[14px]" />
          </button>
          <Link href="/dashboard/trends" title="Trend Analytics"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-all">
            <BarChart3 className="w-[14px] h-[14px]" />
          </Link>
          <Link href="/admin/upload" title="Upload Data"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-all">
            <Database className="w-[14px] h-[14px]" />
          </Link>
        </nav>

        <button onClick={() => setControlsOpen(!controlsOpen)} title="ML Controls"
          className={`w-8 h-8 mb-1 rounded-lg flex items-center justify-center transition-all ${controlsOpen ? "bg-blue-50 text-blue-600 border border-blue-100" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"}`}>
          <Settings2 className="w-[14px] h-[14px]" />
        </button>
        <button onClick={() => setQualityPanelOpen(!qualityPanelOpen)} title="Data Quality"
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${qualityPanelOpen ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"}`}>
          <Zap className="w-[14px] h-[14px]" />
        </button>
      </div>

      {/* ═══ MAIN CONTENT ═══ */}
      <div className="flex-grow flex flex-col relative">
        {/* Top Bar */}
        <header className="bg-white/80 backdrop-blur-xl border-b border-gray-200 px-5 py-2 flex justify-between items-center z-20 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">CRASHINTEL</span>
            <span className="text-[10px] text-gray-400 font-mono">DASHBOARD</span>
            <div className={`ml-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide ${
              qualityScore >= 90 ? "bg-emerald-100 text-emerald-700 border border-emerald-200" :
              qualityScore >= 70 ? "bg-amber-100 text-amber-700 border border-amber-200" :
              "bg-rose-100 text-rose-700 border border-rose-200"
            }`}>
              {qualityScore}% CLEAN
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button onClick={() => setLegendOpen(!legendOpen)} className={`flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-md transition-all font-medium ${legendOpen ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'}`}>
              {legendOpen ? <EyeOff size={10} /> : <Eye size={10} />} Legend
            </button>
            <button onClick={() => setStatsPanelOpen(!statsPanelOpen)} className={`flex items-center gap-1 text-[10px] px-2 py-1.5 rounded-md transition-all font-medium ${statsPanelOpen ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'}`}>
              <Layers size={10} /> Stats
            </button>
            <div className="w-px h-4 bg-gray-300 mx-1" />
            <a href={`${API_URL}/api/export/dataset?dataset_id=${datasetId}`} download className="flex items-center gap-1 text-[10px] px-2 py-1.5 bg-gray-100 border border-gray-200 rounded-md text-gray-600 font-medium hover:bg-gray-200 transition-all">
              <Download size={10} /> CSV
            </a>
            <a href={`${API_URL}/api/export/report?dataset_id=${datasetId}`} download className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 bg-indigo-600 border border-indigo-700 rounded-md text-white hover:bg-indigo-700 transition-all font-medium shadow-sm">
              <FileText size={10} /> PDF Report
            </a>
            <div className="w-px h-4 bg-gray-300 mx-1" />
            <button onClick={() => { localStorage.removeItem('user'); window.location.href = '/login'; }} className="flex items-center gap-1 text-[10px] px-2.5 py-1.5 bg-rose-50 border border-rose-200 rounded-md text-rose-600 hover:bg-rose-100 transition-all font-medium">
              <LogOut size={10} /> Logout
            </button>
          </div>
        </header>

        {/* ── Map View ── */}
        {activeTab === "map" && (
          <div className="flex-grow relative" style={{ isolation: 'isolate' }}>
            {/* Left Stats Panel */}
            <AnimatePresence>
              {statsPanelOpen && (
                <motion.div
                  initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -20, opacity: 0 }}
                  className="absolute left-4 top-4 flex flex-col gap-3 w-56 pointer-events-none" style={{ zIndex: 1000 }}
                >
                  {/* KPI Card */}
                  <div className="bg-white/95 backdrop-blur-xl rounded-xl border border-gray-200/80 p-4 pointer-events-auto shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center border border-indigo-100">
                        <Activity className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.15em]">Total Incidents</p>
                        <p className="text-2xl font-black text-gray-900 leading-none">{stats.total_crashes?.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="h-px bg-gradient-to-r from-gray-200 to-transparent mb-3" />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">Fatal</p>
                        <p className="text-lg font-black text-rose-600">{stats.fatal_count || 0}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">Grievous</p>
                        <p className="text-lg font-black text-amber-500">{stats.grievous_count || 0}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">Minor</p>
                        <p className="text-lg font-black text-emerald-500">{stats.minor_count || 0}</p>
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-500 font-semibold uppercase tracking-wider">Clusters</p>
                        <p className="text-lg font-black text-violet-600">{stats.clusters_count || 0}</p>
                      </div>
                    </div>
                    <div className="h-px bg-gray-100 my-3" />
                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Severity Index</p>
                        <p className="text-[11px] font-mono font-medium text-gray-700">{stats.severity_index}/6.0</p>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
                        <div className={`h-full rounded-full transition-all duration-1000 shadow-sm ${
                          stats.severity_index >= 4 ? 'bg-rose-500' : stats.severity_index >= 2.5 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`} style={{ width: `${(stats.severity_index / 5) * 100}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Severity Bars */}
                  {severityBreakdown.length > 0 && (
                    <div className="bg-white/95 backdrop-blur-xl rounded-xl border border-gray-200/80 p-4 pointer-events-auto shadow-[0_8px_30px_rgb(0,0,0,0.08)]">
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.15em] mb-3">Severity Breakdown</p>
                      <div className="space-y-2.5">
                        {severityBreakdown.map((s: any) => {
                          const total = severityBreakdown.reduce((a: number, b: any) => a + b.value, 0);
                          const pct = total > 0 ? ((s.value / total) * 100).toFixed(1) : 0;
                          const color = s.name === 'Fatal' ? 'bg-rose-500' : s.name === 'Grievous' ? 'bg-amber-500' : 'bg-emerald-500';
                          return (
                            <div key={s.name}>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[11px] font-medium text-gray-700">{s.name}</span>
                                <span className="text-[11px] text-gray-500 font-mono">{s.value} ({pct}%)</span>
                              </div>
                              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden border border-gray-200/50">
                                <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Right Collision Panel */}
            <AnimatePresence>
              {statsPanelOpen && topCollisions.length > 0 && (
                <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 20, opacity: 0 }}
                  className="absolute right-4 top-4 w-52 bg-white/95 backdrop-blur-xl rounded-xl border border-gray-200/80 p-4 shadow-[0_8px_30px_rgb(0,0,0,0.08)]" style={{ zIndex: 1000 }}>
                  <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.15em] mb-3">Top Collision Types</p>
                  <div className="space-y-2.5">
                    {topCollisions.map((c: any, i: number) => (
                      <div key={c.name} className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 font-mono font-medium w-3">{i + 1}</span>
                        <p className="text-[11px] font-medium text-gray-700 truncate flex-grow">{c.name}</p>
                        <span className="text-[11px] text-indigo-600 font-mono font-bold bg-indigo-50 px-1.5 py-0.5 rounded">{c.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-gray-100">
                    <Link href="/dashboard/trends" className="flex items-center gap-1 text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold transition-colors">
                      View All Analytics <ChevronRight size={10} />
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Bottom Legend */}
            <AnimatePresence>
              {legendOpen && (
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-xl rounded-full border border-gray-200/80 px-6 py-3 flex items-center gap-6 shadow-[0_8px_30px_rgb(0,0,0,0.12)]" style={{ zIndex: 1000 }}>
                  <div className="flex items-center gap-4">
                    {[
                      { color: "bg-blue-500", label: "Default" },
                      { color: "bg-amber-500", label: "Grievous" },
                      { color: "bg-rose-500", label: "Fatal" },
                      { color: "bg-emerald-500", label: "Minor" },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-1.5">
                        <div className={`w-3 h-3 rounded-full ${item.color} shadow-sm border border-white`} />
                        <span className="text-[11px] font-medium text-gray-600">{item.label}</span>
                      </div>
                    ))}
                  </div>
                  <div className="w-px h-4 bg-gray-200" />
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-3 rounded-full border border-rose-500 bg-rose-50 border-dashed" />
                      <span className="text-[11px] font-medium text-gray-600">Cluster Zone</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-gray-400 border border-white shadow-sm" />
                      <span className="text-[11px] font-medium text-gray-600">Noise</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-3 rounded-md bg-gradient-to-r from-blue-500 via-amber-500 to-rose-500 shadow-sm" />
                      <span className="text-[11px] font-medium text-gray-600">KDE Heat</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Map */}
            <div style={{ zIndex: 0 }} className="absolute inset-0">
              <DeckMap mapData={data.map_data} blackspots={data.blackspots} kdeRadius={kdeRadius} kdeBlur={kdeBlur} />
            </div>
          </div>
        )}

        {/* ── Blackspots Tab ── */}
        {activeTab === "blackspots" && (
          <div className="flex-grow overflow-auto p-8 bg-gray-50">
            <div className="max-w-5xl mx-auto">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="text-rose-500" /> Identified Blackspots
                </h2>
                <p className="text-sm text-gray-500 mt-1">Ranked by composite danger score (severity × crash count). DBSCAN ε=50m, minPts=5.</p>
              </div>

              {blackspotRankings.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500 shadow-sm">
                  No blackspots identified in this dataset.
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50/50">
                        <th className="px-5 py-4 text-[11px] text-gray-500 font-bold uppercase tracking-wider">Rank</th>
                        <th className="px-5 py-4 text-[11px] text-gray-500 font-bold uppercase tracking-wider">Crashes</th>
                        <th className="px-5 py-4 text-[11px] text-gray-500 font-bold uppercase tracking-wider">Severity</th>
                        <th className="px-5 py-4 text-[11px] text-gray-500 font-bold uppercase tracking-wider">Score</th>
                        <th className="px-5 py-4 text-[11px] text-gray-500 font-bold uppercase tracking-wider">Coordinates</th>
                        <th className="px-5 py-4 text-[11px] text-gray-500 font-bold uppercase tracking-wider">Recommendation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {blackspotRankings.map((bs: any) => (
                        <tr key={bs.rank} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-5 py-3.5 text-sm font-black text-gray-900">#{bs.rank}</td>
                          <td className="px-5 py-3.5 text-sm font-bold text-indigo-600">{bs.crash_count}</td>
                          <td className="px-5 py-3.5">
                            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                              bs.dominant_severity === 'Fatal' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              bs.dominant_severity === 'Grievous' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {bs.dominant_severity}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-xs font-mono font-medium text-gray-600">{bs.avg_severity_score}</td>
                          <td className="px-5 py-3.5 text-xs font-mono text-gray-500">{bs.latitude}, {bs.longitude}</td>
                          <td className="px-5 py-3.5 text-xs text-gray-600 max-w-xs leading-relaxed">{bs.recommendation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ═══ DATA QUALITY PANEL ═══ */}
      <AnimatePresence>
        {qualityPanelOpen && (
          <motion.div
            initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
            className="absolute left-[52px] top-0 bottom-0 w-[300px] bg-white border-r border-gray-200 overflow-y-auto p-6 shadow-2xl" style={{ zIndex: 1100 }}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-500" /> Data Quality
              </h3>
              <button onClick={() => setQualityPanelOpen(false)} className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded hover:bg-gray-100">✕</button>
            </div>

            <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 mb-6 text-center">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">Overall Score</p>
              <p className={`text-5xl font-black tracking-tight ${qualityScore >= 90 ? 'text-emerald-500' : qualityScore >= 70 ? 'text-amber-500' : 'text-rose-500'}`}>
                {qualityScore}%
              </p>
            </div>

            <div className="space-y-3 mb-8">
              {[
                { label: "Original Rows", value: cleaning.original_rows },
                { label: "Final Rows", value: cleaning.final_rows },
                { label: "Duplicates Removed", value: cleaning.duplicates_removed },
                { label: "Null Coords Dropped", value: cleaning.null_coords_dropped },
                { label: "Outliers Flagged", value: cleaning.outlier_coords_flagged },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                  <span className="text-[11px] font-medium text-gray-600">{item.label}</span>
                  <span className="text-[12px] font-mono font-semibold text-gray-900 bg-gray-100 px-1.5 py-0.5 rounded">{item.value ?? "—"}</span>
                </div>
              ))}
            </div>

            {cleaning.columns_missing_pct && (
              <>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-3">Missing Values by Column</p>
                <div className="space-y-3">
                  {Object.entries(cleaning.columns_missing_pct).map(([col, pct]: [string, any]) => (
                    <div key={col}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] font-medium text-gray-700 truncate max-w-[180px]">{col}</span>
                        <span className={`text-[11px] font-mono font-bold ${pct > 10 ? 'text-rose-600' : pct > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {pct}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${pct > 10 ? 'bg-rose-500' : pct > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══ ML CONTROLS PANEL ═══ */}
      <AnimatePresence>
        {controlsOpen && (
          <motion.div
            initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
            className="absolute left-[52px] top-0 bottom-0 w-[300px] bg-white border-r border-gray-200 overflow-y-auto p-6 shadow-2xl" style={{ zIndex: 1100 }}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-blue-500" /> Controls & Filters
              </h3>
              <button onClick={() => setControlsOpen(false)} className="text-gray-400 hover:text-gray-900 transition-colors p-1 rounded hover:bg-gray-100">✕</button>
            </div>

            <div className="space-y-6">
              {/* Global Filters */}
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-3">Global Filters</p>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Severity Filter</label>
                    <select 
                      value={severityFilter} 
                      onChange={(e) => setSeverityFilter(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                    >
                      <option value="All">All Severities</option>
                      <option value="Fatal">Fatal</option>
                      <option value="Grievous">Grievous</option>
                      <option value="Minor">Minor</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-100 w-full" />

              {/* KDE Controls */}
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-3">KDE Heatmap Params</p>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-xs font-medium text-gray-700">Radius</label>
                      <span className="text-xs text-blue-600 font-mono">{kdeRadius}px</span>
                    </div>
                    <input type="range" min="5" max="50" value={kdeRadius} onChange={(e) => setKdeRadius(Number(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-xs font-medium text-gray-700">Blur</label>
                      <span className="text-xs text-blue-600 font-mono">{kdeBlur}px</span>
                    </div>
                    <input type="range" min="5" max="50" value={kdeBlur} onChange={(e) => setKdeBlur(Number(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                  </div>
                </div>
              </div>

              <div className="h-px bg-gray-100 w-full" />

              {/* DBSCAN Controls */}
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-3">DBSCAN Clustering</p>
                <div className="space-y-4 mb-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-xs font-medium text-gray-700">Epsilon (meters)</label>
                      <span className="text-xs text-rose-600 font-mono">{epsilon}m</span>
                    </div>
                    <input type="range" min="100" max="50000" step="100" value={epsilon} onChange={(e) => setEpsilon(Number(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-500" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <label className="text-xs font-medium text-gray-700">Min Samples</label>
                      <span className="text-xs text-rose-600 font-mono">{minPts}</span>
                    </div>
                    <input type="range" min="2" max="20" value={minPts} onChange={(e) => setMinPts(Number(e.target.value))} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-rose-500" />
                  </div>
                </div>
                <button 
                  onClick={handleRecluster} 
                  disabled={isReclustering}
                  className="w-full py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors flex justify-center items-center gap-2"
                >
                  {isReclustering ? <div className="w-3 h-3 border-2 border-rose-400 border-t-rose-600 rounded-full animate-spin" /> : "Run Re-clustering"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
