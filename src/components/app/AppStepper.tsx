import { Check, FileText, Edit, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppStep } from "@/pages/App";

interface AppStepperProps {
  currentStep: AppStep;
  onStepClick: (step: AppStep) => void;
}

const steps: { id: AppStep; label: string; icon: React.ElementType }[] = [
  { id: "job", label: "Job Description", icon: FileText },
  { id: "editor", label: "Analysis & Cover Letter", icon: Edit },
  { id: "interview", label: "Interview Prep", icon: MessageSquare },
];

const stepOrder: AppStep[] = ["job", "editor", "interview"];

const AppStepper = ({ currentStep, onStepClick }: AppStepperProps) => {
  const currentIndex = stepOrder.indexOf(currentStep);

  return (
    <div className="flex items-center justify-center gap-1 md:gap-2 overflow-x-auto">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = step.id === currentStep;
        const isClickable = index <= currentIndex;

        return (
          <div key={step.id} className="flex items-center flex-shrink-0">
            <button
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1.5 md:px-3 md:py-2 rounded-lg transition-all",
                isCompleted && "bg-success/10 text-success cursor-pointer hover:bg-success/20",
                isCurrent && "bg-accent/10 text-accent cursor-default",
                !isCompleted && !isCurrent && "bg-secondary text-muted-foreground cursor-not-allowed"
              )}
            >
              <div className={cn(
                "w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center transition-colors",
                isCompleted && "bg-success text-success-foreground",
                isCurrent && "bg-accent text-accent-foreground",
                !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
              )}>
                {isCompleted ? (
                  <Check className="w-3.5 h-3.5 md:w-4 md:h-4" />
                ) : (
                  <step.icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
                )}
              </div>
              <span className="hidden lg:inline text-xs md:text-sm font-medium">
                {step.label}
              </span>
            </button>
            
            {index < steps.length - 1 && (
              <div className={cn(
                "w-4 md:w-8 lg:w-12 h-0.5 mx-0.5 md:mx-1 transition-colors",
                index < currentIndex ? "bg-success" : "bg-border"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AppStepper;