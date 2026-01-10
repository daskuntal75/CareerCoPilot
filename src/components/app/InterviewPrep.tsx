import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, ChevronRight, MessageCircle, Lightbulb, AlertTriangle, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { JobData } from "@/pages/App";

interface StarAnswer {
  situation: string;
  task: string;
  action: string;
  result: string;
}

interface InterviewQuestion {
  question: string;
  category: "behavioral" | "technical" | "situational" | "cultural";
  difficulty: "easy" | "medium" | "hard";
  whyAsked: string;
  starAnswer: StarAnswer;
  tips: string[];
}

export interface InterviewPrepData {
  questions: InterviewQuestion[];
  keyStrengths: string[];
  potentialConcerns: string[];
  questionsToAsk: string[];
}

interface InterviewPrepProps {
  data: InterviewPrepData;
  jobData: JobData;
  onBack: () => void;
}

const categoryConfig = {
  behavioral: { label: "Behavioral", color: "bg-blue-100 text-blue-700" },
  technical: { label: "Technical", color: "bg-purple-100 text-purple-700" },
  situational: { label: "Situational", color: "bg-amber-100 text-amber-700" },
  cultural: { label: "Cultural", color: "bg-green-100 text-green-700" },
};

const difficultyConfig = {
  easy: { label: "Easy", color: "text-success" },
  medium: { label: "Medium", color: "text-warning" },
  hard: { label: "Hard", color: "text-destructive" },
};

const QuestionCard = ({ question, index }: { question: InterviewQuestion; index: number }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const category = categoryConfig[question.category];
  const difficulty = difficultyConfig[question.difficulty];

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
                  STAR Answer Framework
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
                    <div className="text-xs font-semibold text-accent uppercase tracking-wider mb-1">Result</div>
                    <p className="text-sm text-foreground">{question.starAnswer.result}</p>
                  </div>
                </div>
              </div>

              {/* Tips */}
              {question.tips.length > 0 && (
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

const InterviewPrep = ({ data, jobData, onBack }: InterviewPrepProps) => {
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
          Back to cover letter
        </button>
        
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Interview Prep
        </h1>
        <p className="text-muted-foreground">
          Predicted questions and STAR-format talking points for {jobData.title} at {jobData.company}
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Questions Section */}
        <div className="lg:col-span-2 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Predicted Questions ({data.questions.length})
            </h2>
            <div className="space-y-3">
              {data.questions.map((question, index) => (
                <QuestionCard key={index} question={question} index={index} />
              ))}
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
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
              {data.keyStrengths.map((strength, i) => (
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
              {data.potentialConcerns.map((concern, i) => (
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
            <ul className="space-y-2">
              {data.questionsToAsk.map((question, i) => (
                <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-accent mt-0.5">?</span>
                  {question}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default InterviewPrep;
