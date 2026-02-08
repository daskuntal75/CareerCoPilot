import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft, Download, Copy, RefreshCw, Check, FileText, FileType,
  MessageSquare, ChevronDown, FileEdit, Sparkles, Target, MessageCircle,
  Eye, Clock, History
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { downloadAsDocx } from "@/utils/docx-export";
import type { JobData } from "@/pages/App";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import ExportPreviewModal from "./ExportPreviewModal";
import VersionHistoryPanel from "./VersionHistoryPanel";
import ReferenceEmailSection from "./ReferenceEmailSection";
import { useDocumentVersions, DocumentVersion } from "@/hooks/useDocumentVersions";
import { usePromptTelemetry } from "@/hooks/usePromptTelemetry";
import { HourlyQuotaIndicator } from "./HourlyQuotaIndicator";
import { useHourlyQuota } from "@/hooks/useHourlyQuota";
import { AIQualityRating } from "./AIQualityRating";
import { useAuth } from "@/contexts/AuthContext";

interface CoverLetterEditorProps {
  content: string;
  jobData: JobData;
  onContentChange: (content: string) => void;
  onBack: () => void;
  onGenerateInterviewPrep?: () => void;
  onRegenerateCoverLetter?: (section: string, feedback: string, tips: string[]) => void;
  isRegenerating?: boolean;
  onGoToInterviewPrep?: () => void;
  hasInterviewPrep?: boolean;
  applicationId?: string | null;
  telemetryId?: string | null;
}

const regenerationSections = [
  { key: "opening", label: "Opening Paragraph", description: "Regenerate the attention-grabbing introduction" },
  { key: "skills", label: "Skills & Experience", description: "Regenerate the skills alignment section" },
  { key: "achievements", label: "Key Achievements", description: "Regenerate achievement highlights" },
  { key: "motivation", label: "Company Motivation", description: "Regenerate why this company section" },
  { key: "closing", label: "Closing Paragraph", description: "Regenerate the call-to-action ending" },
  { key: "full", label: "Full Cover Letter", description: "Regenerate the entire cover letter" },
];

const regenerationTips = [
  { id: "more_specific", label: "Add more specific examples", description: "Include concrete details from experience" },
  { id: "shorter", label: "Make it more concise", description: "Reduce word count, get to the point faster" },
  { id: "longer", label: "Expand with more detail", description: "Add more depth and elaboration" },
  { id: "formal", label: "More formal tone", description: "Professional, traditional language" },
  { id: "conversational", label: "More conversational tone", description: "Friendly, approachable language" },
  { id: "quantify", label: "Add more metrics/numbers", description: "Quantify achievements with data" },
  { id: "passion", label: "Show more enthusiasm", description: "Express genuine interest and passion" },
  { id: "unique", label: "Highlight unique value", description: "Emphasize differentiating factors" },
];

