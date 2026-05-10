"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import Link from "next/link";
import { ArrowLeft, Activity } from "lucide-react";
import ReactECharts from 'echarts-for-react';

export default function Trends() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get("http://localhost:8000/api/dashboard-data");
        setData(res.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A192F] text-white flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <Activity className="w-12 h-12 text-purple-500 mb-4" />
          <h2 className="text-xl">Loading Trend Data...</h2>
        </div>
      </div>
    );
  }

  const severityOption = {
    tooltip: { trigger: 'item' },
    series: [
      {
        name: 'Severity',
        type: 'pie',
        radius: ['40%', '70%'],
        data: data?.trends?.severity || [],
        emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0, 0, 0, 0.5)' } }
      }
    ]
  };

  const collisionOption = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    xAxis: { type: 'category', data: data?.trends?.collision_types?.map((d: any) => d.name) || [] },
    yAxis: { type: 'value' },
    series: [
      {
        data: data?.trends?.collision_types?.map((d: any) => d.value) || [],
        type: 'bar',
        itemStyle: { color: '#a855f7' }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-[#0A192F] text-white p-8">
      <div className="flex items-center mb-8">
        <Link href="/dashboard" className="text-gray-400 hover:text-white mr-4 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
          Trend Analysis
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[#112240] p-6 rounded-2xl border border-gray-800">
          <h2 className="text-xl font-semibold mb-4">Crash Severity Distribution</h2>
          <ReactECharts option={severityOption} theme="dark" style={{ height: '300px' }} opts={{ renderer: 'svg' }} />
        </div>
        
        <div className="bg-[#112240] p-6 rounded-2xl border border-gray-800">
          <h2 className="text-xl font-semibold mb-4">Collision Types</h2>
          <ReactECharts option={collisionOption} theme="dark" style={{ height: '300px' }} opts={{ renderer: 'svg' }} />
        </div>
      </div>
    </div>
  );
}
