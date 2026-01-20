
import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Mic, 
  TrendingUp, 
  Calendar, 
  Clock,
  Activity,
  UserCheck,
  Globe,
  Download,
  LogOut,
  Shield
} from "lucide-react";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useToast } from "@/hooks/use-toast";

interface AnalyticsStats {
  totalRecordings: number;
  totalUsers: number;
  totalFreeRecordings: number;
  totalAuthenticatedRecordings: number;
  todayRecordings: number;
  thisWeekRecordings: number;
  thisMonthRecordings: number;
}

interface Analytics {
  id: number;
  userId: number | null;
  userType: string;
  recordingDuration: number | null;
  processingSuccess: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: string;
}

interface UserWithStats {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  profession: string | null;
  termsAccepted: string | null;
  createdAt: string;
  recordingCount: number;
  lastActivity: string | null;
}

export default function AdminDashboard() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [, setLocation] = useLocation();
  const { isAdmin, logout } = useAdminAuth();
  const { toast } = useToast();

  // Redirect if not admin
  useEffect(() => {
    if (!isAdmin) {
      setLocation("/admin/login");
    }
  }, [isAdmin, setLocation]);

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "Successfully logged out of admin dashboard",
      });
      setLocation("/admin/login");
    } catch (error) {
      toast({
        title: "Logout failed",
        description: "Failed to logout. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Fetch analytics stats
  const { data: stats, isLoading: statsLoading } = useQuery<AnalyticsStats>({
    queryKey: ["/api/admin/analytics/stats"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch recent analytics
  const { data: recentAnalytics, isLoading: analyticsLoading } = useQuery<{analytics: Analytics[]}>({
    queryKey: ["/api/admin/analytics/recent"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch users with stats
  const { data: usersData, isLoading: usersLoading } = useQuery<{users: UserWithStats[]}>({
    queryKey: ["/api/admin/analytics/users"],
    refetchInterval: 30000,
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleString();
  };

  const formatDateShort = (dateString: string | null) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString();
  };

  const exportData = async (type: 'analytics' | 'users') => {
    try {
      const endpoint = type === 'analytics' ? '/api/admin/analytics/recent?limit=1000' : '/api/admin/analytics/users';
      // Direct fetch since we're in admin context
      const response = await fetch(endpoint, { credentials: 'include' });
      const data = await response.json();
      
      const jsonData = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `superflow-${type}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <Shield className="w-8 h-8 text-blue-600" />
              SuperFlow Admin Dashboard
            </h1>
            <p className="text-gray-600">Real-time analytics and user management</p>
          </div>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="flex items-center gap-2"
            data-testid="button-admin-logout"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="recordings">Recordings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {statsLoading ? (
              <div className="text-center py-8">Loading stats...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Recordings</CardTitle>
                    <Mic className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalRecordings || 0}</div>
                    <p className="text-xs text-muted-foreground">All time recordings</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                    <p className="text-xs text-muted-foreground">Registered users</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Today</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.todayRecordings || 0}</div>
                    <p className="text-xs text-muted-foreground">Recordings today</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">This Week</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stats?.thisWeekRecordings || 0}</div>
                    <p className="text-xs text-muted-foreground">Recordings this week</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* User Type Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Type Breakdown</CardTitle>
                  <CardDescription>Recording distribution by user type</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <Globe className="w-4 h-4 text-blue-500" />
                      <span>Free Users</span>
                    </div>
                    <Badge variant="outline">{stats?.totalFreeRecordings || 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <UserCheck className="w-4 h-4 text-green-500" />
                      <span>Authenticated Users</span>
                    </div>
                    <Badge variant="outline">{stats?.totalAuthenticatedRecordings || 0}</Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Activity Timeline</CardTitle>
                  <CardDescription>Usage over time periods</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Today</span>
                    <Badge>{stats?.todayRecordings || 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>This Week</span>
                    <Badge>{stats?.thisWeekRecordings || 0}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>This Month</span>
                    <Badge>{stats?.thisMonthRecordings || 0}</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Recent Activity</h2>
              <Button onClick={() => exportData('analytics')} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Analytics
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                {analyticsLoading ? (
                  <div className="text-center py-8">Loading analytics...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User Type</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User ID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {recentAnalytics?.analytics.map((entry) => (
                          <tr key={entry.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {formatDate(entry.createdAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant={entry.userType === 'free' ? 'secondary' : 'default'}>
                                {entry.userType}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant={entry.processingSuccess === 'success' ? 'default' : 'destructive'}>
                                {entry.processingSuccess}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              {entry.userId || 'Anonymous'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {entry.ipAddress?.substring(0, 10) || 'Unknown'}...
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">User Management</h2>
              <Button onClick={() => exportData('users')} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Users
              </Button>
            </div>

            <Card>
              <CardContent className="p-0">
                {usersLoading ? (
                  <div className="text-center py-8">Loading users...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Profession</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recordings</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Activity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {usersData?.users.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{user.name || 'Unnamed'}</div>
                              <div className="text-xs text-gray-500">ID: {user.id}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {user.email}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {user.profession || 'Not specified'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge>{user.recordingCount}</Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDateShort(user.createdAt)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDateShort(user.lastActivity)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recordings Tab */}
          <TabsContent value="recordings" className="space-y-6">
            <div className="text-center py-16">
              <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Recording Details Coming Soon</h3>
              <p className="text-gray-500">Individual recording analysis and content review will be available here.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
