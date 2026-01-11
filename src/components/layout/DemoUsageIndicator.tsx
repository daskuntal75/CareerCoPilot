import { useDemoLimit } from "@/hooks/useDemoLimit";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FileText } from "lucide-react";

const DemoUsageIndicator = () => {
  const { isDemoMode, applicationCount, demoLimit, loading, isWhitelisted } = useDemoLimit();

  // Don't show if not in demo mode, still loading, or user is whitelisted
  if (!isDemoMode || loading || isWhitelisted) {
    return null;
  }

  const remaining = Math.max(0, demoLimit - applicationCount);
  const isAtLimit = remaining === 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={isAtLimit ? "destructive" : "secondary"}
            className="flex items-center gap-1.5 cursor-help"
          >
            <FileText className="w-3 h-3" />
            <span>{applicationCount} of {demoLimit}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">Demo Mode</p>
          <p className="text-xs text-muted-foreground">
            {isAtLimit 
              ? "Limit reached. Contact support for full access."
              : `${remaining} job application${remaining !== 1 ? 's' : ''} remaining`
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default DemoUsageIndicator;
