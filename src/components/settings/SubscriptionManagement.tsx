import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CreditCard, Loader2, ExternalLink, RefreshCw, Crown, Sparkles, Zap, TestTube } from "lucide-react";
import { toast } from "sonner";

const SubscriptionManagement = () => {
  const { subscription, refreshSubscription } = useAuth();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [stripeEnabled, setStripeEnabled] = useState(false);

  useEffect(() => {
    checkSettings();
  }, []);

  const checkSettings = async () => {
    try {
      const { data } = await supabase.functions.invoke("check-demo-mode");
      if (data) {
        setDemoMode(data.demo_mode ?? false);
        setStripeEnabled(data.stripe_enabled ?? false);
      }
    } catch (error) {
      console.error("Error checking settings:", error);
    }
  };

  const handleManageSubscription = async () => {
    if (!stripeEnabled) {
      toast.info("Billing portal is not available in demo mode");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      
      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Portal error:", error);
      toast.error("Failed to open billing portal");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshSubscription();
    setRefreshing(false);
    toast.success("Subscription status refreshed");
  };

  const getTierIcon = () => {
    switch (subscription.tier) {
      case "premium":
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case "pro":
        return <Sparkles className="w-5 h-5 text-accent" />;
      default:
        return <Zap className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getTierBadgeVariant = () => {
    switch (subscription.tier) {
      case "premium":
        return "default";
      case "pro":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-accent" />
          Subscription
        </CardTitle>
        <CardDescription>Manage your subscription and billing</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Plan */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border">
          <div className="flex items-center gap-3">
            {getTierIcon()}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold capitalize">{subscription.tier} Plan</span>
                <Badge variant={getTierBadgeVariant()}>
                  {subscription.subscribed ? "Active" : "Free"}
                </Badge>
                {demoMode && !stripeEnabled && subscription.subscribed && (
                  <Badge variant="outline" className="border-amber-500 text-amber-500">
                    <TestTube className="w-3 h-3 mr-1" />
                    Demo
                  </Badge>
                )}
              </div>
              {subscription.subscription_end && !demoMode && (
                <p className="text-sm text-muted-foreground">
                  Renews on {new Date(subscription.subscription_end).toLocaleDateString()}
                </p>
              )}
              {demoMode && !stripeEnabled && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  Demo mode - Pro features unlocked
                </p>
              )}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          {subscription.subscribed && stripeEnabled ? (
            <Button
              variant="outline"
              onClick={handleManageSubscription}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ExternalLink className="w-4 h-4 mr-2" />
              )}
              Manage Billing
            </Button>
          ) : subscription.subscribed && !stripeEnabled ? (
            <div className="flex-1 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-center">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Demo mode active - billing management unavailable
              </p>
            </div>
          ) : (
            <Button asChild className="flex-1">
              <Link to="/pricing">
                <Sparkles className="w-4 h-4 mr-2" />
                Upgrade Plan
              </Link>
            </Button>
          )}
        </div>
        {/* Feature highlights */}
        {!subscription.subscribed && (
          <div className="pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground mb-2">Upgrade to unlock:</p>
            <ul className="text-sm space-y-1">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                Unlimited cover letters
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                Full interview preparation
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                STAR answer frameworks
              </li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SubscriptionManagement;
