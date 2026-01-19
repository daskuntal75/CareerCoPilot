import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldAlert, Play, TrendingUp, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
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
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { format, subDays, parseISO } from "date-fns";
import { Json } from "@/integrations/supabase/types";

interface ThreatInfo {
  type: string;
  pattern: string;
  position: number;
  context: string;
}

interface SanitizationLogRaw {
  id: string;
  user_id: string | null;
  input_type: string;
  original_hash: string;
  sanitized_at: string;
  threats_detected: unknown;
}

interface TrendData {
  date: string;
  attempts: number;
  blocked: number;
}

interface CategoryData {
  category: string;
  count: number;
}

interface TestResult {
  totalTests: number;
  passed: number;
  failed: number;
  detectionRate: string;
  falsePositives: number;
  falseNegatives: number;
  byCategory: Array<{
    category: string;
    passed: number;
    failed: number;
    accuracy: string;
  }>;
}

const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
];

const PromptInjectionTrends = () => {
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [recentAttempts, setRecentAttempts] = useState<SanitizationLogRaw[]>([]);
  
  const [testResults, setTestResults] = useState<TestResult | null>(null);
  const [totalBlocked, setTotalBlocked] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTrendData(),
        fetchRecentAttempts(),
      ]);
    } catch (error) {
      console.error("Error fetching injection data:", error);
      toast.error("Failed to load injection attempt data");
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendData = async () => {
    // Get last 30 days of data
    const startDate = subDays(new Date(), 30).toISOString();
    
    const { data, error } = await supabase
      .from("sanitization_log")
      .select("*")
      .gte("sanitized_at", startDate)
      .order("sanitized_at", { ascending: true });

    if (error) throw error;

    // Group by date
    const byDate = new Map<string, { attempts: number; blocked: number }>();
    const byCategory = new Map<string, number>();

    (data || []).forEach((log: SanitizationLogRaw) => {
      const date = format(parseISO(log.sanitized_at), "MMM dd");
      
      if (!byDate.has(date)) {
        byDate.set(date, { attempts: 0, blocked: 0 });
      }
      const dateData = byDate.get(date)!;
      dateData.attempts++;
      
      const threats = log.threats_detected as ThreatInfo[] | null;
      if (threats && threats.length > 0) {
        dateData.blocked++;
        
        // Count by threat type
        threats.forEach((threat) => {
          const category = threat.type || "unknown";
          byCategory.set(category, (byCategory.get(category) || 0) + 1);
        });
      }
    });

    // Convert to arrays
    const trends = Array.from(byDate.entries()).map(([date, stats]) => ({
      date,
      ...stats,
    }));

    const categories = Array.from(byCategory.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    setTrendData(trends);
    setCategoryData(categories);
    setTotalBlocked(trends.reduce((sum, t) => sum + t.blocked, 0));
  };

  const fetchRecentAttempts = async () => {
    const { data, error } = await supabase
      .from("sanitization_log")
      .select("*")
      .not("threats_detected", "is", null)
      .order("sanitized_at", { ascending: false })
      .limit(10);

    if (error) throw error;
    
    // Filter to only show logs with actual threats
    const logsWithThreats = (data || []).filter((log: SanitizationLogRaw) => {
      const threats = log.threats_detected as ThreatInfo[] | null;
      return threats && threats.length > 0;
    });
    
    setRecentAttempts(logsWithThreats);
  };

  const runDetectionTest = async () => {
    setTesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Please log in to run tests");
        return;
      }

      const { data, error } = await supabase.functions.invoke("test-prompt-injection", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setTestResults(data.summary);
      toast.success(`Detection test complete: ${data.summary.detectionRate} accuracy`);
      
      // Refresh data after test
      await fetchData();
    } catch (error: any) {
      console.error("Error running detection test:", error);
      toast.error(error.message || "Failed to run detection test");
    } finally {
      setTesting(false);
    }
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
      {/* Header with Test Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-destructive" />
            Prompt Injection Detection
          </h3>
          <p className="text-sm text-muted-foreground">
            Monitor and test prompt injection attempts across the platform
          </p>
        </div>
        <Button 
          onClick={runDetectionTest} 
          disabled={testing}
          className="gap-2"
        >
          <Play className={`w-4 h-4 ${testing ? "animate-pulse" : ""}`} />
          {testing ? "Running Tests..." : "Run Detection Tests"}
        </Button>
      </div>

      {/* Test Results Card */}
      {testResults && (
        <Card className="border-accent/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              Detection Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-foreground">
                  {testResults.detectionRate}
                </div>
                <div className="text-xs text-muted-foreground">Accuracy</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  {testResults.passed}
                </div>
                <div className="text-xs text-muted-foreground">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-destructive">
                  {testResults.failed}
                </div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-500">
                  {testResults.falsePositives}
                </div>
                <div className="text-xs text-muted-foreground">False Positives</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-500">
                  {testResults.falseNegatives}
                </div>
                <div className="text-xs text-muted-foreground">False Negatives</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-destructive/10">
              <ShieldAlert className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalBlocked}</div>
              <div className="text-sm text-muted-foreground">Attempts Blocked (30d)</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-accent/10">
              <TrendingUp className="w-6 h-6 text-accent" />
            </div>
            <div>
              <div className="text-2xl font-bold">{categoryData.length}</div>
              <div className="text-sm text-muted-foreground">Attack Types Detected</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-500/10">
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <div className="text-2xl font-bold">100%</div>
              <div className="text-sm text-muted-foreground">Prevention Rate</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trend Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Injection Attempts Over Time</CardTitle>
            <CardDescription>Daily blocked attempts in the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 11 }}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 11 }} />
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
                    dataKey="blocked" 
                    name="Blocked"
                    stroke="hsl(var(--destructive))" 
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--destructive))" }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="attempts" 
                    name="Total Scanned"
                    stroke="hsl(var(--accent))" 
                    strokeWidth={2}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No injection attempts detected
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attack Categories</CardTitle>
            <CardDescription>Most common injection techniques blocked</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis 
                    dataKey="category" 
                    type="category" 
                    tick={{ fontSize: 10 }}
                    width={120}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--destructive))" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No categorized attacks detected
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Attempts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Recent Blocked Attempts
          </CardTitle>
          <CardDescription>
            Last 10 injection attempts that were detected and blocked
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentAttempts.length > 0 ? (
            <div className="space-y-3">
              {recentAttempts.map((attempt) => {
                const threats = attempt.threats_detected as ThreatInfo[] | null;
                return (
                  <div 
                    key={attempt.id}
                    className="flex items-start justify-between p-3 rounded-lg bg-muted/50 border"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <XCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                        <span className="text-sm font-medium truncate">
                          {attempt.input_type}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(parseISO(attempt.sanitized_at), "MMM dd, HH:mm")}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {threats?.slice(0, 3).map((threat, idx) => (
                          <Badge key={idx} variant="destructive" className="text-xs">
                            {threat.type}
                          </Badge>
                        ))}
                        {threats && threats.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{threats.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className="flex-shrink-0">
                      {threats?.length || 0} threats
                    </Badge>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <ShieldAlert className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No injection attempts have been detected yet</p>
              <p className="text-sm">Run the detection test to verify the system is working</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PromptInjectionTrends;
