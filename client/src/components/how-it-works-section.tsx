import { Mic, Brain, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function HowItWorksSection() {
  const steps = [
    {
      number: 1,
      icon: Mic,
      title: "Speak Your Mind",
      description: "Click record and share your thoughts naturally."
    },
    {
      number: 2,
      icon: Brain,
      title: "AI Understands",
      description: "Superflow transcribes, identifies intent, and shapes the narrative"
    },
    {
      number: 3,
      icon: CheckCircle,
      title: "Content Ready",
      description: "Receive polished, platform-optimized content ready for publishing"
    }
  ];

  return (
    <div className="py-16 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center bg-blue-100 text-blue-800 px-6 py-3 rounded-full text-lg font-semibold mb-6">
            <Brain className="w-5 h-5 mr-2" />
            How It Works
          </div>
          
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
            3 Simple Steps
          </h2>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, index) => (
            <Card key={index} className="bg-white shadow-md hover:shadow-lg transition-shadow duration-200 border-0 text-center">
              <CardContent className="p-6">
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                    <step.icon className="w-8 h-8 text-blue-600" />
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-gray-900 mb-3">
                  {step.title}
                </h3>
                
                <p className="text-gray-600 text-sm">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}