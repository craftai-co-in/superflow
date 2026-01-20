
import { useAuth } from "@/hooks/useAuth";
import Header from "@/components/header";
import NewPricingSection from "@/components/new-pricing-section";
import NewFooter from "@/components/new-footer";
import SEO from "@/components/seo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Crown, Clock, AlertCircle } from "lucide-react";

export default function Premium() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen">
      <SEO
        title="Premium Plans - Superflow"
        description="Upgrade to Superflow Premium for unlimited recording minutes, advanced features, and priority support. Choose from Lite, Pro, or Max plans."
        canonical="https://superflow.work/premium"
      />
      <Header />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <Crown className="w-16 h-16 mx-auto mb-6 text-yellow-300" />
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Upgrade to Premium
          </h1>
          <p className="text-xl text-blue-100 mb-8">
            Unlock unlimited recording minutes and advanced AI features
          </p>
          
          {user && (
            <Card className="bg-white/10 border-white/20 text-white max-w-md mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center text-white">
                  <AlertCircle className="w-5 h-5 mr-2 text-yellow-300" />
                  Current Plan Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-lg font-semibold text-yellow-200">
                    {user.planType?.toUpperCase() || "FREE"} Plan
                  </p>
                  <div className="flex items-center justify-center mt-2 text-blue-100">
                    <Clock className="w-4 h-4 mr-2" />
                    <span>{user.minutesRemaining || 30} minutes remaining</span>
                  </div>
                  {user.planExpiresAt && (
                    <p className="text-sm text-blue-200 mt-2">
                      Expires: {new Date(user.planExpiresAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-16">
        <NewPricingSection />
      </section>

      {/* Features Comparison */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Upgrade?</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="w-5 h-5 mr-2 text-blue-600" />
                  More Recording Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  From 30 minutes to unlimited monthly recordings. Never worry about running out of time again.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Crown className="w-5 h-5 mr-2 text-yellow-600" />
                  Advanced AI Features
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Enhanced content generation, multiple output formats, and priority processing for faster results.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2 text-green-600" />
                  Priority Support
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Get faster response times and dedicated support for all your content creation needs.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <NewFooter />
    </div>
  );
}
