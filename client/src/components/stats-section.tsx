import { Minus } from "lucide-react";

export default function StatsSection() {
  return (
    <section className="w-full bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">The Speed Problem</h2>
          <p className="text-xl text-gray-600">Your brain works faster than your fingers</p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 items-center">
          <div className="text-center bg-red-50 rounded-2xl p-8 border border-red-200">
            <div className="text-4xl font-bold text-red-600 mb-2">220 WPM</div>
            <div className="text-lg font-semibold text-gray-800 mb-2">Ideas/Thoughts</div>
            <div className="text-gray-600">Average thinking speed</div>
          </div>
          
          <div className="text-center">
            <div className="text-6xl text-gray-600 mb-4 flex justify-center">
              <Minus className="w-16 h-16" />
            </div>
            <div className="text-2xl font-bold text-gray-800">Speed Mismatch</div>
            <div className="text-lg text-red-600 font-semibold">= Lost Ideas</div>
          </div>
          
          <div className="text-center bg-yellow-50 rounded-2xl p-8 border border-yellow-200">
            <div className="text-4xl font-bold text-yellow-600 mb-2">20 WPM</div>
            <div className="text-lg font-semibold text-gray-800 mb-2">Typing Speed</div>
            <div className="text-gray-600">Average typing speed</div>
          </div>
        </div>
        
        <div className="mt-12 text-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-8 border border-blue-200">
          <div className="text-5xl font-bold text-blue-600 mb-4">10x Faster</div>
          <div className="text-xl text-gray-800 font-semibold mb-2">With Voice + AI</div>
          <div className="text-gray-600">Capture and enhance ideas at the speed of thought</div>
        </div>
      </div>
    </section>
  );
}
