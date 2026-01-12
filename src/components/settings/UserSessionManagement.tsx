import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  RefreshCw,
  XCircle,
  CheckCircle,
  Globe,
  Clock,
  Shield,
  MapPin,
  Laptop
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

interface UserSession {
  id: string;
  created_at: string;
  ip_address: string | null;
  user_agent: string | null;
  location: string | null;
  is_current: boolean;
}

const UserSessionManagement = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserSessions();
    }
  }, [user]);

  const fetchUserSessions = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch user's login events from audit log
      const { data: loginEvents, error } = await supabase
        .from("audit_log")
        .select("id, created_at, ip_address, user_agent, action_data")
        .eq("user_id", user.id)
        .eq("action_type", "login_success")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      // Get current session info for comparison
      const { data: currentSession } = await supabase.auth.getSession();
      
      // Process sessions and deduplicate by IP + User Agent combination
      const sessionMap = new Map<string, UserSession>();
      
      loginEvents?.forEach(event => {
        const key = `${event.ip_address}-${event.user_agent?.substring(0, 50)}`;
        const actionData = event.action_data as Record<string, unknown>;
        
        if (!sessionMap.has(key)) {
          sessionMap.set(key, {
            id: event.id,
            created_at: event.created_at,
            ip_address: event.ip_address,
            user_agent: event.user_agent,
            location: (actionData?.location as string) || null,
            is_current: false, // Will be determined below
          });
        }
      });

      const processedSessions = Array.from(sessionMap.values());
      
      // Mark the most recent session as potentially current
      if (processedSessions.length > 0) {
        processedSessions[0].is_current = true;
      }

      setSessions(processedSessions);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    if (!user) return;
    
    setRevoking(sessionId);
    try {
      // For users revoking their own sessions, we sign them out
      // The session ID here is actually the audit log entry ID
      await supabase.auth.signOut({ scope: 'others' });
      
      toast.success("Other sessions have been signed out");
      fetchUserSessions();
    } catch (error) {
      console.error("Error revoking session:", error);
      toast.error("Failed to revoke session");
    } finally {
      setRevoking(null);
    }
  };

  const handleRevokeAllOtherSessions = async () => {
    if (!user) return;
    
    setRevokingAll(true);
    try {
      await supabase.auth.signOut({ scope: 'others' });
      
      toast.success("All other sessions have been signed out");
      fetchUserSessions();
    } catch (error) {
      console.error("Error revoking sessions:", error);
      toast.error("Failed to revoke sessions");
    } finally {
      setRevokingAll(false);
    }
  };

  const parseDeviceInfo = (userAgent: string | null): { 
    icon: React.ReactNode; 
    name: string;
    browser: string;
    os: string;
  } => {
    if (!userAgent) {
      return { 
        icon: <Monitor className="w-5 h-5" />, 
        name: "Unknown Device",
        browser: "Unknown",
        os: "Unknown"
      };
    }
    
    // Detect device type
    const isMobile = /mobile|android|iphone|ipad|ipod/i.test(userAgent);
    const isTablet = /ipad|tablet/i.test(userAgent);
    
    // Detect OS
    let os = "Unknown";
    if (/windows/i.test(userAgent)) os = "Windows";
    else if (/macintosh|mac os/i.test(userAgent)) os = "macOS";
    else if (/linux/i.test(userAgent)) os = "Linux";
    else if (/android/i.test(userAgent)) os = "Android";
    else if (/iphone|ipad|ipod/i.test(userAgent)) os = "iOS";
    
    // Detect browser
    let browser = "Unknown";
    if (/chrome/i.test(userAgent) && !/edge|edg/i.test(userAgent)) browser = "Chrome";
    else if (/firefox/i.test(userAgent)) browser = "Firefox";
    else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = "Safari";
    else if (/edge|edg/i.test(userAgent)) browser = "Edge";
    else if (/opera|opr/i.test(userAgent)) browser = "Opera";
    
    let icon = <Monitor className="w-5 h-5" />;
    let name = "Desktop";
    
    if (isMobile && !isTablet) {
      icon = <Smartphone className="w-5 h-5" />;
      name = "Mobile";
    } else if (isTablet) {
      icon = <Laptop className="w-5 h-5" />;
      name = "Tablet";
    }
    
    return { icon, name: `${name} - ${os}`, browser, os };
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent" />
              Active Sessions
            </CardTitle>
            <CardDescription>
              Devices where you're currently signed in
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchUserSessions}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
            {sessions.length > 1 && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    disabled={revokingAll}
                  >
                    {revokingAll ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      "Sign Out All Others"
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sign Out All Other Sessions?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will sign you out from all devices except the current one. 
                      You'll remain signed in on this device.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRevokeAllOtherSessions}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Sign Out All Others
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Monitor className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No active sessions found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => {
              const device = parseDeviceInfo(session.user_agent);

              return (
                <div
                  key={session.id}
                  className="flex items-start gap-4 p-4 rounded-lg border border-border bg-card hover:bg-secondary/30 transition-colors"
                >
                  <div className="p-2.5 rounded-lg bg-muted">
                    {device.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-medium">{device.name}</span>
                      {session.is_current && (
                        <Badge variant="outline" className="border-success text-success">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Current
                        </Badge>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-1">
                      <span>{device.browser}</span>
                      {session.ip_address && (
                        <div className="flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          <span>{session.ip_address}</span>
                        </div>
                      )}
                      {session.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{session.location}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span title={format(new Date(session.created_at), "PPpp")}>
                        Signed in {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {!session.is_current && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                          disabled={revoking === session.id}
                        >
                          {revoking === session.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Sign Out This Device?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will sign you out from {device.name}. 
                            You'll need to sign in again on that device to access your account.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRevokeSession(session.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Sign Out
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              );
            })}
          </div>
        )}
        
        <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm font-medium">Security Tip</p>
              <p className="text-xs text-muted-foreground mt-1">
                If you see any devices or locations you don't recognize, sign them out immediately 
                and change your password. Enable two-factor authentication for added security.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserSessionManagement;