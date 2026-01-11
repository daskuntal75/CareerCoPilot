import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send, CheckCircle, MessageSquarePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface FeedbackModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Track navigation history in session storage
const NAV_HISTORY_KEY = "careercopilot_nav_history";

export function getNavigationHistory(): string[] {
  try {
    const stored = sessionStorage.getItem(NAV_HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addToNavigationHistory(path: string) {
  try {
    const history = getNavigationHistory();
    // Only add if different from last entry
    if (history[history.length - 1] !== path) {
      history.push(path);
      // Keep last 20 entries
      const trimmed = history.slice(-20);
      sessionStorage.setItem(NAV_HISTORY_KEY, JSON.stringify(trimmed));
    }
  } catch {
    // Ignore storage errors
  }
}

const FeedbackModal = ({ open, onOpenChange }: FeedbackModalProps) => {
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [feedback, setFeedback] = useState("");
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Pre-fill email if user is logged in
  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user?.email, email]);

  const collectMetadata = () => {
    const navHistory = getNavigationHistory();
    
    // Get all cookies as a string (excluding sensitive ones)
    const cookies = document.cookie
      .split(";")
      .map(c => c.trim())
      .filter(c => !c.startsWith("sb-")) // Exclude Supabase auth cookies for privacy
      .join("; ");

    return {
      currentPage: location.pathname,
      fullUrl: window.location.href,
      navigationPath: navHistory,
      previousPage: navHistory.length > 1 ? navHistory[navHistory.length - 2] : null,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      referrer: document.referrer || null,
      sessionCookies: cookies || "none",
      isLoggedIn: !!user,
      userId: user?.id || null,
    };
  };

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      toast({
        title: "Please enter your feedback",
        variant: "destructive",
      });
      return;
    }

    setSending(true);
    try {
      const metadata = collectMetadata();
      
      const { error } = await supabase.functions.invoke("send-feedback", {
        body: {
          feedback: feedback.trim(),
          email: email.trim() || "Not provided",
          metadata,
        },
      });

      if (error) throw error;

      setSent(true);
      toast({
        title: "Feedback sent!",
        description: "Thank you for helping us improve.",
      });

      // Reset and close after a delay
      setTimeout(() => {
        setFeedback("");
        setSent(false);
        onOpenChange(false);
      }, 2000);
    } catch (error) {
      console.error("Error sending feedback:", error);
      toast({
        title: "Failed to send feedback",
        description: "Please try again or email us directly.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-accent" />
            Send Feedback
          </DialogTitle>
          <DialogDescription>
            Help us improve CareerCopilot! Your feedback goes directly to our team.
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="py-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-lg font-medium">Thank you!</p>
            <p className="text-sm text-muted-foreground">Your feedback has been sent.</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Your Email (optional)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback">Your Feedback</Label>
                <Textarea
                  id="feedback"
                  placeholder="Share your thoughts, suggestions, or report issues..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                We'll include context about where you are in the app to help us understand your feedback better.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={sending}>
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Feedback
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default FeedbackModal;
