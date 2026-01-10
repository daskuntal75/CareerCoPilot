import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ResumeUpload from "@/components/app/ResumeUpload";
import JobDescriptionInput from "@/components/app/JobDescriptionInput";
import AnalysisResults from "@/components/app/AnalysisResults";
import CoverLetterEditor from "@/components/app/CoverLetterEditor";
import InterviewPrep, { InterviewPrepData } from "@/components/app/InterviewPrep";
import AppStepper from "@/components/app/AppStepper";
import GenerationProgress, { GenerationStage } from "@/components/app/GenerationProgress";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AppStep = "upload" | "job" | "analysis" | "editor" | "interview";

export interface ResumeData {
  fileName: string;
  content: string;
  filePath?: string | null;
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
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<AppStep>("upload");
  const [resumeData, setResumeData] = useState<ResumeData | null>(null);
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [coverLetter, setCoverLetter] = useState<string>("");
  const [interviewPrep, setInterviewPrep] = useState<InterviewPrepData | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(id || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generationStage, setGenerationStage] = useState<GenerationStage>("analyzing");
  const [generationType, setGenerationType] = useState<"cover-letter" | "interview-prep">("cover-letter");

  // Load existing application if ID provided
  useEffect(() => {
    if (id && user) {
      loadApplication(id);
    }
  }, [id, user]);

  const loadApplication = async (appId: string) => {
    try {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("id", appId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error("Application not found");
        navigate("/dashboard");
        return;
      }

      setJobData({
        company: data.company,
        title: data.job_title,
        description: data.job_description,
      });

      if (data.resume_content) {
        setResumeData({
          fileName: data.resume_file_path?.split("/").pop() || "resume.pdf",
          content: data.resume_content,
          filePath: data.resume_file_path,
        });
      }

      if (data.requirements_analysis) {
        const analysis = data.requirements_analysis as any;
        setAnalysisData({
          fitScore: data.fit_score || analysis.fitScore,
          fitLevel: data.fit_level as any || analysis.fitLevel,
          requirements: analysis.requirements || [],
        });
      }

      if (data.cover_letter) {
        setCoverLetter(data.cover_letter);
      }

      if (data.interview_prep) {
        setInterviewPrep(data.interview_prep as any);
      }

      // Set appropriate step based on data
      if (data.interview_prep) {
        setCurrentStep("interview");
      } else if (data.cover_letter) {
        setCurrentStep("editor");
      } else if (data.requirements_analysis) {
        setCurrentStep("analysis");
      } else if (data.resume_content) {
        setCurrentStep("job");
      }
    } catch (error) {
      console.error("Error loading application:", error);
      toast.error("Failed to load application");
    }
  };

