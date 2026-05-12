"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { UploadCloud, CheckCircle, AlertCircle, Loader2, ArrowLeft, FileSpreadsheet, Zap, Database, ArrowRight, Trash2, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import axios from "axios";
import api, { API_URL } from "@/lib/api";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState("");
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [taskId, setTaskId] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [datasets, setDatasets] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Check auth
    const user = localStorage.getItem("user");
    if (!user || JSON.parse(user).role !== "admin") {
      router.push("/login");
    } else {
      fetchDatasets();
    }
  }, []);

  const fetchDatasets = async () => {
    try {
      const res = await api.get("/api/datasets");
      setDatasets(res.data);
    } catch (e) {
      console.error("Failed to fetch datasets", e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStatus("idle");
      // Auto-fill name if empty
      if (!datasetName) {
        setDatasetName(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.endsWith('.csv') || droppedFile.name.endsWith('.xlsx'))) {
      setFile(droppedFile);
      setStatus("idle");
      if (!datasetName) {
        setDatasetName(droppedFile.name.replace(/\.[^/.]+$/, ""));
      }
    }
  }, [datasetName]);

  const handleUpload = async () => {
    if (!file || !datasetName) return;

    setStatus("uploading");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("dataset_name", datasetName);

    try {
      const response = await api.post("/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      setTaskId(response.data.dataset_id.toString());
      setStatus("processing");
      pollStatus(response.data.dataset_id.toString());
    } catch (error) {
      setStatus("error");
      setMessage("Failed to upload file. Is the backend running on port 8000?");
    }
  };

  const pollStatus = async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/api/status/${id}`);
        if (res.data.status === "SUCCESS") {
          clearInterval(interval);
          setStatus("success");
          setMessage(`Processed ${res.data.result?.total_records || '?'} records. ${res.data.result?.blackspots_found || 0} blackspot crashes identified.`);
          fetchDatasets(); // Refresh list
        } else if (res.data.status === "FAILURE") {
          clearInterval(interval);
          setStatus("error");
          setMessage(res.data.result?.error || "Failed to process data.");
        }
      } catch (err) {
        clearInterval(interval);
        setStatus("error");
        setMessage("Error checking processing status.");
      }
    }, 1500);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this dataset?")) return;
    try {
      await api.delete(`/api/datasets/${id}`);
      fetchDatasets();
    } catch (e) {
      alert("Failed to delete dataset");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    router.push("/login");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const pipelineSteps = [
    { label: "Upload", icon: UploadCloud, done: status !== "idle" },
    { label: "Cleaning", icon: Database, done: status === "processing" || status === "success" },
    { label: "DBSCAN", icon: Zap, done: status === "success" },
    { label: "Done", icon: CheckCircle, done: status === "success" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 relative overflow-hidden font-sans">
      <div className="relative z-10 max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <motion.div
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-600 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all shadow-sm">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">Admin Data Pipeline</h1>
              <p className="text-xs text-gray-500 mt-1 font-medium">Upload and process new crash datasets</p>
            </div>
          </div>
          
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors shadow-sm">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </motion.div>

        {/* Status Pipeline Tracker */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl p-6 mb-6 flex justify-between items-center relative shadow-sm border border-gray-200">
          <div className="absolute left-10 right-10 top-1/2 h-0.5 bg-gray-100 -z-10" />
          {pipelineSteps.map((step, i) => {
            const Icon = step.icon;
            const isActive = step.done || (i === 0 && status === "idle");
            return (
              <div key={step.label} className="flex flex-col items-center gap-3 bg-white px-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 border-2 ${
                  step.done ? 'bg-emerald-50 border-emerald-500 text-emerald-500' :
                  (i === 0 && status === 'idle') || (i === 1 && status === 'processing') ? 'bg-indigo-50 border-indigo-500 text-indigo-500 shadow-lg shadow-indigo-200' :
                  'bg-white border-gray-200 text-gray-300'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </motion.div>

        {/* Upload Area */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 mb-8"
        >
          {status === "idle" || status === "error" ? (
            <>
              <div className="mb-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Dataset Name</label>
                <input 
                  type="text" 
                  value={datasetName}
                  onChange={(e) => setDatasetName(e.target.value)}
                  placeholder="e.g. London Q1 2024 Crashes"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 font-medium"
                />
              </div>

              <div
                className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors cursor-pointer ${
                  isDragOver ? "border-indigo-500 bg-indigo-50/50" : file ? "border-indigo-300 bg-indigo-50/30" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".csv,.xlsx"
                  className="hidden"
                />
                
                {file ? (
                  <>
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                      <FileSpreadsheet className="w-8 h-8 text-indigo-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{file.name}</h3>
                    <p className="text-gray-500 text-sm">{formatFileSize(file.size)}</p>
                    <p className="text-indigo-600 text-xs font-semibold mt-4 hover:underline">Click to change file</p>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                      <UploadCloud className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">Drag & Drop your dataset</h3>
                    <p className="text-gray-500 text-sm mb-4">Supports CSV and Excel files</p>
                    <button className="px-5 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-700 shadow-sm">
                      Browse Files
                    </button>
                  </>
                )}
              </div>

              {status === "error" && (
                <div className="mt-6 p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold mb-1">Upload Failed</h4>
                    <p className="text-xs opacity-90">{message}</p>
                  </div>
                </div>
              )}

              {file && (
                <button
                  onClick={handleUpload}
                  disabled={!datasetName}
                  className="w-full mt-6 py-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-white font-bold text-sm shadow-md shadow-indigo-200 transition-all"
                >
                  Start Processing Pipeline
                </button>
              )}
            </>
          ) : (
            <div className="py-12 flex flex-col items-center text-center">
              {status === "success" ? (
                <>
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="w-10 h-10 text-emerald-500" />
                  </div>
                  <h3 className="text-2xl font-black text-gray-900 mb-2">Processing Complete!</h3>
                  <p className="text-emerald-600 font-medium text-sm mb-8 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100">{message}</p>
                  
                  <div className="flex gap-4">
                    <button onClick={() => { setFile(null); setDatasetName(""); setStatus("idle"); }} className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors shadow-sm">
                      Upload Another
                    </button>
                    <Link href="/dashboard" className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-md flex items-center gap-2">
                      View Dashboard <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </>
              ) : (
                <>
                  <div className="relative mb-8">
                    <div className="w-20 h-20 bg-indigo-50 border border-indigo-100 rounded-full flex items-center justify-center">
                      <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {status === "uploading" ? "Uploading Dataset..." : "Running Analytics Pipeline..."}
                  </h3>
                  <p className="text-gray-500 text-sm max-w-sm mx-auto">
                    {status === "uploading" 
                      ? "Transferring your file to the server." 
                      : "Cleaning data, extracting features, and running DBSCAN spatial clustering algorithm."}
                  </p>
                </>
              )}
            </div>
          )}
        </motion.div>

        {/* Existing Datasets List */}
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-500" /> Uploaded Datasets
          </h2>
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {datasets.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm font-medium">No datasets uploaded yet.</div>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-bold tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Dataset Name</th>
                    <th className="px-6 py-4">Uploaded At</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {datasets.map(ds => (
                    <tr key={ds.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-gray-900">{ds.name}</td>
                      <td className="px-6 py-4 text-gray-500 font-mono text-xs">{new Date(ds.uploaded_at).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDelete(ds.id)}
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-2 rounded-lg transition-colors"
                          title="Delete Dataset"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
