import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ArrowLeft, ChevronDown, ChevronRight, MessageCircle, Lightbulb, AlertTriangle, 
  HelpCircle, Building, Target, TrendingUp, Users, Briefcase, RefreshCw, 
  Download, Play, FileEdit, FileType, Sparkles, Eye, History
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";
import type { JobData } from "@/pages/App";
import InterviewPractice from "./InterviewPractice";
import ExportPreviewModal from "./ExportPreviewModal";
import VersionHistoryPanel from "./VersionHistoryPanel";
import { useDocumentVersions, DocumentVersion } from "@/hooks/useDocumentVersions";
import { usePromptTelemetry } from "@/hooks/usePromptTelemetry";
import { AIQualityRating } from "./AIQualityRating";
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

interface StarAnswer {
  situation: string;
  task: string;
  action: string;
  result: string;
}

interface InterviewQuestion {
  question: string;
  category: "behavioral" | "technical" | "situational" | "cultural" | "recruiter" | "hiring_manager" | "peer" | "vp" | "panel";
  difficulty: "easy" | "medium" | "hard";
  whyAsked: string;
  starAnswer: StarAnswer;
  tips: string[];
}

interface QuestionsToAsk {
  forRecruiter?: string[];
  forHiringManager?: string[];
  forPeer?: string[];
  forTechnicalLead?: string[];
  forVP?: string[];
}

interface CompanyIntelligence {
  visionMission?: string;
  industryMarket?: string;
  financialPerformance?: string;
  productsServices?: string;
}

interface StrategicAnalysis {
  strengths?: string[];
  criticalStrength?: string;
  weaknesses?: string[];
  criticalWeakness?: string;
  opportunities?: string[];
  criticalOpportunity?: string;
  threats?: string[];
  criticalThreat?: string;
  competitors?: string[];
  competitivePosition?: string;
}

interface InterviewStructure {
  coreRequirements?: string[];
  keyCompetencies?: string[];
  predictedFormat?: string;
}

export interface InterviewPrepData {
  questions: InterviewQuestion[];
  keyStrengths: string[];
  potentialConcerns: string[];
  questionsToAsk: string[] | QuestionsToAsk;
  applicationContext?: string;
  companyIntelligence?: CompanyIntelligence;
  keyDomainConcepts?: string[];
  strategicAnalysis?: StrategicAnalysis;
  cultureAndBenefits?: {
    cultureInsights?: string[];
    standoutBenefits?: string[];
  };
  interviewStructure?: InterviewStructure;
  uniqueValueProposition?: string;
  whyThisCompany?: string;
}

interface InterviewPrepProps {
  data: InterviewPrepData;
  jobData: JobData;
  onBack: () => void;
  onRegenerateSection?: (section: string, feedback: string, tips: string[]) => void;
  onGenerateTargeted?: (interviewerType: string, guidance: string) => void;
  isRegenerating?: boolean;
  onGoToCoverLetter?: () => void;
  applicationId?: string | null;
  onDataChange?: (data: InterviewPrepData) => void;
  telemetryId?: string | null;
}

const categoryConfig: Record<string, { label: string; color: string }> = {
  behavioral: { label: "Behavioral", color: "bg-blue-100 text-blue-700" },
  technical: { label: "Technical", color: "bg-purple-100 text-purple-700" },
  situational: { label: "Situational", color: "bg-amber-100 text-amber-700" },
  cultural: { label: "Cultural", color: "bg-green-100 text-green-700" },
  recruiter: { label: "Recruiter", color: "bg-sky-100 text-sky-700" },
  hiring_manager: { label: "Hiring Manager", color: "bg-indigo-100 text-indigo-700" },
  peer: { label: "Peer", color: "bg-teal-100 text-teal-700" },
  vp: { label: "Senior Leadership", color: "bg-rose-100 text-rose-700" },
  panel: { label: "Panel", color: "bg-orange-100 text-orange-700" },
};

const difficultyConfig = {
  easy: { label: "Easy", color: "text-success" },
  medium: { label: "Medium", color: "text-warning" },
  hard: { label: "Hard", color: "text-destructive" },
};

