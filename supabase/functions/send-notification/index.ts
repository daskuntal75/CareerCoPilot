import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  userId: string;
  notificationType: "status_change" | "interview_reminder" | "weekly_summary";
  applicationId?: string;
  data?: Record<string, any>;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { userId, notificationType, applicationId, data }: NotificationRequest = await req.json();

    // Get user profile and email
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !userData?.user?.email) {
      throw new Error("User not found or no email");
    }

    const userEmail = userData.user.email;
    const userName = userData.user.user_metadata?.full_name || "there";

    // Check if user has notifications enabled
    const { data: profile } = await supabase
      .from("profiles")
      .select("email_notifications_enabled")
      .eq("user_id", userId)
      .single();

    if (profile && !profile.email_notifications_enabled) {
      return new Response(
        JSON.stringify({ message: "Notifications disabled for user" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let subject = "";
    let htmlContent = "";

    switch (notificationType) {
      case "status_change": {
        const { company, jobTitle, oldStatus, newStatus } = data || {};
        subject = `Application Status Update: ${jobTitle} at ${company}`;
        htmlContent = `
          <h1>Application Status Updated</h1>
          <p>Hi ${userName},</p>
          <p>Your application for <strong>${jobTitle}</strong> at <strong>${company}</strong> has been updated.</p>
          <p>Status changed from <strong>${formatStatus(oldStatus)}</strong> to <strong>${formatStatus(newStatus)}</strong>.</p>
          ${newStatus === "interviewing" ? `<p>🎉 Congratulations on moving forward! Don't forget to review your interview prep materials.</p>` : ""}
          ${newStatus === "offer" ? `<p>🎊 Amazing news! Best of luck with your decision!</p>` : ""}
          <p>Best regards,<br>The CoverCraft Team</p>
        `;
        break;
      }
      case "interview_reminder": {
        const { company, jobTitle, interviewDate } = data || {};
        subject = `Interview Reminder: ${jobTitle} at ${company}`;
        htmlContent = `
          <h1>Interview Reminder</h1>
          <p>Hi ${userName},</p>
          <p>This is a friendly reminder about your upcoming interview for <strong>${jobTitle}</strong> at <strong>${company}</strong>.</p>
          ${interviewDate ? `<p>Scheduled for: <strong>${new Date(interviewDate).toLocaleDateString()}</strong></p>` : ""}
          <p><strong>Quick Tips:</strong></p>
          <ul>
            <li>Review your interview prep materials</li>
            <li>Research the company's latest news</li>
            <li>Prepare questions to ask the interviewer</li>
            <li>Get a good night's sleep!</li>
          </ul>
          <p>You've got this! 💪</p>
          <p>Best regards,<br>The CoverCraft Team</p>
        `;
        break;
      }
      case "weekly_summary": {
        const { totalApplications, appliedThisWeek, interviews } = data || {};
        subject = "Your Weekly Job Search Summary";
        htmlContent = `
          <h1>Weekly Summary</h1>
          <p>Hi ${userName},</p>
          <p>Here's your job search summary for this week:</p>
          <ul>
            <li>Total active applications: <strong>${totalApplications || 0}</strong></li>
            <li>Applications submitted this week: <strong>${appliedThisWeek || 0}</strong></li>
            <li>Upcoming interviews: <strong>${interviews || 0}</strong></li>
          </ul>
          <p>Keep up the great work!</p>
          <p>Best regards,<br>The CoverCraft Team</p>
        `;
        break;
      }
      default:
        throw new Error(`Unknown notification type: ${notificationType}`);
    }

    // Send email
    const emailResponse = await resend.emails.send({
      from: "CoverCraft <onboarding@resend.dev>",
      to: [userEmail],
      subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    // Log to email_notifications table (using service role to bypass RLS)
    await supabase.from("email_notifications").insert({
      user_id: userId,
      application_id: applicationId || null,
      notification_type: notificationType,
      subject,
      status: "sent",
      metadata: { resend_id: emailResponse.data?.id, ...data },
    });

    return new Response(
      JSON.stringify({ success: true, messageId: emailResponse.data?.id }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-notification function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

function formatStatus(status: string): string {
  const statusLabels: Record<string, string> = {
    draft: "Draft",
    applied: "Applied",
    interviewing: "Interviewing",
    offer: "Offer Received",
    rejected: "Rejected",
    withdrawn: "Withdrawn",
  };
  return statusLabels[status] || status;
}

serve(handler);
