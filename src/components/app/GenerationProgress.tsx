import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type GenerationStage = "analyzing" | "drafting" | "refining" | "complete";

interface GenerationProgressProps {
  currentStage: GenerationStage;
  type: "cover-letter" | "interview-prep";
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

const stages: GenerationStage[] = ["analyzing", "drafting", "refining", "complete"];

const GenerationProgress = ({ currentStage, type }: GenerationProgressProps) => {
  const config = stageConfig[type];
  const currentIndex = stages.indexOf(currentStage);

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
            ) : (
              <Loader2 className="w-8 h-8 text-accent" />
            )}
          </motion.div>
          <h2 className="text-xl font-bold text-foreground">
            {type === "cover-letter" ? "Generating Cover Letter" : "Preparing Interview Guide"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Using Gemini 2.5 Pro for enhanced accuracy
          </p>
        </div>

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
            <span>This may take up to a minute</span>
          </div>
          <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-accent rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${((currentIndex + 1) / 3) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default GenerationProgress;
