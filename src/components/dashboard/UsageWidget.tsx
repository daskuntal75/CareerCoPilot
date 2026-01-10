import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUsageTracking } from "@/hooks/useUsageTracking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  MessageSquare, 
  Sparkles, 
  Crown, 
  Zap,
  ArrowRight,
  RefreshCw
} from "lucide-react";
import { cn } from "@/lib/utils";

const UsageWidget = () => {
  const { subscription, refreshSubscription } = useAuth();
  const { usage, limits, getRemainingUsage, loading, refreshUsage } = useUsageTracking();

  const coverLetterRemaining = getRemainingUsage("cover_letter");
  const isFreeTier = subscription.tier === "free";
  const isUnlimited = limits.cover_letter === -1;

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

  const getTierColor = () => {
    switch (subscription.tier) {
      case "premium":
        return "from-yellow-500/20 to-orange-500/20 border-yellow-500/30";
      case "pro":
        return "from-accent/20 to-primary/20 border-accent/30";
      default:
        return "from-secondary to-secondary border-border";
    }
  };

  const handleRefresh = async () => {
    await Promise.all([refreshSubscription(), refreshUsage()]);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center">
            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "bg-gradient-to-br border",
      getTierColor()
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {getTierIcon()}
            <span className="capitalize">{subscription.tier} Plan</span>
          </CardTitle>
          <Button variant="ghost" size="icon" onClick={handleRefresh} className="h-8 w-8">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        {subscription.subscription_end && (
          <p className="text-xs text-muted-foreground">
            Renews {new Date(subscription.subscription_end).toLocaleDateString()}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Cover Letters Usage */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span>Cover Letters</span>
            </div>
            {isUnlimited ? (
              <Badge variant="secondary" className="text-xs">Unlimited</Badge>
            ) : (
              <span className="text-muted-foreground">
                {coverLetterRemaining} / {limits.cover_letter} left
              </span>
            )}
          </div>
          {!isUnlimited && (
            <Progress 
              value={((limits.cover_letter - (coverLetterRemaining || 0)) / limits.cover_letter) * 100} 
              className="h-2"
            />
          )}
        </div>

        {/* Interview Prep Access */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span>Interview Prep</span>
            </div>
            {limits.interview_prep === -1 ? (
              <Badge variant="secondary" className="text-xs">Unlimited</Badge>
            ) : (
              <Badge variant="outline" className="text-xs">Pro Feature</Badge>
            )}
          </div>
        </div>

        {/* Upgrade CTA for free tier */}
        {isFreeTier && (
          <div className="pt-2">
            <Button asChild size="sm" className="w-full">
              <Link to="/pricing">
                <Sparkles className="w-4 h-4 mr-2" />
                Upgrade to Pro
                <ArrowRight className="w-4 h-4 ml-2" />
              </Link>
            </Button>
          </div>
        )}

        {/* Manage subscription for paid tiers */}
        {!isFreeTier && (
          <div className="pt-2">
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to="/settings?tab=billing">
                Manage Subscription
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UsageWidget;
