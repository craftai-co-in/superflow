import RecordingInterface from "./recording-interface";

export default function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 py-16 sm:py-24 min-h-screen flex items-center">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-800 leading-tight">
          Capture Ideas at{" "}
          <span className="text-blue-600">Thought Speed</span>
        </h1>
        <p className="mt-6 text-xl text-gray-600 max-w-2xl mx-auto">
          Stop losing ideas while typing—start creating content 10x faster with AI-powered voice transcription and processing.
        </p>
        
        <RecordingInterface />
        
        <div className="mt-8">
          <button className="bg-blue-600 text-white text-lg px-8 py-4 rounded-xl hover:bg-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
            Start Creating for Free
          </button>
        </div>
      </div>
    </section>
  );
}
