import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, ChevronRight, Sparkles, Check, Minus, X, AlertCircle, MessageCircle, FileText, Download, Eye, Copy, FileType } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { AnalysisData, JobData, RequirementMatch } from "@/pages/App";
import RAGDebugPanel from "./RAGDebugPanel";
import { useUsageTracking } from "@/hooks/useUsageTracking";
import { useAuth } from "@/contexts/AuthContext";
import { HourlyQuotaIndicator } from "./HourlyQuotaIndicator";
import { useHourlyQuota } from "@/hooks/useHourlyQuota";
import JobSearchEmailsContainer from "./JobSearchEmailsContainer";
import { toast } from "sonner";

interface AnalysisResultsProps {
  data: AnalysisData;
  jobData: JobData;
  onGenerate: () => void;
  onGenerateInterviewPrep?: () => void;
  onBack: () => void;
  applicationId: string | null;
  coverLetter?: string;
  onViewEditCoverLetter?: () => void;
  onDownloadPDF?: () => void;
  onDownloadDOCX?: () => void;
  isExporting?: boolean;
}

const fitLevelLabels = {
  strong: { label: "Strong Fit", color: "bg-success/10 text-success" },
  good: { label: "Good Fit", color: "bg-success/10 text-success" },
  partial: { label: "Partial Fit", color: "bg-warning/10 text-warning" },
  low: { label: "Low Fit", color: "bg-destructive/10 text-destructive" },
};

const statusIcons = {
  yes: { icon: Check, color: "text-success", bg: "bg-success" },
  partial: { icon: Minus, color: "text-warning", bg: "bg-warning" },
  no: { icon: X, color: "text-destructive", bg: "bg-destructive" },
};

