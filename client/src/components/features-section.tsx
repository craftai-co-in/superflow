import { Mic, Brain, Sparkles, Lightbulb, PenTool, Users, GraduationCap } from "lucide-react";

export default function FeaturesSection() {
  return (
    <div className="w-full">
      <section id="features" className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">How It Works</h2>
            <p className="text-xl text-gray-600">Three simple steps to transform your ideas</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Mic className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">1. Record</h3>
              <p className="text-gray-600">Speak your ideas naturally for up to 30 seconds. No need to worry about perfect grammar or structure.</p>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Brain className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">2. Transcribe</h3>
              <p className="text-gray-600">OpenAI Whisper converts your speech to text with industry-leading accuracy and speed.</p>
            </div>
            
            <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200 text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">3. Enhance</h3>
              <p className="text-gray-600">GPT-4o mini polishes your ideas into clear, compelling content ready for any use case.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-800 mb-4">Perfect For</h2>
            <p className="text-xl text-gray-600">Any situation where ideas come faster than typing</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <Lightbulb className="w-8 h-8 text-blue-600 mb-4" />
              <h3 className="font-semibold text-gray-800 mb-2">Brainstorming</h3>
              <p className="text-sm text-gray-600">Capture ideas during creative sessions</p>
            </div>
            
            <div className="bg-green-50 rounded-xl p-6 border border-green-200">
              <PenTool className="w-8 h-8 text-green-600 mb-4" />
              <h3 className="font-semibold text-gray-800 mb-2">Content Creation</h3>
              <p className="text-sm text-gray-600">Draft blogs, social posts, and articles</p>
            </div>
            
            <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
              <Users className="w-8 h-8 text-purple-600 mb-4" />
              <h3 className="font-semibold text-gray-800 mb-2">Meeting Notes</h3>
              <p className="text-sm text-gray-600">Quick thoughts and action items</p>
            </div>
            
            <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
              <GraduationCap className="w-8 h-8 text-orange-600 mb-4" />
              <h3 className="font-semibold text-gray-800 mb-2">Learning</h3>
              <p className="text-sm text-gray-600">Summarize insights and key takeaways</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
