import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle, Sparkles, User, Briefcase, Camera, Pen, Megaphone, Building2 } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { useLocation } from "wouter";
import type { ProfessionRequest } from "@shared/schema";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
}

const professions = [
  { id: "content-creator", label: "Content Creator", icon: Camera, description: "Social media, YouTube, blogging" },
  { id: "entrepreneur", label: "Entrepreneur", icon: Briefcase, description: "Business owner, startup founder" },
  { id: "marketer", label: "Marketer", icon: Megaphone, description: "Marketing professional, advertising" },
  { id: "writer", label: "Writer/Journalist", icon: Pen, description: "Author, journalist, copywriter" },
  { id: "consultant", label: "Consultant", icon: Building2, description: "Business consultant, freelancer" },
  { id: "other", label: "Other Professional", icon: User, description: "Any other profession" }
];

export default function OnboardingModal({ isOpen, onClose, userId }: OnboardingModalProps) {
  const [selectedProfession, setSelectedProfession] = useState<string>("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const professionMutation = useMutation({
    mutationFn: async (data: ProfessionRequest) => {
      // Add a small delay to ensure session is fully established
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await apiRequest('POST', `/api/user/profession`, data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update profession');
      }
      return response.json();
    },
    onSuccess: () => {
      // Track completed onboarding
      trackEvent('complete_onboarding', 'user', selectedProfession);
      onClose();
      
      // Redirect to dashboard
      setTimeout(() => setLocation("/dashboard"), 100);
    },
    onError: (error: any) => {
      console.error("Profession update error:", error);
      toast({
        title: "Something went wrong",
        description: error.message || "Failed to save profession. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProfession) {
      professionMutation.mutate({ profession: selectedProfession });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Superflow!</h2>
            <p className="text-gray-600">Let's personalize your experience. What best describes your profession?</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {professions.map((profession) => {
                const Icon = profession.icon;
                return (
                  <div
                    key={profession.id}
                    className={`relative p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      selectedProfession === profession.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedProfession(profession.id)}
                    data-testid={`profession-${profession.id}`}
                  >
                    {selectedProfession === profession.id && (
                      <CheckCircle className="absolute top-2 right-2 w-5 h-5 text-blue-600" />
                    )}
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${
                        selectedProfession === profession.id ? 'bg-blue-100' : 'bg-gray-100'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          selectedProfession === profession.id ? 'text-blue-600' : 'text-gray-600'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-800 mb-1">{profession.label}</h3>
                        <p className="text-sm text-gray-600">{profession.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-center">
              <Button 
                type="submit" 
                disabled={!selectedProfession || professionMutation.isPending}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white"
                data-testid="button-complete-onboarding"
              >
                {professionMutation.isPending ? "Saving..." : "Complete Setup"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}