const CoverLetterEditor = ({ 
  content, 
  jobData, 
  onContentChange, 
  onBack, 
  onGenerateInterviewPrep,
  onRegenerateCoverLetter,
  isRegenerating,
  onGoToInterviewPrep,
  hasInterviewPrep,
  applicationId,
  telemetryId,
}: CoverLetterEditorProps) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [selectedTips, setSelectedTips] = useState<string[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [hasRated, setHasRated] = useState(false);

  // Hourly quota hook
  const { canGenerate: canGenerateHourly, isExhausted: isHourlyExhausted } = useHourlyQuota();

  // Version history hook
  const {
    versions,
    isLoading: isLoadingVersions,
    saveVersion,
    restoreVersion,
    deleteVersion,
    renameVersion,
  } = useDocumentVersions(applicationId || null, "cover_letter");

  // Prompt telemetry hook
  const { trackCoverLetterPrompt } = usePromptTelemetry();

  // Track previous content for auto-versioning
  const previousContentRef = useRef<string>(content);
  const lastAutoSaveRef = useRef<number>(Date.now());

  // Save initial version when content first loads
  useEffect(() => {
    if (content && applicationId && versions.length === 0) {
      saveVersion(content, null, "initial");
      previousContentRef.current = content;
    }
  }, [content, applicationId, versions.length]);

  // Auto-version after regeneration (significant content change)
  useEffect(() => {
    if (!content || !applicationId || versions.length === 0) return;
    
    const previousContent = previousContentRef.current;
    const timeSinceLastSave = Date.now() - lastAutoSaveRef.current;
    
    // Calculate word count difference
    const previousWordCount = previousContent.trim().split(/\s+/).filter(Boolean).length;
    const currentWordCount = content.trim().split(/\s+/).filter(Boolean).length;
    const wordCountDiff = Math.abs(currentWordCount - previousWordCount);
    
    // Auto-save if content changed significantly (>20% words changed) and at least 30 seconds since last save
    const significantChange = wordCountDiff > Math.max(previousWordCount * 0.2, 20);
    
    if (significantChange && timeSinceLastSave > 30000) {
      saveVersion(content, null, "regenerated", `Auto-saved after changes`);
      previousContentRef.current = content;
      lastAutoSaveRef.current = Date.now();
    }
  }, [content, applicationId, versions.length]);

  const handleRestoreVersion = async (version: DocumentVersion) => {
    const success = await restoreVersion(version);
    if (success && version.content) {
      onContentChange(version.content);
    }
  };

  const handleSelectVersion = (version: DocumentVersion) => {
    if (version.content) {
      // Just preview - don't restore yet
      toast.info(`Viewing version ${version.version_number}. Click "Restore" to apply.`);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = async () => {
    if (!content || content.trim().length === 0) {
      toast.error("No content to export");
      return;
    }
    
    setIsExporting(true);
    try {
      const response = await supabase.functions.invoke("export-pdf", {
        body: { 
          content, 
          title: jobData.title, 
          company: jobData.company, 
          jobTitle: jobData.title,
          type: "cover-letter"
        },
      });
      
      if (response.error) throw new Error(response.error.message);
      
      const { pdf, filename } = response.data;
      
      if (!pdf) {
        throw new Error("No PDF data received");
      }
      
      const byteCharacters = atob(pdf);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success("PDF downloaded!");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const handleDownloadDOCX = async () => {
    if (!content || content.trim().length === 0) {
      toast.error("No content to export");
      return;
    }

    setIsExporting(true);
    try {
      // Use lazy-loaded DOCX export utility
      await downloadAsDocx({
        content,
        title: jobData.title,
        company: jobData.company,
        type: 'cover-letter',
      });
      toast.success("DOCX downloaded!");
    } catch (error) {
      console.error("DOCX export error:", error);
      toast.error("Failed to export DOCX");
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenRegenerateDialog = (sectionKey: string, preselectedTip?: string) => {
    setSelectedSection(sectionKey);
    setFeedbackText("");
    // Pre-select the tip if provided (from quick improvements)
    setSelectedTips(preselectedTip ? [preselectedTip] : []);
    setShowRegenerateDialog(true);
  };

  const handleRegenerateSubmit = async () => {
    if (!feedbackText.trim() && selectedTips.length === 0) {
      toast.error("Please provide feedback or select at least one improvement tip");
      return;
    }
    
    if (onRegenerateCoverLetter && selectedSection) {
      // Build the injected prompt for telemetry
      const tipLabels = selectedTips.map(tipId => {
        const tip = regenerationTips.find(t => t.id === tipId);
        return tip ? `${tip.label}: ${tip.description}` : tipId;
      });
      
      const injectedPrompt = [
        `Section: ${selectedSection}`,
        feedbackText ? `User Feedback: ${feedbackText}` : "",
        tipLabels.length > 0 ? `Improvement Tips: ${tipLabels.join("; ")}` : "",
      ].filter(Boolean).join("\n");

      // Track prompt telemetry for monitoring
      await trackCoverLetterPrompt(
        applicationId || null,
        "regenerate",
        {
          section: selectedSection,
          userFeedback: feedbackText,
          selectedTips,
          injectedPrompt,
          metadata: {
            tipLabels,
            company: jobData.company,
            jobTitle: jobData.title,
            contentWordCount: content.trim().split(/\s+/).filter(Boolean).length,
          },
        }
      );

      onRegenerateCoverLetter(selectedSection, feedbackText, selectedTips);
      setShowRegenerateDialog(false);
      setSelectedSection(null);
      setFeedbackText("");
      setSelectedTips([]);
    }
  };

  const toggleTip = (tipId: string) => {
    setSelectedTips(prev => 
      prev.includes(tipId) 
        ? prev.filter(t => t !== tipId)
        : [...prev, tipId]
    );
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
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Navigate to Interview Prep if exists */}
            {hasInterviewPrep && onGoToInterviewPrep && (
              <Button
                variant="outline"
                size="sm"
                onClick={onGoToInterviewPrep}
              >
                <MessageCircle className="w-4 h-4" />
                View Interview Prep
              </Button>
            )}
            
            {/* Regenerate Dropdown */}
            {onRegenerateCoverLetter && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={isRegenerating}>
                    {isRegenerating ? (
                      <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    Regenerate
                    <ChevronDown className="w-4 h-4 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Select section to regenerate</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {regenerationSections.map((section) => (
                    <DropdownMenuItem
                      key={section.key}
                      onClick={() => handleOpenRegenerateDialog(section.key)}
                      className="flex flex-col items-start gap-0.5 cursor-pointer"
                    >
                      <span className="font-medium">{section.label}</span>
                      <span className="text-xs text-muted-foreground">{section.description}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
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

          {/* Reference Email Section */}
          <ReferenceEmailSection
            jobTitle={jobData.title}
            company={jobData.company}
            coverLetterContent={content}
            applicationId={applicationId}
            userId={user?.id}
          />
        </motion.div>

        {/* Export Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-1"
        >
          <div className="bg-card rounded-xl border border-border p-6 sticky top-24 space-y-6">
            <div>
              <h3 className="font-semibold text-foreground mb-4">Export</h3>
              
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setShowPreviewModal(true)}
                >
                  <Eye className="w-4 h-4" />
                  Preview Document
                </Button>
                
                <Button 
                  variant="accent" 
                  className="w-full justify-start"
                  onClick={handleDownloadPDF}
                  disabled={isExporting}
                >
                  {isExporting ? (
                    <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Download PDF
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={handleDownloadDOCX}
                  disabled={isExporting}
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
            </div>

            {/* Version History */}
            {applicationId && (
              <div className="pt-6 border-t border-border">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => setShowVersionHistory(!showVersionHistory)}
                >
                  <History className="w-4 h-4" />
                  Version History ({versions.length})
                </Button>
                
                <AnimatePresence>
                  {showVersionHistory && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="mt-4 overflow-hidden"
                    >
                      <VersionHistoryPanel
                        versions={versions}
                        currentVersionId={versions.find(v => v.is_current)?.id}
                        documentType="cover_letter"
                        onSelectVersion={handleSelectVersion}
                        onRestoreVersion={handleRestoreVersion}
                        onDeleteVersion={deleteVersion}
                        onRenameVersion={renameVersion}
                        isLoading={isLoadingVersions}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Quality Rating Widget */}
            {telemetryId && !hasRated && (
              <div className="pt-6 border-t border-border">
                <AIQualityRating 
                  telemetryId={telemetryId} 
                  documentType="cover_letter"
                  onRatingSubmitted={() => setHasRated(true)}
                />
              </div>
            )}

            {onGenerateInterviewPrep && !hasInterviewPrep && (
              <div className="pt-6 border-t border-border space-y-3">
                <h4 className="text-sm font-medium text-foreground">Next Step</h4>
                
                {/* Hourly Quota Indicator */}
                <HourlyQuotaIndicator showUpgradeLink={false} />
                
                <Button 
                  variant="hero" 
                  className="w-full"
                  onClick={onGenerateInterviewPrep}
                  disabled={isHourlyExhausted}
                >
                  <MessageSquare className="w-4 h-4" />
                  {isHourlyExhausted ? "Hourly Limit Reached" : "Prepare for Interview"}
                </Button>
              </div>
            )}

            <div className="pt-6 border-t border-border">
              <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" />
                Quick Improvements
              </h4>
              <div className="space-y-2">
                {regenerationTips.slice(0, 4).map((tip) => (
                  <button
                    key={tip.id}
                    onClick={() => handleOpenRegenerateDialog("full", tip.id)}
                    className="w-full text-left text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 p-2 rounded-lg transition-colors flex items-start gap-2"
                  >
                    <Target className="w-3 h-3 mt-0.5 flex-shrink-0 text-accent" />
                    {tip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Regeneration Dialog */}
      <Dialog open={showRegenerateDialog} onOpenChange={setShowRegenerateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileEdit className="w-5 h-5 text-accent" />
              Regenerate {selectedSection ? regenerationSections.find(s => s.key === selectedSection)?.label : "Section"}
            </DialogTitle>
            <DialogDescription>
              Help us understand what you'd like to improve. Your feedback is required to ensure we generate content that meets your expectations.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block">
                What would you like to change? <span className="text-destructive">*</span>
              </label>
              <Textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Please describe what wasn't working and what you'd like instead. Be as specific as possible..."
                className="min-h-[100px]"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">
                Select improvement areas (optional but recommended)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {regenerationTips.map((tip) => (
                  <label
                    key={tip.id}
                    className={`flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                      selectedTips.includes(tip.id) 
                        ? "border-accent bg-accent/5" 
                        : "border-border hover:border-accent/50"
                    }`}
                  >
                    <Checkbox
                      checked={selectedTips.includes(tip.id)}
                      onCheckedChange={() => toggleTip(tip.id)}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="text-sm font-medium">{tip.label}</div>
                      <div className="text-xs text-muted-foreground">{tip.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRegenerateDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="hero" 
              onClick={handleRegenerateSubmit}
              disabled={!feedbackText.trim() && selectedTips.length === 0}
            >
              <RefreshCw className="w-4 h-4" />
              Regenerate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Preview Modal */}
      <ExportPreviewModal
        open={showPreviewModal}
        onOpenChange={setShowPreviewModal}
        type="cover-letter"
        content={content}
        jobTitle={jobData.title}
        company={jobData.company}
        onDownloadPDF={handleDownloadPDF}
        onDownloadDOCX={handleDownloadDOCX}
        isExporting={isExporting}
      />
    </div>
  );
};

export default CoverLetterEditor;
