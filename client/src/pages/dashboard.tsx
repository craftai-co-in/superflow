import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Mic, History, Star, Zap, Calendar, Clock, FileText, Download, Crown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import RecordingInterface from "@/components/recording-interface";
import PremiumModal from "@/components/premium-modal";
import Header from "@/components/header";
import SEO from "@/components/seo";
import type { Recording } from "@shared/schema";

interface UserStats {
  totalRecordings: number;
  totalDuration: number;
}

interface UserPlan {
  planType: string;
  minutesRemaining: number;
  isPremium: boolean;
  planExpiresAt?: string;
}

export default function Dashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("record");
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const { toast } = useToast();

  // Handle data download for compliance (Privacy Policy requirement)
  const handleDataDownload = async () => {
    try {
      const response = await fetch('/api/user/export', {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }
      
      const data = await response.blob();
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `superflow-transcripts-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Data exported successfully",
        description: "Your transcripts have been downloaded.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Could not download your data. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Fetch user recording history
  const { data: recordingsData = [], isLoading: recordingsLoading } = useQuery<Recording[]>({
    queryKey: ["/api/user/recordings"],
    enabled: !!user,
    retry: false,
  });
  
  // Ensure recordings is always an array
  const recordings = Array.isArray(recordingsData) ? recordingsData : [];

  // Fetch user stats
  const { data: stats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ["/api/user/stats"],
    enabled: !!user,
  });

  // Fetch user plan status
  const { data: planStatus, isLoading: planLoading } = useQuery<UserPlan>({
    queryKey: ["/api/user/plan-status"],
    enabled: !!user,
  });

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <SEO
          title="Dashboard - Superflow"
          description="Manage your voice recordings and transcriptions in your personal Superflow dashboard."
          canonical="https://superflow.work/dashboard"
        />
        <div className="animate-pulse text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0s";
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "Unknown";
    const d = new Date(date);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <SEO
        title="Dashboard - Superflow"
        description="Manage your voice recordings, view transcription history, and access your personal Superflow workspace."
        canonical="https://superflow.work/dashboard"
      />
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user.name || user.email}!</h1>
          <p className="text-gray-600 mt-2">Transform your voice into powerful content with AI</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Recordings</CardTitle>
              <Mic className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-recordings">
                {statsLoading ? "..." : (stats?.totalRecordings || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Voice recordings processed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Duration</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-total-duration">
                {statsLoading ? "..." : formatDuration(stats?.totalDuration || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Audio processed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Plan</CardTitle>
              {planStatus?.isPremium ? <Crown className="h-4 w-4 text-yellow-500" /> : <Star className="h-4 w-4 text-muted-foreground" />}
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className={`text-2xl font-bold ${
                    planStatus?.isPremium ? 'text-yellow-600' : 'text-gray-600'
                  }`}>
                    {planLoading ? "..." : planStatus?.planType?.toUpperCase() || "FREE"}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {planStatus?.isPremium 
                      ? `${planStatus.minutesRemaining} minutes left`
                      : `${planStatus?.minutesRemaining || 30} minutes remaining`
                    }
                  </p>
                </div>
                {!planStatus?.isPremium && (
                  <Button
                    onClick={() => setShowPremiumModal(true)}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700"
                    data-testid="button-upgrade-plan"
                  >
                    <ArrowUp className="w-3 h-3 mr-1" />
                    Upgrade
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="record" data-testid="tab-record">
              <Mic className="w-4 h-4 mr-2" />
              Record
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">
              <History className="w-4 h-4 mr-2" />
              History
            </TabsTrigger>
            <TabsTrigger value="features" data-testid="tab-features">
              <Zap className="w-4 h-4 mr-2" />
              Features
            </TabsTrigger>
          </TabsList>

          {/* Recording Tab */}
          <TabsContent value="record" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Voice Recording Studio</CardTitle>
                <CardDescription>
                  Record your voice and transform it into enhanced content plus social media posts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <RecordingInterface />
              </CardContent>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Recording History</CardTitle>
                    <CardDescription>
                      View and manage your previous recordings
                    </CardDescription>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleDataDownload}
                    className="flex items-center space-x-2"
                    data-testid="button-download-transcripts"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Data</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recordingsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-pulse text-gray-500">Loading history...</div>
                  </div>
                ) : recordings.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No recordings yet</p>
                    <p className="text-sm text-gray-400">Start recording to see your history here</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recordings.map((recording) => (
                      <div
                        key={recording.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        data-testid={`recording-item-${recording.id}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary">
                              {formatDate(recording.createdAt)}
                            </Badge>
                            {recording.duration && (
                              <Badge variant="outline">
                                {formatDuration(recording.duration)}
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div>
                            <h4 className="font-medium text-sm text-gray-700 mb-1">Original Transcript:</h4>
                            <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                              {recording.transcript}
                            </p>
                          </div>
                          
                          <div>
                            <h4 className="font-medium text-sm text-gray-700 mb-1">Enhanced Content:</h4>
                            <p className="text-sm text-gray-800 bg-blue-50 p-2 rounded border border-blue-200">
                              {recording.processedContent}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>


          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Current Features */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Zap className="w-5 h-5 text-green-600 mr-2" />
                    Available Now
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium">Voice Transcription</h4>
                      <p className="text-sm text-gray-600">Convert speech to text with AI</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium">Content Enhancement</h4>
                      <p className="text-sm text-gray-600">Polish your thoughts with GPT</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium">Social Media Generation</h4>
                      <p className="text-sm text-gray-600">Platform-optimized posts for Instagram, Facebook, YouTube</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium">Recording History</h4>
                      <p className="text-sm text-gray-600">Save and access all your recordings</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Coming Soon Features */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                    Coming Soon
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium">Team Collaboration</h4>
                      <p className="text-sm text-gray-600">Share and collaborate on content</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium">Custom Templates</h4>
                      <p className="text-sm text-gray-600">Create reusable content templates</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium">Analytics Dashboard</h4>
                      <p className="text-sm text-gray-600">Detailed usage and performance metrics</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium">API Access</h4>
                      <p className="text-sm text-gray-600">Integrate with your own applications</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <h4 className="font-medium">Multi-language Support</h4>
                      <p className="text-sm text-gray-600">Process content in multiple languages</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <PremiumModal 
        isOpen={showPremiumModal}
        onClose={() => setShowPremiumModal(false)}
      />
    </div>
  );
}