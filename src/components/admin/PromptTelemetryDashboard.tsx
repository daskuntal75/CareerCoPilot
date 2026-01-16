import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from "recharts";
import {
  FileText,
  MessageSquare,
  TrendingUp,
  RefreshCw,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Activity,
  Filter,
  Bell,
} from "lucide-react";
import PromptSatisfactionAlerts from "./PromptSatisfactionAlerts";

interface TelemetryRecord {
  id: string;
  document_type: string;
  action_type: string;
  section: string | null;
  user_feedback: string | null;
  selected_tips: string[] | null;
  injected_prompt: string | null;
  prompt_metadata: unknown;
  response_quality_rating: number | null;
  prompt_version_id: string | null;
  created_at: string;
}

interface TelemetrySummary {
  totalPrompts: number;
  coverLetterPrompts: number;
  interviewPrepPrompts: number;
  regenerations: number;
  quickImprovements: number;
  avgQualityRating: number | null;
  topTips: { tip: string; count: number }[];
  actionBreakdown: { action: string; count: number }[];
  dailyTrends: { date: string; cover_letter: number; interview_prep: number }[];
}

const COLORS = ["hsl(var(--accent))", "hsl(var(--primary))", "#3b82f6", "#22c55e", "#f59e0b", "#ef4444"];

const TIP_LABELS: Record<string, string> = {
  more_specific: "More Specific",
  shorter: "Shorter",
  longer: "Longer",
  formal: "More Formal",
  conversational: "Conversational",
  quantify: "Add Metrics",
  passion: "More Enthusiasm",
  unique: "Unique Factors",
};

