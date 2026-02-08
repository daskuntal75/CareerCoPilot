import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Copy, Check, RefreshCw, Sparkles, ChevronDown, ChevronUp,
  LucideIcon
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useHourlyQuota } from "@/hooks/useHourlyQuota";
import { HourlyQuotaIndicator } from "./HourlyQuotaIndicator";

export interface EmailSectionConfig {
  icon: LucideIcon;
  title: string;
  description: string;
  functionName: string;
  fields: {
    name: string;
    label: string;
    placeholder: string;
    type?: "text" | "textarea";
  }[];
}

interface JobSearchEmailSectionProps {
  config: EmailSectionConfig;
  jobTitle: string;
  company: string;
  coverLetterContent: string;
  applicationId?: string | null;
  userId?: string;
}

const JobSearchEmailSection = ({
  config,
  jobTitle,
  company,
  coverLetterContent,
  applicationId,
  userId,
}: JobSearchEmailSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [emailContent, setEmailContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  
  const { canGenerate, isExhausted, refreshQuota } = useHourlyQuota();
  const IconComponent = config.icon;

  const handleFieldChange = (fieldName: string, value: string) => {
    setFieldValues(prev => ({ ...prev, [fieldName]: value }));
  };

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
      const { data, error } = await supabase.functions.invoke(config.functionName, {
        body: {
          jobTitle,
          company,
          coverLetterContent,
          ...fieldValues,
          applicationId,
          userId,
        },
      });

      if (error) throw error;

      if (data?.email) {
        setEmailContent(data.email);
        toast.success(`${config.title} generated!`);
        refreshQuota();
      } else {
        throw new Error("No email content received");
      }
    } catch (error) {
      console.error(`Error generating ${config.title}:`, error);
      toast.error(`Failed to generate ${config.title.toLowerCase()}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(emailContent);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const wordCount = emailContent.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden mt-4">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-secondary/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
            <IconComponent className="w-5 h-5 text-accent" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-foreground">{config.title}</h3>
            <p className="text-sm text-muted-foreground">
              {config.description}
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
              {/* Dynamic fields */}
              {config.fields.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {config.fields.map((field) => (
                    <div key={field.name} className="space-y-2">
                      <Label htmlFor={field.name}>{field.label}</Label>
                      {field.type === "textarea" ? (
                        <Textarea
                          id={field.name}
                          placeholder={field.placeholder}
                          value={fieldValues[field.name] || ""}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                          className="min-h-[80px]"
                        />
                      ) : (
                        <Input
                          id={field.name}
                          placeholder={field.placeholder}
                          value={fieldValues[field.name] || ""}
                          onChange={(e) => handleFieldChange(field.name, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Quota indicator */}
              <HourlyQuotaIndicator showUpgradeLink={false} />

              {/* Generate button */}
              {!emailContent && (
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
                      {isExhausted ? "Hourly Limit Reached" : `Generate ${config.title}`}
                    </>
                  )}
                </Button>
              )}

              {/* Generated email display */}
              {emailContent && (
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
                    value={emailContent}
                    onChange={(e) => setEmailContent(e.target.value)}
                    className="min-h-[250px] resize-y font-mono text-sm leading-relaxed"
                    placeholder="Your email will appear here..."
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

export default JobSearchEmailSection;
