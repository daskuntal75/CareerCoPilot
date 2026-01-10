import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  AreaChart,
  Area,
} from "recharts";

interface RevenueSummary {
  total_revenue_cents: number;
  revenue_this_month_cents: number;
  active_subscriptions: number;
  mrr_cents: number;
  churn_rate: number;
}

interface RevenueStats {
  date: string;
  total_revenue_cents: number;
  subscription_revenue_cents: number;
  new_subscriptions: number;
  cancellations: number;
  mrr_cents: number;
}

interface RevenueAnalyticsProps {
  refreshTrigger?: number;
}

const RevenueAnalytics = ({ refreshTrigger }: RevenueAnalyticsProps) => {
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [stats, setStats] = useState<RevenueStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [summaryResult, statsResult] = await Promise.all([
        supabase.rpc("get_admin_revenue_summary"),
        supabase.rpc("get_admin_revenue_stats", { days_back: 30 }),
      ]);

      if (summaryResult.error) throw summaryResult.error;
      if (statsResult.error) throw statsResult.error;

      if (summaryResult.data && summaryResult.data.length > 0) {
        setSummary(summaryResult.data[0]);
      }
      setStats(statsResult.data || []);
    } catch (error) {
      console.error("Error fetching revenue data:", error);
      toast.error("Failed to load revenue data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const chartData = stats.map(stat => ({
    ...stat,
    date: formatDate(stat.date),
    revenue: stat.total_revenue_cents / 100,
    subscription_revenue: stat.subscription_revenue_cents / 100,
  })).reverse();

  const subscriptionChartData = stats.map(stat => ({
    ...stat,
    date: formatDate(stat.date),
    net_change: stat.new_subscriptions - stat.cancellations,
  })).reverse();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(summary?.total_revenue_cents || 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Revenue</div>
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
                  {formatCurrency(summary?.revenue_this_month_cents || 0)}
                </div>
                <div className="text-sm text-muted-foreground">This Month</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-accent/10">
                <Users className="w-6 h-6 text-accent" />
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {summary?.active_subscriptions || 0}
                </div>
                <div className="text-sm text-muted-foreground">Active Subs</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${(summary?.churn_rate || 0) > 5 ? 'bg-red-500/10' : 'bg-green-500/10'}`}>
                {(summary?.churn_rate || 0) > 5 ? (
                  <ArrowDownRight className="w-6 h-6 text-red-500" />
                ) : (
                  <ArrowUpRight className="w-6 h-6 text-green-500" />
                )}
              </div>
              <div>
                <div className="text-2xl font-bold text-foreground">
                  {summary?.churn_rate || 0}%
                </div>
                <div className="text-sm text-muted-foreground">Churn Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Revenue (Last 30 Days)</CardTitle>
            <CardDescription>Daily revenue breakdown</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={refreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis 
                  dataKey="date" 
                  className="text-muted-foreground"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  className="text-muted-foreground"
                  tickFormatter={(value) => `$${value}`}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Revenue"]}
                />
                <Area 
                  type="monotone" 
                  dataKey="revenue" 
                  name="Total Revenue"
                  stroke="hsl(var(--accent))" 
                  strokeWidth={2}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[350px] text-muted-foreground">
              <AlertTriangle className="w-5 h-5 mr-2" />
              No revenue data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subscription Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Trends (Last 30 Days)</CardTitle>
          <CardDescription>New subscriptions vs cancellations</CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptionChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={subscriptionChartData}>
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
                  dataKey="new_subscriptions" 
                  name="New Subscriptions"
                  fill="#22c55e" 
                  radius={[4, 4, 0, 0]}
                />
                <Bar 
                  dataKey="cancellations" 
                  name="Cancellations"
                  fill="#ef4444" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[350px] text-muted-foreground">
              <AlertTriangle className="w-5 h-5 mr-2" />
              No subscription data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RevenueAnalytics;
