import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPrelight, createCorsResponse, createCorsErrorResponse } from "../_shared/cors-utils.ts";

/**
 * GDPR Data Export Function
 *
 * Exports ALL user data in a comprehensive format for GDPR Article 20 compliance
 * (Right to data portability)
 */

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GDPR-EXPORT] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight
  const preflightResponse = handleCorsPrelight(req);
  if (preflightResponse) return preflightResponse;

  const origin = req.headers.get("origin");

  try {
    logStep("Function started");

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return createCorsErrorResponse("Authorization required", origin, 401);
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify the user
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !userData.user) {
      return createCorsErrorResponse("Invalid authentication", origin, 401);
    }

    const userId = userData.user.id;
    logStep("User authenticated", { userId });

    // Fetch ALL user data from all tables
    const [
      profileResult,
      applicationsResult,
      resumesResult,
      coverLetterTemplatesResult,
      documentVersionsResult,
      resumeChunksResult,
      auditLogResult,
      analyticsResult,
      emailNotificationsResult,
      userDevicesResult,
      sessionLogsResult,
      mfaSettingsResult,
      backupCodesResult,
      demoFeedbackResult,
    ] = await Promise.all([
      supabaseClient.from("profiles").select("*").eq("user_id", userId).single(),
      supabaseClient.from("applications").select("*").eq("user_id", userId),
      supabaseClient.from("user_resumes").select("id, file_name, resume_type, uploaded_at, content").eq("user_id", userId),
      supabaseClient.from("user_cover_letter_templates").select("*").eq("user_id", userId),
      supabaseClient.from("document_versions").select("*").eq("user_id", userId),
      supabaseClient.from("resume_chunks").select("id, resume_type, chunk_index, content, created_at").eq("user_id", userId),
      supabaseClient.from("audit_log").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabaseClient.from("analytics_events").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabaseClient.from("email_notifications").select("*").eq("user_id", userId),
      supabaseClient.from("user_devices").select("id, device_name, device_fingerprint, ip_address, last_used_at, is_trusted, created_at").eq("user_id", userId),
      supabaseClient.from("session_logs").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabaseClient.from("mfa_settings").select("user_id, mfa_enabled, method, created_at, updated_at").eq("user_id", userId).single(),
      supabaseClient.from("backup_codes").select("id, created_at, used_at").eq("user_id", userId),
      supabaseClient.from("demo_feedback").select("*").eq("user_id", userId),
    ]);

    logStep("Data fetched from all tables");

    // Build comprehensive export object
    const exportData = {
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        exportVersion: "1.0",
        dataSubject: {
          id: userId,
          email: userData.user.email,
        },
        legalBasis: "GDPR Article 20 - Right to data portability",
      },

      // Account Information
      account: {
        userId: userData.user.id,
        email: userData.user.email,
        emailConfirmed: userData.user.email_confirmed_at,
        phone: userData.user.phone,
        createdAt: userData.user.created_at,
        lastSignInAt: userData.user.last_sign_in_at,
        userMetadata: userData.user.user_metadata,
      },

      // Profile Data
      profile: profileResult.data || null,

      // Security Settings
      security: {
        mfaSettings: mfaSettingsResult.data || null,
        backupCodesCount: backupCodesResult.data?.length || 0,
        backupCodesUsed: backupCodesResult.data?.filter(c => c.used_at)?.length || 0,
        trustedDevices: userDevicesResult.data || [],
        sessionHistory: sessionLogsResult.data || [],
      },

      // Application Data
      applications: (applicationsResult.data || []).map(app => ({
        id: app.id,
        company: app.company,
        jobTitle: app.job_title,
        jobDescription: app.job_description,
        resumeContent: app.resume_content,
        coverLetter: app.cover_letter,
        requirementsAnalysis: app.requirements_analysis,
        fitScore: app.fit_score,
        interviewPrep: app.interview_prep,
        status: app.status,
        appliedAt: app.applied_at,
        createdAt: app.created_at,
        updatedAt: app.updated_at,
      })),

      // Resume Data
      resumes: resumesResult.data || [],

      // Cover Letter Templates
      coverLetterTemplates: coverLetterTemplatesResult.data || [],

      // Document Version History
      documentVersions: documentVersionsResult.data || [],

      // Resume Chunks (RAG data)
      resumeChunks: (resumeChunksResult.data || []).map(chunk => ({
        id: chunk.id,
        resumeType: chunk.resume_type,
        chunkIndex: chunk.chunk_index,
        content: chunk.content,
        createdAt: chunk.created_at,
        // Excluding embedding vectors as they are not human-readable
      })),

      // Notification Preferences
      emailNotificationPreferences: emailNotificationsResult.data || [],

      // Activity & Audit Log
      activityLog: auditLogResult.data || [],

      // Analytics Events
      analyticsEvents: (analyticsResult.data || []).map(event => ({
        eventName: event.event_name,
        eventCategory: event.event_category,
        eventData: event.event_data,
        pagePath: event.page_path,
        createdAt: event.created_at,
        // session_id included for context
        sessionId: event.session_id,
      })),

      // Feedback Provided
      feedback: demoFeedbackResult.data || [],
    };

    // Log the export action
    await supabaseClient.from("audit_log").insert({
      user_id: userId,
      action_type: "gdpr_data_export",
      action_target: "all_data",
      action_data: {
        exportedAt: exportData.exportMetadata.exportedAt,
        tablesIncluded: [
          "profiles", "applications", "user_resumes", "user_cover_letter_templates",
          "document_versions", "resume_chunks", "audit_log", "analytics_events",
          "email_notifications", "user_devices", "session_logs", "mfa_settings",
          "backup_codes", "demo_feedback"
        ],
      },
      approval_status: "approved",
    });

    logStep("Export completed successfully");

    return createCorsResponse(exportData, origin);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return createCorsErrorResponse(errorMessage, origin, 500);
  }
});