const PromptTelemetryDashboard = () => {
  const [telemetryData, setTelemetryData] = useState<TelemetryRecord[]>([]);
  const [summary, setSummary] = useState<TelemetrySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");
  const [isCheckingManually, setIsCheckingManually] = useState(false);
  const [manualCheckResult, setManualCheckResult] = useState<any>(null);

  useEffect(() => {
    fetchTelemetry();
  }, [timeRange]);

  const fetchTelemetry = async () => {
    setRefreshing(true);
    try {
      const daysBack = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const { data, error } = await (supabase as any)
        .from("prompt_telemetry")
        .select("*")
        .gte("created_at", startDate.toISOString())
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTelemetryData((data || []) as TelemetryRecord[]);
      calculateSummary((data || []) as TelemetryRecord[]);
    } catch (error) {
      console.error("Error fetching telemetry:", error);
      toast.error("Failed to fetch telemetry data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateSummary = (data: TelemetryRecord[]) => {
    const coverLetterPrompts = data.filter((d) => d.document_type === "cover_letter").length;
    const interviewPrepPrompts = data.filter((d) => d.document_type === "interview_prep").length;
    const regenerations = data.filter((d) => d.action_type === "regenerate").length;
    const quickImprovements = data.filter((d) => d.action_type === "quick_improvement").length;

    // Calculate average quality rating
    const ratings = data
      .map((d) => d.response_quality_rating)
      .filter((r): r is number => r !== null);
    const avgQualityRating = ratings.length > 0
      ? ratings.reduce((a, b) => a + b, 0) / ratings.length
      : null;

    // Count tips usage
    const tipCounts: Record<string, number> = {};
    data.forEach((d) => {
      d.selected_tips?.forEach((tip) => {
        tipCounts[tip] = (tipCounts[tip] || 0) + 1;
      });
    });
    const topTips = Object.entries(tipCounts)
      .map(([tip, count]) => ({ tip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Action breakdown
    const actionCounts: Record<string, number> = {};
    data.forEach((d) => {
      actionCounts[d.action_type] = (actionCounts[d.action_type] || 0) + 1;
    });
    const actionBreakdown = Object.entries(actionCounts)
      .map(([action, count]) => ({ action, count }));

    // Daily trends
    const dailyData: Record<string, { cover_letter: number; interview_prep: number }> = {};
    data.forEach((d) => {
      const date = new Date(d.created_at).toISOString().split("T")[0];
      if (!dailyData[date]) {
        dailyData[date] = { cover_letter: 0, interview_prep: 0 };
      }
      if (d.document_type === "cover_letter") {
        dailyData[date].cover_letter++;
      } else {
        dailyData[date].interview_prep++;
      }
    });
    const dailyTrends = Object.entries(dailyData)
      .map(([date, counts]) => ({ date, ...counts }))
      .sort((a, b) => a.date.localeCompare(b.date));

    setSummary({
      totalPrompts: data.length,
      coverLetterPrompts,
      interviewPrepPrompts,
      regenerations,
      quickImprovements,
      avgQualityRating,
      topTips,
      actionBreakdown,
      dailyTrends,
    });
  };

  const handleManualCheck = async () => {
    setIsCheckingManually(true);
    setManualCheckResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("check-prompt-satisfaction", {
        body: { skipEmail: true },
      });

      if (error) throw error;

      setManualCheckResult(data);
      
      if (data?.alertedVersions > 0) {
        toast.warning(`Found ${data.alertedVersions} prompt(s) below satisfaction threshold`);
      } else {
        toast.success("All prompt versions are performing well!");
      }
    } catch (error) {
      console.error("Error running manual check:", error);
      toast.error("Failed to run satisfaction check");
    } finally {
      setIsCheckingManually(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const formatChartDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Activity className="w-6 h-6 text-accent" />
            Prompt Telemetry Analytics
          </h2>
          <p className="text-muted-foreground">
            Monitor AI prompt injections, user feedback, and improvement trends
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={(v: "7d" | "30d" | "90d") => setTimeRange(v)}>
            <SelectTrigger className="w-32">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchTelemetry} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <MessageSquare className="w-5 h-5 text-accent" />
              </div>
              <div>
                <div className="text-2xl font-bold">{summary?.totalPrompts || 0}</div>
                <div className="text-xs text-muted-foreground">Total Prompts</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{summary?.coverLetterPrompts || 0}</div>
                <div className="text-xs text-muted-foreground">Cover Letters</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <MessageSquare className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{summary?.interviewPrepPrompts || 0}</div>
                <div className="text-xs text-muted-foreground">Interview Preps</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{summary?.regenerations || 0}</div>
                <div className="text-xs text-muted-foreground">Regenerations</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
              </div>
              <div>
                <div className="text-2xl font-bold">{summary?.quickImprovements || 0}</div>
                <div className="text-xs text-muted-foreground">Quick Improvements</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="alerts" className="space-y-4">
        <TabsList>
          <TabsTrigger value="alerts" className="flex items-center gap-1">
            <Bell className="w-4 h-4" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="trends">Daily Trends</TabsTrigger>
          <TabsTrigger value="tips">Popular Tips</TabsTrigger>
          <TabsTrigger value="actions">Action Breakdown</TabsTrigger>
          <TabsTrigger value="recent">Recent Activity</TabsTrigger>
        </TabsList>

        {/* Satisfaction Alerts */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Prompt Satisfaction Monitoring</CardTitle>
              <CardDescription>
                Monitor and manage AI prompt quality alerts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PromptSatisfactionAlerts 
                onManualCheck={handleManualCheck}
                isCheckingManually={isCheckingManually}
              />
              
              {manualCheckResult && (
                <div className="mt-6 p-4 rounded-lg bg-muted">
                  <h4 className="font-medium mb-2">Last Manual Check Results</h4>
                  <div className="text-sm space-y-1 text-muted-foreground">
                    <p>Checked: {manualCheckResult.checked || manualCheckResult.versions?.length || 0} prompt versions</p>
                    <p>Issues found: {manualCheckResult.alertedVersions || 0}</p>
                    <p>New alerts created: {manualCheckResult.newAlertsCreated || 0}</p>
                  </div>
                  {manualCheckResult.versions && (
                    <div className="mt-3 space-y-1">
                      {manualCheckResult.versions.map((v: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Badge 
                            variant={v.status === "ok" ? "outline" : v.status === "below_threshold" ? "destructive" : "secondary"}
                            className="text-xs"
                          >
                            {v.status === "ok" ? "✓" : v.status === "below_threshold" ? "⚠" : "?"}
                          </Badge>
                          <span className="font-mono text-xs">{v.setting_key}</span>
                          <span className="text-muted-foreground">
                            {v.avg_rating !== null ? `${v.avg_rating.toFixed(2)}/5` : "No ratings"} ({v.total_ratings} ratings)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Daily Trends */}
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Prompt Generation Trends</CardTitle>
              <CardDescription>Daily cover letter and interview prep generations</CardDescription>
            </CardHeader>
            <CardContent>
              {summary?.dailyTrends && summary.dailyTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={summary.dailyTrends}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatChartDate}
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
                      labelFormatter={formatChartDate}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="cover_letter"
                      name="Cover Letters"
                      stroke="hsl(var(--accent))"
                      strokeWidth={2}
                      dot={{ fill: "hsl(var(--accent))" }}
                    />
                    <Line
                      type="monotone"
                      dataKey="interview_prep"
                      name="Interview Preps"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      dot={{ fill: "#8b5cf6" }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  No trend data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Popular Tips */}
        <TabsContent value="tips">
          <Card>
            <CardHeader>
              <CardTitle>Most Requested Improvements</CardTitle>
              <CardDescription>User-selected quick improvement tips</CardDescription>
            </CardHeader>
            <CardContent>
              {summary?.topTips && summary.topTips.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={summary.topTips} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" className="text-muted-foreground" />
                    <YAxis
                      type="category"
                      dataKey="tip"
                      width={120}
                      tickFormatter={(v) => TIP_LABELS[v] || v}
                      className="text-muted-foreground"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value, name, props) => [value, TIP_LABELS[props.payload.tip] || props.payload.tip]}
                    />
                    <Bar dataKey="count" fill="hsl(var(--accent))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  No tips data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Action Breakdown */}
        <TabsContent value="actions">
          <Card>
            <CardHeader>
              <CardTitle>Action Type Distribution</CardTitle>
              <CardDescription>Breakdown of prompt action types</CardDescription>
            </CardHeader>
            <CardContent>
              {summary?.actionBreakdown && summary.actionBreakdown.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={summary.actionBreakdown}
                        dataKey="count"
                        nameKey="action"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ action, percent }) =>
                          `${action} (${(percent * 100).toFixed(0)}%)`
                        }
                      >
                        {summary.actionBreakdown.map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col justify-center gap-2">
                    {summary.actionBreakdown.map((item, index) => (
                      <div key={item.action} className="flex items-center gap-3">
                        <div
                          className="w-4 h-4 rounded"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="font-medium capitalize">{item.action.replace("_", " ")}</span>
                        <Badge variant="secondary">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  No action data available
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recent Activity */}
        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recent Prompt Injections</CardTitle>
              <CardDescription>Latest prompt telemetry records</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3">
                  {telemetryData.slice(0, 50).map((record) => (
                    <div
                      key={record.id}
                      className="p-4 border border-border rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={record.document_type === "cover_letter" ? "default" : "secondary"}
                          >
                            {record.document_type === "cover_letter" ? "Cover Letter" : "Interview Prep"}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {record.action_type.replace("_", " ")}
                          </Badge>
                          {record.section && (
                            <Badge variant="outline" className="capitalize">
                              {record.section}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <Clock className="w-3 h-3" />
                          {formatDate(record.created_at)}
                        </div>
                      </div>

                      {record.user_feedback && (
                        <div className="text-sm">
                          <span className="font-medium text-muted-foreground">Feedback: </span>
                          <span className="text-foreground">{record.user_feedback}</span>
                        </div>
                      )}

                      {record.selected_tips && record.selected_tips.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {record.selected_tips.map((tip) => (
                            <Badge key={tip} variant="secondary" className="text-xs">
                              {TIP_LABELS[tip] || tip}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {record.response_quality_rating !== null && (
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">Rating: </span>
                          {record.response_quality_rating >= 4 ? (
                            <ThumbsUp className="w-4 h-4 text-green-500" />
                          ) : (
                            <ThumbsDown className="w-4 h-4 text-red-500" />
                          )}
                          <span className="text-sm font-medium">{record.response_quality_rating}/5</span>
                        </div>
                      )}

                      {record.injected_prompt && (
                        <div className="text-xs bg-muted/50 p-2 rounded font-mono max-h-24 overflow-auto">
                          {record.injected_prompt.slice(0, 300)}
                          {record.injected_prompt.length > 300 && "..."}
                        </div>
                      )}
                    </div>
                  ))}

                  {telemetryData.length === 0 && (
                    <div className="flex items-center justify-center h-32 text-muted-foreground">
                      No telemetry records found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PromptTelemetryDashboard;
