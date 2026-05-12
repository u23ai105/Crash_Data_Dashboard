"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, MapIcon, BarChart3, UploadCloud, Shield, Zap, Database, LogIn, LogOut, User } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("user");
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("user");
    setUser(null);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15, delayChildren: 0.3 } }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1, 
      transition: { duration: 0.5 } 
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-black flex flex-col relative overflow-hidden font-sans">
      {/* Animated background gradient orbs (Light mode) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-200/40 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-violet-200/40 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] bg-sky-200/30 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Navigation Bar */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 flex items-center justify-between px-8 py-5 border-b border-gray-200 bg-white/50 backdrop-blur-md"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center shadow-sm">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-black">CrashIntel</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors">Dashboard</Link>
          <Link href="/dashboard/trends" className="text-sm font-medium text-gray-700 hover:text-indigo-600 transition-colors">Analytics</Link>
          
          {user ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-black bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg">
                <User className="w-4 h-4 text-indigo-600" />
                {user.username}
                <span className="text-[10px] font-bold uppercase tracking-wider bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">{user.role}</span>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-2 text-sm px-4 py-2 bg-white border border-gray-200 rounded-lg text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors font-medium shadow-sm">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </div>
          ) : (
            <Link href="/login" className="flex items-center gap-2 text-sm px-4 py-2 bg-indigo-600 rounded-lg text-white hover:bg-indigo-700 transition-colors font-medium shadow-md shadow-indigo-200">
              <LogIn className="w-4 h-4" /> Login
            </Link>
          )}
        </div>
      </motion.nav>

      {/* Hero Section */}
      <div className="relative z-10 flex-grow flex flex-col items-center justify-center px-8 py-16">
        <motion.div
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 text-xs font-bold tracking-wider uppercase mb-8 shadow-sm">
            <Zap className="w-3.5 h-3.5" />
            Powered by DBSCAN + KDE Spatial Analysis
          </div>

          <h1 className="text-6xl md:text-7xl font-black mb-6 leading-[1.05] tracking-tight">
            <span className="text-black">Crash Data</span>
            <br />
            <span className="bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">Intelligence</span>
          </h1>

          <p className="text-lg text-gray-700 mb-10 max-w-xl mx-auto leading-relaxed font-medium">
            Upload accident datasets and instantly discover high-risk blackspots, crash trends, and safety insights through advanced spatial machine learning.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link href="/dashboard" className="group inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl text-white font-bold hover:shadow-lg hover:shadow-indigo-500/25 transition-all hover:scale-[1.02]">
              Open Dashboard
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href={user ? (user.role === 'admin' ? '/admin/upload' : '/dashboard') : '/login'} className="inline-flex items-center gap-2 px-7 py-3.5 bg-white border border-gray-200 rounded-xl text-gray-800 font-bold hover:bg-gray-50 transition-all shadow-sm">
              <UploadCloud className="w-4 h-4" />
              Upload Dataset
            </Link>
          </div>
        </motion.div>

        {/* Feature Cards (Bento Grid) */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full mt-20"
        >
          <motion.div variants={itemVariants}>
            <Link href="/dashboard" className="group block h-full">
              <div className="bg-white p-7 rounded-2xl border border-gray-200 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-100 transition-all duration-300 flex flex-col h-full shadow-sm">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform border border-indigo-100">
                  <MapIcon className="w-6 h-6 text-indigo-600" />
                </div>
                <h2 className="text-xl font-bold mb-2 text-black">Spatial Map</h2>
                <p className="text-gray-600 text-sm leading-relaxed flex-grow font-medium">Interactive map with crash pins, DBSCAN cluster zones, and KDE density heatmap overlay.</p>
                <div className="flex items-center gap-1.5 mt-5 text-indigo-600 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  Explore <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Link href="/dashboard/trends" className="group block h-full">
              <div className="bg-white p-7 rounded-2xl border border-gray-200 hover:border-purple-300 hover:shadow-lg hover:shadow-purple-100 transition-all duration-300 flex flex-col h-full shadow-sm">
                <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform border border-purple-100">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
                <h2 className="text-xl font-bold mb-2 text-black">Trend Analysis</h2>
                <p className="text-gray-600 text-sm leading-relaxed flex-grow font-medium">Severity breakdown, collision types, hourly trends, and day-of-week patterns.</p>
                <div className="flex items-center gap-1.5 mt-5 text-purple-600 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  Analyze <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Link href={user ? (user.role === 'admin' ? '/admin/upload' : '/dashboard') : '/login'} className="group block h-full">
              <div className="bg-white p-7 rounded-2xl border border-gray-200 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100 transition-all duration-300 flex flex-col h-full shadow-sm">
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform border border-emerald-100">
                  <Database className="w-6 h-6 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold mb-2 text-black">Data Pipeline</h2>
                <p className="text-gray-600 text-sm leading-relaxed flex-grow font-medium">Upload CSV/XLSX files for automated cleaning, DBSCAN clustering, and blackspot detection.</p>
                <div className="flex items-center gap-1.5 mt-5 text-emerald-600 text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity">
                  Upload <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            </Link>
          </motion.div>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center py-6 border-t border-gray-200 text-gray-600 font-medium text-xs bg-white/50 backdrop-blur-md">
        Crash Data Intelligence Platform · Built with Next.js, FastAPI, Polars & Scikit-learn
      </div>
    </div>
  );
}
