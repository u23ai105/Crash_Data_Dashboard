import Link from "next/link";
import { ArrowRight, MapIcon, BarChart3, UploadCloud } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A192F] text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-5xl font-bold mb-6 text-center bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
        Crash Data Intelligence Platform
      </h1>
      <p className="text-xl text-gray-400 mb-12 max-w-2xl text-center">
        Advanced spatial analysis and machine learning to identify high-risk blackspots and accident trends.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
        <Link href="/dashboard" className="group">
          <div className="bg-[#112240] p-8 rounded-xl border border-gray-800 hover:border-blue-500 transition-all flex flex-col items-center text-center h-full">
            <MapIcon className="w-12 h-12 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-2xl font-semibold mb-2">Spatial Map</h2>
            <p className="text-gray-400 mb-4 flex-grow">Explore high-risk areas using DBSCAN clustering and Kernel Density Estimation.</p>
            <ArrowRight className="w-6 h-6 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>

        <Link href="/dashboard/trends" className="group">
          <div className="bg-[#112240] p-8 rounded-xl border border-gray-800 hover:border-purple-500 transition-all flex flex-col items-center text-center h-full">
            <BarChart3 className="w-12 h-12 text-purple-400 mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-2xl font-semibold mb-2">Trend Analysis</h2>
            <p className="text-gray-400 mb-4 flex-grow">Interactive charts showing crash severity, collision types, and weather conditions.</p>
            <ArrowRight className="w-6 h-6 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>

        <Link href="/admin/upload" className="group">
          <div className="bg-[#112240] p-8 rounded-xl border border-gray-800 hover:border-green-500 transition-all flex flex-col items-center text-center h-full">
            <UploadCloud className="w-12 h-12 text-green-400 mb-4 group-hover:scale-110 transition-transform" />
            <h2 className="text-2xl font-semibold mb-2">Admin Upload</h2>
            <p className="text-gray-400 mb-4 flex-grow">Upload tabular data (.csv, .xlsx) to instantly trigger spatial ML pipelines.</p>
            <ArrowRight className="w-6 h-6 text-green-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </Link>
      </div>
    </div>
  );
}
