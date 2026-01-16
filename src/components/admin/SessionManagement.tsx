import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Monitor, 
  Smartphone, 
  Search,
  RefreshCw,
  XCircle,
  CheckCircle,
  Globe,
  Clock,
  User,
  Shield,
  AlertTriangle,
  MapPin
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface ActiveUser {
  user_id: string;
  email: string;
  full_name: string | null;
  last_sign_in: string | null;
  created_at: string;
  is_admin: boolean;
  last_activity: string | null;
  ip_address: string | null;
  user_agent: string | null;
  location: string | null;
}

interface SessionManagementProps {
  refreshTrigger?: number;
}

const SessionManagement = ({ refreshTrigger }: SessionManagementProps) => {
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchActiveSessions();
  }, [refreshTrigger]);

  const fetchActiveSessions = async () => {
    setLoading(true);
    try {
      // Fetch users with recent activity (signed in within last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Get profiles with recent login activity
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, is_admin, created_at")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Get recent login events from audit log
      const { data: loginEvents, error: loginError } = await supabase
        .from("audit_log")
        .select("user_id, created_at, ip_address, user_agent, action_data")
        .eq("action_type", "login_success")
        .gte("created_at", thirtyDaysAgo.toISOString())
        .order("created_at", { ascending: false });

      if (loginError) throw loginError;

      // Create a map of user's most recent activity
      const userActivityMap = new Map<string, {
        last_activity: string;
        ip_address: string | null;
        user_agent: string | null;
        email: string | null;
        location: string | null;
      }>();

      loginEvents?.forEach(event => {
        if (!userActivityMap.has(event.user_id)) {
          const actionData = event.action_data as Record<string, unknown>;
          userActivityMap.set(event.user_id, {
            last_activity: event.created_at,
            ip_address: event.ip_address,
            user_agent: event.user_agent,
            email: actionData?.email as string || null,
            location: actionData?.location as string || null,
          });
        }
      });

      // Combine profiles with activity data
      const usersWithActivity: ActiveUser[] = profiles?.map(profile => {
        const activity = userActivityMap.get(profile.user_id);
        return {
          user_id: profile.user_id,
          email: activity?.email || "Unknown",
          full_name: profile.full_name,
          last_sign_in: activity?.last_activity || null,
          created_at: profile.created_at,
          is_admin: profile.is_admin || false,
          last_activity: activity?.last_activity || null,
          ip_address: activity?.ip_address || null,
          user_agent: activity?.user_agent || null,
          location: activity?.location || null,
        };
      }).filter(user => user.last_activity !== null) || [];

      // Sort by most recent activity
      usersWithActivity.sort((a, b) => {
        if (!a.last_activity) return 1;
        if (!b.last_activity) return -1;
        return new Date(b.last_activity).getTime() - new Date(a.last_activity).getTime();
      });

      setActiveUsers(usersWithActivity);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast.error("Failed to load active sessions");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (userId: string, email: string) => {
    setRevoking(userId);
    try {
      const { data: session } = await supabase.auth.getSession();
      
      const response = await supabase.functions.invoke("revoke-user-session", {
        body: {
          targetUserId: userId,
          sessionInfo: "All active sessions",
          sendNotification: true,
        },
        headers: {
          Authorization: `Bearer ${session.session?.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success(`Sessions revoked for ${email}`);
      fetchActiveSessions();
    } catch (error) {
      console.error("Error revoking session:", error);
      toast.error("Failed to revoke session");
    } finally {
      setRevoking(null);
    }
  };

  const parseDeviceType = (userAgent: string | null): { icon: React.ReactNode; name: string } => {
    if (!userAgent) return { icon: <Monitor className="w-4 h-4" />, name: "Unknown" };
    
    if (/mobile|android|iphone|ipad|ipod/i.test(userAgent)) {
      return { icon: <Smartphone className="w-4 h-4" />, name: "Mobile" };
    }
    return { icon: <Monitor className="w-4 h-4" />, name: "Desktop" };
  };

  const filteredUsers = activeUsers.filter(user =>
    !searchTerm ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.ip_address?.includes(searchTerm)
  );

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent" />
              Active Sessions
            </CardTitle>
            <CardDescription>
              Manage user sessions and revoke access remotely
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchActiveSessions}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by email, name, or IP..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">{activeUsers.length}</div>
            <div className="text-xs text-muted-foreground">Active Users (30d)</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">
              {activeUsers.filter(u => {
                if (!u.last_activity) return false;
                const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
                return new Date(u.last_activity) > hourAgo;
              }).length}
            </div>
            <div className="text-xs text-muted-foreground">Active Now</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">
              {activeUsers.filter(u => u.is_admin).length}
            </div>
            <div className="text-xs text-muted-foreground">Admins Online</div>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="text-2xl font-bold">
              {new Set(activeUsers.map(u => u.ip_address).filter(Boolean)).size}
            </div>
            <div className="text-xs text-muted-foreground">Unique IPs</div>
          </div>
        </div>

        {/* Sessions List */}
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Monitor className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No active sessions found</p>
            {searchTerm && <p className="text-sm mt-1">Try adjusting your search</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => {
              const device = parseDeviceType(user.user_agent);
              const isRecentlyActive = user.last_activity && 
                new Date(user.last_activity) > new Date(Date.now() - 60 * 60 * 1000);

              return (
                <div
                  key={user.user_id}
                  className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors"
                >
                  <div className="p-2 rounded-lg bg-muted">
                    {device.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-medium truncate">
                        {user.full_name || user.email}
                      </span>
                      {user.is_admin && (
                        <Badge variant="outline" className="border-accent text-accent">
                          Admin
                        </Badge>
                      )}
                      {isRecentlyActive && (
                        <Badge variant="outline" className="border-success text-success">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-2">
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span className="truncate max-w-[180px]">{user.email}</span>
                        </div>
                        {user.ip_address && (
                          <div className="flex items-center gap-1">
                            <Globe className="w-3 h-3" />
                            <span>{user.ip_address}</span>
                          </div>
                        )}
                        {user.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span>{user.location}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          {device.icon}
                          <span>{device.name}</span>
                        </div>
                      </div>
                    
                    {user.last_activity && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span title={format(new Date(user.last_activity), "PPpp")}>
                          Last active {formatDistanceToNow(new Date(user.last_activity), { addSuffix: true })}
                        </span>
                      </div>
                    )}
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        disabled={revoking === user.user_id}
                      >
                        {revoking === user.user_id ? (
                          <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 mr-1" />
                            Revoke
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="w-5 h-5 text-warning" />
                          Revoke User Session
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This will sign out <strong>{user.email}</strong> from all devices and sessions.
                          They will need to sign in again to access their account.
                          <br /><br />
                          A notification email will be sent to inform them of this action.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleRevokeSession(user.user_id, user.email)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          Revoke All Sessions
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SessionManagement;
