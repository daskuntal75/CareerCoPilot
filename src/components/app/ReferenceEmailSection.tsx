import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Mail, Copy, Check, RefreshCw, Sparkles, ChevronDown, ChevronUp 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHourlyQuota } from "@/hooks/useHourlyQuota";
import { HourlyQuotaIndicator } from "./HourlyQuotaIndicator";

interface ReferenceEmailSectionProps {
  jobTitle: string;
  company: string;
  coverLetterContent: string;
  applicationId?: string | null;
  userId?: string;
}

const ReferenceEmailSection = ({
  jobTitle,
  company,
  coverLetterContent,
  applicationId,
  userId,
}: ReferenceEmailSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [referenceEmail, setReferenceEmail] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [referenceName, setReferenceName] = useState("");
  const [referenceRelationship, setReferenceRelationship] = useState("");
  
  const { canGenerate, isExhausted, refreshQuota } = useHourlyQuota();

  const handleGenerate = async () => {
    if (!coverLetterContent.trim()) {
      toast.error("Please generate a cover letter first");
      return;
    }

    if (isExhausted) {
      toast.error("Hourly generation limit reached. Please try again later.");
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-reference-email", {
        body: {
          jobTitle,
          company,
          coverLetterContent,
          referenceName: referenceName.trim() || undefined,
          referenceRelationship: referenceRelationship.trim() || undefined,
          applicationId,
          userId,
        },
      });

      if (error) throw error;

      if (data?.email) {
        setReferenceEmail(data.email);
        toast.success("Reference email generated!");
        refreshQuota();
      } else {
        throw new Error("No email content received");
      }
    } catch (error) {
      console.error("Error generating reference email:", error);
      toast.error("Failed to generate reference email");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(referenceEmail);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = referenceEmail.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
            <Mail className="w-5 h-5 text-accent" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-foreground">Reference Request Email</h3>
            <p className="text-sm text-muted-foreground">
              Generate an email to request a professional reference
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        )}
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 pt-0 space-y-4 border-t border-border">
              {/* Optional inputs for personalization */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="referenceName">Reference Name (optional)</Label>
                  <Input
                    id="referenceName"
                    placeholder="e.g., John Smith"
                    value={referenceName}
                    onChange={(e) => setReferenceName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="referenceRelationship">Your Relationship (optional)</Label>
                  <Input
                    id="referenceRelationship"
                    placeholder="e.g., Former Manager at ABC Corp"
                    value={referenceRelationship}
                    onChange={(e) => setReferenceRelationship(e.target.value)}
                  />
                </div>
              </div>

              {/* Quota indicator */}
              <HourlyQuotaIndicator showUpgradeLink={false} />

              {/* Generate button */}
              {!referenceEmail && (
                <Button
                  variant="hero"
                  className="w-full"
                  onClick={handleGenerate}
                  disabled={isGenerating || isExhausted || !coverLetterContent.trim()}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      {isExhausted ? "Hourly Limit Reached" : "Generate Reference Email"}
                    </>
                  )}
                </Button>
              )}

              {/* Generated email display */}
              {referenceEmail && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full">
                        AI Generated
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {wordCount} words
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerate}
                        disabled={isGenerating || isExhausted}
                      >
                        <RefreshCw className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
                        Regenerate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopy}
                      >
                        {copied ? (
                          <Check className="w-4 h-4 text-success" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                        {copied ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  </div>

                  <Textarea
                    value={referenceEmail}
                    onChange={(e) => setReferenceEmail(e.target.value)}
                    className="min-h-[250px] resize-y font-mono text-sm leading-relaxed"
                    placeholder="Your reference request email will appear here..."
                  />
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReferenceEmailSection;
