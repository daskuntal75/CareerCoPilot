import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { generateAdminSecurityAlertEmail, generatePromptInjectionAlertEmail } from "../_shared/email-templates.ts";
import { getLocationFromIP } from "../_shared/geolocation.ts";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors-utils.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface SecurityAlertRequest {
  alertType: 'failed_admin_login' | 'suspicious_activity' | 'rate_limit_exceeded' | 'prompt_injection_detected' | 'unusual_access_pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  ipAddress?: string;
  userEmail?: string;
  location?: string;
  actionRequired?: string;
  eventCount?: number;
  // For prompt injection alerts
  recentAttempts?: Array<{
    input: string;
    threatType: string;
    timestamp: string;
  }>;
}

const handler = async (req: Request): Promise<Response> => {
  const preflightResponse = handleCorsPrelight(req);
  if (preflightResponse) return preflightResponse;
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const requestData: SecurityAlertRequest = await req.json();
    const {
      alertType,
      severity,
      details,
      ipAddress,
      userEmail,
      location: providedLocation,
      actionRequired,
      eventCount,
      recentAttempts,
    } = requestData;

    // Get geolocation if not provided
    let location = providedLocation;
    if (!location && ipAddress) {
      try {
        const geoData = await getLocationFromIP(ipAddress);
        location = geoData.formatted;
      } catch {
        console.log("Could not get geolocation");
      }
    }

    const timestamp = new Date().toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });

    const appUrl = Deno.env.get("APP_URL") || "https://tailoredapply.lovable.app";

    // Fetch all admin users to notify
    const { data: adminRoles, error: roleError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (roleError) {
      console.error("Error fetching admin roles:", roleError);
      throw new Error("Failed to fetch admin users");
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admin users found to notify");
      return new Response(
        JSON.stringify({ success: true, message: "No admin users to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get admin emails
    const adminUserIds = adminRoles.map(r => r.user_id);
    const { data: adminUsers, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error("Error fetching admin users:", usersError);
      throw new Error("Failed to fetch admin user emails");
    }

    const adminEmails = adminUsers.users
      .filter(u => adminUserIds.includes(u.id))
      .map(u => u.email)
      .filter((email): email is string => !!email);

    if (adminEmails.length === 0) {
      console.log("No admin emails found");
      return new Response(
        JSON.stringify({ success: true, message: "No admin emails found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate email content based on alert type
    let htmlContent: string;
    let subject: string;

    if (alertType === "prompt_injection_detected" && recentAttempts) {
      htmlContent = generatePromptInjectionAlertEmail({
        attemptCount: eventCount || recentAttempts.length,
        recentAttempts,
        timestamp,
        appUrl,
      });
      subject = `🛡️ Security Alert: ${eventCount || recentAttempts.length} Prompt Injection Attempts Blocked`;
    } else {
      htmlContent = generateAdminSecurityAlertEmail({
        alertType,
        severity,
        details,
        ipAddress,
        userEmail,
        location,
        timestamp,
        appUrl,
        actionRequired,
        eventCount,
      });

      const severityEmoji = {
        low: 'ℹ️',
        medium: '⚠️',
        high: '🚨',
        critical: '🔴',
      }[severity] || '⚠️';

      subject = `${severityEmoji} Security Alert [${severity.toUpperCase()}]: ${alertType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`;
    }

    // Send email to all admins
    const emailResponse = await resend.emails.send({
      from: "TailoredApply Security <security@resend.dev>",
      to: adminEmails,
      subject,
      html: htmlContent,
    });

    console.log(`Security alert sent to ${adminEmails.length} admins:`, emailResponse);

    // Log the notification
    for (const adminId of adminUserIds) {
      await supabase.from("email_notifications").insert({
        user_id: adminId,
        notification_type: "security_alert",
        subject,
        metadata: {
          alertType,
          severity,
          details: details.substring(0, 200),
          ipAddress,
          eventCount,
        },
      });
    }

    // Also log to audit log
    await supabase.from("audit_log").insert({
      user_id: adminUserIds[0], // Use first admin as the "system" user
      action_type: "security_alert_sent",
      action_data: {
        alertType,
        severity,
        recipientCount: adminEmails.length,
        eventCount,
      },
      ip_address: ipAddress || "system",
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Security alert sent to ${adminEmails.length} admin(s)`,
        recipients: adminEmails.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending security alert:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
