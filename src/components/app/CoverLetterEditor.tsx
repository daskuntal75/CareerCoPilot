import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Download, Copy, RefreshCw, Check, FileText, FileType } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import type { JobData } from "@/pages/App";

interface CoverLetterEditorProps {
  content: string;
  jobData: JobData;
  onContentChange: (content: string) => void;
  onBack: () => void;
}

const CoverLetterEditor = ({ content, jobData, onContentChange, onBack }: CoverLetterEditorProps) => {
  const [copied, setCopied] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = () => {
    // In a real app, this would generate a PDF
    toast.success("PDF download started");
  };

  const handleDownloadDOCX = () => {
    // In a real app, this would generate a DOCX
    toast.success("DOCX download started");
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    // In a real app, this would call the AI again
    toast.success("Cover letter regenerated");
    setIsRegenerating(false);
  };

  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to analysis
        </button>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Your Cover Letter
            </h1>
            <p className="text-muted-foreground">
              {jobData.title} at {jobData.company}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRegenerate}
              disabled={isRegenerating}
            >
              {isRegenerating ? (
                <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
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
      </motion.div>

      <div className="grid lg:grid-cols-4 gap-6">
        {/* Editor */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-3"
        >
          <div className="bg-card rounded-xl border border-border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full">
                  AI Generated
                </span>
                <span className="text-xs text-muted-foreground">
                  Auto-saved
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {wordCount} words
              </span>
            </div>
            
            <Textarea
              value={content}
              onChange={(e) => onContentChange(e.target.value)}
              className="min-h-[500px] resize-y font-mono text-sm leading-relaxed"
              placeholder="Your cover letter will appear here..."
            />
          </div>
        </motion.div>

        {/* Export Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-1"
        >
          <div className="bg-card rounded-xl border border-border p-6 sticky top-24">
            <h3 className="font-semibold text-foreground mb-4">Export</h3>
            
            <div className="space-y-3">
              <Button 
                variant="accent" 
                className="w-full justify-start"
                onClick={handleDownloadPDF}
              >
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={handleDownloadDOCX}
              >
                <FileType className="w-4 h-4" />
                Download DOCX
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={handleCopy}
              >
                <FileText className="w-4 h-4" />
                Copy as Text
              </Button>
            </div>

            <div className="mt-6 pt-6 border-t border-border">
              <h4 className="text-sm font-medium text-foreground mb-3">Tips</h4>
              <ul className="text-xs text-muted-foreground space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-accent">•</span>
                  Review for your personal voice
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent">•</span>
                  Add specific details if needed
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-accent">•</span>
                  Keep it under 400 words
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CoverLetterEditor;