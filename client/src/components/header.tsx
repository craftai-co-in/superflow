import { useState } from "react";
import { Mic, User, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import AuthModal from "./auth-modal";

export default function Header() {
  const { isAuthenticated, user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth/logout', {});
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Logout failed');
      }
      
      return data;
    },
    onSuccess: () => {
      // Invalidate user query to clear auth state
      queryClient.invalidateQueries({ queryKey: ["/api/me"] });
      
      // Redirect to landing page
      setLocation("/");
      
      toast({
        title: "Signed out successfully",
        description: "You have been logged out.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Sign out failed",
        description: error.message || "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleSignOut = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-2">
            <Link href="/">
              <div className="flex items-center cursor-pointer hover:opacity-80 transition-opacity">
                <span className="text-2xl font-bold text-blue-600">Superflow</span>
              </div>
            </Link>
          </div>
          <nav className="hidden md:flex items-center space-x-8">
            <a href="/#features" className="text-gray-600 hover:text-gray-800 transition-colors">Features</a>
            <a href="/#how-it-works" className="text-gray-600 hover:text-gray-800 transition-colors">How It Works</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-800 transition-colors">Pricing</a>
            
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                <Link href="/dashboard" className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors" data-testid="link-dashboard-header">
                  <User className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  disabled={logoutMutation.isPending}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors"
                  data-testid="button-sign-out"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{logoutMutation.isPending ? "Signing out..." : "Sign Out"}</span>
                </button>
              </div>
            ) : (
              <button 
                onClick={() => setShowAuthModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                data-testid="button-sign-in"
              >
                Sign In
              </button>
            )}
          </nav>
        </div>
      </div>
      
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        initialMode="login"
      />
    </header>
  );
}
