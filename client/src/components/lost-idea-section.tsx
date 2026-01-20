import { TrendingDown } from "lucide-react";

export default function LostIdeaSection() {
  return (
    <div className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Statistic */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center bg-red-100 text-red-800 px-6 py-3 rounded-full text-lg font-semibold mb-6">
            <TrendingDown className="w-5 h-5 mr-2" />
            The "Lost Idea" Problem
          </div>
          
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-8">
            <span className="text-red-600">57%</span> of creators admit ideas get lost before they're captured
          </h2>
        </div>

        {/* Scenarios */}
        <div className="text-center mb-8">
          <p className="text-xl text-gray-700 mb-6">Brilliant ideas strike anytime</p>
          
          <div className="flex justify-center items-center space-x-8">
            <div className="text-center">
              <span className="text-2xl">🚗</span>
              <p className="text-sm text-gray-600 mt-2">The Commute Breakthrough</p>
            </div>
            
            <div className="text-center">
              <span className="text-2xl">💡</span>
              <p className="text-sm text-gray-600 mt-2">The 3am Genius Moment</p>
            </div>
          </div>
        </div>

        {/* Solution Statement */}
        <div className="text-center">
          <div className="inline-flex items-center bg-green-100 text-green-800 px-8 py-4 rounded-full text-xl font-semibold">
            Never lose your next brilliant idea
          </div>
        </div>
      </div>
    </div>
  );
}