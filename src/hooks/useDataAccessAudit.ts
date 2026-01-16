import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type DataAccessAction = 
  | "view_profile"
  | "update_profile"
  | "view_application"
  | "create_application"
  | "update_application"
  | "delete_application"
  | "export_data"
  | "view_resume"
  | "view_cover_letter"
  | "generate_cover_letter"
  | "generate_interview_prep";

interface AuditMetadata {
  resource_id?: string;
  resource_type?: string;
  fields_accessed?: string[];
  ip_address?: string;
  user_agent?: string;
  additional_context?: Record<string, unknown>;
}

/**
 * Hook for logging sensitive data access for compliance monitoring
 * Implements audit logging for GDPR/CCPA compliance
 */
export function useDataAccessAudit() {
  const { user } = useAuth();

  /**
   * Log a data access event
   */
  const logDataAccess = useCallback(
    async (
      action: DataAccessAction,
      metadata: AuditMetadata = {}
    ): Promise<boolean> => {
      if (!user) return false;

      try {
        const { error } = await supabase.from("audit_log").insert([{
          user_id: user.id,
          action_type: action,
          action_target: metadata.resource_type || "unknown",
          action_data: {
            resource_id: metadata.resource_id,
            fields_accessed: metadata.fields_accessed,
            user_agent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            ...metadata.additional_context,
          },
          approval_status: "approved", // Data access doesn't need approval
          ip_address: null, // Will be captured by RLS or edge function
        }]);

        if (error) {
          console.error("Failed to log data access:", error);
          return false;
        }

        return true;
      } catch (error) {
        console.error("Data access audit error:", error);
        return false;
      }
    },
    [user]
  );

  /**
   * Log profile access
   */
  const logProfileAccess = useCallback(
    async (profileId: string, action: "view" | "update" = "view") => {
      return logDataAccess(action === "view" ? "view_profile" : "update_profile", {
        resource_id: profileId,
        resource_type: "profiles",
      });
    },
    [logDataAccess]
  );

  /**
   * Log application access
   */
  const logApplicationAccess = useCallback(
    async (
      applicationId: string,
      action: "view" | "create" | "update" | "delete" = "view",
      fieldsAccessed?: string[]
    ) => {
      const actionMap: Record<string, DataAccessAction> = {
        view: "view_application",
        create: "create_application",
        update: "update_application",
        delete: "delete_application",
      };

      return logDataAccess(actionMap[action], {
        resource_id: applicationId,
        resource_type: "applications",
        fields_accessed: fieldsAccessed,
      });
    },
    [logDataAccess]
  );

  /**
   * Log resume access
   */
  const logResumeAccess = useCallback(
    async (resumeId: string) => {
      return logDataAccess("view_resume", {
        resource_id: resumeId,
        resource_type: "user_resumes",
      });
    },
    [logDataAccess]
  );

  /**
   * Log cover letter access
   */
  const logCoverLetterAccess = useCallback(
    async (applicationId: string) => {
      return logDataAccess("view_cover_letter", {
        resource_id: applicationId,
        resource_type: "applications",
        fields_accessed: ["cover_letter"],
      });
    },
    [logDataAccess]
  );

  /**
   * Log AI generation event
   */
  const logAIGeneration = useCallback(
    async (type: "cover_letter" | "interview_prep", applicationId: string) => {
      return logDataAccess(
        type === "cover_letter" ? "generate_cover_letter" : "generate_interview_prep",
        {
          resource_id: applicationId,
          resource_type: "applications",
          additional_context: {
            generation_type: type,
          },
        }
      );
    },
    [logDataAccess]
  );

  /**
   * Log data export event
   */
  const logDataExport = useCallback(
    async (exportType: string) => {
      return logDataAccess("export_data", {
        resource_type: "user_data",
        additional_context: {
          export_type: exportType,
        },
      });
    },
    [logDataAccess]
  );

  return {
    logDataAccess,
    logProfileAccess,
    logApplicationAccess,
    logResumeAccess,
    logCoverLetterAccess,
    logAIGeneration,
    logDataExport,
  };
}

export default useDataAccessAudit;
