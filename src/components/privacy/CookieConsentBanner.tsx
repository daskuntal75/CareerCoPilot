import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, Settings, Shield, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useConsentManagement } from "@/hooks/useConsentManagement";
import { Link } from "react-router-dom";

const CookieConsentBanner = () => {
  const {
    consent,
    needsConsent,
    isLoading,
    acceptAll,
    acceptEssentialOnly,
    updateConsent,
  } = useConsentManagement();

  const [showSettings, setShowSettings] = useState(false);
  const [localAnalytics, setLocalAnalytics] = useState(consent.analytics);
  const [localMarketing, setLocalMarketing] = useState(consent.marketing);

  if (isLoading || !needsConsent) {
    return null;
  }

  const handleSavePreferences = () => {
    updateConsent({
      analytics: localAnalytics,
      marketing: localMarketing,
    });
    setShowSettings(false);
  };

  return (
    <>
      <AnimatePresence>
        {needsConsent && !showSettings && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
          >
            <div className="max-w-4xl mx-auto bg-background border border-border rounded-lg shadow-lg p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                    <Cookie className="w-5 h-5 text-accent" />
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  <div>
                    <h3 className="font-semibold text-foreground">
                      We value your privacy
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      We use cookies to improve your experience and analyze site usage.
                      You can customize your preferences or accept all cookies.
                      Read our{" "}
                      <Link to="/privacy" className="text-accent hover:underline">
                        Privacy Policy
                      </Link>{" "}
                      for more information.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={acceptEssentialOnly}
                      className="flex-1 sm:flex-none"
                    >
                      Essential Only
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSettings(true)}
                      className="flex-1 sm:flex-none"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Customize
                    </Button>
                    <Button
                      size="sm"
                      onClick={acceptAll}
                      className="flex-1 sm:flex-none"
                    >
                      Accept All
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cookie Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-accent" />
              Privacy Preferences
            </DialogTitle>
            <DialogDescription>
              Choose which cookies you want to allow. Essential cookies are required
              for the website to function properly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Essential Cookies - Always On */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-lg bg-muted/50">
              <div className="space-y-1">
                <Label className="text-base font-medium">Essential Cookies</Label>
                <p className="text-sm text-muted-foreground">
                  Required for the website to function. Cannot be disabled.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Includes: Authentication, security, preferences
                </p>
              </div>
              <Switch checked={true} disabled className="mt-1" />
            </div>

            {/* Analytics Cookies */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border">
              <div className="space-y-1">
                <Label className="text-base font-medium">Analytics Cookies</Label>
                <p className="text-sm text-muted-foreground">
                  Help us understand how visitors interact with our website.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Includes: Page views, feature usage, performance metrics
                </p>
              </div>
              <Switch
                checked={localAnalytics}
                onCheckedChange={setLocalAnalytics}
                className="mt-1"
              />
            </div>

            {/* Marketing Cookies */}
            <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border">
              <div className="space-y-1">
                <Label className="text-base font-medium">Marketing Cookies</Label>
                <p className="text-sm text-muted-foreground">
                  Used to deliver relevant advertisements and track campaigns.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Includes: Ad personalization, campaign tracking
                </p>
              </div>
              <Switch
                checked={localMarketing}
                onCheckedChange={setLocalMarketing}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePreferences}>
              Save Preferences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CookieConsentBanner;
