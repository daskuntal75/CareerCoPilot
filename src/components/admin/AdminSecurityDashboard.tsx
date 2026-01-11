import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Shield, 
  AlertTriangle, 
  Lock, 
  Clock, 
  Search,
  RefreshCw,
  XCircle,
  CheckCircle,
  AlertCircle,
  User,
  Globe
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import type { Json } from "@/integrations/supabase/types";

interface SecurityEvent {
  id: string;
  action_type: string;
  action_target: string | null;
  action_data: Json | null;
  user_id: string;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface SecurityStats {
  total_failed_logins: number;
  failed_logins_24h: number;
  rate_limit_triggers: number;
  lockout_notifications: number;
  unique_ips_blocked: number;
}

interface AdminSecurityDashboardProps {
  refreshTrigger?: number;
}

const AdminSecurityDashboard = ({ refreshTrigger }: AdminSecurityDashboardProps) => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchSecurityData();
  }, [refreshTrigger]);

  const fetchSecurityData = async () => {
    setLoading(true);
    try {
      // Fetch security-related audit events
      const { data: eventsData, error: eventsError } = await supabase
        .from("audit_log")
        .select("*")
        .in("action_type", [
          "login_failed",
          "login_success",
          "rate_limit_exceeded",
          "account_locked",
          "lockout_notification_sent",
          "suspicious_activity"
        ])
        .order("created_at", { ascending: false })
        .limit(100);

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);

      // Calculate stats from events
      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      const allEvents = eventsData || [];
      const failedLogins = allEvents.filter(e => e.action_type === "login_failed");
      const failedLogins24h = failedLogins.filter(e => new Date(e.created_at) > last24h);
      const rateLimits = allEvents.filter(e => e.action_type === "rate_limit_exceeded");
      const lockouts = allEvents.filter(e => 
        e.action_type === "account_locked" || e.action_type === "lockout_notification_sent"
      );
      
      const uniqueIps = new Set(failedLogins.map(e => e.ip_address).filter(Boolean));

      setStats({
        total_failed_logins: failedLogins.length,
        failed_logins_24h: failedLogins24h.length,
        rate_limit_triggers: rateLimits.length,
        lockout_notifications: lockouts.length,
        unique_ips_blocked: uniqueIps.size,
      });

    } catch (error) {
      console.error("Error fetching security data:", error);
      toast.error("Failed to load security data");
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (actionType: string) => {
    switch (actionType) {
      case "login_failed":
        return <XCircle className="w-4 h-4 text-destructive" />;
      case "login_success":
        return <CheckCircle className="w-4 h-4 text-success" />;
      case "rate_limit_exceeded":
        return <AlertTriangle className="w-4 h-4 text-warning" />;
      case "account_locked":
        return <Lock className="w-4 h-4 text-destructive" />;
      case "lockout_notification_sent":
        return <AlertCircle className="w-4 h-4 text-warning" />;
      case "suspicious_activity":
        return <Shield className="w-4 h-4 text-destructive" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getEventBadge = (actionType: string) => {
    switch (actionType) {
      case "login_failed":
        return <Badge variant="destructive">Failed Login</Badge>;
      case "login_success":
        return <Badge variant="outline" className="border-success text-success">Login Success</Badge>;
      case "rate_limit_exceeded":
        return <Badge variant="outline" className="border-warning text-warning">Rate Limited</Badge>;
      case "account_locked":
        return <Badge variant="destructive">Account Locked</Badge>;
      case "lockout_notification_sent":
        return <Badge variant="outline" className="border-warning text-warning">Lockout Notice</Badge>;
      case "suspicious_activity":
        return <Badge variant="destructive">Suspicious</Badge>;
      default:
        return <Badge variant="secondary">{actionType}</Badge>;
    }
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = 
      !searchTerm ||
      event.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.ip_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.action_target?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.action_data as any)?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesFilter = 
      filter === "all" ||
      (filter === "failed" && event.action_type === "login_failed") ||
      (filter === "success" && event.action_type === "login_success") ||
      (filter === "rate_limit" && event.action_type === "rate_limit_exceeded") ||
      (filter === "lockout" && (event.action_type === "account_locked" || event.action_type === "lockout_notification_sent"));

    return matchesSearch && matchesFilter;
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <XCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats?.failed_logins_24h || 0}</div>
                <div className="text-xs text-muted-foreground">Failed (24h)</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats?.total_failed_logins || 0}</div>
                <div className="text-xs text-muted-foreground">Total Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="w-5 h-5 text-warning" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats?.rate_limit_triggers || 0}</div>
                <div className="text-xs text-muted-foreground">Rate Limits</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Lock className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats?.lockout_notifications || 0}</div>
                <div className="text-xs text-muted-foreground">Lockouts</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10">
                <Globe className="w-5 h-5 text-accent" />
              </div>
              <div>
                <div className="text-2xl font-bold">{stats?.unique_ips_blocked || 0}</div>
                <div className="text-xs text-muted-foreground">Unique IPs</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security Events */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-accent" />
                Security Events
              </CardTitle>
              <CardDescription>
                Recent authentication attempts, rate limits, and security incidents
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchSecurityData}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by email, IP, or action..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              {[
                { value: "all", label: "All" },
                { value: "failed", label: "Failed" },
                { value: "success", label: "Success" },
                { value: "rate_limit", label: "Rate Limited" },
                { value: "lockout", label: "Lockouts" },
              ].map(({ value, label }) => (
                <Button
                  key={value}
                  variant={filter === value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>

          {/* Events List */}
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No security events found</p>
              {searchTerm && <p className="text-sm mt-1">Try adjusting your search</p>}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-4 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors"
                >
                  <div className="mt-0.5">{getEventIcon(event.action_type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {getEventBadge(event.action_type)}
                      {event.action_target && (
                        <span className="text-sm text-foreground truncate max-w-[200px]">
                          {event.action_target}
                        </span>
                      )}
                      {(event.action_data as any)?.email && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <User className="w-3 h-3" />
                          <span className="truncate max-w-[150px]">
                            {(event.action_data as any).email}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span title={format(new Date(event.created_at), "PPpp")}>
                        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                      </span>
                      {event.ip_address && (
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          <span>{event.ip_address}</span>
                        </div>
                      )}
                      {(event.action_data as any)?.reason && (
                        <span className="text-destructive">
                          {(event.action_data as any).reason}
                        </span>
                      )}
                      {(event.action_data as any)?.lockout_duration && (
                        <span>
                          Locked for {Math.round((event.action_data as any).lockout_duration / 60)}m
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSecurityDashboard;