const RequirementRow = ({ item, index }: { item: RequirementMatch; index: number }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = statusIcons[item.status];
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border border-border rounded-lg overflow-hidden"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 p-4 hover:bg-secondary/50 transition-colors text-left"
      >
        <div className={cn("w-6 h-6 rounded-full flex items-center justify-center", status.bg)}>
          <StatusIcon className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="flex-1 text-sm text-foreground">{item.requirement}</span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0">
              <div className="pl-9 text-sm text-muted-foreground bg-secondary/30 rounded-lg p-3">
                <span className="font-medium text-foreground">Evidence: </span>
                {item.evidence}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const AnalysisResults = ({ data, jobData, onGenerate, onGenerateInterviewPrep, onBack, applicationId, coverLetter, onViewEditCoverLetter, onDownloadPDF, onDownloadDOCX, isExporting }: AnalysisResultsProps) => {
  const { user, subscription } = useAuth();
  const { canUseFeature, getRemainingUsage, limits } = useUsageTracking();
  const { canGenerate: canGenerateHourly, isExhausted: isHourlyExhausted } = useHourlyQuota();
  
  const fitLabel = fitLevelLabels[data.fitLevel];
  const yesCount = data.requirements.filter(r => r.status === "yes").length;
  const partialCount = data.requirements.filter(r => r.status === "partial").length;
  const noCount = data.requirements.filter(r => r.status === "no").length;
  
  const canGenerateMonthly = canUseFeature("cover_letter");
  const canGenerate = canGenerateMonthly && canGenerateHourly;
  const remaining = getRemainingUsage("cover_letter");
  const isFreeTier = subscription.tier === "free";
  const hasCoverLetter = !!coverLetter && coverLetter.trim().length > 0;

  // Calculate circumference for the circular progress
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (data.fitScore / 100) * circumference;

  const handleCopyCoverLetter = async () => {
    if (!coverLetter) return;
    await navigator.clipboard.writeText(coverLetter);
    toast.success("Cover letter copied to clipboard");
  };

  // Get a preview snippet of the cover letter
  const coverLetterPreview = coverLetter 
    ? coverLetter.slice(0, 200).trim() + (coverLetter.length > 200 ? "..." : "")
    : "";

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
          Back to job description
        </button>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Analysis Results
            </h1>
            <p className="text-muted-foreground">
              {jobData.title} at {jobData.company}
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Fit Score Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:col-span-1"
        >
          <div className="bg-card rounded-xl border border-border p-6 text-center">
            <h2 className="text-lg font-semibold text-foreground mb-4">Job Fit Score</h2>
            
            {/* Circular Progress */}
            <div className="relative w-32 h-32 mx-auto mb-4">
              <svg className="w-32 h-32 -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-secondary"
                />
                <motion.circle
                  cx="64"
                  cy="64"
                  r={radius}
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1, ease: "easeOut" }}
                  className="text-success"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-4xl font-bold text-foreground"
                >
                  {data.fitScore}%
                </motion.span>
              </div>
            </div>

            <span className={cn("inline-block px-3 py-1.5 rounded-full text-sm font-medium", fitLabel.color)}>
              {fitLabel.label}
            </span>

            {/* Match Summary */}
            <div className="mt-6 pt-6 border-t border-border">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-2xl font-bold text-success">{yesCount}</div>
                  <div className="text-xs text-muted-foreground">Matched</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-warning">{partialCount}</div>
                  <div className="text-xs text-muted-foreground">Partial</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-destructive">{noCount}</div>
                  <div className="text-xs text-muted-foreground">Gaps</div>
                </div>
              </div>
            </div>

            {/* Cover Letter Actions or Generate CTA */}
            <div className="mt-6 space-y-3">
              <HourlyQuotaIndicator showUpgradeLink={false} />

              {hasCoverLetter ? (
                <>
                  {/* Cover Letter Ready - Prominent Actions */}
                  <div className="bg-success/10 border border-success/20 rounded-lg p-3 text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-success" />
                      <span className="text-sm font-semibold text-success">Cover Letter Ready</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {coverLetterPreview}
                    </p>
                  </div>

                  <Button variant="hero" className="w-full" onClick={onViewEditCoverLetter}>
                    <Eye className="w-4 h-4" />
                    View & Edit Cover Letter
                  </Button>

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={onDownloadPDF}
                      disabled={isExporting}
                    >
                      <Download className="w-3.5 h-3.5" />
                      PDF
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={onDownloadDOCX}
                      disabled={isExporting}
                    >
                      <FileType className="w-3.5 h-3.5" />
                      DOCX
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={handleCopyCoverLetter}
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copy to Clipboard
                  </Button>
                </>
              ) : (
                <>
                  {isFreeTier && remaining !== null && (
                    <div className={cn(
                      "flex items-center gap-2 text-sm p-2 rounded-lg",
                      canGenerateMonthly 
                        ? "bg-accent/10 text-accent" 
                        : "bg-destructive/10 text-destructive"
                    )}>
                      <AlertCircle className="w-4 h-4" />
                      <span>
                        {canGenerateMonthly 
                          ? `${remaining} of ${limits.cover_letter} free cover letters remaining this month`
                          : "Monthly limit reached"}
                      </span>
                    </div>
                  )}
                  
                  {canGenerate ? (
                    <Button variant="hero" className="w-full" onClick={onGenerate}>
                      <Sparkles className="w-4 h-4" />
                      Generate Cover Letter
                    </Button>
                  ) : isHourlyExhausted ? (
                    <Button variant="hero" className="w-full" disabled>
                      <Sparkles className="w-4 h-4" />
                      Hourly Limit Reached
                    </Button>
                  ) : (
                    <Button variant="hero" className="w-full" asChild>
                      <Link to="/pricing">
                        <Sparkles className="w-4 h-4" />
                        Upgrade for Unlimited
                      </Link>
                    </Button>
                  )}
                </>
              )}
              
              {/* Interview Prep Button */}
              {onGenerateInterviewPrep && canGenerate && (
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={onGenerateInterviewPrep}
                >
                  <MessageCircle className="w-4 h-4" />
                  Prepare for Interview
                </Button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Requirements List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <div className="bg-card rounded-xl border border-border p-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Requirements Mapping
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Click each requirement to see the evidence from your resume
            </p>

            <div className="space-y-3">
              {data.requirements.map((item, index) => (
                <RequirementRow key={index} item={item} index={index} />
              ))}
            </div>
          </div>

          {/* Job Search Emails - shown when cover letter exists */}
          {hasCoverLetter && (
            <JobSearchEmailsContainer
              jobTitle={jobData.title}
              company={jobData.company}
              coverLetterContent={coverLetter!}
              applicationId={applicationId}
              userId={user?.id}
            />
          )}
        </motion.div>
      </div>

      {/* RAG Debug Panel */}
      <RAGDebugPanel applicationId={applicationId} />
    </div>
  );
};

export default AnalysisResults;
