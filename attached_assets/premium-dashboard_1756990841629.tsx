import { useState } from "react";
import { Crown, Mic, History, BarChart3, Settings, FileAudio, Users, Zap } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import PremiumRecordingInterface from "@/components/premium-recording-interface";
import PremiumRecordingHistory from "@/components/premium-recording-history";
import PremiumAnalytics from "@/components/premium-analytics";
import SubscriptionManagement from "@/components/subscription-management";
import SEO from "@/components/seo";

export default function PremiumDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("record");

  // Fetch premium plan status
  const { data: planStatus } = useQuery({
    queryKey: ['/api/premium/plan-status'],
    enabled: isAuthenticated,
  });

  // Fetch premium statistics
  const { data: premiumStats } = useQuery({
    queryKey: ['/api/premium/stats'],
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <Card className="max-w-md w-full text-center p-8">
          <CardContent>
            <Crown className="w-16 h-16 mx-auto mb-4 text-purple-600" />
            <h2 className="text-2xl font-bold mb-2">Premium Access Required</h2>
            <p className="text-gray-600 mb-6">
              You need to be logged in with a premium plan to access this application.
            </p>
            <Button
              onClick={() => window.location.href = "https://superflow.work/"}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Go to Main App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getPlanBadgeColor = (planType: string) => {
    switch (planType) {
      case 'lite': return 'bg-green-100 text-green-800';
      case 'pro': return 'bg-blue-100 text-blue-800';
      case 'max': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      <SEO
        title="Premium Dashboard - Superflow"
        description="Access unlimited recording, file uploads, and premium transcription features."
        canonical="https://app.superflow.work/dashboard"
      />
      
      {/* Premium Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Superflow Premium
              </h1>
              <Badge className={`${getPlanBadgeColor(planStatus?.planType)} flex items-center space-x-1`}>
                <Crown className="w-3 h-3" />
                <span>{planStatus?.planType?.toUpperCase() || 'PREMIUM'}</span>
              </Badge>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="hidden sm:block text-right">
                <p className="text-sm text-gray-600">Welcome back,</p>
                <p className="font-medium">{user?.name || user?.email}</p>
              </div>
              <Button
                onClick={() => window.location.href = '/api/auth/logout'}
                variant="ghost"
                size="sm"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Features Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Mic className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Recordings</p>
                  <p className="text-xl font-bold">{premiumStats?.totalRecordings || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileAudio className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Files Processed</p>
                  <p className="text-xl font-bold">{premiumStats?.premiumFeatures?.file_upload?.usageCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Speaker Detection</p>
                  <p className="text-xl font-bold">{premiumStats?.premiumFeatures?.speaker_detection?.usageCount || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Zap className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Duration</p>
                  <p className="text-xl font-bold">{Math.floor((premiumStats?.totalDuration || 0) / 60)}m</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Premium Plan Status */}
        {planStatus && (
          <Card className="mb-8 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Crown className="w-8 h-8 text-purple-600" />
                  <div>
                    <h3 className="text-lg font-semibold text-purple-800">
                      {planStatus.planType?.toUpperCase()} Plan Active
                    </h3>
                    <p className="text-purple-600">
                      {planStatus.isUnlimited ? 'Unlimited usage' : 'Premium features enabled'}
                      {planStatus.planExpiresAt && ` • Expires ${new Date(planStatus.planExpiresAt).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex flex-wrap gap-2">
                    {planStatus.features.unlimitedRecording && (
                      <Badge variant="secondary" className="text-xs">Unlimited Recording</Badge>
                    )}
                    {planStatus.features.fileUpload && (
                      <Badge variant="secondary" className="text-xs">File Upload</Badge>
                    )}
                    {planStatus.features.speakerDetection && (
                      <Badge variant="secondary" className="text-xs">Speaker Detection</Badge>
                    )}
                    {planStatus.features.priorityProcessing && (
                      <Badge variant="secondary" className="text-xs">Priority Queue</Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Premium Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="record" className="flex items-center space-x-2">
              <Mic className="w-4 h-4" />
              <span className="hidden sm:inline">Record</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center space-x-2">
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="subscription" className="flex items-center space-x-2">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Account</span>
            </TabsTrigger>
          </TabsList>

          {/* Recording Tab with Premium Interface */}
          <TabsContent value="record" className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Premium Recording Studio
              </h2>
              <p className="text-gray-600">
                Unlimited recording time with advanced AI processing
              </p>
            </div>
            <PremiumRecordingInterface />
          </TabsContent>

          {/* History Tab with Enhanced Metadata */}
          <TabsContent value="history" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">Recording History</h2>
              <Badge variant="outline" className="flex items-center space-x-1">
                <Crown className="w-3 h-3" />
                <span>Premium Features</span>
              </Badge>
            </div>
            <PremiumRecordingHistory />
          </TabsContent>

          {/* Analytics Tab with Premium Insights */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">Premium Analytics</h2>
              <Badge variant="outline" className="flex items-center space-x-1">
                <BarChart3 className="w-3 h-3" />
                <span>Advanced Insights</span>
              </Badge>
            </div>
            <PremiumAnalytics />
          </TabsContent>

          {/* Subscription Management Tab */}
          <TabsContent value="subscription" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-800">Account & Subscription</h2>
              <Badge variant="outline" className="flex items-center space-x-1">
                <Settings className="w-3 h-3" />
                <span>Manage Plan</span>
              </Badge>
            </div>
            <SubscriptionManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}