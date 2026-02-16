import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Sparkles, Star, Send, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface FeedbackCollectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  applicationCount: number;
  company?: string;
  jobTitle?: string;
}

const FeedbackCollectionModal = ({
  open,
  onOpenChange,
  applicationCount,
  company,
  jobTitle,
}: FeedbackCollectionModalProps) => {
  const { user } = useAuth();
  const [rating, setRating] = useState<string>("");
  const [feedback, setFeedback] = useState("");
  const [wouldRecommend, setWouldRecommend] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!rating) {
      toast.error("Please select a rating");
      return;
    }

    setSubmitting(true);
    try {
      // Send feedback via edge function
      await supabase.functions.invoke("send-feedback", {
        body: {
          userId: user?.id,
          email: user?.email,
          feedbackType: "demo_completion",
          rating: parseInt(rating),
          wouldRecommend: wouldRecommend === "yes",
          feedback,
          metadata: {
            applicationCount,
            company,
            jobTitle,
          },
        },
      });

      toast.success("Thank you for your feedback! 🎉", {
        description: "Early adopters like you help us build a better product.",
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const isLastDemoApp = applicationCount === 3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-accent" />
            {isLastDemoApp ? "Demo Complete! Share Your Experience" : "How was your experience?"}
          </DialogTitle>
          <DialogDescription>
            {isLastDemoApp ? (
              <>
                You've completed all 3 demo applications! Your feedback helps us improve and qualifies you for{" "}
                <span className="text-accent font-medium">discounted early adopter pricing</span>.
              </>
            ) : (
              "Quick feedback helps us build a better product for you."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Rating */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              How would you rate your experience?
            </Label>
            <RadioGroup value={rating} onValueChange={setRating} className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <div key={value} className="flex flex-col items-center">
                  <RadioGroupItem
                    value={value.toString()}
                    id={`rating-${value}`}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={`rating-${value}`}
                    className="flex items-center justify-center w-10 h-10 rounded-full border-2 cursor-pointer transition-all peer-data-[state=checked]:bg-accent peer-data-[state=checked]:border-accent peer-data-[state=checked]:text-accent-foreground hover:border-accent/50"
                  >
                    {value}
                  </Label>
                  <span className="text-xs text-muted-foreground mt-1">
                    {value === 1 ? "Poor" : value === 5 ? "Great" : ""}
                  </span>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Would recommend */}
          <div className="space-y-3">
            <Label>Would you recommend TailoredApply to a friend?</Label>
            <RadioGroup value={wouldRecommend} onValueChange={setWouldRecommend} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="yes" id="recommend-yes" />
                <Label htmlFor="recommend-yes" className="cursor-pointer">Yes, definitely!</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="maybe" id="recommend-maybe" />
                <Label htmlFor="recommend-maybe" className="cursor-pointer">Maybe</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="no" id="recommend-no" />
                <Label htmlFor="recommend-no" className="cursor-pointer">Not yet</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Free text feedback */}
          <div className="space-y-3">
            <Label htmlFor="feedback">What could we do better? (Optional)</Label>
            <Textarea
              id="feedback"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Share your thoughts, suggestions, or what features you'd like to see..."
              className="min-h-[100px]"
              maxLength={1000}
            />
          </div>

          {/* Early adopter benefit reminder */}
          {isLastDemoApp && (
            <div className="flex items-start gap-3 p-3 bg-accent/10 rounded-lg border border-accent/20">
              <Gift className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Early Adopter Benefit</p>
                <p className="text-muted-foreground">
                  By sharing your feedback, you'll be eligible for discounted pricing when we launch the full version!
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Skip for now
          </Button>
          <Button onClick={handleSubmit} disabled={submitting} className="flex-1">
            {submitting ? (
              <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Feedback
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackCollectionModal;