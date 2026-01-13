import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Bell, 
  Shield, 
  Smartphone, 
  MapPin, 
  AlertTriangle,
  Lock,
  LogIn,
  RefreshCw,
  Save,
  Check
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SecurityNotificationSettings {
  new_device_login: boolean;
  suspicious_activity: boolean;
  password_changed: boolean;
  unusual_location: boolean;
  session_revoked: boolean;
  failed_login_attempts: boolean;
  weekly_security_digest: boolean;
}

const defaultSettings: SecurityNotificationSettings = {
  new_device_login: true,
  suspicious_activity: true,
  password_changed: true,
  unusual_location: true,
  session_revoked: true,
  failed_login_attempts: false,
  weekly_security_digest: false,
};

const SecurityNotificationsPreferences = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<SecurityNotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", `security_notifications_${user?.id}`)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data?.setting_value) {
        setSettings(data.setting_value as unknown as SecurityNotificationSettings);
      }
    } catch (error) {
      console.error("Error fetching security notification settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (key: keyof SecurityNotificationSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    setHasChanges(true);
    setSaved(false);
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Check if setting exists
      const { data: existing } = await supabase
        .from("admin_settings")
        .select("id")
        .eq("setting_key", `security_notifications_${user.id}`)
        .maybeSingle();

      let error;
      if (existing) {
        // Update existing
        const result = await supabase
          .from("admin_settings")
          .update({
            setting_value: settings as unknown as { [key: string]: boolean },
            updated_at: new Date().toISOString(),
          })
          .eq("setting_key", `security_notifications_${user.id}`);
        error = result.error;
      } else {
        // Insert new
        const result = await supabase
          .from("admin_settings")
          .insert([{
            setting_key: `security_notifications_${user.id}`,
            setting_value: settings as unknown as { [key: string]: boolean },
            description: "User security notification preferences",
          }]);
        error = result.error;
      }

      if (error) throw error;

      setSaved(true);
      setHasChanges(false);
      toast.success("Security notification preferences saved");
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const enableAll = () => {
    setSettings({
      new_device_login: true,
      suspicious_activity: true,
      password_changed: true,
      unusual_location: true,
      session_revoked: true,
      failed_login_attempts: true,
      weekly_security_digest: true,
    });
    setHasChanges(true);
    setSaved(false);
  };

  const disableNonCritical = () => {
    setSettings({
      new_device_login: true,
      suspicious_activity: true,
      password_changed: true,
      unusual_location: false,
      session_revoked: true,
      failed_login_attempts: false,
      weekly_security_digest: false,
    });
    setHasChanges(true);
    setSaved(false);
  };

  const notificationOptions = [
    {
      key: "new_device_login" as const,
      icon: Smartphone,
      title: "New Device Login",
      description: "Get notified when someone signs in from a new device",
      critical: true,
    },
    {
      key: "suspicious_activity" as const,
      icon: AlertTriangle,
      title: "Suspicious Activity",
      description: "Alert when unusual patterns are detected in your account",
      critical: true,
    },
    {
      key: "password_changed" as const,
      icon: Lock,
      title: "Password Changes",
      description: "Confirmation when your password is updated",
      critical: true,
    },
    {
      key: "unusual_location" as const,
      icon: MapPin,
      title: "Unusual Location",
      description: "Alert when login is detected from a new geographic location",
      critical: false,
    },
    {
      key: "session_revoked" as const,
      icon: Shield,
      title: "Session Revoked",
      description: "Notification when one of your sessions is terminated",
      critical: true,
    },
    {
      key: "failed_login_attempts" as const,
      icon: LogIn,
      title: "Failed Login Attempts",
      description: "Alert after multiple failed login attempts to your account",
      critical: false,
    },
    {
      key: "weekly_security_digest" as const,
      icon: Bell,
      title: "Weekly Security Digest",
      description: "Weekly summary of your account security activity",
      critical: false,
    },
  ];

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-accent" />
              Security Notifications
            </CardTitle>
            <CardDescription>Choose which security alerts you want to receive</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={enableAll}>
              Enable All
            </Button>
            <Button variant="outline" size="sm" onClick={disableNonCritical}>
              Critical Only
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {notificationOptions.map((option, index) => (
          <motion.div
            key={option.key}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/30 transition-colors">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${
                  option.critical ? "bg-warning/10" : "bg-muted"
                }`}>
                  <option.icon className={`w-4 h-4 ${
                    option.critical ? "text-warning" : "text-muted-foreground"
                  }`} />
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={option.key} className="text-sm font-medium cursor-pointer">
                      {option.title}
                    </Label>
                    {option.critical && (
                      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-warning/20 text-warning font-medium">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </div>
              <Switch
                id={option.key}
                checked={settings[option.key]}
                onCheckedChange={() => handleToggle(option.key)}
              />
            </div>
            {index < notificationOptions.length - 1 && <Separator className="my-2" />}
          </motion.div>
        ))}

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSave} 
            disabled={saving || !hasChanges}
            className="min-w-[140px]"
          >
            {saving ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : saved ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Saved
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Preferences
              </>
            )}
          </Button>
        </div>

        {/* Info note */}
        <div className="mt-4 p-3 rounded-lg bg-muted/50 border border-border">
          <p className="text-xs text-muted-foreground">
            <Shield className="w-3 h-3 inline mr-1" />
            Critical security alerts are strongly recommended to keep your account safe. 
            You'll receive these notifications via the email address associated with your account.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SecurityNotificationsPreferences;
