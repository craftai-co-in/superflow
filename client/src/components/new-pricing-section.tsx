import { useState } from "react";
import { Check, Star, Zap, Clock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trackEvent } from "@/lib/analytics";
import AuthModal from "./auth-modal";
import PremiumModal from "./premium-modal";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";

export default function NewPricingSection() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const { isAuthenticated } = useAuth();

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            <span>Pricing</span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Pay Only When You{" "}
            <span className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Create
            </span>
          </h2>
          
          <p className="text-xl text-gray-600 mb-4">
            <strong>No subscriptions.</strong> No monthly fees. Just pure value.
          </p>
          
          <Badge variant="secondary" className="text-sm px-3 py-1">
            Fair pricing that scales with your success
          </Badge>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <Card className="border-2 border-gray-200 hover:border-blue-300 transition-colors relative bg-white">
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Free</CardTitle>
              <p className="text-gray-600">Perfect for getting started</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-gray-900">$0</span>
                <span className="text-gray-600 ml-2">/forever</span>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Up to 30-second recordings</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Basic transcription & enhancement</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">3 platform templates</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Recording history (last 10)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Copy & export content</span>
                </div>
              </div>
              
              <div className="pt-4">
                {isAuthenticated ? (
                  <Link href="/dashboard">
                    <Button 
                      onClick={() => trackEvent('start_creating_free', 'pricing', 'free_plan_authenticated')}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                      data-testid="button-start-free"
                    >
                      Start Creating Free
                    </Button>
                  </Link>
                ) : (
                  <Button 
                    onClick={() => {
                      trackEvent('get_started_free', 'pricing', 'free_plan');
                      setShowAuthModal(true);
                    }}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                    data-testid="button-get-started-free"
                  >
                    Get Started Free
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-blue-50 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-gradient-to-l from-purple-600 to-blue-600 text-white px-4 py-1 text-sm font-semibold rounded-bl-lg">
              Coming Soon
            </div>
            
            <CardHeader className="text-center pb-4">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Premium</CardTitle>
              <p className="text-gray-600">For serious content creators</p>
              <div className="mt-4">
                <span className="text-4xl font-bold text-purple-600">$1</span>
                <span className="text-gray-600 ml-2">/per idea</span>
              </div>
              <p className="text-sm text-gray-500">Pay-as-you-go pricing</p>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-purple-500 flex-shrink-0" />
                  <span className="text-gray-700">Up to 5-minute recordings</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-purple-500 flex-shrink-0" />
                  <span className="text-gray-700">Advanced AI processing</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-purple-500 flex-shrink-0" />
                  <span className="text-gray-700">Platform-ready content</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-purple-500 flex-shrink-0" />
                  <span className="text-gray-700">Ready-made prompt library</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-purple-500 flex-shrink-0" />
                  <span className="text-gray-700">All platform templates</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-purple-500 flex-shrink-0" />
                  <span className="text-gray-700">Unlimited history</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Check className="w-5 h-5 text-purple-500 flex-shrink-0" />
                  <span className="text-gray-700">Priority support</span>
                </div>
              </div>
              
              <div className="pt-4">
                <Button 
                  onClick={() => {
                    trackEvent('join_waitlist_click', 'pricing', 'premium_plan');
                    setShowPremiumModal(true);
                  }}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white py-3"
                  data-testid="button-join-waitlist"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Join Wait-list
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Value Props */}
        <div className="mt-16 text-center">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">No Waste</h3>
              <p className="text-gray-600 text-sm">Only pay when you create something valuable</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Star className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Start Free</h3>
              <p className="text-gray-600 text-sm">Test everything before committing to premium</p>
            </div>
            
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Crown className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Scale Up</h3>
              <p className="text-gray-600 text-sm">Upgrade seamlessly as your needs grow</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAuthModal && (
        <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      )}
      
      {showPremiumModal && (
        <PremiumModal isOpen={showPremiumModal} onClose={() => setShowPremiumModal(false)} />
      )}
    </section>
  );
}