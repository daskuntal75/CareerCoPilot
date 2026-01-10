import { Check, Upload, FileText, BarChart3, Edit } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppStep } from "@/pages/App";

interface AppStepperProps {
  currentStep: AppStep;
  onStepClick: (step: AppStep) => void;
}

const steps: { id: AppStep; label: string; icon: React.ElementType }[] = [
  { id: "upload", label: "Resume", icon: Upload },
  { id: "job", label: "Job Description", icon: FileText },
  { id: "analysis", label: "Analysis", icon: BarChart3 },
  { id: "editor", label: "Cover Letter", icon: Edit },
];

const stepOrder: AppStep[] = ["upload", "job", "analysis", "editor"];

const AppStepper = ({ currentStep, onStepClick }: AppStepperProps) => {
  const currentIndex = stepOrder.indexOf(currentStep);

  return (
    <div className="flex items-center justify-center gap-2 md:gap-4">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = step.id === currentStep;
        const isClickable = index <= currentIndex;

        return (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => isClickable && onStepClick(step.id)}
              disabled={!isClickable}
              className={cn(
                "flex items-center gap-2 px-3 py-2 md:px-4 md:py-2.5 rounded-lg transition-all",
                isCompleted && "bg-success/10 text-success cursor-pointer hover:bg-success/20",
                isCurrent && "bg-accent/10 text-accent cursor-default",
                !isCompleted && !isCurrent && "bg-secondary text-muted-foreground cursor-not-allowed"
              )}
            >
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center transition-colors",
                isCompleted && "bg-success text-success-foreground",
                isCurrent && "bg-accent text-accent-foreground",
                !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
              )}>
                {isCompleted ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <step.icon className="w-4 h-4" />
                )}
              </div>
              <span className="hidden md:inline text-sm font-medium">
                {step.label}
              </span>
            </button>
            
            {index < steps.length - 1 && (
              <div className={cn(
                "w-8 md:w-16 h-0.5 mx-1 md:mx-2 transition-colors",
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