import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, FileText, FileType, X, ZoomIn, ZoomOut } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { InterviewPrepData } from "./InterviewPrep";

interface ExportPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: "cover-letter" | "interview-prep";
  content?: string;
  interviewPrepData?: InterviewPrepData;
  jobTitle: string;
  company: string;
  onDownloadPDF: () => Promise<void>;
  onDownloadDOCX: () => Promise<void>;
  isExporting?: boolean;
}

const ExportPreviewModal = ({
  open,
  onOpenChange,
  type,
  content,
  interviewPrepData,
  jobTitle,
  company,
  onDownloadPDF,
  onDownloadDOCX,
  isExporting = false,
}: ExportPreviewModalProps) => {
  const [zoom, setZoom] = useState(100);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 25, 50));

  const renderCoverLetterPreview = () => {
    if (!content) return null;
    
    const lines = content.split('\n');
    
    return (
      <div className="space-y-4">
        <div className="text-center border-b border-border pb-4 mb-6">
          <h1 className="text-xl font-bold text-foreground">Cover Letter</h1>
          <p className="text-sm text-muted-foreground">{jobTitle} at {company}</p>
        </div>
        
        {lines.map((line, i) => {
          if (line.trim() === '') {
            return <div key={i} className="h-3" />;
          }
          if (line.startsWith('## ')) {
            return (
              <h3 key={i} className="text-lg font-semibold text-foreground mt-4">
                {line.replace('## ', '')}
              </h3>
            );
          }
          if (line.startsWith('# ')) {
            return (
              <h2 key={i} className="text-xl font-bold text-foreground mt-6">
                {line.replace('# ', '')}
              </h2>
            );
          }
          if (line.match(/^[•\-\*]\s/)) {
            return (
              <div key={i} className="flex gap-2 ml-4">
                <span className="text-accent">•</span>
                <span className="text-foreground">{line.replace(/^[•\-\*]\s*/, '')}</span>
              </div>
            );
          }
          
          // Handle inline bold
          const parts = line.split(/(\*\*[^*]+\*\*)/g);
          return (
            <p key={i} className="text-foreground leading-relaxed">
              {parts.map((part, j) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return <strong key={j}>{part.replace(/\*\*/g, '')}</strong>;
                }
                return part;
              })}
            </p>
          );
        })}
      </div>
    );
  };

  const renderInterviewPrepPreview = () => {
    if (!interviewPrepData) return null;
    
    return (
      <div className="space-y-6">
        <div className="text-center border-b border-border pb-4 mb-6">
          <h1 className="text-xl font-bold text-foreground">Interview Preparation Guide</h1>
          <p className="text-sm text-muted-foreground">{jobTitle} at {company}</p>
        </div>

        {interviewPrepData.uniqueValueProposition && (
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Your Unique Value Proposition</h3>
            <p className="text-muted-foreground">{interviewPrepData.uniqueValueProposition}</p>
          </div>
        )}

        {interviewPrepData.keyStrengths && interviewPrepData.keyStrengths.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Key Strengths</h3>
            <ul className="space-y-1">
              {interviewPrepData.keyStrengths.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-accent">•</span>
                  <span className="text-foreground">{s}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {interviewPrepData.questions && interviewPrepData.questions.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-3">Interview Questions ({interviewPrepData.questions.length})</h3>
            <div className="space-y-4">
              {interviewPrepData.questions.slice(0, 3).map((q, i) => (
                <div key={i} className="bg-secondary/30 rounded-lg p-3">
                  <p className="font-medium text-foreground mb-2">Q{i + 1}: {q.question}</p>
                  <p className="text-xs text-muted-foreground">
                    {q.category} | {q.difficulty}
                  </p>
                  {q.starAnswer && (
                    <div className="mt-2 text-sm space-y-1">
                      <p><strong>S:</strong> {q.starAnswer.situation.substring(0, 100)}...</p>
                      <p><strong>T:</strong> {q.starAnswer.task.substring(0, 100)}...</p>
                    </div>
                  )}
                </div>
              ))}
              {interviewPrepData.questions.length > 3 && (
                <p className="text-sm text-muted-foreground italic">
                  + {interviewPrepData.questions.length - 3} more questions in full document
                </p>
              )}
            </div>
          </div>
        )}

        {interviewPrepData.potentialConcerns && interviewPrepData.potentialConcerns.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Potential Concerns to Address</h3>
            <ul className="space-y-1">
              {interviewPrepData.potentialConcerns.map((c, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-warning">!</span>
                  <span className="text-foreground">{c}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" />
            Export Preview - {type === "cover-letter" ? "Cover Letter" : "Interview Prep"}
          </DialogTitle>
          <DialogDescription>
            Preview how your document will appear when exported
          </DialogDescription>
        </DialogHeader>

        {/* Zoom controls */}
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={zoom <= 50}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground w-14 text-center">{zoom}%</span>
            <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={zoom >= 200}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onDownloadDOCX}
              disabled={isExporting}
            >
              <FileType className="w-4 h-4" />
              DOCX
            </Button>
            <Button
              variant="accent"
              size="sm"
              onClick={onDownloadPDF}
              disabled={isExporting}
            >
              {isExporting ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              PDF
            </Button>
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 overflow-auto bg-white rounded-lg border border-border">
          <motion.div
            animate={{ scale: zoom / 100 }}
            className="origin-top-left p-8 min-h-full"
            style={{ width: `${10000 / zoom}%` }}
          >
            <div className="max-w-[8.5in] mx-auto bg-white shadow-lg border border-gray-200 p-8 min-h-[11in]">
              {type === "cover-letter" ? renderCoverLetterPreview() : renderInterviewPrepPreview()}
            </div>
          </motion.div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportPreviewModal;
