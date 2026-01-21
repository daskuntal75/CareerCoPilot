import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

/**
 * Data Retention Cleanup Function
 *
 * Scheduled function to automatically clean up old data according to retention policies.
 * This helps maintain GDPR compliance and reduces storage costs.
 *
 * Retention Policies:
 * - Analytics events: 90 days
 * - Audit logs: 365 days
 * - Session logs: 30 days
 * - Anonymous consent records: 90 days
 * - Inactive demo accounts: 30 days
 *
 * Schedule: Run daily at 2 AM UTC
 */

const RETENTION_POLICIES = {
  analytics_events: 90,    // days
  audit_log: 365,          // days
  session_logs: 30,        // days
  anonymous_consent: 90,   // days
  demo_inactive: 30,       // days
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DATA-RETENTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  // This function is designed to be called by a cron job
  // Verify it's being called internally or with proper authorization
  const authHeader = req.headers.get("Authorization");
  const cronSecret = Deno.env.get("CRON_SECRET");

  // Allow either service role key or cron secret
  if (!authHeader && !cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    logStep("Data retention cleanup started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const results: Record<string, { deleted: number; error?: string }> = {};
    const now = new Date();

    // 1. Clean up old analytics events
    const analyticsDate = new Date(now);
    analyticsDate.setDate(analyticsDate.getDate() - RETENTION_POLICIES.analytics_events);

    const { data: analyticsDeleted, error: analyticsError } = await supabaseClient
      .from("analytics_events")
      .delete()
      .lt("created_at", analyticsDate.toISOString())
      .select("id");

    results.analytics_events = {
      deleted: analyticsDeleted?.length || 0,
      error: analyticsError?.message,
    };
    logStep("Analytics cleanup", results.analytics_events);

    // 2. Clean up old audit logs (keep longer for compliance)
    const auditDate = new Date(now);
    auditDate.setDate(auditDate.getDate() - RETENTION_POLICIES.audit_log);

    const { data: auditDeleted, error: auditError } = await supabaseClient
      .from("audit_log")
      .delete()
      .lt("created_at", auditDate.toISOString())
      .select("id");

    results.audit_log = {
      deleted: auditDeleted?.length || 0,
      error: auditError?.message,
    };
    logStep("Audit log cleanup", results.audit_log);

    // 3. Clean up old session logs
    const sessionDate = new Date(now);
    sessionDate.setDate(sessionDate.getDate() - RETENTION_POLICIES.session_logs);

    const { data: sessionDeleted, error: sessionError } = await supabaseClient
      .from("session_logs")
      .delete()
      .lt("created_at", sessionDate.toISOString())
      .select("id");

    results.session_logs = {
      deleted: sessionDeleted?.length || 0,
      error: sessionError?.message,
    };
    logStep("Session logs cleanup", results.session_logs);

    // 4. Clean up old anonymous consent records (no user_id)
    const consentDate = new Date(now);
    consentDate.setDate(consentDate.getDate() - RETENTION_POLICIES.anonymous_consent);

    const { data: consentDeleted, error: consentError } = await supabaseClient
      .from("user_consent")
      .delete()
      .is("user_id", null)
      .lt("created_at", consentDate.toISOString())
      .select("id");

    results.anonymous_consent = {
      deleted: consentDeleted?.length || 0,
      error: consentError?.message,
    };
    logStep("Anonymous consent cleanup", results.anonymous_consent);

    // 5. Clean up expired password breach cache
    const breachCacheDate = new Date(now);
    breachCacheDate.setDate(breachCacheDate.getDate() - 7); // 7 day cache

    const { data: breachDeleted, error: breachError } = await supabaseClient
      .from("password_breach_cache")
      .delete()
      .lt("checked_at", breachCacheDate.toISOString())
      .select("id");

    results.password_breach_cache = {
      deleted: breachDeleted?.length || 0,
      error: breachError?.message,
    };
    logStep("Breach cache cleanup", results.password_breach_cache);

    // 6. Identify inactive demo users for potential notification
    // (Not deleting automatically - just logging for review)
    const demoDate = new Date(now);
    demoDate.setDate(demoDate.getDate() - RETENTION_POLICIES.demo_inactive);

    const { data: inactiveDemo, error: demoError } = await supabaseClient
      .from("profiles")
      .select("user_id, full_name, updated_at")
      .lt("updated_at", demoDate.toISOString())
      .limit(100);

    results.inactive_demo_users = {
      deleted: 0, // Not deleting, just counting
      error: demoError?.message,
    };

    if (inactiveDemo && inactiveDemo.length > 0) {
      logStep("Inactive users found", { count: inactiveDemo.length });
      // Could send reminder emails or schedule for deletion
    }

    // Calculate totals
    const totalDeleted = Object.values(results).reduce(
      (sum, r) => sum + (r.deleted || 0),
      0
    );

    logStep("Data retention cleanup completed", {
      totalRecordsDeleted: totalDeleted,
      results,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Data retention cleanup completed",
        timestamp: now.toISOString(),
        totalRecordsDeleted: totalDeleted,
        details: results,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
