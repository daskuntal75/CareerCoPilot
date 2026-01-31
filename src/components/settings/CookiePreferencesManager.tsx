import { useState, useEffect } from "react";
import { Cookie, Settings, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useConsentManagement } from "@/hooks/useConsentManagement";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const CookiePreferencesManager = () => {
  const {
    consent,
    isLoading,
    updateConsent,
    acceptAll,
    revokeConsent,
  } = useConsentManagement();

  const [localAnalytics, setLocalAnalytics] = useState(consent.analytics);
  const [localMarketing, setLocalMarketing] = useState(consent.marketing);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalAnalytics(consent.analytics);
    setLocalMarketing(consent.marketing);
  }, [consent]);

  useEffect(() => {
    const analyticsChanged = localAnalytics !== consent.analytics;
    const marketingChanged = localMarketing !== consent.marketing;
    setHasChanges(analyticsChanged || marketingChanged);
  }, [localAnalytics, localMarketing, consent]);

  const handleSavePreferences = () => {
    updateConsent({
      analytics: localAnalytics,
      marketing: localMarketing,
    });
    toast.success("Cookie preferences updated successfully");
  };

  const handleAcceptAll = () => {
    acceptAll();
    setLocalAnalytics(true);
    setLocalMarketing(true);
    toast.success("All cookies accepted");
  };

  const handleRejectOptional = () => {
    revokeConsent();
    setLocalAnalytics(false);
    setLocalMarketing(false);
    toast.success("Optional cookies rejected");
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-20 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cookie className="w-5 h-5 text-accent" />
          Cookie Preferences
        </CardTitle>
        <CardDescription>
          Manage how we use cookies on this site. Your preferences are stored locally and respected immediately.
          {consent.consentTimestamp && (
            <span className="block mt-1 text-xs">
              Last updated: {new Date(consent.consentTimestamp).toLocaleDateString()}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Essential Cookies - Always On */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-muted/50">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent" />
              <Label className="text-base font-medium">Essential Cookies</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Required for the website to function properly. These cannot be disabled as they are necessary for authentication, security, and basic preferences.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Includes: Session management, authentication tokens, security features, CSRF protection
            </p>
          </div>
          <Switch checked={true} disabled className="mt-1" aria-label="Essential cookies (always enabled)" />
        </div>

        {/* Analytics Cookies */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <Label className="text-base font-medium">Analytics Cookies</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Help us understand how visitors interact with our website. This data is used to improve the user experience and product features.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Includes: Page views, feature usage metrics, performance monitoring, error tracking
            </p>
          </div>
          <Switch
            checked={localAnalytics}
            onCheckedChange={setLocalAnalytics}
            className="mt-1"
            aria-label="Toggle analytics cookies"
          />
        </div>

        {/* Marketing Cookies */}
        <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <Label className="text-base font-medium">Marketing Cookies</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              Used to deliver relevant advertisements and track the effectiveness of marketing campaigns.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Includes: Ad personalization, campaign tracking, conversion measurement
            </p>
          </div>
          <Switch
            checked={localMarketing}
            onCheckedChange={setLocalMarketing}
            className="mt-1"
            aria-label="Toggle marketing cookies"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={handleRejectOptional}
            className="flex-1"
          >
            Reject Optional
          </Button>
          <Button
            variant="outline"
            onClick={handleAcceptAll}
            className="flex-1"
          >
            Accept All
          </Button>
          <Button
            onClick={handleSavePreferences}
            disabled={!hasChanges}
            className="flex-1"
          >
            Save Preferences
          </Button>
        </div>

        {/* Additional Info */}
        <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
          <p>
            For more details about the cookies we use, please read our{" "}
            <Link to="/cookies" className="text-accent hover:underline">
              Cookie Policy
            </Link>
            . You can also learn more about your privacy rights in our{" "}
            <Link to="/privacy" className="text-accent hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default CookiePreferencesManager;
