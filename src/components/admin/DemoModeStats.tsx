import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TestTube, Users, Shield, CheckCircle } from "lucide-react";

interface DemoStats {
  whitelistCount: number;
  totalUsers: number;
}

interface DemoModeStatsProps {
  refreshTrigger?: number;
}

const DemoModeStats = ({ refreshTrigger }: DemoModeStatsProps) => {
  const { settings, loading: settingsLoading } = useAppSettings();
  const [stats, setStats] = useState<DemoStats>({ whitelistCount: 0, totalUsers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [refreshTrigger]);

  const fetchStats = async () => {
    try {
      const [whitelistResult, usersResult] = await Promise.all([
        supabase.from("demo_whitelist").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        whitelistCount: whitelistResult.count || 0,
        totalUsers: usersResult.count || 0,
      });
    } catch (error) {
      console.error("Error fetching demo stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (settingsLoading || loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="h-16 animate-pulse bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {/* Demo Mode Status */}
      <Card className={settings.demoMode ? "border-amber-500/50 bg-amber-500/5" : "border-green-500/50 bg-green-500/5"}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${settings.demoMode ? "bg-amber-500/10" : "bg-green-500/10"}`}>
              <TestTube className={`w-6 h-6 ${settings.demoMode ? "text-amber-500" : "text-green-500"}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-foreground">
                  {settings.demoMode ? "ON" : "OFF"}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">Demo Mode</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stripe Status */}
      <Card className={settings.stripeEnabled ? "border-green-500/50 bg-green-500/5" : ""}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${settings.stripeEnabled ? "bg-green-500/10" : "bg-muted"}`}>
              <CheckCircle className={`w-6 h-6 ${settings.stripeEnabled ? "text-green-500" : "text-muted-foreground"}`} />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {settings.stripeEnabled ? "Live" : "Off"}
              </div>
              <div className="text-sm text-muted-foreground">Stripe</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Whitelisted Users */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-accent/10">
              <Shield className="w-6 h-6 text-accent" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {stats.whitelistCount}
              </div>
              <div className="text-sm text-muted-foreground">Whitelisted</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Total Users */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-foreground">
                {stats.totalUsers}
              </div>
              <div className="text-sm text-muted-foreground">Total Users</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DemoModeStats;
