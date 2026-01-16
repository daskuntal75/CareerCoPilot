import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Threshold configuration
const SATISFACTION_THRESHOLD = 3.5; // Average rating below this triggers alert
const MIN_RATINGS_FOR_ALERT = 5; // Minimum ratings needed to trigger alert
const ALERT_COOLDOWN_HOURS = 24; // Don't send more than one alert per day per prompt version

interface PromptVersionStats {
  id: string;
  setting_key: string;
  version_number: number;
  version_label: string | null;
  avg_quality_rating: number;
  total_uses: number;
  positive_ratings: number;
  negative_ratings: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Parse request body for optional parameters
    let skipEmail = false;
    try {
      const body = await req.json();
      skipEmail = body?.skipEmail === true;
    } catch {
      // No body or invalid JSON, use defaults
    }

    // Get all active prompt versions with their stats
    const { data: promptVersions, error: versionsError } = await supabase
      .from("ai_prompt_versions")
      .select("id, setting_key, version_number, version_label, avg_quality_rating, total_uses, positive_ratings, negative_ratings")
      .eq("is_current", true);

    if (versionsError) {
      throw new Error(`Failed to fetch prompt versions: ${versionsError.message}`);
    }

    const lowSatisfactionVersions: PromptVersionStats[] = [];
    const allVersionsStatus: Array<{
      setting_key: string;
      avg_rating: number | null;
      total_ratings: number;
      status: string;
    }> = [];

    for (const version of promptVersions || []) {
      const totalRatings = (version.positive_ratings || 0) + (version.negative_ratings || 0);
      const status = 
        totalRatings < MIN_RATINGS_FOR_ALERT 
          ? "insufficient_data"
          : version.avg_quality_rating !== null && version.avg_quality_rating < SATISFACTION_THRESHOLD
            ? "below_threshold"
            : "ok";

      allVersionsStatus.push({
        setting_key: version.setting_key,
        avg_rating: version.avg_quality_rating,
        total_ratings: totalRatings,
        status,
      });

      // Check if this version has enough ratings and is below threshold
      if (
        totalRatings >= MIN_RATINGS_FOR_ALERT &&
        version.avg_quality_rating !== null &&
        version.avg_quality_rating < SATISFACTION_THRESHOLD
      ) {
        lowSatisfactionVersions.push(version as PromptVersionStats);
      }
    }

