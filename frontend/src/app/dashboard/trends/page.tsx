"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import api, { API_URL } from "@/lib/api";
import Link from "next/link";
import { 
  ArrowLeft, Activity, BarChart3, Clock, Calendar, Cloud, Route, 
  TrendingUp, Grid3X3, Sun, Car, Target, FileText, AlertCircle, 
  ChevronRight, ShieldCheck, Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import ReactECharts from 'echarts-for-react';

export default function Trends() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState("All");
  const [datasets, setDatasets] = useState<any[]>([]);
  const [datasetId, setDatasetId] = useState<number>(0);

  useEffect(() => {
    // Security Check: Redirect if not logged in
    const user = localStorage.getItem("user");
    if (!user) {
      window.location.href = "/login";
      return;
    }

    const fetchDatasets = async () => {
      try {
        const res = await api.get("/api/datasets");
        setDatasets(res.data);
        if (res.data.length > 0 && datasetId === 0) {
          setDatasetId(res.data[0].id);
        }
      } catch (err) { console.error(err); }
    };
    fetchDatasets();
  }, []);

  useEffect(() => {
    if (datasetId === 0 && datasets.length === 0) return;
    
    const fetchData = async () => {
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
    fetchData();
  }, [datasetId, severityFilter]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-500 font-medium animate-pulse">Analyzing crash trends...</p>
      </div>
    );
  }

  const trends = data?.trends || {};
  const stats = data?.stats || {};
  const clusterSizes = data?.cluster_sizes || [];

  // ── Helper to make ECharts options ──
  const makeBar = (dataset: any[], color: string, color2: string, rotate = 0) => ({
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { left: '3%', right: '4%', bottom: '10%', top: '10%', containLabel: true },
    xAxis: { 
      type: 'category', 
      data: dataset.map(d => d.name),
      axisLabel: { interval: 0, rotate, color: '#64748b', fontSize: 10, fontWeight: 500 }
    },
    yAxis: { type: 'value', splitLine: { lineStyle: { type: 'dashed', color: '#f1f5f9' } } },
    series: [{
      data: dataset.map(d => d.value),
      type: 'bar',
      smooth: true,
      barWidth: '50%',
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: {
          type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [{ offset: 0, color }, { offset: 1, color: color2 }]
        }
      }
    }]
  });

  const generateInsights = () => {
    const insights = [];
    if (!trends) return [];

    // Severity Insight
    if (stats.severity_index > 4.5) {
      insights.push({ icon: AlertCircle, color: "text-rose-600", bg: "bg-rose-50", text: "High Severity Warning: The WSI is critically high, indicating a large proportion of fatal/grievous accidents." });
    }

    // Time Insight
    if (trends.hours && trends.hours.length > 0) {
      const peakHour = [...trends.hours].sort((a,b) => b.value - a.value)[0];
      insights.push({ icon: Clock, color: "text-amber-600", bg: "bg-amber-50", text: `Peak Risk Period: Traffic accidents peak significantly around ${peakHour.name}, requiring heightened patrolling.` });
    }

    // Weather Insight
    if (trends.weather && trends.weather.length > 0) {
      const rain = trends.weather.find((w:any) => w.name.toLowerCase().includes('rain') || w.name.toLowerCase().includes('monsoon'));
      if (rain && rain.value > stats.total_crashes * 0.2) {
        insights.push({ icon: Cloud, color: "text-indigo-600", bg: "bg-indigo-50", text: "Environmental Factor: A significant percentage of crashes occur during adverse weather. Review road drainage and surface friction." });
      }
    }

    // Road Type Insight
    if (trends.road_types && trends.road_types.length > 0) {
      const topRoad = [...trends.road_types].sort((a,b) => b.value - a.value)[0];
      insights.push({ icon: Route, color: "text-emerald-600", bg: "bg-emerald-50", text: `Infrastructure Focus: ${topRoad.name} shows the highest crash frequency. Consider engineering audits for these stretches.` });
    }

    return insights.slice(0, 3);
  };

  const insights = generateInsights();

  const ChartCard = ({ title, icon: Icon, children, span = 1 }: { title: string; icon: any; children: React.ReactNode; span?: number }) => (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
      className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${span === 2 ? 'lg:col-span-2' : ''}`}>
      <div className="flex items-center gap-2.5 px-5 pt-4 pb-1">
        <div className="w-7 h-7 bg-indigo-50 text-indigo-600 rounded flex items-center justify-center">
            <Icon className="w-4 h-4" />
        </div>
        <h2 className="text-xs font-bold text-gray-700 uppercase tracking-wider">{title}</h2>
      </div>
      <div className="px-3 pb-3">{children}</div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 relative overflow-hidden font-sans pb-10">
      
      <div className="relative z-10 px-6 py-6 max-w-7xl mx-auto">
        {/* Header */}
        <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Trend Analytics</h1>
              <p className="text-xs text-gray-500 mt-1 font-medium">
                {stats.total_crashes?.toLocaleString()} crashes · {stats.clusters_count || 0} clusters · WSI {stats.severity_index}/6.0
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Dataset Selector */}
            <select 
              value={datasetId} 
              onChange={(e) => setDatasetId(Number(e.target.value))}
              className="bg-white border border-gray-200 text-gray-700 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block px-3 py-2 shadow-sm font-bold"
            >
              {datasets.map(ds => (
                <option key={ds.id} value={ds.id}>{ds.name}</option>
              ))}
            </select>

            <select 
              value={severityFilter} 
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="bg-white border border-gray-200 text-gray-700 text-xs rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block px-3 py-2 shadow-sm font-bold"
            >
              <option value="All">All Severities</option>
              <option value="Fatal">Fatal Only</option>
              <option value="Grievous">Grievous Only</option>
              <option value="Minor">Minor Only</option>
            </select>
          </div>
        </motion.div>

        {/* 💡 Automated Insights Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {insights.map((ins, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, scale: 0.95 }} 
              animate={{ opacity: 1, scale: 1 }} 
              transition={{ delay: i * 0.1 }}
              className={`${ins.bg} p-4 rounded-2xl border border-gray-100 flex gap-3 shadow-sm`}
            >
              <div className={`${ins.color} shrink-0`}><ins.icon className="w-5 h-5" /></div>
              <p className="text-xs font-semibold text-gray-800 leading-relaxed">{ins.text}</p>
            </motion.div>
          ))}
          {insights.length === 0 && (
            <div className="md:col-span-3 bg-white p-4 rounded-2xl border border-gray-200 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <p className="text-xs font-bold text-gray-600">All metrics within safety operational bounds for this view.</p>
            </div>
          )}
        </div>

        {/* Row 1: Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Crashes", value: stats.total_crashes, color: "text-indigo-600", icon: Activity },
            { label: "Blackspot Sites", value: stats.clusters_count, color: "text-rose-600", icon: Target },
            { label: "Avg Severity", value: `${stats.severity_index}/6.0`, color: "text-amber-600", icon: BarChart3 },
            { label: "Data Quality", value: `${stats.quality_score}%`, color: "text-emerald-600", icon: Zap },
          ].map((stat, i) => (
            <motion.div key={i} whileHover={{ y: -2 }} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                <stat.icon className={`w-4 h-4 ${stat.color} opacity-60`} />
              </div>
              <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Row 2: Main Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {(trends.years || []).length > 0 && (
            <ChartCard title="Year-over-Year Trend" icon={TrendingUp}>
              <ReactECharts option={makeBar(trends.years || [], '#3b82f6', '#2563eb')} style={{ height: '250px' }} opts={{ renderer: 'svg' }} />
            </ChartCard>
          )}
          {(trends.quarters || []).length > 0 && (
            <ChartCard title="Seasonal Pattern (Q1-Q4)" icon={Calendar}>
              <ReactECharts option={makeBar(trends.quarters || [], '#8b5cf6', '#7c3aed')} style={{ height: '250px' }} opts={{ renderer: 'svg' }} />
            </ChartCard>
          )}
        </div>

        {/* Row 3: Hourly + Daily */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {(trends.hours || []).length > 0 && (
            <ChartCard title="Hourly Distribution" icon={Clock} span={2}>
              <ReactECharts option={makeBar(trends.hours || [], '#6366f1', '#4f46e5')} style={{ height: '260px' }} opts={{ renderer: 'svg' }} />
            </ChartCard>
          )}
          {(trends.days || []).length > 0 && (
            <ChartCard title="Day of Week" icon={Grid3X3}>
              <ReactECharts option={makeBar(trends.days || [], '#f43f5e', '#e11d48')} style={{ height: '260px' }} opts={{ renderer: 'svg' }} />
            </ChartCard>
          )}
        </div>

        {/* Row 4: Weather + Light Conditions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {(trends.weather || []).length > 0 && (
            <ChartCard title="Weather Conditions" icon={Cloud}>
              <ReactECharts option={makeBar(trends.weather || [], '#0ea5e9', '#0284c7', 20)} style={{ height: '260px' }} opts={{ renderer: 'svg' }} />
            </ChartCard>
          )}
          {(trends.light_conditions || []).length > 0 && (
            <ChartCard title="Light Conditions" icon={Sun}>
              <ReactECharts option={makeBar(trends.light_conditions || [], '#eab308', '#ca8a04', 15)} style={{ height: '260px' }} opts={{ renderer: 'svg' }} />
            </ChartCard>
          )}
        </div>

        {/* Row 5: Road Type + Vehicle Types */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {(trends.road_types || []).length > 0 && (
            <ChartCard title="Road Types" icon={Route}>
              <ReactECharts option={makeBar(trends.road_types || [], '#f59e0b', '#d97706', 20)} style={{ height: '260px' }} opts={{ renderer: 'svg' }} />
            </ChartCard>
          )}
          {(trends.vehicle_types || []).length > 0 && (
            <ChartCard title="Vehicle Type Involvement" icon={Car}>
              <ReactECharts option={makeBar(trends.vehicle_types || [], '#14b8a6', '#0d9488', 25)} style={{ height: '260px' }} opts={{ renderer: 'svg' }} />
            </ChartCard>
          )}
        </div>

        {/* Row 6: Cluster Size Distribution */}
        {clusterSizes.length > 0 && (
          <div className="mb-6">
            <ChartCard title="DBSCAN Cluster Size Distribution" icon={Target}>
              <ReactECharts option={makeBar(clusterSizes, '#f43f5e', '#e11d48', 20)} style={{ height: '280px' }} opts={{ renderer: 'svg' }} />
            </ChartCard>
          </div>
        )}

      </div>
    </div>
  );
}
