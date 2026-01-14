import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Timer, Save, Check, Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";

const TIMEOUT_OPTIONS = [
  { value: "15", label: "15 minutes" },
  { value: "30", label: "30 minutes" },
  { value: "60", label: "1 hour" },
  { value: "120", label: "2 hours" },
  { value: "480", label: "8 hours" },
  { value: "1440", label: "24 hours" },
  { value: "10080", label: "7 days" },
  { value: "0", label: "Never (not recommended)" },
];

const SESSION_TIMEOUT_KEY = "session_timeout_settings";

interface SessionTimeoutConfig {
  enabled: boolean;
  timeout_minutes: number;
  warn_before_minutes: number;
  require_reauth_for_sensitive: boolean;
}

export function SessionTimeoutSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [config, setConfig] = useState<SessionTimeoutConfig>({
    enabled: true,
    timeout_minutes: 60,
    warn_before_minutes: 5,
    require_reauth_for_sensitive: true,
  });

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      // Try to get from localStorage first for faster load
      const cached = localStorage.getItem(`${SESSION_TIMEOUT_KEY}_${user?.id}`);
      if (cached) {
        setConfig(JSON.parse(cached));
      }

      // Then fetch from server
      const { data, error } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", `${SESSION_TIMEOUT_KEY}_${user?.id}`)
        .single();

      if (data && !error) {
        const serverConfig = data.setting_value as unknown as SessionTimeoutConfig;
        setConfig(serverConfig);
        localStorage.setItem(`${SESSION_TIMEOUT_KEY}_${user?.id}`, JSON.stringify(serverConfig));
      }
    } catch (err) {
      console.error("Error fetching session timeout settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("admin_settings")
        .upsert({
          setting_key: `${SESSION_TIMEOUT_KEY}_${user.id}`,
          setting_value: config as unknown as Record<string, unknown>,
          description: "User session timeout preferences",
          updated_at: new Date().toISOString(),
        } as any, {
          onConflict: "setting_key",
        });

      if (error) throw error;

      // Update localStorage
      localStorage.setItem(`${SESSION_TIMEOUT_KEY}_${user.id}`, JSON.stringify(config));

      setSaved(true);
      toast.success("Session timeout settings saved");
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Error saving session timeout settings:", err);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-accent" />
            Session Timeout
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Timer className="w-5 h-5 text-accent" />
          Session Timeout
        </CardTitle>
        <CardDescription>
          Configure automatic session expiration for enhanced security
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base">Enable Session Timeout</Label>
            <p className="text-sm text-muted-foreground">
              Automatically sign out after a period of inactivity
            </p>
          </div>
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => setConfig({ ...config, enabled: checked })}
          />
        </div>

        {config.enabled && (
          <>
            {/* Timeout Duration */}
            <div className="space-y-2">
              <Label>Timeout After Inactivity</Label>
              <Select
                value={config.timeout_minutes.toString()}
                onValueChange={(value) => setConfig({ ...config, timeout_minutes: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEOUT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Your session will expire after this period of no activity
              </p>
            </div>

            {/* Warning Time */}
            <div className="space-y-2">
              <Label>Warning Before Timeout</Label>
              <Select
                value={config.warn_before_minutes.toString()}
                onValueChange={(value) => setConfig({ ...config, warn_before_minutes: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 minute before</SelectItem>
                  <SelectItem value="2">2 minutes before</SelectItem>
                  <SelectItem value="5">5 minutes before</SelectItem>
                  <SelectItem value="10">10 minutes before</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                You'll be warned before your session expires
              </p>
            </div>

            {/* Re-auth for sensitive actions */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Re-authenticate for Sensitive Actions</Label>
                <p className="text-sm text-muted-foreground">
                  Require password for changing security settings
                </p>
              </div>
              <Switch
                checked={config.require_reauth_for_sensitive}
                onCheckedChange={(checked) => setConfig({ ...config, require_reauth_for_sensitive: checked })}
              />
            </div>
          </>
        )}

        {config.timeout_minutes === 0 && config.enabled && (
          <Alert variant="destructive" className="bg-warning/10 border-warning">
            <AlertCircle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning">
              Disabling session timeout is not recommended for security. Your session will remain active indefinitely.
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : saved ? (
            <Check className="w-4 h-4 mr-2" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {saved ? "Saved!" : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}

export default SessionTimeoutSettings;