const regenerationSections = [
  { key: "questions", label: "Interview Questions", description: "Regenerate predicted questions & STAR answers" },
  { key: "keyStrengths", label: "Key Strengths", description: "Regenerate strengths to highlight" },
  { key: "potentialConcerns", label: "Concerns to Address", description: "Regenerate potential concerns" },
  { key: "questionsToAsk", label: "Questions to Ask", description: "Regenerate questions for interviewers" },
  { key: "companyIntelligence", label: "Company Intelligence", description: "Regenerate company research" },
  { key: "strategicAnalysis", label: "SWOT Analysis", description: "Regenerate strategic analysis" },
  { key: "uniqueValueProposition", label: "Value Proposition", description: "Regenerate your unique value prop" },
];

const regenerationTips = [
  { id: "more_specific", label: "More specific examples", description: "Include concrete details" },
  { id: "deeper_research", label: "Deeper company research", description: "More industry insights" },
  { id: "harder_questions", label: "Include harder questions", description: "Challenge me more" },
  { id: "different_angle", label: "Different perspective", description: "Try a new approach" },
  { id: "more_metrics", label: "Add more metrics", description: "Quantify with numbers" },
  { id: "simpler", label: "Simplify language", description: "Make it easier to remember" },
  { id: "leadership_focus", label: "Leadership focus", description: "Management considerations" },
  { id: "technical_depth", label: "More technical depth", description: "Deeper technical details" },
];