    if (lowSatisfactionVersions.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "All prompt versions are performing well", 
          checked: promptVersions?.length || 0,
          versions: allVersionsStatus,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for existing open alerts to avoid duplicates
    const { data: existingAlerts } = await supabase
      .from("prompt_satisfaction_alerts")
      .select("prompt_version_id")
      .eq("status", "open");

    const existingAlertVersionIds = new Set(
      (existingAlerts || []).map((a: any) => a.prompt_version_id)
    );

    // Create alerts for new issues
    const newAlerts = [];
    for (const version of lowSatisfactionVersions) {
      if (!existingAlertVersionIds.has(version.id)) {
        const totalRatings = (version.positive_ratings || 0) + (version.negative_ratings || 0);
        newAlerts.push({
          prompt_version_id: version.id,
          setting_key: version.setting_key,
          avg_rating: version.avg_quality_rating,
          total_ratings: totalRatings,
          threshold: SATISFACTION_THRESHOLD,
          alert_type: "low_satisfaction",
          status: "open",
        });
      }
    }

    if (newAlerts.length > 0) {
      const { error: insertError } = await supabase
        .from("prompt_satisfaction_alerts")
        .insert(newAlerts);

      if (insertError) {
        console.error("Failed to insert alerts:", insertError);
      }
    }

    // Skip email if requested or no API key
    if (skipEmail || !RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ 
          message: skipEmail ? "Check completed (email skipped)" : "Check completed (no email configured)",
          alertedVersions: lowSatisfactionVersions.length,
          newAlertsCreated: newAlerts.length,
          versions: allVersionsStatus,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resend = new Resend(RESEND_API_KEY);

    // Get admin users to notify
    const { data: adminUsers, error: adminError } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (adminError) {
      throw new Error(`Failed to fetch admin users: ${adminError.message}`);
    }

    // Get admin emails
    const adminIds = (adminUsers || []).map(u => u.user_id);
    const adminEmails: string[] = [];

    for (const adminId of adminIds) {
      const { data: userData } = await supabase.auth.admin.getUserById(adminId);
      if (userData?.user?.email) {
        adminEmails.push(userData.user.email);
      }
    }

    if (adminEmails.length === 0) {
      console.warn("No admin emails found for notification");
      return new Response(
        JSON.stringify({ 
          message: "Low satisfaction detected but no admins to notify", 
          versions: allVersionsStatus,
          newAlertsCreated: newAlerts.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for recent alerts to avoid spamming
    const cooldownTime = new Date(Date.now() - ALERT_COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();
    const { data: recentAlerts } = await supabase
      .from("email_notifications")
      .select("metadata")
      .eq("notification_type", "prompt_satisfaction_alert")
      .gte("sent_at", cooldownTime);

    const recentlyAlertedVersions = new Set(
      (recentAlerts || [])
        .filter((a: any) => a.metadata?.prompt_version_id)
        .map((a: any) => a.metadata.prompt_version_id)
    );

    // Filter out versions that were already alerted recently
    const versionsToAlert = lowSatisfactionVersions.filter(v => !recentlyAlertedVersions.has(v.id));

    if (versionsToAlert.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: "Low satisfaction detected but already alerted within cooldown period",
          versions: allVersionsStatus,
          newAlertsCreated: newAlerts.length,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build email content
    const promptTypeLabels: Record<string, string> = {
      "ai_cover_letter_system_prompt": "Cover Letter System Prompt",
      "ai_cover_letter_user_prompt": "Cover Letter User Prompt",
      "ai_interview_prep_system_prompt": "Interview Prep System Prompt",
      "ai_interview_prep_user_prompt": "Interview Prep User Prompt",
    };

    const versionsHtml = versionsToAlert.map(v => {
      const totalRatings = (v.positive_ratings || 0) + (v.negative_ratings || 0);
      const negativeRate = totalRatings > 0 ? ((v.negative_ratings || 0) / totalRatings * 100).toFixed(1) : 0;
      
      return `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #eee;">
            <strong>${promptTypeLabels[v.setting_key] || v.setting_key}</strong>
            <br><span style="color: #666;">Version ${v.version_number}${v.version_label ? ` - ${v.version_label}` : ''}</span>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; color: #dc2626;">
            ${v.avg_quality_rating?.toFixed(2) || 'N/A'}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
            ${v.total_uses || 0}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">
            👍 ${v.positive_ratings || 0} / 👎 ${v.negative_ratings || 0}
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; color: #dc2626;">
            ${negativeRate}%
          </td>
        </tr>
      `;
    }).join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Prompt Satisfaction Alert</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">⚠️ AI Prompt Quality Alert</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Low user satisfaction detected for AI prompts</p>
        </div>
        
        <div style="background: #fff; padding: 30px; border: 1px solid #eee; border-top: none; border-radius: 0 0 10px 10px;">
          <p>The following AI prompt versions have dropped below the satisfaction threshold of <strong>${SATISFACTION_THRESHOLD}/5</strong>:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
              <tr style="background: #f5f5f5;">
                <th style="padding: 12px; text-align: left;">Prompt</th>
                <th style="padding: 12px; text-align: center;">Avg Rating</th>
                <th style="padding: 12px; text-align: center;">Total Uses</th>
                <th style="padding: 12px; text-align: center;">Ratings</th>
                <th style="padding: 12px; text-align: center;">Negative Rate</th>
              </tr>
            </thead>
            <tbody>
              ${versionsHtml}
            </tbody>
          </table>
          
          <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 15px; margin-top: 20px;">
            <h3 style="margin: 0 0 10px 0; color: #b45309;">Recommended Actions:</h3>
            <ul style="margin: 0; padding-left: 20px; color: #92400e;">
              <li>Review recent prompt telemetry to identify patterns in negative feedback</li>
              <li>Consider A/B testing alternative prompt versions</li>
              <li>Check if recent changes to prompts caused the drop</li>
              <li>Review user feedback comments for specific issues</li>
            </ul>
          </div>
          
          <p style="margin-top: 30px; color: #666; font-size: 14px;">
            This is an automated alert. You will not receive another alert for the same prompt version within ${ALERT_COOLDOWN_HOURS} hours.
          </p>
        </div>
      </body>
      </html>
    `;

    // Send email to all admins
    for (const adminEmail of adminEmails) {
      try {
        await resend.emails.send({
          from: "TailoredApply <alerts@resend.dev>",
          to: [adminEmail],
          subject: `⚠️ AI Prompt Satisfaction Alert - ${versionsToAlert.length} prompt(s) below threshold`,
          html: emailHtml,
        });

        // Log the notification
        await supabase.from("email_notifications").insert({
          user_id: adminIds[0], // Use first admin as reference
          notification_type: "prompt_satisfaction_alert",
          subject: `AI Prompt Satisfaction Alert`,
          metadata: {
            prompt_versions: versionsToAlert.map(v => v.id),
            prompt_version_id: versionsToAlert[0].id, // For cooldown tracking
            admin_emails: adminEmails,
            threshold: SATISFACTION_THRESHOLD,
          },
        });
      } catch (emailError) {
        console.error(`Failed to send email to ${adminEmail}:`, emailError);
      }
    }

    return new Response(
      JSON.stringify({ 
        message: "Alert sent successfully",
        alertedVersions: versionsToAlert.length,
        adminNotified: adminEmails.length,
        newAlertsCreated: newAlerts.length,
        versions: allVersionsStatus,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in check-prompt-satisfaction:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
