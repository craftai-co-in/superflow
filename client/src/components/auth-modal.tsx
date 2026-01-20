import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { X, Loader2, UserPlus, LogIn, Sparkles } from "lucide-react";
import OnboardingModal from "./onboarding-modal";
import { trackEvent } from "@/lib/analytics";
import { useLocation } from "wouter";
import type { LoginRequest, SignupRequest } from "@shared/schema";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "signup";
  zIndex?: string;
}

interface AuthResponse {
  user: {
    id: number;
    email: string;
    name: string;
  };
  message: string;
  redirectTo?: string;
  reason?: string;
}

export default function AuthModal({ isOpen, onClose, initialMode = "login", zIndex = "z-50" }: AuthModalProps) {
  const [mode, setMode] = useState<"login" | "signup">(initialMode);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
    password: "",
    termsAccepted: false,
  });
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [newUserId, setNewUserId] = useState<number | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const authMutation = useMutation({
    mutationFn: async (data: LoginRequest | SignupRequest): Promise<AuthResponse> => {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
      const response = await apiRequest('POST', endpoint, data);
      return await response.json();
    },
    onSuccess: (data) => {
      // Handle cross-domain redirection for both login and signup
      if (data.redirectTo) {
        console.log(`Auth redirect: ${data.reason} -> ${data.redirectTo}`);
        
        toast({
          title: mode === "signup" ? "Account created!" : "Welcome back!",
          description: `${data.message} Redirecting to ${data.reason === "premium_user" ? "premium" : "main"} app...`,
        });
        
        setTimeout(() => {
          window.location.href = data.redirectTo;
        }, 1000);
        return;
      }

      if (mode === "signup") {
        // Track successful signup
        trackEvent('sign_up', 'user', 'signup_modal');
        
        // Invalidate user query to refresh auth state immediately after signup
        queryClient.invalidateQueries({ queryKey: ["/api/me"] });
        
        // Show onboarding for new users
        setNewUserId(data.user.id);
        setShowOnboarding(true);
      } else {
        // Track successful login
        trackEvent('login', 'user', 'login_modal');
        
        toast({
          title: "Welcome back!",
          description: data.message,
        });
        
        // Invalidate user query to refresh auth state
        queryClient.invalidateQueries({ queryKey: ["/api/me"] });
        
        // Close modal
        onClose();
        
        // Reset form
        setFormData({ email: "", name: "", phone: "", password: "", termsAccepted: false });
        
        // Redirect to dashboard
        setTimeout(() => setLocation("/dashboard"), 100);
      }
    },
    onError: (error: any) => {
      let errorMessage = "An error occurred. Please try again.";
      
      try {
        const errorData = JSON.parse(error.message);
        
        if (errorData.error === "User with this email already exists") {
          errorMessage = "An account with this email already exists. Try logging in instead.";
        } else if (errorData.error === "Invalid email or password") {
          errorMessage = "Invalid email or password. Please check your credentials.";
        } else if (errorData.details) {
          // Validation errors
          errorMessage = errorData.details.map((d: any) => d.message).join(", ");
        } else {
          errorMessage = errorData.error || errorMessage;
        }
      } catch {
        errorMessage = error.message || errorMessage;
      }
      
      toast({
        title: mode === "login" ? "Login failed" : "Signup failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = mode === "login" 
      ? { email: formData.email, password: formData.password }
      : { email: formData.email, name: formData.name, phone: formData.phone, password: formData.password, termsAccepted: formData.termsAccepted };
    
    authMutation.mutate(data);
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const switchMode = () => {
    setMode(mode === "login" ? "signup" : "login");
    setFormData({ email: "", name: "", phone: "", password: "", termsAccepted: false });
  };

  const handleOnboardingComplete = () => {
    toast({
      title: "Welcome to VoiceFlow!",
      description: "Your account has been created successfully.",
    });
    
    // Invalidate user query to refresh auth state
    queryClient.invalidateQueries({ queryKey: ["/api/me"] });
    
    // Close modals
    setShowOnboarding(false);
    onClose();
    
    // Reset form
    setFormData({ email: "", name: "", phone: "", password: "", termsAccepted: false });
  };

  if (showOnboarding && newUserId) {
    return (
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={handleOnboardingComplete}
        userId={newUserId}
      />
    );
  }

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center ${zIndex} p-4`}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex">
          {/* Left Side - Content */}
          <div className="w-1/2 bg-gradient-to-br from-blue-50 to-purple-50 p-8">
            <div className="h-full flex flex-col justify-center">
              <div className="mb-6">
                <Sparkles className="w-12 h-12 text-blue-600 mb-4" />
                <h2 className="text-3xl font-bold text-gray-800 mb-4">
                  {mode === "login" ? "Welcome Back!" : "Join Superflow"}
                </h2>
                <p className="text-gray-600 mb-6">
                  {mode === "login" 
                    ? "Continue your voice transcription journey"
                    : "Transform your voice into powerful content"}
                </p>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center text-sm text-gray-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <span>Unlimited 30-second recordings</span>
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <span>Save & access your recording history</span>
                </div>
                <div className="flex items-center text-sm text-gray-700">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                  <span>Generate social media content</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Side - Form */}
          <div className="w-1/2 p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold text-gray-800">
                {mode === "login" ? "Sign In" : "Create Account"}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-xl"
                data-testid="button-close-auth-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={handleInputChange("name")}
                    placeholder="Enter your full name"
                    required
                    className="mt-1"
                    data-testid="input-name"
                  />
                </div>
              )}
              
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange("email")}
                  placeholder="Enter your email address"
                  required
                  className="mt-1"
                  data-testid="input-email"
                />
              </div>

              {mode === "signup" && (
                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleInputChange("phone")}
                    placeholder="Enter your phone number"
                    required
                    className="mt-1"
                    data-testid="input-phone"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={handleInputChange("password")}
                  placeholder={mode === "signup" ? "Must contain letters and numbers" : "Enter your password"}
                  required
                  className="mt-1"
                  data-testid="input-password"
                />
                {mode === "signup" && (
                  <p className="text-xs text-gray-500 mt-1">
                    Password must be 6+ characters with letters and numbers
                  </p>
                )}
              </div>

              {mode === "signup" && (
                <div className="flex items-start space-x-3 pt-2">
                  <input
                    id="terms-consent"
                    type="checkbox"
                    checked={formData.termsAccepted}
                    onChange={(e) => setFormData(prev => ({ ...prev, termsAccepted: e.target.checked }))}
                    className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    data-testid="checkbox-terms-consent"
                    required
                  />
                  <Label htmlFor="terms-consent" className="text-sm text-gray-600 leading-relaxed">
                    I agree to the{" "}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline">
                      Terms of Service
                    </a>
                    {" "}and{" "}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 underline">
                      Privacy Policy
                    </a>
                  </Label>
                </div>
              )}

              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 text-lg"
                disabled={authMutation.isPending}
                data-testid="button-submit-auth"
              >
                {authMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {mode === "login" ? "Signing In..." : "Creating Account..."}
                  </>
                ) : (
                  <>
                    {mode === "login" ? (
                      <><LogIn className="w-4 h-4 mr-2" />Sign In</>
                    ) : (
                      <><UserPlus className="w-4 h-4 mr-2" />Create Account</>
                    )}
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-gray-600 text-sm">
                {mode === "login" ? "Don't have an account?" : "Already have an account?"}
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-blue-600 hover:text-blue-700 ml-1 font-medium"
                  data-testid="button-switch-mode"
                >
                  {mode === "login" ? "Sign Up" : "Sign In"}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}