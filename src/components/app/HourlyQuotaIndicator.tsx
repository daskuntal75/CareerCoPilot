import { AlertCircle, Clock, Infinity, Sparkles, Zap } from "lucide-react";
import { useHourlyQuota } from "@/hooks/useHourlyQuota";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface HourlyQuotaIndicatorProps {
  className?: string;
  showUpgradeLink?: boolean;
  compact?: boolean;
}

export const HourlyQuotaIndicator = ({
  className,
  showUpgradeLink = true,
  compact = false,
}: HourlyQuotaIndicatorProps) => {
  const { remaining, limit, tier, loading, isUnlimited, isLow, isExhausted, resetAt } = useHourlyQuota();

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
        {!compact && <span>Loading quota...</span>}
      </div>
    );
  }

  if (isUnlimited) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <Infinity className="w-4 h-4 text-primary" />
        {!compact && <span>Unlimited AI generations</span>}
      </div>
    );
  }

  const getTimeUntilReset = () => {
    if (!resetAt) return "";
    const minutes = Math.ceil((resetAt.getTime() - Date.now()) / 60000);
    if (minutes <= 0) return "Resets now";
    if (minutes === 1) return "Resets in 1 min";
    return `Resets in ${minutes} min`;
  };

  const content = (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm",
        {
          "bg-destructive/10 text-destructive": isExhausted,
          "bg-warning/10 text-warning": isLow && !isExhausted,
          "bg-muted text-muted-foreground": !isLow && !isExhausted,
        },
        className
      )}
    >
      {isExhausted ? (
        <AlertCircle className="w-4 h-4" />
      ) : isLow ? (
        <Zap className="w-4 h-4" />
      ) : (
        <Sparkles className="w-4 h-4" />
      )}

      {compact ? (
        <span className="font-medium">{remaining}/{limit}</span>
      ) : (
        <span>
          <span className="font-medium">{remaining}</span>
          <span className="text-muted-foreground">/{limit}</span>
          <span className="ml-1">AI generations left this hour</span>
        </span>
      )}

      {!compact && resetAt && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Clock className="w-3.5 h-3.5 ml-1 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p>{getTimeUntilReset()}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );

  if (isExhausted && showUpgradeLink) {
    return (
      <div className="flex flex-col gap-2">
        {content}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-destructive">Limit reached.</span>
          <Button variant="link" size="sm" className="h-auto p-0 text-primary" asChild>
            <Link to="/pricing">Upgrade for more</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (isLow && showUpgradeLink) {
    return (
      <div className="flex flex-col gap-1">
        {content}
        <span className="text-xs text-muted-foreground">
          Running low?{" "}
          <Link to="/pricing" className="text-primary hover:underline">
            Upgrade your plan
          </Link>
        </span>
      </div>
    );
  }

  return content;
};
