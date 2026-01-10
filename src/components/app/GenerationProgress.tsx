import { motion } from "framer-motion";
import { Check, Loader2, RefreshCw, AlertTriangle, X, Shield, Lock, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type GenerationStage = "analyzing" | "drafting" | "refining" | "complete";

interface RetryInfo {
  attempt: number;
  maxAttempts: number;
  isRetrying: boolean;
  lastError?: string;
}

interface GenerationProgressProps {
  currentStage: GenerationStage;
  type: "cover-letter" | "interview-prep";
  retryInfo?: RetryInfo;
  onCancel?: () => void;
  streamingContent?: string;
  progress?: number;
}

const stageConfig = {
  "cover-letter": {
    analyzing: { label: "Analyzing job requirements", description: "Matching your experience with job criteria" },
    drafting: { label: "Drafting cover letter", description: "Creating personalized content based on your profile" },
    refining: { label: "Refining & polishing", description: "Enhancing language and formatting" },
    complete: { label: "Complete", description: "Your cover letter is ready" },
  },
  "interview-prep": {
    analyzing: { label: "Researching company", description: "Gathering intelligence and strategic insights" },
    drafting: { label: "Generating questions", description: "Creating role-specific interview scenarios" },
    refining: { label: "Building STAR answers", description: "Crafting responses from your experience" },
    complete: { label: "Complete", description: "Your interview prep is ready" },
  },
};

const securityFeatures = [
  { icon: Shield, text: "Zero-retention AI processing" },
  { icon: Lock, text: "End-to-end encryption" },
  { icon: Eye, text: "PII automatically redacted" },
];

const stages: GenerationStage[] = ["analyzing", "drafting", "refining", "complete"];

const GenerationProgress = ({ 
  currentStage, 
  type, 
  retryInfo, 
  onCancel,
  streamingContent,
  progress: externalProgress 
}: GenerationProgressProps) => {
  const config = stageConfig[type];
  const currentIndex = stages.indexOf(currentStage);
  const calculatedProgress = externalProgress ?? ((currentIndex + 1) / 3) * 100;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-border rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl"
      >
        <div className="text-center mb-8">
          <motion.div
            animate={{ rotate: currentStage !== "complete" ? 360 : 0 }}
            transition={{ duration: 2, repeat: currentStage !== "complete" ? Infinity : 0, ease: "linear" }}
            className="w-16 h-16 mx-auto mb-4 rounded-full bg-accent/10 flex items-center justify-center"
          >
            {currentStage === "complete" ? (
              <Check className="w-8 h-8 text-success" />
            ) : retryInfo?.isRetrying ? (
              <RefreshCw className="w-8 h-8 text-warning" />
            ) : (
              <Loader2 className="w-8 h-8 text-accent" />
            )}
          </motion.div>
          <h2 className="text-xl font-bold text-foreground">
            {type === "cover-letter" ? "Generating Cover Letter" : "Preparing Interview Guide"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Using Gemini 2.5 Flash for fast, accurate results
          </p>
        </div>

        {/* Security Features Banner */}
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-3 rounded-lg bg-success/5 border border-success/20"
        >
          <div className="flex items-center justify-center gap-4 text-xs text-success">
            {securityFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <feature.icon className="w-3.5 h-3.5" />
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Retry Status Banner */}
        {retryInfo && retryInfo.attempt > 1 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className={cn(
              "mb-4 p-3 rounded-lg flex items-center gap-3 text-sm",
              retryInfo.isRetrying 
                ? "bg-warning/10 border border-warning/20 text-warning" 
                : "bg-muted/50 border border-border text-muted-foreground"
            )}
          >
            {retryInfo.isRetrying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
                <div>
                  <p className="font-medium">Retrying... (Attempt {retryInfo.attempt}/{retryInfo.maxAttempts})</p>
                  {retryInfo.lastError && (
                    <p className="text-xs opacity-80 mt-0.5">{retryInfo.lastError}</p>
                  )}
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <p>Recovered after {retryInfo.attempt - 1} retry attempt(s)</p>
              </>
            )}
          </motion.div>
        )}

        {/* Streaming Content Preview */}
        {streamingContent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mb-4 p-3 rounded-lg bg-muted/30 border border-border max-h-32 overflow-y-auto"
          >
            <p className="text-xs text-muted-foreground font-mono whitespace-pre-wrap">
              {streamingContent.slice(-500)}
              <span className="animate-pulse">▊</span>
            </p>
          </motion.div>
        )}

        <div className="space-y-4">
          {stages.slice(0, -1).map((stage, index) => {
            const isComplete = index < currentIndex;
            const isCurrent = index === currentIndex;
            const stageInfo = config[stage];

            return (
              <motion.div
                key={stage}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "flex items-start gap-4 p-3 rounded-lg transition-colors",
                  isCurrent && "bg-accent/5 border border-accent/20",
                  isComplete && "opacity-60"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                  isComplete && "bg-success/20 text-success",
                  isCurrent && "bg-accent/20 text-accent",
                  !isComplete && !isCurrent && "bg-muted text-muted-foreground"
                )}>
                  {isComplete ? (
                    <Check className="w-4 h-4" />
                  ) : isCurrent ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <Loader2 className="w-4 h-4" />
                    </motion.div>
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium",
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {stageInfo.label}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {stageInfo.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-6 pt-4 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Step {Math.min(currentIndex + 1, 3)} of 3</span>
            <span>
              {retryInfo?.isRetrying 
                ? `Retry ${retryInfo.attempt}/${retryInfo.maxAttempts}` 
                : "This may take up to a minute"}
            </span>
          </div>
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full",
                retryInfo?.isRetrying ? "bg-warning" : "bg-accent"
              )}
              initial={{ width: "0%" }}
              animate={{ width: `${calculatedProgress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Cancel Button */}
        {onCancel && currentStage !== "complete" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-4 flex justify-center"
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel Generation
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default GenerationProgress;
