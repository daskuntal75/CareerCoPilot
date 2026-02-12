import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import JobDescriptionInput from "@/components/app/JobDescriptionInput";
import AnalysisResults from "@/components/app/AnalysisResults";
import CoverLetterEditor from "@/components/app/CoverLetterEditor";
import InterviewPrep, { InterviewPrepData, SavedPrepSet } from "@/components/app/InterviewPrep";
import AppStepper from "@/components/app/AppStepper";
import GenerationProgress, { GenerationStage } from "@/components/app/GenerationProgress";
import FeedbackCollectionModal from "@/components/feedback/FeedbackCollectionModal";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AlertCircle, FileText, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HourlyQuotaIndicator } from "@/components/app/HourlyQuotaIndicator";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useUsageTracking } from "@/hooks/useUsageTracking";
import { usePromptTelemetry } from "@/hooks/usePromptTelemetry";
import { EmailVerificationRequired } from "@/components/auth/EmailVerificationRequired";
import { useDemoLimit } from "@/hooks/useDemoLimit";
import { DemoLimitBanner } from "@/components/feedback";

export type AppStep = "job" | "editor" | "interview";

// Transform legacy interview prep data format (phase_X) to expected format
const normalizeInterviewPrepData = (data: any): InterviewPrepData | null => {
  if (!data) return null;
  
  // If data already has the expected structure, return it
  if (data.questions && Array.isArray(data.questions)) {
    return data as InterviewPrepData;
  }
  
  // Transform legacy phase_X format to expected format
  const phase1 = data.phase_1_company_research || {};
  const phase2 = data.phase_2_strategic_analysis || {};
  const phase3 = data.phase_3_interview_preparation || {};
  const phase4 = data.phase_4_interview_questions || [];
  
  // If no legacy data found, return null
  if (!phase1.vision_mission && !phase3.core_requirements && phase4.length === 0) {
    // Check if there's any data at all
    if (Object.keys(data).length === 0) return null;
  }
  
  // Transform questions from legacy format
  const questions = Array.isArray(phase4) ? phase4.map((q: any) => ({
    question: q.question || "",
    category: q.interviewer_type?.toLowerCase()?.replace(" ", "_") || "behavioral",
    difficulty: "medium" as const,
    whyAsked: "Based on job requirements and your experience",
    starAnswer: q.answer ? {
      situation: q.answer.situation || "",
      task: q.answer.task || "",
      action: q.answer.action || "",
      result: q.answer.result || "",
    } : { situation: "", task: "", action: "", result: "" },
    tips: [],
  })) : [];
  
  // Transform SWOT analysis
  const swot = phase2.swot_analysis || {};
  const strategicAnalysis = {
    strengths: swot.strengths || [],
    criticalStrength: swot.strengths?.[0] || "",
    weaknesses: swot.weaknesses || [],
    criticalWeakness: swot.weaknesses?.[0] || "",
    opportunities: swot.opportunities || [],
    criticalOpportunity: swot.opportunities?.[0] || "",
    threats: swot.threats || [],
    criticalThreat: swot.threats?.[0] || "",
    competitors: phase2.competitive_landscape || [],
    competitivePosition: "",
  };
  
  // Build normalized data
  const normalizedData: InterviewPrepData = {
    questions,
    keyStrengths: phase3.core_requirements || [],
    potentialConcerns: [],
    questionsToAsk: [],
    applicationContext: `Interview preparation for ${phase3.interview_structure || "this role"}`,
    companyIntelligence: {
      visionMission: phase1.vision_mission || "",
      industryMarket: phase1.industry_position || "",
      financialPerformance: "",
      productsServices: phase1.products_services || "",
    },
    keyDomainConcepts: [],
    strategicAnalysis,
    cultureAndBenefits: {
      cultureInsights: phase1.culture ? [phase1.culture] : [],
      standoutBenefits: [],
    },
    interviewStructure: {
      coreRequirements: phase3.core_requirements || [],
      keyCompetencies: [],
      predictedFormat: phase3.interview_structure || "",
    },
    uniqueValueProposition: phase3.unique_value_proposition || "",
    whyThisCompany: phase3.why_company_why_leaving?.why_company || "",
  };
  
  return normalizedData;
};

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
  const { detailedResume, isProfileComplete, isLoading: isProfileLoading } = useUserProfile();
  const { trackPageView, trackApplicationEvent, trackCoverLetterEvent, trackInterviewPrepEvent } = useAnalytics();
  const { canUseFeature, incrementUsage, getRemainingUsage, limits } = useUsageTracking();
  const { trackCoverLetterPrompt, trackInterviewPrepPrompt } = usePromptTelemetry();
  const { isLimitReached, isDemoMode, demoLimit, supportEmail, applicationCount, refreshCount } = useDemoLimit();
  const [currentStep, setCurrentStep] = useState<AppStep>("job");
  const [jobData, setJobData] = useState<JobData | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  const [coverLetter, setCoverLetter] = useState<string>("");
  const [interviewPrep, setInterviewPrep] = useState<InterviewPrepData | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(id || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generationStage, setGenerationStage] = useState<GenerationStage>("analyzing");
  const [generationType, setGenerationType] = useState<"cover-letter" | "interview-prep">("cover-letter");
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [savedPrepSets, setSavedPrepSets] = useState<SavedPrepSet[]>([]);

  // Load existing application if ID provided and track page view
  useEffect(() => {
    trackPageView("application", { application_id: id, step: currentStep });
    if (id && user) {
      loadApplication(id);
    }
  }, [id, user]);

  const loadApplication = async (appId: string) => {
    try {
      // Use decrypted RPC to read encrypted cover_letter/resume_content
      const { data, error } = await supabase
        .rpc("get_application_decrypted", { app_id: appId })
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
        // Normalize legacy format to expected format
        const rawPrep = data.interview_prep as any;
        const normalizedPrep = normalizeInterviewPrepData(rawPrep);
        if (normalizedPrep) {
          setInterviewPrep(normalizedPrep);
        }
        // Load saved prep sets if they exist
        if (rawPrep.savedPrepSets && Array.isArray(rawPrep.savedPrepSets)) {
          setSavedPrepSets(rawPrep.savedPrepSets);
        }
      }

      // Set appropriate step based on data
      if (data.interview_prep) {
        setCurrentStep("interview");
      } else if (data.cover_letter || data.requirements_analysis) {
        setCurrentStep("editor");
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

  const handleJobSubmit = async (data: JobData) => {
    // Check demo limit before allowing new application (only for new apps, not existing ones)
    if (!applicationId && isDemoMode && isLimitReached) {
      toast.error("Demo limit reached. Please contact support for full access.");
      return;
    }

    if (!detailedResume) {
      toast.error("Please upload your resume in Career Documents first");
      navigate("/profile");
      return;
    }

    setJobData(data);
    setIsLoading(true);
    setGenerationType("cover-letter");
    setGenerationStage("analyzing");
    setCurrentStep("editor");

    // Create abort controller for cancellation
    const controller = new AbortController();
    setAbortController(controller);

    try {
      // Step 1: Analyze job fit
      const response = await supabase.functions.invoke("analyze-job-fit", {
        body: {
          resumeContent: detailedResume.content,
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
      
      // Track analytics
      trackApplicationEvent("analyzed", {
        company: data.company,
        job_title: data.title,
        fit_score: analysis.fitScore,
        fit_level: analysis.fitLevel,
      });

      let newAppId = applicationId;
      if (user) {
        newAppId = await saveApplication({
          company: data.company,
          job_title: data.title,
          job_description: data.description,
          fit_score: analysis.fitScore,
          fit_level: analysis.fitLevel,
          requirements_analysis: analysis,
        });

        // Handle demo mode triggers for new applications
        if (isDemoMode && newAppId && !id) {
          refreshCount();
          const newAppCount = applicationCount + 1;
          
          if (newAppCount === 2) {
            supabase.functions.invoke("send-demo-reminder", {
              body: {
                email: user.email,
                firstName: user.user_metadata?.full_name?.split(" ")[0],
                fullName: user.user_metadata?.full_name,
                applicationsUsed: 2,
                applicationsRemaining: 1,
              },
            }).catch(console.error);
          }
          
          if (newAppCount === 3) {
            setTimeout(() => setShowFeedbackModal(true), 1500);
          }
        }
      }

      // Step 2: Check usage limits before generating cover letter
      if (!canUseFeature("cover_letter")) {
        // Still show analysis results but don't generate cover letter
        setIsLoading(false);
        setAbortController(null);
        toast.info("Analysis complete! Upgrade to generate a cover letter.");
        return;
      }

      // Increment usage before generation
      const usageIncremented = await incrementUsage("cover_letter");
      if (!usageIncremented) {
        setIsLoading(false);
        setAbortController(null);
        toast.error("Failed to track usage. Please try again.");
        return;
      }

      // Step 3: Generate cover letter using the same analysis data
      setGenerationStage("drafting");

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Authentication required");

      const clResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-cover-letter`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            resumeContent: detailedResume.content,
            jobDescription: data.description,
            jobTitle: data.title,
            company: data.company,
            analysisData: analysis,
            applicationId: newAppId || applicationId,
            userId: user?.id,
            stream: true,
          }),
          signal: controller.signal,
        }
      );

      if (!clResponse.ok) {
        const errorData = await clResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${clResponse.status}`);
      }

      const reader = clResponse.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";

      setGenerationStage("refining");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const lineData = line.slice(6).trim();
            if (lineData === "[DONE]") break;
            
            try {
              const parsed = JSON.parse(lineData);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
              }
            } catch {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }

      setGenerationStage("complete");
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCoverLetter(fullContent);
      
      // Track prompt telemetry for initial generation
      await trackCoverLetterPrompt(newAppId || applicationId, "generate", {
        metadata: {
          company: data.company,
          jobTitle: data.title,
          fitScore: analysis.fitScore,
        },
      });
      
      trackCoverLetterEvent("generated", {
        company: data.company,
        job_title: data.title,
        application_id: newAppId || applicationId,
      });

      if (user) {
        await saveApplication({
          cover_letter: fullContent,
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        toast.info("Generation cancelled");
        return;
      }
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to analyze and generate. Please try again.");
      trackApplicationEvent("analysis_failed", { error: String(error) });
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleGenerateCoverLetter = async () => {
    if (!jobData || !detailedResume) return;
    
    // Check usage limits for free tier
    if (!canUseFeature("cover_letter")) {
      const remaining = getRemainingUsage("cover_letter");
      toast.error(
        `You've reached your monthly limit of ${limits.cover_letter} cover letters. Upgrade to Pro for unlimited access!`,
        {
          action: {
            label: "Upgrade",
            onClick: () => navigate("/pricing"),
          },
        }
      );
      return;
    }
    
    setIsLoading(true);
    setGenerationType("cover-letter");
    setGenerationStage("analyzing");
    
    // Create abort controller for cancellation
    const controller = new AbortController();
    setAbortController(controller);
    
    try {
      // Increment usage before generation
      const usageIncremented = await incrementUsage("cover_letter");
      if (!usageIncremented) {
        toast.error("Failed to track usage. Please try again.");
        setIsLoading(false);
        return;
      }

      // Get auth token for streaming request
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Authentication required");

      setGenerationStage("drafting");

      // Make streaming request
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-cover-letter`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            resumeContent: detailedResume.content,
            jobDescription: jobData.description,
            jobTitle: jobData.title,
            company: jobData.company,
            analysisData,
            applicationId: applicationId,
            userId: user?.id,
            stream: true,
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      // Handle SSE stream
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";

      setGenerationStage("refining");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Process SSE events line by line
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
              }
            } catch {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }

      setGenerationStage("complete");
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setCoverLetter(fullContent);
      setCurrentStep("editor");
      
      // Track prompt telemetry for initial generation
      await trackCoverLetterPrompt(applicationId, "generate", {
        metadata: {
          company: jobData.company,
          jobTitle: jobData.title,
          fitScore: analysisData?.fitScore,
        },
      });
      
      // Track analytics
      trackCoverLetterEvent("generated", {
        company: jobData.company,
        job_title: jobData.title,
        application_id: applicationId,
      });

      if (user) {
        await saveApplication({
          cover_letter: fullContent,
        });
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        toast.info("Generation cancelled");
        return;
      }
      console.error("Error generating cover letter:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate cover letter. Please try again.");
      trackCoverLetterEvent("generation_failed", { error: String(error) });
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleRegenerateCoverLetter = async (
    section: string,
    feedback: string,
    tips: string[]
  ) => {
    if (!jobData || !detailedResume) return;
    
    setIsLoading(true);
    setGenerationType("cover-letter");
    setGenerationStage("analyzing");
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Authentication required");

      setGenerationStage("drafting");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-cover-letter`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            resumeContent: detailedResume.content,
            jobDescription: jobData.description,
            jobTitle: jobData.title,
            company: jobData.company,
            analysisData,
            applicationId: applicationId,
            userId: user?.id,
            sectionToRegenerate: section,
            userFeedback: feedback,
            selectedTips: tips,
            existingCoverLetter: coverLetter,
            stream: true,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Request failed with status ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";

      setGenerationStage("refining");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                fullContent += content;
              }
            } catch {
              // Ignore parse errors for partial chunks
            }
          }
        }
      }

      setGenerationStage("complete");
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // For section regeneration, the AI returns just the section content
      // We need to merge it appropriately (for now, just use the full regenerated content)
      setCoverLetter(fullContent);
      
      toast.success(`${section} regenerated successfully`);
      
      if (user) {
        await saveApplication({
          cover_letter: fullContent,
        });
      }
    } catch (error) {
      console.error("Error regenerating cover letter:", error);
      toast.error(error instanceof Error ? error.message : "Failed to regenerate. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateInterviewPrep = async (
    sectionToRegenerate?: string,
    userFeedback?: string,
    selectedTips?: string[]
  ) => {
    if (!jobData || !detailedResume) return;
    
    // Check usage limits for free tier (only for new generations, not regenerations)
    if (!sectionToRegenerate && !canUseFeature("interview_prep")) {
      toast.error(
        "Interview prep is a Pro feature. Upgrade to access interview preparation!",
        {
          action: {
            label: "Upgrade",
            onClick: () => navigate("/pricing"),
          },
        }
      );
      return;
    }
    
    setIsLoading(true);
    setGenerationType("interview-prep");
    setGenerationStage("analyzing");
    
    // Create abort controller for cancellation
    const controller = new AbortController();
    setAbortController(controller);
    
    try {
      // Increment usage before generation (only for new generations)
      if (!sectionToRegenerate) {
        const usageIncremented = await incrementUsage("interview_prep");
        if (!usageIncremented && limits.interview_prep !== -1) {
          toast.error("Failed to track usage. Please try again.");
          setIsLoading(false);
          return;
        }
      }

      // Build injected prompt for telemetry
      let injectedPrompt = "";
      if (sectionToRegenerate) {
        injectedPrompt = `Section: ${sectionToRegenerate}`;
        if (userFeedback) injectedPrompt += `\nUser Feedback: ${userFeedback}`;
        if (selectedTips?.length) injectedPrompt += `\nSelected Tips: ${selectedTips.join(", ")}`;
      }

      // For interview prep, we use non-streaming since we need structured JSON
      // The function handles retries and timeouts internally
      setGenerationStage("drafting");
      
      const response = await supabase.functions.invoke("generate-interview-prep", {
        body: {
          resumeContent: detailedResume.content,
          jobDescription: jobData.description,
          jobTitle: jobData.title,
          company: jobData.company,
          analysisData,
          sectionToRegenerate,
          userFeedback,
          selectedTips,
          existingData: sectionToRegenerate ? interviewPrep : undefined,
          stream: false, // Keep non-streaming for structured JSON response
        },
      });

      if (response.error) throw new Error(response.error.message);
      
      setGenerationStage("refining");
      await new Promise(resolve => setTimeout(resolve, 300));
      
      setGenerationStage("complete");
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Normalize the response data to handle legacy format
      const normalizedData = normalizeInterviewPrepData(response.data);
      
      if (!normalizedData) {
        throw new Error("Failed to process interview prep data");
      }
      
      // If regenerating a section, merge the data
      if (sectionToRegenerate && interviewPrep) {
        // For section regeneration, merge the regenerated section with existing data
        const regeneratedSection = normalizeInterviewPrepData(response.data);
        const updatedPrep = { ...interviewPrep, ...regeneratedSection };
        setInterviewPrep(updatedPrep);
        if (user) {
          await saveApplication({ interview_prep: { ...updatedPrep, savedPrepSets } });
        }
        toast.success(`${sectionToRegenerate} regenerated successfully`);
        trackInterviewPrepEvent("section_regenerated", { section: sectionToRegenerate });
        
        // Track telemetry for regeneration
        await trackInterviewPrepPrompt(applicationId, "regenerate", {
          section: sectionToRegenerate,
          userFeedback,
          selectedTips,
          injectedPrompt,
          metadata: {
            company: jobData.company,
            jobTitle: jobData.title,
            fitScore: analysisData?.fitScore,
          },
        });
      } else {
        setInterviewPrep(normalizedData);
        setCurrentStep("interview");
        
        // Track analytics
        trackInterviewPrepEvent("generated", {
          company: jobData.company,
          job_title: jobData.title,
          application_id: applicationId,
        });
        
        // Track telemetry for initial generation
        await trackInterviewPrepPrompt(applicationId, "generate", {
          metadata: {
            company: jobData.company,
            jobTitle: jobData.title,
            fitScore: analysisData?.fitScore,
          },
        });
        
        if (user) {
          await saveApplication({ interview_prep: { ...normalizedData, savedPrepSets } });
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        toast.info("Generation cancelled");
        return;
      }
      console.error("Error generating interview prep:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate interview prep. Please try again.");
      trackInterviewPrepEvent("generation_failed", { error: String(error) });
    } finally {
      setIsLoading(false);
      setAbortController(null);
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

  // Show loading while checking profile
  if (isProfileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Check if email is verified
  if (user && !user.email_confirmed_at) {
    return <EmailVerificationRequired email={user.email || ""} />;
  }

  // Redirect to profile setup if not complete
  if (user && !isProfileComplete) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 pt-24 pb-12 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-warning" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Complete Your Profile First
            </h2>
            <p className="text-muted-foreground mb-6">
              Upload your detailed resume to start applying for jobs. Your resume will be used for all applications.
            </p>
            <Button variant="hero" size="lg" onClick={() => navigate("/profile")}>
              Upload Resume
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Demo Limit Banner */}
          {isDemoMode && isLimitReached && !applicationId && (
            <DemoLimitBanner 
              supportEmail={supportEmail} 
              applicationCount={applicationCount} 
              demoLimit={demoLimit} 
            />
          )}

          {/* Stepper */}
          <div className="mb-8">
            <AppStepper currentStep={currentStep} onStepClick={goToStep} />
          </div>

          {/* Loading Overlay - show for interview step too */}
          {isLoading && (currentStep === "editor" || currentStep === "interview") && (
            <GenerationProgress 
              currentStage={generationStage} 
              type={generationType}
              onCancel={() => {
                if (abortController) {
                  abortController.abort();
                  setAbortController(null);
                }
                setIsLoading(false);
              }}
            />
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
              {currentStep === "job" && (
                <JobDescriptionInput 
                  onSubmit={handleJobSubmit} 
                  initialData={jobData}
                />
              )}
              
              
              
              {currentStep === "editor" && jobData && (
                <>
                  {/* Show generate prompt when no cover letter exists */}
                  {!coverLetter ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="max-w-2xl mx-auto text-center py-12"
                    >
                      <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
                        <FileText className="w-8 h-8 text-accent" />
                      </div>
                      <h2 className="text-2xl font-bold text-foreground mb-3">
                        Generate Your Cover Letter
                      </h2>
                      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                        Create a tailored cover letter for {jobData.title} at {jobData.company} based on your resume and the job requirements.
                      </p>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button
                          variant="outline"
                          onClick={() => setCurrentStep("job")}
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" />
                          Back to Analysis
                        </Button>
                        <Button
                          variant="hero"
                          onClick={handleGenerateCoverLetter}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin mr-2" />
                          ) : (
                            <Sparkles className="w-4 h-4 mr-2" />
                          )}
                          Generate Cover Letter
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <CoverLetterEditor 
                      content={coverLetter}
                      jobData={jobData}
                      onContentChange={handleCoverLetterChange}
                      onBack={() => setCurrentStep("job")}
                      onGenerateInterviewPrep={() => handleGenerateInterviewPrep()}
                      onRegenerateCoverLetter={(section, feedback, tips) => {
                        toast.info(`Regenerating ${section} with your feedback...`);
                        handleRegenerateCoverLetter(section, feedback, tips);
                      }}
                      isRegenerating={isLoading}
                      hasInterviewPrep={!!interviewPrep}
                      onGoToInterviewPrep={() => setCurrentStep("interview")}
                      applicationId={applicationId}
                      analysisData={analysisData}
                    />
                  )}
                </>
              )}

              {currentStep === "interview" && jobData && (interviewPrep || isLoading) && (
                <InterviewPrep
                  data={interviewPrep || { questions: [], keyStrengths: [], potentialConcerns: [], questionsToAsk: [] }}
                  jobData={jobData}
                  onBack={() => setCurrentStep("editor")}
                  onRegenerateSection={(section, feedback, tips) => {
                    toast.info(`Regenerating ${section} with your feedback...`);
                    handleGenerateInterviewPrep(section, feedback, tips);
                  }}
                  onGenerateTargeted={async (interviewerType, guidance) => {
                    if (!jobData || !detailedResume) return;
                    setIsLoading(true);
                    setGenerationType("interview-prep");
                    setGenerationStage("analyzing");
                    try {
                      setGenerationStage("drafting");
                      const response = await supabase.functions.invoke("generate-interview-prep", {
                        body: {
                          resumeContent: detailedResume.content,
                          jobDescription: jobData.description,
                          jobTitle: jobData.title,
                          company: jobData.company,
                          analysisData,
                          interviewerType,
                          targetedGuidance: guidance,
                          stream: false,
                        },
                      });
                      if (response.error) throw new Error(response.error.message);
                      setGenerationStage("complete");
                      await new Promise(resolve => setTimeout(resolve, 500));
                      const normalizedData = normalizeInterviewPrepData(response.data);
                      if (!normalizedData) throw new Error("Failed to process response");
                      // Merge: keep existing data, only replace questions
                      const updatedPrep = { ...interviewPrep!, questions: normalizedData.questions };
                      setInterviewPrep(updatedPrep);
                      if (user && applicationId) {
                        await saveApplication({ interview_prep: { ...updatedPrep, savedPrepSets } });
                      }
                      toast.success(`Targeted questions for ${interviewerType} generated!`);
                    } catch (error) {
                      console.error("Error:", error);
                      toast.error(error instanceof Error ? error.message : "Failed to generate targeted prep");
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                  isRegenerating={isLoading}
                  onGoToCoverLetter={coverLetter ? () => setCurrentStep("editor") : undefined}
                  applicationId={applicationId}
                  onDataChange={(newData) => {
                    setInterviewPrep(newData);
                    if (user && applicationId) {
                      saveApplication({ interview_prep: { ...newData, savedPrepSets } });
                    }
                  }}
                  savedPrepSets={savedPrepSets}
                  onSavedPrepSetsChange={(newSets) => {
                    setSavedPrepSets(newSets);
                    if (user && applicationId && interviewPrep) {
                      saveApplication({ interview_prep: { ...interviewPrep, savedPrepSets: newSets } });
                    }
                  }}
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

          {/* Feedback Collection Modal */}
          <FeedbackCollectionModal
            open={showFeedbackModal}
            onOpenChange={setShowFeedbackModal}
            applicationCount={applicationCount + 1}
            company={jobData?.company}
            jobTitle={jobData?.title}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AppPage;