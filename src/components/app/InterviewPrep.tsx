import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, ChevronRight, MessageCircle, Lightbulb, AlertTriangle, HelpCircle, Building, Target, TrendingUp, Users, Briefcase, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { JobData } from "@/pages/App";
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
  // Enhanced PRD fields
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
  onRegenerateSection?: (section: string) => void;
  isRegenerating?: boolean;
}

const categoryConfig: Record<string, { label: string; color: string }> = {
  behavioral: { label: "Behavioral", color: "bg-blue-100 text-blue-700" },
  technical: { label: "Technical", color: "bg-purple-100 text-purple-700" },
  situational: { label: "Situational", color: "bg-amber-100 text-amber-700" },
  cultural: { label: "Cultural", color: "bg-green-100 text-green-700" },
  recruiter: { label: "Recruiter", color: "bg-sky-100 text-sky-700" },
  hiring_manager: { label: "Hiring Manager", color: "bg-indigo-100 text-indigo-700" },
  peer: { label: "Peer", color: "bg-teal-100 text-teal-700" },
  vp: { label: "VP/Executive", color: "bg-rose-100 text-rose-700" },
  panel: { label: "Panel", color: "bg-orange-100 text-orange-700" },
};

const difficultyConfig = {
  easy: { label: "Easy", color: "text-success" },
  medium: { label: "Medium", color: "text-warning" },
  hard: { label: "Hard", color: "text-destructive" },
};

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
              {/* Why This Question */}
              <div className="bg-secondary/30 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground mb-2">
                  <HelpCircle className="w-4 h-4 text-accent" />
                  Why they might ask this
                </div>
                <p className="text-sm text-muted-foreground">{question.whyAsked}</p>
              </div>

              {/* STAR Answer */}
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

              {/* Tips */}
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

const InterviewPrep = ({ data, jobData, onBack, onRegenerateSection, isRegenerating }: InterviewPrepProps) => {
  const [activeTab, setActiveTab] = useState<"questions" | "research" | "strategy">("questions");

  const regenerationSections = [
    { key: "questions", label: "Interview Questions", description: "Regenerate predicted questions & STAR answers" },
    { key: "keyStrengths", label: "Key Strengths", description: "Regenerate strengths to highlight" },
    { key: "potentialConcerns", label: "Concerns to Address", description: "Regenerate potential concerns" },
    { key: "questionsToAsk", label: "Questions to Ask", description: "Regenerate questions for interviewers" },
    { key: "companyIntelligence", label: "Company Intelligence", description: "Regenerate company research" },
    { key: "strategicAnalysis", label: "SWOT Analysis", description: "Regenerate strategic analysis" },
    { key: "uniqueValueProposition", label: "Value Proposition", description: "Regenerate your unique value prop" },
  ];

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
      { key: "forVP", label: "For VP/Executive" },
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
          
          {onRegenerateSection && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isRegenerating}>
                  {isRegenerating ? (
                    <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Regenerate Section
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Select section to regenerate</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {regenerationSections.map((section) => (
                  <DropdownMenuItem
                    key={section.key}
                    onClick={() => onRegenerateSection(section.key)}
                    className="flex flex-col items-start gap-0.5 cursor-pointer"
                  >
                    <span className="font-medium">{section.label}</span>
                    <span className="text-xs text-muted-foreground">{section.description}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </motion.div>

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

              {/* Competitive Landscape */}
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
    </div>
  );
};

export default InterviewPrep;
