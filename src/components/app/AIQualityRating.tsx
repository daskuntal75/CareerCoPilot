import { useState } from "react";
import { ThumbsUp, ThumbsDown, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePromptTelemetry } from "@/hooks/usePromptTelemetry";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface AIQualityRatingProps {
  telemetryId: string | null;
  className?: string;
  onRatingSubmitted?: (rating: number) => void;
  documentType: "cover_letter" | "interview_prep";
}

export const AIQualityRating = ({
  telemetryId,
  className,
  onRatingSubmitted,
  documentType,
}: AIQualityRatingProps) => {
  const [rating, setRating] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { ratePromptResponse } = usePromptTelemetry();

  const handleRate = async (value: number) => {
    if (!telemetryId || isSubmitting || isSubmitted) return;

    setIsSubmitting(true);
    setRating(value);

    try {
      const success = await ratePromptResponse(telemetryId, value);
      
      if (success) {
        setIsSubmitted(true);
        onRatingSubmitted?.(value);
        toast.success(value >= 4 ? "Thanks for the positive feedback!" : "Thanks for your feedback. We'll work to improve!");
      } else {
        toast.error("Failed to submit rating");
        setRating(null);
      }
    } catch (error) {
      console.error("Error submitting rating:", error);
      toast.error("Failed to submit rating");
      setRating(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!telemetryId) return null;

  const label = documentType === "cover_letter" 
    ? "How was this cover letter?" 
    : "How was this interview prep?";

  return (
    <AnimatePresence mode="wait">
      {isSubmitted ? (
        <motion.div
          key="submitted"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className={cn(
            "flex items-center gap-2 text-sm text-success bg-success/10 px-3 py-2 rounded-lg",
            className
          )}
        >
          <Check className="w-4 h-4" />
          <span>Thanks for your feedback!</span>
        </motion.div>
      ) : (
        <motion.div
          key="rating"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border",
            className
          )}
        >
          <span className="text-sm text-muted-foreground">{label}</span>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleRate(5)}
              className={cn(
                "h-8 w-8 p-0 hover:bg-success/20 hover:text-success transition-colors",
                rating === 5 && "bg-success/20 text-success"
              )}
            >
              {isSubmitting && rating === 5 ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ThumbsUp className="w-4 h-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={isSubmitting}
              onClick={() => handleRate(2)}
              className={cn(
                "h-8 w-8 p-0 hover:bg-destructive/20 hover:text-destructive transition-colors",
                rating === 2 && "bg-destructive/20 text-destructive"
              )}
            >
              {isSubmitting && rating === 2 ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ThumbsDown className="w-4 h-4" />
              )}
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