const QuestionCard = ({ question, index }: { question: InterviewQuestion; index: number }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const category = categoryConfig[question.category] || categoryConfig.behavioral;
  const difficulty = difficultyConfig[question.difficulty] || difficultyConfig.medium;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border border-border rounded-xl overflow-hidden"
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start gap-4 p-4 hover:bg-secondary/30 transition-colors text-left"
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-semibold text-sm">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", category.color)}>
              {category.label}
            </span>
            <span className={cn("text-xs font-medium", difficulty.color)}>
              {difficulty.label}
            </span>
          </div>
          <p className="font-medium text-foreground">{question.question}</p>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
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
            <div className="px-4 pb-4 space-y-4">
              {question.whyAsked && (
                <div className="bg-secondary/30 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <HelpCircle className="w-4 h-4 text-accent" />
                    Why they might ask this
                  </div>
                  <p className="text-sm text-muted-foreground">{question.whyAsked}</p>
                </div>
              )}

              {question.starAnswer && (
                <div className="bg-accent/5 rounded-lg p-4 border border-accent/20">
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-3">
                    <MessageCircle className="w-4 h-4 text-accent" />
                    STAR + SMART Answer Framework
                  </div>
                  <div className="space-y-3">
                    <div>
                      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Situation</div>
                      <p className="text-sm text-foreground">{question.starAnswer.situation}</p>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Task</div>
                      <p className="text-sm text-foreground">{question.starAnswer.task}</p>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Action</div>
                      <p className="text-sm text-foreground">{question.starAnswer.action}</p>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Result (SMART)</div>
                      <p className="text-sm text-foreground">{question.starAnswer.result}</p>
                    </div>
                  </div>
                </div>
              )}

              {question.tips && question.tips.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                    <Lightbulb className="w-4 h-4 text-warning" />
                    Pro Tips
                  </div>
                  <ul className="space-y-1">
                    {question.tips.map((tip, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-accent mt-1">•</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const InterviewPrep = ({ 
  data, 
  jobData, 
  onBack, 
  onRegenerateSection, 
  onGenerateTargeted,
  isRegenerating,
  onGoToCoverLetter,
  applicationId,
  onDataChange,
  telemetryId,
}: InterviewPrepProps) => {
  const [activeTab, setActiveTab] = useState<"questions" | "research" | "strategy">("questions");
  const [showPracticeMode, setShowPracticeMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [selectedSection, setSelectedSection] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [selectedTips, setSelectedTips] = useState<string[]>([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [hasRated, setHasRated] = useState(false);
  const [targetedInterviewerType, setTargetedInterviewerType] = useState("");
  const [targetedGuidance, setTargetedGuidance] = useState("");

  // Version history hook
  const {
    versions,
    isLoading: isLoadingVersions,
    saveVersion,
    restoreVersion,
    deleteVersion,
    renameVersion,
  } = useDocumentVersions(applicationId || null, "interview_prep");

  // Prompt telemetry hook
  const { trackInterviewPrepPrompt } = usePromptTelemetry();

  // Track previous data for auto-versioning
  const previousDataRef = useRef<InterviewPrepData>(data);
  const lastAutoSaveRef = useRef<number>(Date.now());

  // Save initial version when data first loads
  useEffect(() => {
    if (data && applicationId && versions.length === 0) {
      saveVersion(null, data, "initial");
      previousDataRef.current = data;
    }
  }, [data, applicationId, versions.length]);

  // Auto-version after regeneration (significant data change)
  useEffect(() => {
    if (!data || !applicationId || versions.length === 0) return;
    
    const previousData = previousDataRef.current;
    const timeSinceLastSave = Date.now() - lastAutoSaveRef.current;
    
    // Calculate question count difference as a proxy for significant change
    const previousQuestionCount = previousData.questions?.length || 0;
    const currentQuestionCount = data.questions?.length || 0;
    const questionCountDiff = Math.abs(currentQuestionCount - previousQuestionCount);
    
    // Check if key fields changed significantly
    const significantChange = 
      questionCountDiff > 2 ||
      previousData.uniqueValueProposition !== data.uniqueValueProposition ||
      JSON.stringify(previousData.keyStrengths) !== JSON.stringify(data.keyStrengths);
    
    if (significantChange && timeSinceLastSave > 30000) {
      saveVersion(null, data, "regenerated", `Auto-saved after changes`);
      previousDataRef.current = data;
      lastAutoSaveRef.current = Date.now();
    }
  }, [data, applicationId, versions.length]);

  const handleRestoreVersion = async (version: DocumentVersion) => {
    const success = await restoreVersion(version);
    if (success && version.structured_content && onDataChange) {
      onDataChange(version.structured_content as InterviewPrepData);
    }
  };

  const handleSelectVersion = (version: DocumentVersion) => {
    toast.info(`Viewing version ${version.version_number}. Click "Restore" to apply.`);
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const response = await supabase.functions.invoke("export-pdf", {
        body: {
          type: "interview-prep",
          interviewPrepData: data,
          jobTitle: jobData.title,
          company: jobData.company,
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

      toast.success("Interview prep PDF downloaded!");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to export PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDOCX = async () => {
    setIsExporting(true);
    try {
      const paragraphs: Paragraph[] = [];
      
      // Title
      paragraphs.push(new Paragraph({
        children: [new TextRun({ text: `Interview Prep: ${jobData.title} at ${jobData.company}`, bold: true, size: 36 })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }));
      
      // Overview section
      if (data.applicationContext) {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: "Application Context", bold: true, size: 28 })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 150 },
        }));
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: data.applicationContext, size: 24 })],
          spacing: { after: 200 },
        }));
      }
      
      if (data.uniqueValueProposition) {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: "Your Unique Value Proposition", bold: true, size: 28 })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 150 },
        }));
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: data.uniqueValueProposition, size: 24 })],
          spacing: { after: 200 },
        }));
      }
      
      // Key Strengths
      if (data.keyStrengths?.length > 0) {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: "Key Strengths to Highlight", bold: true, size: 28 })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 300, after: 150 },
        }));
        data.keyStrengths.forEach(s => {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: s, size: 24 })],
            bullet: { level: 0 },
            spacing: { after: 80 },
          }));
        });
      }
      
      // Interview Questions
      if (data.questions?.length > 0) {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: "Interview Questions", bold: true, size: 32 })],
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }));
        
        data.questions.forEach((q, i) => {
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: `Q${i + 1}: ${q.question}`, bold: true, size: 26 })],
            spacing: { before: 250, after: 100 },
          }));
          
          paragraphs.push(new Paragraph({
            children: [new TextRun({ text: `Category: ${q.category} | Difficulty: ${q.difficulty}`, italics: true, size: 22 })],
            spacing: { after: 100 },
          }));
          
          if (q.starAnswer) {
            paragraphs.push(new Paragraph({
              children: [new TextRun({ text: "SITUATION: ", bold: true, size: 24 }), new TextRun({ text: q.starAnswer.situation, size: 24 })],
              spacing: { after: 100 },
            }));
            paragraphs.push(new Paragraph({
              children: [new TextRun({ text: "TASK: ", bold: true, size: 24 }), new TextRun({ text: q.starAnswer.task, size: 24 })],
              spacing: { after: 100 },
            }));
            paragraphs.push(new Paragraph({
              children: [new TextRun({ text: "ACTION: ", bold: true, size: 24 }), new TextRun({ text: q.starAnswer.action, size: 24 })],
              spacing: { after: 100 },
            }));
            paragraphs.push(new Paragraph({
              children: [new TextRun({ text: "RESULT: ", bold: true, size: 24 }), new TextRun({ text: q.starAnswer.result, size: 24 })],
              spacing: { after: 150 },
            }));
          }
        });
      }
      
      const doc = new Document({
        sections: [{
          properties: {
            page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
          },
          children: paragraphs,
        }],
      });
      
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `InterviewPrep_${jobData.company.replace(/\s+/g, "_")}.docx`;
      a.click();
      URL.revokeObjectURL(url);
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
    
    if (onRegenerateSection && selectedSection) {
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
      await trackInterviewPrepPrompt(
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
            questionCount: data.questions?.length || 0,
          },
        }
      );

      onRegenerateSection(selectedSection, feedbackText, selectedTips);
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

  // Handle both old format (string[]) and new format (object with categories)
  const renderQuestionsToAsk = () => {
    if (Array.isArray(data.questionsToAsk)) {
      return (
        <ul className="space-y-2">
          {data.questionsToAsk.map((question, i) => (
            <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
              <span className="text-accent mt-0.5">?</span>
              {question}
            </li>
          ))}
        </ul>
      );
    }

    const categories = [
      { key: "forRecruiter", label: "For Recruiter" },
      { key: "forHiringManager", label: "For Hiring Manager" },
      { key: "forPeer", label: "For Peer/Director" },
      { key: "forTechnicalLead", label: "For Technical Lead" },
      { key: "forVP", label: "For Senior Leadership" },
    ] as const;

    return (
      <div className="space-y-4">
        {categories.map(({ key, label }) => {
          const questions = (data.questionsToAsk as QuestionsToAsk)?.[key];
          if (!questions || questions.length === 0) return null;
          return (
            <div key={key}>
              <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">{label}</div>
              <ul className="space-y-1">
                {questions.map((q, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-accent mt-0.5">?</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto">
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
          Back to cover letter
        </button>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Interview Prep
            </h1>
            <p className="text-muted-foreground">
              Comprehensive preparation for {jobData.title} at {jobData.company}
            </p>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {/* Navigate to Cover Letter */}
            {onGoToCoverLetter && (
              <Button
                variant="outline"
                size="sm"
                onClick={onGoToCoverLetter}
              >
                <FileEdit className="w-4 h-4" />
                View Cover Letter
              </Button>
            )}
            
            <Button
              variant="hero"
              size="sm"
              onClick={() => setShowPracticeMode(true)}
              disabled={!data.questions || data.questions.length === 0}
            >
              <Play className="w-4 h-4" />
              Practice Mode
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting}>
                  {isExporting ? (
                    <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Export
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setShowPreviewModal(true)}>
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Document
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleExportPDF}>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportDOCX}>
                  <FileType className="w-4 h-4 mr-2" />
                  Download DOCX
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {onRegenerateSection && (
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
            
            {/* Version History Button */}
            {applicationId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowVersionHistory(!showVersionHistory)}
              >
                <History className="w-4 h-4" />
                Versions ({versions.length})
              </Button>
            )}
          </div>
        </div>
        
        {/* Quality Rating Widget */}
        {telemetryId && !hasRated && (
          <div className="mt-4">
            <AIQualityRating 
              telemetryId={telemetryId} 
              documentType="interview_prep"
              onRatingSubmitted={() => setHasRated(true)}
            />
          </div>
        )}
      </motion.div>

      {/* Version History Panel */}
      <AnimatePresence>
        {showVersionHistory && applicationId && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
          >
            <VersionHistoryPanel
              versions={versions}
              currentVersionId={versions.find(v => v.is_current)?.id}
              documentType="interview_prep"
              onSelectVersion={handleSelectVersion}
              onRestoreVersion={handleRestoreVersion}
              onDeleteVersion={deleteVersion}
              onRenameVersion={renameVersion}
              isLoading={isLoadingVersions}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Practice Mode Modal */}
      <AnimatePresence>
        {showPracticeMode && data.questions && (
          <InterviewPractice
            questions={data.questions}
            onClose={() => setShowPracticeMode(false)}
          />
        )}
      </AnimatePresence>
      
      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border">
        <button
          onClick={() => setActiveTab("questions")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeTab === "questions"
              ? "border-accent text-accent"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Interview Questions
        </button>
        <button
          onClick={() => setActiveTab("research")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeTab === "research"
              ? "border-accent text-accent"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Company Research
        </button>
        <button
          onClick={() => setActiveTab("strategy")}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeTab === "strategy"
              ? "border-accent text-accent"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Your Strategy
        </button>
      </div>

      {/* Questions Tab */}
      {activeTab === "questions" && (
        <div className="space-y-6">
          {/* Targeted Interview Prep Section */}
          {onGenerateTargeted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-accent/5 border-2 border-accent/30 rounded-xl p-6"
            >
              <div className="flex items-center gap-2 text-foreground font-semibold mb-1">
                <Users className="w-5 h-5 text-accent" />
                Targeted Interview Prep
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Generate questions tailored to a specific interviewer role and topic. Company research, strengths, and strategy are preserved.
              </p>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Interviewer Type / Role
                  </label>
                  <Input
                    value={targetedInterviewerType}
                    onChange={(e) => setTargetedInterviewerType(e.target.value)}
                    placeholder="e.g. UX Director, Engineering Manager, SVP Product"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Interview Topic / Guidance
                  </label>
                  <Input
                    value={targetedGuidance}
                    onChange={(e) => setTargetedGuidance(e.target.value)}
                    placeholder="e.g. Design systems, Team leadership, Product strategy"
                  />
                </div>
              </div>
              <Button
                variant="hero"
                size="sm"
                onClick={() => {
                  if (!targetedInterviewerType.trim()) {
                    toast.error("Please enter an interviewer type or role");
                    return;
                  }
                  onGenerateTargeted(targetedInterviewerType.trim(), targetedGuidance.trim());
                }}
                disabled={isRegenerating || !targetedInterviewerType.trim()}
              >
                {isRegenerating ? (
                  <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Generate Targeted Questions
              </Button>
            </motion.div>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="text-lg font-semibold text-foreground mb-4">
                  Predicted Questions ({data.questions?.length || 0})
                </h2>
                <div className="space-y-3">
                  {data.questions?.map((question, index) => (
                    <QuestionCard key={index} question={question} index={index} />
                  ))}
                </div>
              </motion.div>
            </div>

          <div className="space-y-6">
            {/* Key Strengths */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card border border-border rounded-xl p-5"
            >
              <div className="flex items-center gap-2 text-foreground font-semibold mb-3">
                <Lightbulb className="w-5 h-5 text-success" />
                Key Strengths to Highlight
              </div>
              <ul className="space-y-2">
                {data.keyStrengths?.map((strength, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-success mt-0.5">✓</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Potential Concerns */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card border border-border rounded-xl p-5"
            >
              <div className="flex items-center gap-2 text-foreground font-semibold mb-3">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Prepare to Address
              </div>
              <ul className="space-y-2">
                {data.potentialConcerns?.map((concern, i) => (
                  <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-warning mt-0.5">!</span>
                    {concern}
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Questions to Ask */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-card border border-border rounded-xl p-5"
            >
              <div className="flex items-center gap-2 text-foreground font-semibold mb-3">
                <HelpCircle className="w-5 h-5 text-accent" />
                Questions to Ask Them
              </div>
              {renderQuestionsToAsk()}
            </motion.div>

            {/* Quick Improvements */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-card border border-border rounded-xl p-5"
            >
              <div className="flex items-center gap-2 text-foreground font-semibold mb-3">
                <Sparkles className="w-5 h-5 text-accent" />
                Quick Improvements
              </div>
              <div className="space-y-2">
                {regenerationTips.slice(0, 4).map((tip) => (
                  <button
                    key={tip.id}
                    onClick={() => handleOpenRegenerateDialog("questions", tip.id)}
                    className="w-full text-left text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 p-2 rounded-lg transition-colors flex items-start gap-2"
                  >
                    <Target className="w-3 h-3 mt-0.5 flex-shrink-0 text-accent" />
                    {tip.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
        </div>
      )}

      {/* Research Tab */}
      {activeTab === "research" && (
        <div className="space-y-6">
          {/* Company Intelligence */}
          {data.companyIntelligence && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl p-6"
            >
              <div className="flex items-center gap-2 text-foreground font-semibold mb-4">
                <Building className="w-5 h-5 text-accent" />
                Company Intelligence
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {data.companyIntelligence.visionMission && (
                  <div>
                    <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Vision & Mission</div>
                    <p className="text-sm text-muted-foreground">{data.companyIntelligence.visionMission}</p>
                  </div>
                )}
                {data.companyIntelligence.industryMarket && (
                  <div>
                    <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Industry & Market</div>
                    <p className="text-sm text-muted-foreground">{data.companyIntelligence.industryMarket}</p>
                  </div>
                )}
                {data.companyIntelligence.financialPerformance && (
                  <div>
                    <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Financial Performance</div>
                    <p className="text-sm text-muted-foreground">{data.companyIntelligence.financialPerformance}</p>
                  </div>
                )}
                {data.companyIntelligence.productsServices && (
                  <div>
                    <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Products & Services</div>
                    <p className="text-sm text-muted-foreground">{data.companyIntelligence.productsServices}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* SWOT Analysis */}
          {data.strategicAnalysis && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-xl p-6"
            >
              <div className="flex items-center gap-2 text-foreground font-semibold mb-4">
                <Target className="w-5 h-5 text-accent" />
                SWOT Analysis
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-success/5 border border-success/20 rounded-lg p-4">
                  <div className="text-xs font-semibold text-success uppercase tracking-wider mb-2">Strengths</div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {data.strategicAnalysis.strengths?.map((s, i) => (
                      <li key={i}>• {s}</li>
                    ))}
                  </ul>
                  {data.strategicAnalysis.criticalStrength && (
                    <p className="mt-2 text-sm font-medium text-success">Key: {data.strategicAnalysis.criticalStrength}</p>
                  )}
                </div>
                <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-4">
                  <div className="text-xs font-semibold text-destructive uppercase tracking-wider mb-2">Weaknesses</div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {data.strategicAnalysis.weaknesses?.map((w, i) => (
                      <li key={i}>• {w}</li>
                    ))}
                  </ul>
                  {data.strategicAnalysis.criticalWeakness && (
                    <p className="mt-2 text-sm font-medium text-destructive">Key: {data.strategicAnalysis.criticalWeakness}</p>
                  )}
                </div>
                <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
                  <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">Opportunities</div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {data.strategicAnalysis.opportunities?.map((o, i) => (
                      <li key={i}>• {o}</li>
                    ))}
                  </ul>
                  {data.strategicAnalysis.criticalOpportunity && (
                    <p className="mt-2 text-sm font-medium text-accent">Key: {data.strategicAnalysis.criticalOpportunity}</p>
                  )}
                </div>
                <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
                  <div className="text-xs font-semibold text-warning uppercase tracking-wider mb-2">Threats</div>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {data.strategicAnalysis.threats?.map((t, i) => (
                      <li key={i}>• {t}</li>
                    ))}
                  </ul>
                  {data.strategicAnalysis.criticalThreat && (
                    <p className="mt-2 text-sm font-medium text-warning">Key: {data.strategicAnalysis.criticalThreat}</p>
                  )}
                </div>
              </div>

              {(data.strategicAnalysis.competitors || data.strategicAnalysis.competitivePosition) && (
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">Competitive Landscape</div>
                  {data.strategicAnalysis.competitors && (
                    <p className="text-sm text-muted-foreground mb-2">
                      <span className="font-medium">Competitors:</span> {data.strategicAnalysis.competitors.join(", ")}
                    </p>
                  )}
                  {data.strategicAnalysis.competitivePosition && (
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium">Position:</span> {data.strategicAnalysis.competitivePosition}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {/* Culture & Benefits */}
          {data.cultureAndBenefits && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card border border-border rounded-xl p-6"
            >
              <div className="flex items-center gap-2 text-foreground font-semibold mb-4">
                <Users className="w-5 h-5 text-accent" />
                Culture & Benefits
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                {data.cultureAndBenefits.cultureInsights && data.cultureAndBenefits.cultureInsights.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">Culture Insights</div>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {data.cultureAndBenefits.cultureInsights.map((insight, i) => (
                        <li key={i}>• {insight}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.cultureAndBenefits.standoutBenefits && data.cultureAndBenefits.standoutBenefits.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">Standout Benefits</div>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {data.cultureAndBenefits.standoutBenefits.map((benefit, i) => (
                        <li key={i}>• {benefit}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Key Domain Concepts */}
          {data.keyDomainConcepts && data.keyDomainConcepts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card border border-border rounded-xl p-6"
            >
              <div className="flex items-center gap-2 text-foreground font-semibold mb-4">
                <Briefcase className="w-5 h-5 text-accent" />
                Key Domain Concepts to Master
              </div>
              <div className="flex flex-wrap gap-2">
                {data.keyDomainConcepts.map((concept, i) => (
                  <span key={i} className="px-3 py-1 bg-accent/10 text-accent text-sm rounded-full">
                    {concept}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Strategy Tab */}
      {activeTab === "strategy" && (
        <div className="space-y-6">
          {/* Unique Value Proposition */}
          {data.uniqueValueProposition && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-accent/5 border border-accent/20 rounded-xl p-6"
            >
              <div className="flex items-center gap-2 text-foreground font-semibold mb-3">
                <TrendingUp className="w-5 h-5 text-accent" />
                Your Unique Value Proposition
              </div>
              <p className="text-foreground">{data.uniqueValueProposition}</p>
            </motion.div>
          )}

          {/* Why This Company */}
          {data.whyThisCompany && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-xl p-6"
            >
              <div className="flex items-center gap-2 text-foreground font-semibold mb-3">
                <Building className="w-5 h-5 text-accent" />
                Why This Company?
              </div>
              <p className="text-muted-foreground">{data.whyThisCompany}</p>
            </motion.div>
          )}

          {/* Interview Structure */}
          {data.interviewStructure && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card border border-border rounded-xl p-6"
            >
              <div className="flex items-center gap-2 text-foreground font-semibold mb-4">
                <Target className="w-5 h-5 text-accent" />
                Interview Structure & Expectations
              </div>
              <div className="space-y-4">
                {data.interviewStructure.predictedFormat && (
                  <div>
                    <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Predicted Format</div>
                    <p className="text-sm text-muted-foreground">{data.interviewStructure.predictedFormat}</p>
                  </div>
                )}
                {data.interviewStructure.coreRequirements && data.interviewStructure.coreRequirements.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">Core Requirements</div>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {data.interviewStructure.coreRequirements.map((req, i) => (
                        <li key={i}>• {req}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {data.interviewStructure.keyCompetencies && data.interviewStructure.keyCompetencies.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-2">Key Competencies Sought</div>
                    <div className="flex flex-wrap gap-2">
                      {data.interviewStructure.keyCompetencies.map((comp, i) => (
                        <span key={i} className="px-3 py-1 bg-secondary text-sm rounded-full">
                          {comp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Application Context */}
          {data.applicationContext && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card border border-border rounded-xl p-6"
            >
              <div className="flex items-center gap-2 text-foreground font-semibold mb-3">
                <Briefcase className="w-5 h-5 text-accent" />
                Application Context
              </div>
              <p className="text-muted-foreground">{data.applicationContext}</p>
            </motion.div>
          )}
        </div>
      )}

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
        type="interview-prep"
        interviewPrepData={data}
        jobTitle={jobData.title}
        company={jobData.company}
        onDownloadPDF={handleExportPDF}
        onDownloadDOCX={handleExportDOCX}
        isExporting={isExporting}
      />
    </div>
  );
};

export default InterviewPrep;
