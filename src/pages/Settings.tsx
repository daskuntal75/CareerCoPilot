import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { User, Bell, Mail, Clock, Save, Check, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useAnalytics } from "@/hooks/useAnalytics";
import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";

interface ProfileSettings {
  full_name: string | null;
  avatar_url: string | null;
  email_notifications_enabled: boolean;
  interview_reminder_days: number;
}

const Settings = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { trackPageView } = useAnalytics();
  
  const [settings, setSettings] = useState<ProfileSettings>({
    full_name: "",
    avatar_url: null,
    email_notifications_enabled: true,
    interview_reminder_days: 1,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchSettings();
      trackPageView("settings");
    }
  }, [user]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("full_name, avatar_url, email_notifications_enabled, interview_reminder_days")
        .eq("user_id", user?.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      
      if (data) {
        setSettings({
          full_name: data.full_name || "",
          avatar_url: data.avatar_url,
          email_notifications_enabled: data.email_notifications_enabled ?? true,
          interview_reminder_days: data.interview_reminder_days ?? 1,
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: settings.full_name,
          email_notifications_enabled: settings.email_notifications_enabled,
          interview_reminder_days: settings.interview_reminder_days,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;
      
      setSaved(true);
      toast.success("Settings saved successfully");
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 lg:px-8 max-w-3xl">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">Manage your account preferences</p>
          </motion.div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-6"
            >
              {/* Profile Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-accent" />
                    Profile
                  </CardTitle>
                  <CardDescription>Your personal information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user.email || ""}
                      disabled
                      className="bg-secondary/50"
                    />
                    <p className="text-xs text-muted-foreground">
                      Email cannot be changed
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      value={settings.full_name || ""}
                      onChange={(e) => setSettings({ ...settings, full_name: e.target.value })}
                      placeholder="Enter your full name"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Email Notification Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-accent" />
                    Email Notifications
                  </CardTitle>
                  <CardDescription>Configure when and how you receive emails</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="text-base">Enable Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Receive updates about your applications via email
                      </p>
                    </div>
                    <Switch
                      checked={settings.email_notifications_enabled}
                      onCheckedChange={(checked) => 
                        setSettings({ ...settings, email_notifications_enabled: checked })
                      }
                    />
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Mail className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <Label className="text-base">Application Status Updates</Label>
                        <p className="text-sm text-muted-foreground">
                          Get notified when your application status changes
                        </p>
                      </div>
                      <Switch
                        checked={settings.email_notifications_enabled}
                        disabled={!settings.email_notifications_enabled}
                      />
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <Label className="text-base">Interview Reminders</Label>
                        <p className="text-sm text-muted-foreground">
                          Get reminded before upcoming interviews
                        </p>
                        <Select
                          value={settings.interview_reminder_days.toString()}
                          onValueChange={(value) => 
                            setSettings({ ...settings, interview_reminder_days: parseInt(value) })
                          }
                          disabled={!settings.email_notifications_enabled}
                        >
                          <SelectTrigger className="w-[200px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">Same day</SelectItem>
                            <SelectItem value="1">1 day before</SelectItem>
                            <SelectItem value="2">2 days before</SelectItem>
                            <SelectItem value="3">3 days before</SelectItem>
                            <SelectItem value="7">1 week before</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Security Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="w-5 h-5 text-accent" />
                    Security
                  </CardTitle>
                  <CardDescription>Manage your password and security settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <ChangePasswordForm />
                </CardContent>
              </Card>

              {/* Account Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                  <CardDescription>Details about your account</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Account Created</p>
                      <p className="font-medium">
                        {user.created_at 
                          ? new Date(user.created_at).toLocaleDateString()
                          : "Unknown"
                        }
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Sign In</p>
                      <p className="font-medium">
                        {user.last_sign_in_at 
                          ? new Date(user.last_sign_in_at).toLocaleDateString()
                          : "Unknown"
                        }
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex justify-end">
                <Button 
                  onClick={handleSave} 
                  disabled={saving}
                  className="min-w-[120px]"
                >
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                  ) : saved ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Saved
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Settings;
