import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { 
  Users, 
  FileText, 
  TrendingUp, 
  Shield,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  Briefcase
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import UserManagement from "@/components/admin/UserManagement";

interface UserSummary {
  total_users: number;
  users_with_applications: number;
  users_this_month: number;
  total_applications: number;
}

interface UsageStats {
  date: string;
  active_users: number;
  cover_letters_generated: number;
  interview_preps_generated: number;
}

interface ApplicationStats {
  date: string;
  applications_created: number;
  applications_submitted: number;
  interviews_scheduled: number;
  offers_received: number;
}

const Admin = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [userSummary, setUserSummary] = useState<UserSummary | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats[]>([]);
  const [applicationStats, setApplicationStats] = useState<ApplicationStats[]>([]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      checkAdminAccess();
    }
  }, [user]);

  const checkAdminAccess = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("user_id", user?.id)
        .single();

      if (error) throw error;

      if (data?.is_admin) {
        setIsAdmin(true);
        fetchAllData();
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error checking admin access:", error);
      setLoading(false);
    }
  };

  const fetchAllData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchUserSummary(),
        fetchUsageStats(),
        fetchApplicationStats(),
      ]);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      toast.error("Failed to load admin data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchUserSummary = async () => {
    const { data, error } = await supabase.rpc("get_admin_user_summary");
    if (error) throw error;
    if (data && data.length > 0) {
      setUserSummary(data[0]);
    }
  };

  const fetchUsageStats = async () => {
    const { data, error } = await supabase.rpc("get_admin_usage_stats", { days_back: 30 });
    if (error) throw error;
    setUsageStats(data || []);
  };

  const fetchApplicationStats = async () => {
    const { data, error } = await supabase.rpc("get_admin_application_stats", { days_back: 30 });
    if (error) throw error;
    setApplicationStats(data || []);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 pt-24 pb-12 flex items-center justify-center">
          <div className="text-center">
            <Shield className="w-16 h-16 text-destructive mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
            <p className="text-muted-foreground mb-4">
              You don't have permission to access the admin dashboard.
            </p>
            <Button onClick={() => navigate("/dashboard")}>
              Return to Dashboard
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const chartData = usageStats.map(stat => ({
    ...stat,
    date: formatDate(stat.date),
  })).reverse();

  const appChartData = applicationStats.map(stat => ({
    ...stat,
    date: formatDate(stat.date),
  })).reverse();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
          >
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Shield className="w-8 h-8 text-accent" />
                Admin Dashboard
              </h1>
              <p className="text-muted-foreground">Monitor users, usage, and application metrics</p>
            </div>
            <Button 
              variant="outline" 
              onClick={fetchAllData}
              disabled={refreshing}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
              Refresh Data
            </Button>
          </motion.div>

          {/* Summary Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-accent/10">
                    <Users className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {userSummary?.total_users || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Users</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-500/10">
                    <TrendingUp className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {userSummary?.users_this_month || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">New This Month</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-purple-500/10">
                    <Briefcase className="w-6 h-6 text-purple-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {userSummary?.total_applications || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Applications</div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-green-500/10">
                    <FileText className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-foreground">
                      {userSummary?.users_with_applications || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Active Users</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Charts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Tabs defaultValue="users" className="space-y-6">
              <TabsList>
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Users
                </TabsTrigger>
                <TabsTrigger value="usage" className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Feature Usage
                </TabsTrigger>
                <TabsTrigger value="applications" className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Applications
                </TabsTrigger>
              </TabsList>

              <TabsContent value="users">
                <UserManagement refreshTrigger={refreshTrigger} />
              </TabsContent>

              <TabsContent value="usage">
                <Card>
                  <CardHeader>
                    <CardTitle>Feature Usage (Last 30 Days)</CardTitle>
                    <CardDescription>
                      Daily cover letter and interview prep generations
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {chartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis 
                            dataKey="date" 
                            className="text-muted-foreground"
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis className="text-muted-foreground" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                          <Legend />
                          <Bar 
                            dataKey="cover_letters_generated" 
                            name="Cover Letters"
                            fill="hsl(var(--accent))" 
                            radius={[4, 4, 0, 0]}
                          />
                          <Bar 
                            dataKey="interview_preps_generated" 
                            name="Interview Preps"
                            fill="hsl(var(--primary))" 
                            radius={[4, 4, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        No usage data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="applications">
                <Card>
                  <CardHeader>
                    <CardTitle>Application Activity (Last 30 Days)</CardTitle>
                    <CardDescription>
                      Daily application creation and status changes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {appChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={appChartData}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                          <XAxis 
                            dataKey="date" 
                            className="text-muted-foreground"
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis className="text-muted-foreground" />
                          <Tooltip 
                            contentStyle={{ 
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "8px",
                            }}
                          />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="applications_created" 
                            name="Created"
                            stroke="hsl(var(--accent))" 
                            strokeWidth={2}
                            dot={{ fill: "hsl(var(--accent))" }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="applications_submitted" 
                            name="Submitted"
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            dot={{ fill: "#3b82f6" }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="offers_received" 
                            name="Offers"
                            stroke="#22c55e" 
                            strokeWidth={2}
                            dot={{ fill: "#22c55e" }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                        <AlertTriangle className="w-5 h-5 mr-2" />
                        No application data available
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Admin;
