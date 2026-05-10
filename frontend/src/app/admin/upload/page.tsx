"use client";

import { useState } from "react";
import { UploadCloud, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import axios from "axios";

export default function AdminUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "uploading" | "processing" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [taskId, setTaskId] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setStatus("uploading");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://localhost:8000/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      setTaskId(response.data.task_id);
      setStatus("processing");
      pollStatus(response.data.task_id);
    } catch (error) {
      setStatus("error");
      setMessage("Failed to upload file.");
    }
  };

  const pollStatus = async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`http://localhost:8000/api/status/${id}`);
        if (res.data.status === "SUCCESS") {
          clearInterval(interval);
          setStatus("success");
          setMessage("Data processed and Blackspots identified successfully!");
        } else if (res.data.status === "FAILURE") {
          clearInterval(interval);
          setStatus("error");
          setMessage("Failed to process data.");
        }
      } catch (err) {
        clearInterval(interval);
        setStatus("error");
        setMessage("Error checking status.");
      }
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#0A192F] text-white p-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-bold">Admin Data Upload</h1>
          <Link href="/dashboard" className="px-4 py-2 bg-[#112240] rounded hover:bg-blue-600 transition-colors">
            Go to Dashboard
          </Link>
        </div>

        <div className="bg-[#112240] p-12 rounded-2xl border border-gray-800 text-center flex flex-col items-center">
          <div className="w-24 h-24 bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
            <UploadCloud className="w-12 h-12 text-blue-400" />
          </div>
          
          <h2 className="text-2xl font-semibold mb-2">Upload Crash Dataset</h2>
          <p className="text-gray-400 mb-8">Supported formats: .csv, .xlsx</p>

          <input
            type="file"
            id="file-upload"
            className="hidden"
            accept=".csv,.xlsx"
            onChange={handleFileChange}
          />
          <label
            htmlFor="file-upload"
            className="cursor-pointer px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors mb-4"
          >
            {file ? file.name : "Select File"}
          </label>

          {file && status === "idle" && (
            <button
              onClick={handleUpload}
              className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-lg font-medium transition-colors"
            >
              Start Processing Pipeline
            </button>
          )}

          {status === "uploading" && (
            <div className="flex items-center text-blue-400 mt-4">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Uploading...
            </div>
          )}

          {status === "processing" && (
            <div className="flex items-center text-purple-400 mt-4">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Running Polars & DBSCAN Clustering...
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center text-green-400 mt-4">
              <div className="flex items-center mb-4">
                <CheckCircle className="w-5 h-5 mr-2" /> {message}
              </div>
              <Link href="/dashboard" className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors">
                View Generated Dashboard
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className="flex items-center text-red-400 mt-4">
              <AlertCircle className="w-5 h-5 mr-2" /> {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
