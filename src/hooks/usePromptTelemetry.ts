import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type DocumentType = "cover_letter" | "interview_prep";
export type ActionType = "generate" | "regenerate" | "quick_improvement";

interface TrackPromptOptions {
  applicationId?: string | null;
  documentType: DocumentType;
  actionType: ActionType;
  section?: string;
  userFeedback?: string;
  selectedTips?: string[];
  injectedPrompt?: string;
  metadata?: Record<string, any>;
}

interface PromptTelemetryRecord {
  id: string;
  document_type: DocumentType;
  action_type: ActionType;
  section: string | null;
  user_feedback: string | null;
  selected_tips: string[] | null;
  injected_prompt: string | null;
  prompt_metadata: Record<string, any>;
  created_at: string;
}

export function usePromptTelemetry() {
  const { user } = useAuth();

  /**
   * Track a prompt injection for telemetry and monitoring
   * Records the actual prompts being sent to the AI system
   */
  const trackPrompt = useCallback(async (options: TrackPromptOptions): Promise<string | null> => {
    if (!user?.id) {
      console.warn("Cannot track prompt telemetry: No authenticated user");
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("prompt_telemetry")
        .insert({
          user_id: user.id,
          application_id: options.applicationId || null,
          document_type: options.documentType,
          action_type: options.actionType,
          section: options.section || null,
          user_feedback: options.userFeedback || null,
          selected_tips: options.selectedTips || null,
          injected_prompt: options.injectedPrompt || null,
          prompt_metadata: options.metadata || {},
        })
        .select("id")
        .single();

      if (error) {
        console.error("Error tracking prompt telemetry:", error);
        return null;
      }

      return data?.id || null;
    } catch (error) {
      console.error("Error tracking prompt telemetry:", error);
      return null;
    }
  }, [user?.id]);

  /**
   * Track a cover letter prompt injection
   */
  const trackCoverLetterPrompt = useCallback(async (
    applicationId: string | null,
    actionType: ActionType,
    options: {
      section?: string;
      userFeedback?: string;
      selectedTips?: string[];
      injectedPrompt?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<string | null> => {
    return trackPrompt({
      applicationId,
      documentType: "cover_letter",
      actionType,
      ...options,
    });
  }, [trackPrompt]);

  /**
   * Track an interview prep prompt injection
   */
  const trackInterviewPrepPrompt = useCallback(async (
    applicationId: string | null,
    actionType: ActionType,
    options: {
      section?: string;
      userFeedback?: string;
      selectedTips?: string[];
      injectedPrompt?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<string | null> => {
    return trackPrompt({
      applicationId,
      documentType: "interview_prep",
      actionType,
      ...options,
    });
  }, [trackPrompt]);

  /**
   * Update the quality rating for a tracked prompt (for feedback loop)
   */
  const ratePromptResponse = useCallback(async (
    telemetryId: string,
    rating: number
  ): Promise<boolean> => {
    if (!user?.id) return false;

    try {
      const { error } = await supabase
        .from("prompt_telemetry")
        .update({ response_quality_rating: rating })
        .eq("id", telemetryId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Error rating prompt response:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error rating prompt response:", error);
      return false;
    }
  }, [user?.id]);

  /**
   * Get prompt telemetry history for an application
   */
  const getPromptHistory = useCallback(async (
    applicationId: string
  ): Promise<PromptTelemetryRecord[]> => {
    if (!user?.id) return [];

    try {
      const { data, error } = await supabase
        .from("prompt_telemetry")
        .select("*")
        .eq("application_id", applicationId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching prompt history:", error);
        return [];
      }

      return (data || []) as PromptTelemetryRecord[];
    } catch (error) {
      console.error("Error fetching prompt history:", error);
      return [];
    }
  }, [user?.id]);

  return {
    trackPrompt,
    trackCoverLetterPrompt,
    trackInterviewPrepPrompt,
    ratePromptResponse,
    getPromptHistory,
  };
}
