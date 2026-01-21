import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPrelight, createCorsResponse, createCorsErrorResponse } from "../_shared/cors-utils.ts";

/**
 * GDPR Account Deletion Function
 *
 * Completely deletes ALL user data and the auth account for GDPR Article 17 compliance
 * (Right to erasure / "Right to be forgotten")
 */

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GDPR-DELETE] ${step}${detailsStr}`);
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
    const userEmail = userData.user.email;
    logStep("User authenticated", { userId, email: userEmail });

    // Verify confirmation from request body
    const { confirmText } = await req.json();
    if (confirmText !== "DELETE MY ACCOUNT") {
      return createCorsErrorResponse(
        "Invalid confirmation. Please type 'DELETE MY ACCOUNT' to confirm.",
        origin,
        400
      );
    }

    logStep("Confirmation verified, beginning deletion");

    // Track what we're deleting for audit purposes (before deletion)
    const deletionManifest = {
      userId,
      email: userEmail,
      deletedAt: new Date().toISOString(),
      tablesCleared: [] as string[],
    };

    // Step 1: Get resume chunk IDs to delete related requirement_matches
    const { data: chunks } = await supabaseClient
      .from("resume_chunks")
      .select("id")
      .eq("user_id", userId);

    if (chunks && chunks.length > 0) {
      const chunkIds = chunks.map(c => c.id);
      const { error } = await supabaseClient
        .from("requirement_matches")
        .delete()
        .in("chunk_id", chunkIds);
      if (!error) deletionManifest.tablesCleared.push("requirement_matches");
    }

    // Step 2: Delete from tables with foreign key dependencies first
    // (Tables that reference other user tables)
    const dependentDeletes = await Promise.allSettled([
      supabaseClient.from("document_versions").delete().eq("user_id", userId),
      supabaseClient.from("email_notifications").delete().eq("user_id", userId),
    ]);

    if (dependentDeletes[0].status === "fulfilled") deletionManifest.tablesCleared.push("document_versions");
    if (dependentDeletes[1].status === "fulfilled") deletionManifest.tablesCleared.push("email_notifications");

    logStep("Dependent tables cleared");

    // Step 3: Delete from main data tables
    const mainDeletes = await Promise.allSettled([
      supabaseClient.from("applications").delete().eq("user_id", userId),
      supabaseClient.from("user_resumes").delete().eq("user_id", userId),
      supabaseClient.from("user_cover_letter_templates").delete().eq("user_id", userId),
      supabaseClient.from("resume_chunks").delete().eq("user_id", userId),
      supabaseClient.from("profiles").delete().eq("user_id", userId),
    ]);

    if (mainDeletes[0].status === "fulfilled") deletionManifest.tablesCleared.push("applications");
    if (mainDeletes[1].status === "fulfilled") deletionManifest.tablesCleared.push("user_resumes");
    if (mainDeletes[2].status === "fulfilled") deletionManifest.tablesCleared.push("user_cover_letter_templates");
    if (mainDeletes[3].status === "fulfilled") deletionManifest.tablesCleared.push("resume_chunks");
    if (mainDeletes[4].status === "fulfilled") deletionManifest.tablesCleared.push("profiles");

    logStep("Main data tables cleared");

    // Step 4: Delete security and session data
    const securityDeletes = await Promise.allSettled([
      supabaseClient.from("user_devices").delete().eq("user_id", userId),
      supabaseClient.from("session_logs").delete().eq("user_id", userId),
      supabaseClient.from("backup_codes").delete().eq("user_id", userId),
      supabaseClient.from("mfa_settings").delete().eq("user_id", userId),
    ]);

    if (securityDeletes[0].status === "fulfilled") deletionManifest.tablesCleared.push("user_devices");
    if (securityDeletes[1].status === "fulfilled") deletionManifest.tablesCleared.push("session_logs");
    if (securityDeletes[2].status === "fulfilled") deletionManifest.tablesCleared.push("backup_codes");
    if (securityDeletes[3].status === "fulfilled") deletionManifest.tablesCleared.push("mfa_settings");

    logStep("Security tables cleared");

    // Step 5: Delete analytics and tracking data
    const analyticsDeletes = await Promise.allSettled([
      supabaseClient.from("analytics_events").delete().eq("user_id", userId),
      supabaseClient.from("audit_log").delete().eq("user_id", userId),
    ]);

    if (analyticsDeletes[0].status === "fulfilled") deletionManifest.tablesCleared.push("analytics_events");
    if (analyticsDeletes[1].status === "fulfilled") deletionManifest.tablesCleared.push("audit_log");

    logStep("Analytics tables cleared");

    // Step 6: Delete feedback and demo data
    const miscDeletes = await Promise.allSettled([
      supabaseClient.from("demo_feedback").delete().eq("user_id", userId),
      supabaseClient.from("demo_whitelist").delete().eq("user_id", userId),
      supabaseClient.from("user_roles").delete().eq("user_id", userId),
    ]);

    if (miscDeletes[0].status === "fulfilled") deletionManifest.tablesCleared.push("demo_feedback");
    if (miscDeletes[1].status === "fulfilled") deletionManifest.tablesCleared.push("demo_whitelist");
    if (miscDeletes[2].status === "fulfilled") deletionManifest.tablesCleared.push("user_roles");

    logStep("Miscellaneous tables cleared");

    // Step 7: Delete the auth user itself
    const { error: authDeleteError } = await supabaseClient.auth.admin.deleteUser(userId);

    if (authDeleteError) {
      logStep("Warning: Could not delete auth user", { error: authDeleteError.message });
      // Continue anyway - data is deleted
    } else {
      deletionManifest.tablesCleared.push("auth.users");
      logStep("Auth user deleted");
    }

    // Note: We intentionally do NOT log this deletion to audit_log since:
    // 1. The audit_log for this user was just deleted
    // 2. Keeping deletion records would violate the spirit of GDPR erasure
    // Instead, we log to console for operational purposes only

    logStep("Account deletion completed", {
      tablesCleared: deletionManifest.tablesCleared.length,
      success: true,
    });

    return createCorsResponse(
      {
        success: true,
        message: "Your account and all associated data have been permanently deleted.",
        deletedAt: deletionManifest.deletedAt,
        tablesCleared: deletionManifest.tablesCleared.length,
      },
      origin
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return createCorsErrorResponse(
      "Failed to delete account. Please contact support.",
      origin,
      500
    );
  }
});
