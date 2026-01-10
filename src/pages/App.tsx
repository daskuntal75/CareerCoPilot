import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ResumeUpload from "@/components/app/ResumeUpload";
import JobDescriptionInput from "@/components/app/JobDescriptionInput";
import AnalysisResults from "@/components/app/AnalysisResults";
import CoverLetterEditor from "@/components/app/CoverLetterEditor";
import AppStepper from "@/components/app/AppStepper";
import { motion, AnimatePresence } from "framer-motion";

export type AppStep = "upload" | "job" | "analysis" | "editor";

export interface ResumeData {
  fileName: string;
  content: string;
}

export interface JobData {
  company: string;
  title: string;
  description: string;
}

export interface RequirementMatch {
  requirement: string;
  status: "yes" | "partial" | "no";
  evidence: string;
}

export interface AnalysisData {
  fitScore: number;
  fitLevel: "strong" | "good" | "partial" | "low";
  requirements: RequirementMatch[];
}

const AppPage = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>("upload");
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [coverLetter, setCoverLetter] = useState<string>("");

  const handleResumeUpload = (data: ResumeData) => {
    setResumeData(data);
    setCurrentStep("job");
  };

  const handleJobSubmit = (data: JobData) => {
    setJobData(data);
    // Simulate analysis
    const mockAnalysis: AnalysisData = {
      fitScore: 78,
      fitLevel: "strong",
      requirements: [
        { requirement: "10+ years of product leadership experience", status: "yes", evidence: "15 years as Director and Sr. Director of Product" },
        { requirement: "Enterprise B2B SaaS experience", status: "yes", evidence: "Led B2B products at Splunk, VMware" },
        { requirement: "Cross-functional team leadership", status: "yes", evidence: "Managed teams of 25+ across Engineering, Design, Data Science" },
        { requirement: "Data-driven decision making", status: "yes", evidence: "Built analytics platforms, defined KPIs for product success" },
        { requirement: "AI/ML product experience", status: "partial", evidence: "Experience with ML-powered features, not core AI products" },
        { requirement: "Go-to-market strategy", status: "yes", evidence: "Led product launches generating $50M+ revenue" },
        { requirement: "Stakeholder management", status: "yes", evidence: "Presented to C-suite, managed VP relationships" },
        { requirement: "Agile/Scrum methodology", status: "yes", evidence: "Implemented agile across 4 product teams" },
        { requirement: "Healthcare industry experience", status: "no", evidence: "No direct healthcare experience" },
        { requirement: "Remote team management", status: "partial", evidence: "Managed hybrid teams, limited fully remote" },
      ],
    };
    setAnalysisData(mockAnalysis);
    setCurrentStep("analysis");
  };

  const handleGenerateCoverLetter = () => {
    // Mock cover letter
    const mockLetter = `Dear Hiring Manager,

When I led the development of Splunk's hybrid cloud security platform, I didn't just ship features—I transformed how 2,000+ enterprise customers detected threats, reducing their mean time to detection by 65%. That same obsession with measurable customer outcomes is exactly what drew me to ${jobData?.company}'s ${jobData?.title} role.

Your job posting emphasizes the need for a product leader who can drive cross-functional alignment while maintaining a data-driven approach. At Splunk, I managed a portfolio of security products generating over $400M in ARR, working daily with Engineering, Design, and Sales to prioritize features that moved the needle. When our largest enterprise customer flagged onboarding friction as their #1 pain point, I led the initiative that reduced time-to-value from 2 days to under 2 hours—resulting in a 40% improvement in customer satisfaction scores.

The requirement for "10+ years of product leadership" aligns directly with my 15-year trajectory from PM to Director, where I've consistently grown teams (from 3 to 25), expanded product scope (single feature to full platform), and increased revenue responsibility ($10M to $400M+). My experience building products at the intersection of security and data also positions me well for the AI-driven future your roadmap suggests.

I'm particularly excited about ${jobData?.company}'s mission and would welcome the opportunity to discuss how my experience scaling B2B platforms could accelerate your product vision.

Best regards,
[Your Name]`;
    
    setCoverLetter(mockLetter);
    setCurrentStep("editor");
  };

  const goToStep = (step: AppStep) => {
    setCurrentStep(step);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Stepper */}
          <div className="mb-8">
            <AppStepper currentStep={currentStep} onStepClick={goToStep} />
          </div>

          {/* Step Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentStep === "upload" && (
                <ResumeUpload onUpload={handleResumeUpload} />
              )}
              
              {currentStep === "job" && (
                <JobDescriptionInput 
                  onSubmit={handleJobSubmit} 
                  onBack={() => setCurrentStep("upload")}
                />
              )}
              
              {currentStep === "analysis" && analysisData && jobData && (
                <AnalysisResults 
                  data={analysisData}
                  jobData={jobData}
                  onGenerate={handleGenerateCoverLetter}
                  onBack={() => setCurrentStep("job")}
                />
              )}
              
              {currentStep === "editor" && jobData && (
                <CoverLetterEditor 
                  content={coverLetter}
                  jobData={jobData}
                  onContentChange={setCoverLetter}
                  onBack={() => setCurrentStep("analysis")}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AppPage;