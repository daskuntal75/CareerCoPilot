import { motion, AnimatePresence } from "framer-motion";
import { Check, Loader2, RefreshCw, AlertTriangle, X, Shield, Lock, Eye, Sparkles, Zap, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

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
    analyzing: { 
      label: "Analyzing job fit score", 
      description: "Evaluating your qualifications against job requirements",
      icon: Brain,
      tips: ["Scoring requirement matches", "Mapping your skills to job criteria", "Calculating fit percentage"]
    },
    drafting: { 
      label: "Generating cover letter", 
      description: "Creating a tailored cover letter from your analysis",
      icon: Sparkles,
      tips: ["Writing compelling opening", "Highlighting achievements", "Adding STAR examples"]
    },
    refining: { 
      label: "Refining & polishing", 
      description: "Enhancing language and flow",
      icon: Zap,
      tips: ["Optimizing tone", "Improving clarity", "Final quality check"]
    },
    complete: { 
      label: "Complete", 
      description: "Your fit analysis & cover letter are ready",
      icon: Check,
      tips: []
    },
  },
  "interview-prep": {
    analyzing: { 
      label: "Researching company", 
      description: "Gathering intelligence and insights",
      icon: Brain,
      tips: ["Analyzing company culture", "Identifying key stakeholders", "Understanding the market"]
    },
    drafting: { 
      label: "Generating questions", 
      description: "Creating interview scenarios",
      icon: Sparkles,
      tips: ["Predicting behavioral questions", "Building technical scenarios", "Preparing case studies"]
    },
    refining: { 
      label: "Building STAR answers", 
      description: "Crafting responses from your experience",
      icon: Zap,
      tips: ["Structuring situations", "Highlighting actions", "Quantifying results"]
    },
    complete: { 
      label: "Complete", 
      description: "Your interview prep is ready",
      icon: Check,
      tips: []
    },
  },
};

const securityFeatures = [
  { icon: Shield, text: "Zero-retention AI" },
  { icon: Lock, text: "Encrypted" },
  { icon: Eye, text: "PII protected" },
];

const stages: GenerationStage[] = ["analyzing", "drafting", "refining", "complete"];

// Rotating tips component
const RotatingTips = ({ tips }: { tips: string[] }) => {
  const [currentTip, setCurrentTip] = useState(0);
  
  useEffect(() => {
    if (tips.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % tips.length);
    }, 2500);
    return () => clearInterval(interval);
  }, [tips.length]);
  
  if (tips.length === 0) return null;
  
  return (
    <AnimatePresence mode="wait">
      <motion.p
        key={currentTip}
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -5 }}
        className="text-xs text-accent/80 flex items-center gap-1.5"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
        {tips[currentTip]}
      </motion.p>
    </AnimatePresence>
  );
};

