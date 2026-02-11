import { useEffect, useCallback } from "react";
import { AppStep } from "@/pages/App";

interface UseKeyboardShortcutsOptions {
  currentStep: AppStep;
  setCurrentStep: (step: AppStep) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  hasAnalysis?: boolean;
  hasCoverLetter?: boolean;
  hasInterviewPrep?: boolean;
}

const STEPS: AppStep[] = ["job", "editor", "interview"];

export function useKeyboardShortcuts({
  currentStep,
  setCurrentStep,
  onCancel,
  isLoading = false,
  hasAnalysis = false,
  hasCoverLetter = false,
  hasInterviewPrep = false,
}: UseKeyboardShortcutsOptions) {
  const canGoToStep = useCallback((step: AppStep): boolean => {
    switch (step) {
      case "job":
        return true;
      case "editor":
        return hasAnalysis || hasCoverLetter;
      case "interview":
        return hasInterviewPrep;
      default:
        return false;
    }
  }, [hasAnalysis, hasCoverLetter, hasInterviewPrep]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === "Escape" && isLoading && onCancel) {
      event.preventDefault();
      onCancel();
      return;
    }

    const target = event.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return;
    }

    const currentIndex = STEPS.indexOf(currentStep);

    if (event.key === "ArrowLeft" && currentIndex > 0) {
      const prevStep = STEPS[currentIndex - 1];
      if (canGoToStep(prevStep)) {
        event.preventDefault();
        setCurrentStep(prevStep);
      }
    }

    if (event.key === "ArrowRight" && currentIndex < STEPS.length - 1) {
      const nextStep = STEPS[currentIndex + 1];
      if (canGoToStep(nextStep)) {
        event.preventDefault();
        setCurrentStep(nextStep);
      }
    }
  }, [currentStep, setCurrentStep, onCancel, isLoading, canGoToStep]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const getKeyboardHints = useCallback(() => {
    const hints: string[] = [];
    const currentIndex = STEPS.indexOf(currentStep);

    if (currentIndex > 0 && canGoToStep(STEPS[currentIndex - 1])) {
      hints.push("← Previous step");
    }
    if (currentIndex < STEPS.length - 1 && canGoToStep(STEPS[currentIndex + 1])) {
      hints.push("→ Next step");
    }
    if (isLoading) {
      hints.push("Esc Cancel");
    }

    return hints;
  }, [currentStep, canGoToStep, isLoading]);

  return { getKeyboardHints };
}
