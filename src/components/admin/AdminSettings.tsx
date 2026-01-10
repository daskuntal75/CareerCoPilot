import { useState } from "react";
import { useAppSettings } from "@/contexts/AppSettingsContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, CreditCard, TestTube, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const AdminSettings = () => {
  const { settings, loading, updateSetting } = useAppSettings();
  const [updating, setUpdating] = useState<string | null>(null);

  const handleToggle = async (key: "stripeEnabled" | "demoMode", value: boolean) => {
    setUpdating(key);
    try {
      await updateSetting(key, value);
      toast.success(`${key === "stripeEnabled" ? "Stripe integration" : "Demo mode"} ${value ? "enabled" : "disabled"}`);
    } catch (error) {
      console.error("Error updating setting:", error);
      toast.error("Failed to update setting");
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className={settings.demoMode ? "border-amber-500/50 bg-amber-500/5" : ""}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${settings.demoMode ? "bg-amber-500/10" : "bg-muted"}`}>
                <TestTube className={`w-6 h-6 ${settings.demoMode ? "text-amber-500" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Demo Mode</span>
                  <Badge variant={settings.demoMode ? "default" : "secondary"}>
                    {settings.demoMode ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {settings.demoMode 
                    ? "All users have Pro features" 
                    : "Normal subscription tiers"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={settings.stripeEnabled ? "border-green-500/50 bg-green-500/5" : "border-destructive/50 bg-destructive/5"}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${settings.stripeEnabled ? "bg-green-500/10" : "bg-destructive/10"}`}>
                <CreditCard className={`w-6 h-6 ${settings.stripeEnabled ? "text-green-500" : "text-destructive"}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Stripe Integration</span>
                  <Badge variant={settings.stripeEnabled ? "default" : "destructive"}>
                    {settings.stripeEnabled ? "Live" : "Disabled"}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  {settings.stripeEnabled 
                    ? "Payments are being processed" 
                    : "Payment processing disabled"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settings Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Application Settings</CardTitle>
          <CardDescription>
            Configure demo mode and payment integrations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Demo Mode Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-4">
              <TestTube className="w-5 h-5 text-amber-500" />
              <div>
                <Label htmlFor="demo-mode" className="font-medium">
                  Demo Mode
                </Label>
                <p className="text-sm text-muted-foreground">
                  When enabled, all users receive Pro subscription features without payment
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {updating === "demoMode" && <Loader2 className="w-4 h-4 animate-spin" />}
              <Switch
                id="demo-mode"
                checked={settings.demoMode}
                onCheckedChange={(value) => handleToggle("demoMode", value)}
                disabled={updating === "demoMode"}
              />
            </div>
          </div>

          {/* Stripe Toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border">
            <div className="flex items-center gap-4">
              <CreditCard className="w-5 h-5 text-accent" />
              <div>
                <Label htmlFor="stripe-enabled" className="font-medium">
                  Stripe Integration
                </Label>
                <p className="text-sm text-muted-foreground">
                  Enable live payment processing through Stripe
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {updating === "stripeEnabled" && <Loader2 className="w-4 h-4 animate-spin" />}
              <Switch
                id="stripe-enabled"
                checked={settings.stripeEnabled}
                onCheckedChange={(value) => handleToggle("stripeEnabled", value)}
                disabled={updating === "stripeEnabled"}
              />
            </div>
          </div>

          {/* Warning when enabling Stripe */}
          {settings.stripeEnabled && !settings.demoMode && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Live Mode Active</AlertTitle>
              <AlertDescription>
                Stripe payments are enabled and demo mode is off. Users will need to pay for premium features.
              </AlertDescription>
            </Alert>
          )}

          {settings.stripeEnabled && settings.demoMode && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Configuration Conflict</AlertTitle>
              <AlertDescription>
                Both Stripe and Demo Mode are enabled. Users will have Pro features but can still see payment options. 
                Consider disabling demo mode for production.
              </AlertDescription>
            </Alert>
          )}

          {!settings.stripeEnabled && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Stripe Disabled</AlertTitle>
              <AlertDescription>
                Stripe integration is currently disabled. Before enabling:
                <ul className="list-disc ml-4 mt-2">
                  <li>Ensure your Stripe account is fully set up</li>
                  <li>Verify your business/tax registration (EIN)</li>
                  <li>Test with Stripe test mode first</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
