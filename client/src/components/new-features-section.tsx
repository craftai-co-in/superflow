import { Brain, Globe, Layout, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function NewFeaturesSection() {
  const features = [
    {
      icon: Layout,
      title: "Smart Structuring",
      description: "Your raw thoughts become story-driven content.",
      color: "blue"
    },
    {
      icon: Brain,
      title: "Context Awareness", 
      description: "Detects theme, tone, & structures automatically",
      color: "purple"
    },
    {
      icon: Globe,
      title: "Multi-Language Magic",
      description: "Think & create in your preferred language",
      color: "green"
    },
    {
      icon: Sparkles,
      title: "Omnichannel Templates",
      description: "YouTube format for YouTube. LinkedIn style for LinkedIn. and many more.",
      color: "orange"
    }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-100 text-blue-600';
      case 'purple': return 'bg-purple-100 text-purple-600';
      case 'green': return 'bg-green-100 text-green-600';
      case 'orange': return 'bg-orange-100 text-orange-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center bg-blue-100 text-blue-800 px-6 py-3 rounded-full text-lg font-semibold mb-6">
            <Sparkles className="w-5 h-5 mr-2" />
            Features
          </div>
          
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-6">
            AI-Powered Content Creation
          </h2>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, index) => (
            <Card key={index} className="bg-white shadow-md hover:shadow-lg transition-shadow duration-200 border-0">
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getColorClasses(feature.color)}`}>
                    <feature.icon className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {feature.title}
                    </h3>
                    
                    <p className="text-gray-600 text-sm">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}