// Streaming content preview with live typing effect
const StreamingPreview = ({ content }: { content: string }) => {
  const displayContent = content.slice(-400);
  const lines = displayContent.split('\n').slice(-6);
  
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="mb-4 rounded-lg bg-muted/20 border border-border/50 overflow-hidden"
    >
      <div className="px-3 py-2 border-b border-border/50 bg-muted/30 flex items-center gap-2">
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-destructive/50" />
          <span className="w-2 h-2 rounded-full bg-warning/50" />
          <span className="w-2 h-2 rounded-full bg-success/50" />
        </div>
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Live Preview</span>
      </div>
      <div className="p-3 max-h-28 overflow-y-auto">
        <div className="font-mono text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">
          {lines.map((line, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: i === lines.length - 1 ? 1 : 0.7 }}
              className={cn(i === lines.length - 1 && "font-medium")}
            >
              {line || '\u00A0'}
            </motion.div>
          ))}
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="inline-block w-2 h-4 bg-accent ml-0.5 align-middle"
          />
        </div>
      </div>
    </motion.div>
  );
};

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
  const baseProgress = (currentIndex / 3) * 100;
  const stageProgress = 33.33;
  
  // Animate progress within current stage
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  useEffect(() => {
    if (externalProgress !== undefined) {
      setAnimatedProgress(externalProgress);
      return;
    }
    
    // Simulate progress within stage
    const targetProgress = baseProgress + (stageProgress * 0.9);
    const increment = (targetProgress - animatedProgress) * 0.1;
    
    const interval = setInterval(() => {
      setAnimatedProgress(prev => {
        if (prev >= targetProgress) return prev;
        return Math.min(prev + increment, targetProgress);
      });
    }, 200);
    
    return () => clearInterval(interval);
  }, [currentStage, baseProgress, externalProgress]);

  const currentConfig = config[currentStage];
  const CurrentIcon = currentConfig.icon;

  return (
    <div className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full mx-4 shadow-2xl"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center relative"
          >
            {/* Spinning ring */}
            {currentStage !== "complete" && (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent"
              />
            )}
            
            <motion.div
              animate={{ 
                scale: currentStage === "complete" ? [1, 1.2, 1] : 1,
              }}
              transition={{ duration: 0.3 }}
            >
              {currentStage === "complete" ? (
                <Check className="w-10 h-10 text-success" />
              ) : retryInfo?.isRetrying ? (
                <RefreshCw className="w-10 h-10 text-warning animate-spin" />
              ) : (
                <CurrentIcon className="w-10 h-10 text-accent" />
              )}
            </motion.div>
          </motion.div>
          
          <h2 className="text-xl font-bold text-foreground">
            {currentConfig.label}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {currentConfig.description}
          </p>
          
          {/* Rotating tips */}
          <div className="mt-3 h-5">
            <RotatingTips tips={currentConfig.tips} />
          </div>
        </div>

        {/* Security Features */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="mb-4 p-2 rounded-lg bg-success/5 border border-success/10"
        >
          <div className="flex items-center justify-center gap-4 text-[10px] text-success uppercase tracking-wider">
            {securityFeatures.map((feature, index) => (
              <div key={index} className="flex items-center gap-1">
                <feature.icon className="w-3 h-3" />
                <span>{feature.text}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Retry Status */}
        <AnimatePresence>
          {retryInfo && retryInfo.attempt > 1 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
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
                  <p>Recovered after {retryInfo.attempt - 1} retry</p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Streaming Content Preview */}
        <AnimatePresence>
          {streamingContent && streamingContent.length > 10 && (
            <StreamingPreview content={streamingContent} />
          )}
        </AnimatePresence>

        {/* Stage Progress Steps */}
        <div className="flex items-center justify-between mb-6">
          {stages.slice(0, -1).map((stage, index) => {
            const isComplete = index < currentIndex;
            const isCurrent = index === currentIndex;
            const StageIcon = config[stage].icon;

            return (
              <div key={stage} className="flex-1 flex items-center">
                <motion.div
                  animate={{
                    scale: isCurrent ? 1.1 : 1,
                  }}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                    isComplete && "bg-success text-success-foreground",
                    isCurrent && "bg-accent text-accent-foreground",
                    !isComplete && !isCurrent && "bg-muted text-muted-foreground"
                  )}
                >
                  {isComplete ? (
                    <Check className="w-5 h-5" />
                  ) : isCurrent ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    >
                      <StageIcon className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <StageIcon className="w-5 h-5" />
                  )}
                </motion.div>
                
                {index < 2 && (
                  <div className="flex-1 h-1 mx-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full bg-accent"
                      initial={{ width: "0%" }}
                      animate={{ 
                        width: isComplete ? "100%" : isCurrent ? "50%" : "0%" 
                      }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Main Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {type === "cover-letter" ? "Analyzing Fit & Generating Cover Letter" : "Preparing Interview Guide"}
            </span>
            <span className="font-mono text-foreground">
              {Math.round(animatedProgress)}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className={cn(
                "h-full rounded-full",
                retryInfo?.isRetrying 
                  ? "bg-warning" 
                  : "bg-gradient-to-r from-accent to-accent/70"
              )}
              initial={{ width: "0%" }}
              animate={{ width: `${animatedProgress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-center">
            {retryInfo?.isRetrying 
              ? `Retry ${retryInfo.attempt}/${retryInfo.maxAttempts}` 
              : "Powered by advanced AI • Results are non-deterministic and may vary between runs"}
          </p>
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
              Cancel
            </Button>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};

export default GenerationProgress;
