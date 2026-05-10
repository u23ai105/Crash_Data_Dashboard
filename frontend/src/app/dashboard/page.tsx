"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Activity, MapPin, AlertTriangle } from "lucide-react";

// Dynamically import Map component to avoid SSR issues with deck.gl
const DeckMap = dynamic(() => import("../../components/DeckMap"), { ssr: false });

export default function Dashboard() {
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
          <Activity className="w-12 h-12 text-blue-500 mb-4" />
          <h2 className="text-xl">Loading Dashboard Data...</h2>
        </div>
      </div>
    );
  }

  if (!data || data.error) {
    return (
      <div className="min-h-screen bg-[#0A192F] text-white flex flex-col items-center justify-center">
        <AlertTriangle className="w-16 h-16 text-yellow-500 mb-4" />
        <h2 className="text-2xl mb-4">No Data Available</h2>
        <p className="text-gray-400 mb-8">Please upload a dataset from the Admin panel to view the dashboard.</p>
        <Link href="/admin/upload" className="px-6 py-3 bg-blue-600 rounded-lg hover:bg-blue-500 transition-colors">
          Go to Upload Panel
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A192F] text-white flex flex-col">
      {/* Top Bar */}
      <header className="bg-[#112240] border-b border-gray-800 p-4 flex justify-between items-center z-10 relative shadow-lg">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          Crash Intelligence
        </h1>
        <div className="flex gap-4">
          <Link href="/dashboard/trends" className="text-gray-400 hover:text-white transition-colors">
            Trends
          </Link>
          <Link href="/admin/upload" className="text-gray-400 hover:text-white transition-colors">
            Admin
          </Link>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 z-10 relative">
        <div className="bg-[#112240]/80 backdrop-blur-md p-6 rounded-xl border border-gray-800 flex items-center shadow-lg">
          <div className="w-12 h-12 bg-blue-900/50 rounded-full flex items-center justify-center mr-4">
            <Activity className="text-blue-400" />
          </div>
          <div>
            <p className="text-gray-400 text-sm uppercase tracking-wider">Total Crashes</p>
            <h3 className="text-3xl font-bold">{data.stats.total_crashes}</h3>
          </div>
        </div>
        
        <div className="bg-[#112240]/80 backdrop-blur-md p-6 rounded-xl border border-gray-800 flex items-center shadow-lg">
          <div className="w-12 h-12 bg-red-900/50 rounded-full flex items-center justify-center mr-4">
            <MapPin className="text-red-400" />
          </div>
          <div>
            <p className="text-gray-400 text-sm uppercase tracking-wider">High-Risk Blackspots</p>
            <h3 className="text-3xl font-bold">{data.stats.blackspots_count}</h3>
          </div>
        </div>
        
        <div className="bg-[#112240]/80 backdrop-blur-md p-6 rounded-xl border border-gray-800 flex items-center shadow-lg">
          <div className="w-12 h-12 bg-purple-900/50 rounded-full flex items-center justify-center mr-4">
            <AlertTriangle className="text-purple-400" />
          </div>
          <div>
            <p className="text-gray-400 text-sm uppercase tracking-wider">Analysis Status</p>
            <h3 className="text-xl font-bold text-green-400">Processed & Active</h3>
          </div>
        </div>
      </div>

      {/* Map Container */}
      <div className="flex-grow relative">
        <DeckMap mapData={data.map_data} blackspots={data.blackspots} />
        
        {/* Overlay Legend */}
        <div className="absolute bottom-8 right-8 bg-[#112240]/80 backdrop-blur-md p-4 rounded-xl border border-gray-800 pointer-events-none shadow-lg">
          <h4 className="font-semibold mb-2">Legend</h4>
          <div className="flex items-center mb-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
            <span className="text-sm text-gray-300">Crash Location</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
            <span className="text-sm text-gray-300">Identified Blackspot (DBSCAN)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
