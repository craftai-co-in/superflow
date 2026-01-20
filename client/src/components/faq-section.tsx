import { useState } from "react";
import { ChevronDown, ChevronUp, MessageCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function FAQSection() {
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);

  const faqs = [
    {
      question: "How is this different from Google's voice typing?",
      answer: "Google gives you raw text. Superflow gives you structured, platform-ready content with context and story flow. We don't just transcribe - we understand your intent, analyze the context, and transform your thoughts into compelling narratives optimized for your target platform."
    },
    {
      question: "What languages do you support?",
      answer: "40+ languages with more coming. Think in your native language, create for any audience. Our AI understands cultural nuances and can adapt content style while preserving your authentic voice and message."
    },
    {
      question: "Do I need perfect grammar when speaking?",
      answer: "Not at all. We handle \"umms,\" pauses, and casual speech. Just share your thoughts naturally. Our advanced AI filters out filler words, corrects grammar, and structures your ideas into polished content while maintaining your personal style."
    },
    {
      question: "Can I edit the generated content?",
      answer: "Absolutely. Generated content is your starting point. Edit, refine, and make it perfectly yours. You have full control over the final output - use our AI as your intelligent writing assistant, not a replacement for your creativity."
    },
    {
      question: "How accurate is the transcription?",
      answer: "Our transcription accuracy is over 95% for clear speech. We use advanced AI models that understand context, handle accents, and work well even in slightly noisy environments. Plus, our content enhancement process often improves clarity beyond the original speech."
    },
    {
      question: "What platforms do you optimize content for?",
      answer: "YouTube, LinkedIn, Instagram, Twitter, TikTok, Facebook, blog posts, and more. Each platform has unique content requirements - we automatically format and optimize your content to match each platform's best practices and audience expectations."
    }
  ];

  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-blue-100 text-blue-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <MessageCircle className="w-4 h-4" />
            <span>FAQ</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Frequently Asked{" "}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
          
          <p className="text-xl text-gray-600">
            Everything you need to know about Superflow
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openFAQ === index;
            
            return (
              <Card 
                key={index} 
                className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200 border-0"
              >
                <CardContent className="p-0">
                  <button
                    className="w-full text-left p-6 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
                    onClick={() => setOpenFAQ(isOpen ? null : index)}
                    data-testid={`faq-question-${index}`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900 pr-4">
                        {faq.question}
                      </h3>
                      <div className="flex-shrink-0">
                        {isOpen ? (
                          <ChevronUp className="w-5 h-5 text-gray-500" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-500" />
                        )}
                      </div>
                    </div>
                  </button>
                  
                  {isOpen && (
                    <div className="px-6 pb-6">
                      <div className="border-t border-gray-100 pt-4">
                        <p className="text-gray-700 leading-relaxed">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Still have questions? */}
        <div className="mt-16 text-center bg-white rounded-2xl p-8 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            Still have questions?
          </h3>
          <p className="text-gray-600 mb-6">
            We're here to help. Reach out to our team for personalized support.
          </p>
          <a 
            href="mailto:support@superflow.work"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <MessageCircle className="w-4 h-4 mr-2" />
            Contact Support
          </a>
        </div>
      </div>
    </section>
  );
}