  const saveApplication = async (updates: Record<string, any>) => {
    if (!user) return null;
    
    setIsSaving(true);
    try {
      if (applicationId) {
        const { error } = await supabase
          .from("applications")
          .update(updates)
          .eq("id", applicationId);
        
        if (error) throw error;
        return applicationId;
      } else {
        const { data, error } = await supabase
          .from("applications")
          .insert({
            user_id: user.id,
            company: jobData?.company || updates.company || "Unknown Company",
            job_title: jobData?.title || updates.job_title || "Unknown Position",
            job_description: jobData?.description || updates.job_description || "",
            ...updates,
          })
          .select()
          .single();

        if (error) throw error;
        setApplicationId(data.id);
        return data.id;
      }
    } catch (error) {
      console.error("Error saving application:", error);
      toast.error("Failed to save application");
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleResumeUpload = async (data: ResumeData) => {
    setResumeData(data);
    setCurrentStep("job");
    
    if (user) {
      await saveApplication({
        resume_content: data.content,
        resume_file_path: data.filePath,
      });
    }
  };

  const handleJobSubmit = async (data: JobData) => {
    setJobData(data);
    setIsLoading(true);

    try {
      // Call AI for job fit analysis with RAG support
      const response = await supabase.functions.invoke("analyze-job-fit", {
        body: {
          resumeContent: resumeData?.content,
          jobDescription: data.description,
          jobTitle: data.title,
          company: data.company,
          applicationId: applicationId,
          userId: user?.id,
        },
      });

      if (response.error) throw new Error(response.error.message);
      
      const analysis: AnalysisData = {
        fitScore: response.data.fitScore,
        fitLevel: response.data.fitLevel,
        requirements: response.data.requirements,
      };
      
      setAnalysisData(analysis);
      setCurrentStep("analysis");

      if (user) {
        await saveApplication({
          company: data.company,
          job_title: data.title,
          job_description: data.description,
          fit_score: analysis.fitScore,
          fit_level: analysis.fitLevel,
          requirements_analysis: analysis,
        });
      }
    } catch (error) {
      console.error("Error analyzing job fit:", error);
      toast.error("Failed to analyze job fit. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!jobData || !resumeData) return;
    
    setIsLoading(true);
    setGenerationType("cover-letter");
    setGenerationStage("analyzing");
    
    try {
      // Simulate stage progression
      const stageTimer1 = setTimeout(() => setGenerationStage("drafting"), 3000);
      const stageTimer2 = setTimeout(() => setGenerationStage("refining"), 8000);
      
      // RAG-grounded cover letter generation using only verified resume chunks
      const response = await supabase.functions.invoke("generate-cover-letter", {
        body: {
          resumeContent: resumeData.content,
          jobDescription: jobData.description,
          jobTitle: jobData.title,
          company: jobData.company,
          analysisData,
          applicationId: applicationId,
          userId: user?.id,
        },
      });

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);

      if (response.error) throw new Error(response.error.message);
      
      setGenerationStage("complete");
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCoverLetter(response.data.coverLetter);
      setCurrentStep("editor");

      if (user) {
        await saveApplication({
          cover_letter: response.data.coverLetter,
        });
      }
    } catch (error) {
      console.error("Error generating cover letter:", error);
      toast.error("Failed to generate cover letter. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateInterviewPrep = async (sectionToRegenerate?: string) => {
    if (!jobData || !resumeData) return;
    
    setIsLoading(true);
    setGenerationType("interview-prep");
    setGenerationStage("analyzing");
    
    try {
      // Simulate stage progression
      const stageTimer1 = setTimeout(() => setGenerationStage("drafting"), 4000);
      const stageTimer2 = setTimeout(() => setGenerationStage("refining"), 10000);
      
      const response = await supabase.functions.invoke("generate-interview-prep", {
        body: {
          resumeContent: resumeData.content,
          jobDescription: jobData.description,
          jobTitle: jobData.title,
          company: jobData.company,
          analysisData,
          sectionToRegenerate,
          existingData: sectionToRegenerate ? interviewPrep : undefined,
        },
      });

      clearTimeout(stageTimer1);
      clearTimeout(stageTimer2);

      if (response.error) throw new Error(response.error.message);
      
      setGenerationStage("complete");
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // If regenerating a section, merge the data
      if (sectionToRegenerate && interviewPrep) {
        const updatedPrep = { ...interviewPrep, ...response.data };
        setInterviewPrep(updatedPrep);
        if (user) {
          await saveApplication({ interview_prep: updatedPrep });
        }
        toast.success(`${sectionToRegenerate} regenerated successfully`);
      } else {
        setInterviewPrep(response.data);
        setCurrentStep("interview");
        if (user) {
          await saveApplication({ interview_prep: response.data });
        }
      }
    } catch (error) {
      console.error("Error generating interview prep:", error);
      toast.error("Failed to generate interview prep. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCoverLetterChange = async (content: string) => {
    setCoverLetter(content);
    
    // Debounced save
    if (user && applicationId) {
      await saveApplication({ cover_letter: content });
    }
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

          {/* Loading Overlay */}
          {isLoading && (currentStep === "analysis" || currentStep === "editor") && (
            <GenerationProgress currentStage={generationStage} type={generationType} />
          )}
          
          {/* Simple loading for job analysis */}
          {isLoading && currentStep === "job" && (
            <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-lg font-medium text-foreground">Analyzing job fit...</p>
                <p className="text-sm text-muted-foreground">This may take a moment</p>
              </div>
            </div>
          )}

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
                  initialData={jobData}
                />
              )}
              
              {currentStep === "analysis" && analysisData && jobData && (
                <AnalysisResults 
                  data={analysisData}
                  jobData={jobData}
                  onGenerate={handleGenerateCoverLetter}
                  onBack={() => setCurrentStep("job")}
                  applicationId={applicationId}
                />
              )}
              
              {currentStep === "editor" && jobData && (
                <CoverLetterEditor 
                  content={coverLetter}
                  jobData={jobData}
                  onContentChange={handleCoverLetterChange}
                  onBack={() => setCurrentStep("analysis")}
                  onGenerateInterviewPrep={() => handleGenerateInterviewPrep()}
                />
              )}

              {currentStep === "interview" && jobData && interviewPrep && (
                <InterviewPrep
                  data={interviewPrep}
                  jobData={jobData}
                  onBack={() => setCurrentStep("editor")}
                  onRegenerateSection={(section) => handleGenerateInterviewPrep(section)}
                  isRegenerating={isLoading}
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Save indicator */}
          {isSaving && (
            <div className="fixed bottom-4 right-4 bg-card border border-border rounded-lg px-3 py-2 shadow-lg flex items-center gap-2">
              <div className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-muted-foreground">Saving...</span>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AppPage;
