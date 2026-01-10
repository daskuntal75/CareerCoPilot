import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend
} from "recharts";
import { 
  TrendingUp, Users, FileText, Target, 
  Calendar, Activity, ArrowUpRight, ArrowDownRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

interface AnalyticsData {
  totalEvents: number;
  uniqueSessions: number;
  totalApplications: number;
  coverLettersGenerated: number;
  interviewPrepsGenerated: number;
  conversionRate: number;
  eventsByCategory: { name: string; value: number }[];
  eventsByDay: { date: string; events: number; sessions: number }[];
  applicationFunnel: { stage: string; count: number; percentage: number }[];
  fitScoreDistribution: { range: string; count: number }[];
  topEvents: { name: string; count: number }[];
}

const COLORS = ['hsl(var(--accent))', 'hsl(var(--success))', 'hsl(var(--warning))', 'hsl(var(--destructive))', 'hsl(var(--secondary))'];

const Analytics = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState("7");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, dateRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const days = parseInt(dateRange);
      const startDate = startOfDay(subDays(new Date(), days)).toISOString();
      const endDate = endOfDay(new Date()).toISOString();

      // Fetch analytics events
      const { data: events, error: eventsError } = await supabase
        .from("analytics_events")
        .select("*")
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false });

      if (eventsError) throw eventsError;

      // Fetch applications
      const { data: applications, error: appsError } = await supabase
        .from("applications")
        .select("id, status, fit_score, cover_letter, interview_prep, created_at")
        .gte("created_at", startDate);

      if (appsError) throw appsError;

      // Process analytics data
      const allEvents = events || [];
      const allApps = applications || [];

      // Unique sessions
      const uniqueSessions = new Set(allEvents.map(e => e.session_id).filter(Boolean)).size;

      // Events by category
      const categoryMap = new Map<string, number>();
      allEvents.forEach(e => {
        const count = categoryMap.get(e.event_category) || 0;
        categoryMap.set(e.event_category, count + 1);
      });
      const eventsByCategory = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));

      // Events by day
      const dayMap = new Map<string, { events: number; sessions: Set<string> }>();
      for (let i = days; i >= 0; i--) {
        const date = format(subDays(new Date(), i), "MMM dd");
        dayMap.set(date, { events: 0, sessions: new Set() });
      }
      allEvents.forEach(e => {
        const date = format(new Date(e.created_at), "MMM dd");
        const existing = dayMap.get(date);
        if (existing) {
          existing.events++;
          if (e.session_id) existing.sessions.add(e.session_id);
        }
      });
      const eventsByDay = Array.from(dayMap.entries()).map(([date, { events, sessions }]) => ({
        date,
        events,
        sessions: sessions.size,
      }));

      // Application funnel
      const totalApps = allApps.length;
      const withCoverLetter = allApps.filter(a => a.cover_letter).length;
      const withInterviewPrep = allApps.filter(a => a.interview_prep).length;
      const applied = allApps.filter(a => a.status !== "draft").length;

      const applicationFunnel = [
        { stage: "Applications Started", count: totalApps, percentage: 100 },
        { stage: "Cover Letter Generated", count: withCoverLetter, percentage: totalApps > 0 ? Math.round((withCoverLetter / totalApps) * 100) : 0 },
        { stage: "Interview Prep Generated", count: withInterviewPrep, percentage: totalApps > 0 ? Math.round((withInterviewPrep / totalApps) * 100) : 0 },
        { stage: "Applied", count: applied, percentage: totalApps > 0 ? Math.round((applied / totalApps) * 100) : 0 },
      ];

      // Fit score distribution
      const fitScoreRanges = { "0-25%": 0, "26-50%": 0, "51-75%": 0, "76-100%": 0 };
      allApps.forEach(a => {
        if (a.fit_score !== null) {
          if (a.fit_score <= 25) fitScoreRanges["0-25%"]++;
          else if (a.fit_score <= 50) fitScoreRanges["26-50%"]++;
          else if (a.fit_score <= 75) fitScoreRanges["51-75%"]++;
          else fitScoreRanges["76-100%"]++;
        }
      });
      const fitScoreDistribution = Object.entries(fitScoreRanges).map(([range, count]) => ({ range, count }));

      // Top events
      const eventNameMap = new Map<string, number>();
      allEvents.forEach(e => {
        const count = eventNameMap.get(e.event_name) || 0;
        eventNameMap.set(e.event_name, count + 1);
      });
      const topEvents = Array.from(eventNameMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([name, count]) => ({ name, count }));

      // Calculate conversion rate (applications started -> applied)
      const conversionRate = totalApps > 0 ? Math.round((applied / totalApps) * 100) : 0;

      setData({
        totalEvents: allEvents.length,
        uniqueSessions,
        totalApplications: totalApps,
        coverLettersGenerated: withCoverLetter,
        interviewPrepsGenerated: withInterviewPrep,
        conversionRate,
        eventsByCategory,
        eventsByDay,
        applicationFunnel,
        fitScoreDistribution,
        topEvents,
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

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
              <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
              <p className="text-muted-foreground">Track your job search performance and engagement</p>
            </div>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </motion.div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data ? (
            <>
              {/* Key Metrics */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
              >
                <MetricCard
                  title="Total Events"
                  value={data.totalEvents}
                  icon={Activity}
                  trend={12}
                  color="accent"
                />
                <MetricCard
                  title="Sessions"
                  value={data.uniqueSessions}
                  icon={Users}
                  trend={8}
                  color="success"
                />
                <MetricCard
                  title="Applications"
                  value={data.totalApplications}
                  icon={FileText}
                  trend={-5}
                  color="warning"
                />
                <MetricCard
                  title="Conversion Rate"
                  value={`${data.conversionRate}%`}
                  icon={Target}
                  trend={3}
                  color="accent"
                />
              </motion.div>

              {/* Charts */}
              <Tabs defaultValue="engagement" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                  <TabsTrigger value="engagement">Engagement</TabsTrigger>
                  <TabsTrigger value="funnel">Funnel</TabsTrigger>
                  <TabsTrigger value="events">Events</TabsTrigger>
                </TabsList>

                <TabsContent value="engagement" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Activity Over Time */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="w-5 h-5 text-accent" />
                          Activity Over Time
                        </CardTitle>
                        <CardDescription>Daily events and sessions</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.eventsByDay}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                              <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                              <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'hsl(var(--card))', 
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px'
                                }} 
                              />
                              <Legend />
                              <Area 
                                type="monotone" 
                                dataKey="events" 
                                stackId="1"
                                stroke="hsl(var(--accent))" 
                                fill="hsl(var(--accent) / 0.3)"
                                name="Events"
                              />
                              <Area 
                                type="monotone" 
                                dataKey="sessions" 
                                stackId="2"
                                stroke="hsl(var(--success))" 
                                fill="hsl(var(--success) / 0.3)"
                                name="Sessions"
                              />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Events by Category */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Activity className="w-5 h-5 text-accent" />
                          Events by Category
                        </CardTitle>
                        <CardDescription>Distribution of event types</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={data.eventsByCategory}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={100}
                                fill="#8884d8"
                                paddingAngle={2}
                                dataKey="value"
                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              >
                                {data.eventsByCategory.map((_, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'hsl(var(--card))', 
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px'
                                }} 
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="funnel" className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Application Funnel */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Target className="w-5 h-5 text-accent" />
                          Application Funnel
                        </CardTitle>
                        <CardDescription>Conversion through application stages</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.applicationFunnel} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                              <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                              <YAxis dataKey="stage" type="category" width={150} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'hsl(var(--card))', 
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px'
                                }}
                                formatter={(value, name) => [value, name === 'count' ? 'Count' : 'Percentage']}
                              />
                              <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Fit Score Distribution */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-accent" />
                          Fit Score Distribution
                        </CardTitle>
                        <CardDescription>How well you match job requirements</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-[300px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data.fitScoreDistribution}>
                              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                              <XAxis dataKey="range" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                              <Tooltip 
                                contentStyle={{ 
                                  backgroundColor: 'hsl(var(--card))', 
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px'
                                }} 
                              />
                              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                {data.fitScoreDistribution.map((entry, index) => (
                                  <Cell 
                                    key={`cell-${index}`} 
                                    fill={
                                      entry.range === "76-100%" ? "hsl(var(--success))" :
                                      entry.range === "51-75%" ? "hsl(var(--success) / 0.7)" :
                                      entry.range === "26-50%" ? "hsl(var(--warning))" :
                                      "hsl(var(--destructive))"
                                    } 
                                  />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Funnel Stats */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Funnel Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {data.applicationFunnel.map((stage, index) => (
                          <div key={stage.stage} className="text-center p-4 rounded-lg bg-secondary/50">
                            <div className="text-2xl font-bold text-foreground">{stage.count}</div>
                            <div className="text-sm text-muted-foreground">{stage.stage}</div>
                            <div className="text-xs text-accent mt-1">{stage.percentage}% of total</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="events" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-accent" />
                        Top Events
                      </CardTitle>
                      <CardDescription>Most frequent user actions</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {data.topEvents.length > 0 ? (
                          data.topEvents.map((event, index) => (
                            <div 
                              key={event.name} 
                              className="flex items-center justify-between p-3 rounded-lg bg-secondary/50"
                            >
                              <div className="flex items-center gap-3">
                                <span className="w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-medium flex items-center justify-center">
                                  {index + 1}
                                </span>
                                <span className="font-medium text-foreground">
                                  {event.name.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
                                </span>
                              </div>
                              <span className="text-muted-foreground">{event.count} times</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-center text-muted-foreground py-8">
                            No events recorded yet. Start using the app to see analytics!
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No analytics data available</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: number;
  color?: "accent" | "success" | "warning" | "destructive";
}

const MetricCard = ({ title, value, icon: Icon, trend, color = "accent" }: MetricCardProps) => {
  const isPositive = trend && trend > 0;
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;
  
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={`w-10 h-10 rounded-lg bg-${color}/10 flex items-center justify-center`}>
            <Icon className={`w-5 h-5 text-${color}`} />
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-1 text-xs ${isPositive ? "text-success" : "text-destructive"}`}>
              <TrendIcon className="w-3 h-3" />
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold text-foreground">{value}</div>
          <div className="text-sm text-muted-foreground">{title}</div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Analytics;
