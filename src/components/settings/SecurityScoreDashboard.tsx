import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert,
  Lock,
  Fingerprint,
  Smartphone,
  Key,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Zap
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDeviceFingerprint } from "@/hooks/useDeviceFingerprint";

interface SecurityCheck {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  weight: number;
  completed: boolean;
  action?: () => void;
  actionLabel?: string;
}

interface SecurityScoreDashboardProps {
  onNavigateToSection?: (section: string) => void;
}

const SecurityScoreDashboard = ({ onNavigateToSection }: SecurityScoreDashboardProps) => {
  const { user } = useAuth();
  const { isTrusted } = useDeviceFingerprint();
  const [securityChecks, setSecurityChecks] = useState<SecurityCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [score, setScore] = useState(0);

  useEffect(() => {
    if (user) {
      evaluateSecurityStatus();
    }
  }, [user, isTrusted]);

  const evaluateSecurityStatus = async () => {
    try {
      setLoading(true);

      // Fetch profile data for notification preferences
      const { data: profile } = await supabase
        .from("profiles")
        .select("email_notifications_enabled")
        .eq("user_id", user?.id)
        .single();

      // Check for 2FA (we simulate this - in real implementation, check auth factors)
      const has2FA = false; // Would check supabase.auth.mfa.listFactors()

      // Check if email is verified
      const emailVerified = !!user?.email_confirmed_at;

      // Check password age (simulated - would check last password change from audit log)
      const { data: passwordChange } = await supabase
        .from("audit_log")
        .select("created_at")
        .eq("user_id", user?.id)
        .eq("action_type", "password_changed")
        .order("created_at", { ascending: false })
        .limit(1);

      const passwordRecent = passwordChange && passwordChange.length > 0
        ? new Date(passwordChange[0].created_at) > new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days
        : false;

      // Check for recent login activity
      const { data: recentLogins } = await supabase
        .from("audit_log")
        .select("id")
        .eq("user_id", user?.id)
        .eq("action_type", "login")
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
        .limit(10);

      const hasRecentActivity = recentLogins && recentLogins.length > 0;

      // Build security checks
      const checks: SecurityCheck[] = [
        {
          id: "email_verified",
          name: "Email Verified",
          description: "Your email address has been verified",
          icon: CheckCircle2,
          weight: 15,
          completed: emailVerified,
        },
        {
          id: "strong_password",
          name: "Strong Password",
          description: "Use a strong, unique password that hasn't been breached",
          icon: Key,
          weight: 20,
          completed: true, // Assume true if they passed signup validation
        },
        {
          id: "2fa_enabled",
          name: "Two-Factor Authentication",
          description: "Add an extra layer of security with TOTP",
          icon: Smartphone,
          weight: 25,
          completed: has2FA,
          action: () => onNavigateToSection?.("security"),
          actionLabel: "Enable 2FA",
        },
        {
          id: "password_recent",
          name: "Recent Password Update",
          description: "Password changed within the last 90 days",
          icon: Lock,
          weight: 15,
          completed: passwordRecent,
          action: () => onNavigateToSection?.("security"),
          actionLabel: "Change Password",
        },
        {
          id: "trusted_device",
          name: "Trusted Device",
          description: "This device is recognized and trusted",
          icon: Fingerprint,
          weight: 15,
          completed: isTrusted,
          action: () => onNavigateToSection?.("devices"),
          actionLabel: "Manage Devices",
        },
        {
          id: "notifications_enabled",
          name: "Security Alerts Enabled",
          description: "Receive alerts for suspicious activity",
          icon: Shield,
          weight: 10,
          completed: profile?.email_notifications_enabled ?? false,
          action: () => onNavigateToSection?.("notifications"),
          actionLabel: "Enable Alerts",
        },
      ];

      setSecurityChecks(checks);

      // Calculate score
      const totalWeight = checks.reduce((acc, check) => acc + check.weight, 0);
      const completedWeight = checks
        .filter(check => check.completed)
        .reduce((acc, check) => acc + check.weight, 0);
      const calculatedScore = Math.round((completedWeight / totalWeight) * 100);
      setScore(calculatedScore);
    } catch (error) {
      console.error("Error evaluating security status:", error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = () => {
    if (score >= 80) return "text-success";
    if (score >= 60) return "text-warning";
    return "text-destructive";
  };

  const getScoreLabel = () => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Improvement";
  };

  const getScoreIcon = () => {
    if (score >= 80) return ShieldCheck;
    if (score >= 60) return Shield;
    return ShieldAlert;
  };

  const ScoreIcon = getScoreIcon();
  const incompleteChecks = securityChecks.filter(check => !check.completed);

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-accent" />
          Security Score
        </CardTitle>
        <CardDescription>Your account security status and recommendations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Display */}
        <div className="flex items-center gap-6">
          <div className="relative">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`w-24 h-24 rounded-full border-4 flex items-center justify-center ${
                score >= 80 ? "border-success bg-success/10" : 
                score >= 60 ? "border-warning bg-warning/10" : 
                "border-destructive bg-destructive/10"
              }`}
            >
              <ScoreIcon className={`w-10 h-10 ${getScoreColor()}`} />
            </motion.div>
          </div>
          <div className="flex-1">
            <div className="flex items-baseline gap-2 mb-2">
              <span className={`text-4xl font-bold ${getScoreColor()}`}>{score}</span>
              <span className="text-lg text-muted-foreground">/100</span>
            </div>
            <Badge variant="outline" className={getScoreColor()}>
              {getScoreLabel()}
            </Badge>
            <Progress value={score} className="mt-3 h-2" />
          </div>
        </div>

        {/* Recommendations */}
        {incompleteChecks.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Recommendations to improve your score
            </h4>
            <div className="space-y-2">
              {incompleteChecks.map((check) => (
                <motion.div
                  key={check.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-warning/10">
                      <check.icon className="w-4 h-4 text-warning" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{check.name}</p>
                      <p className="text-xs text-muted-foreground">{check.description}</p>
                    </div>
                  </div>
                  {check.action && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={check.action}
                      className="text-accent hover:text-accent"
                    >
                      {check.actionLabel}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Checks */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            Completed security measures
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {securityChecks.filter(check => check.completed).map((check) => (
              <div
                key={check.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-success/5 border border-success/20"
              >
                <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
                <span className="text-sm text-success truncate">{check.name}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default SecurityScoreDashboard;
