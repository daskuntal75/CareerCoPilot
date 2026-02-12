import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors-utils.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface FeedbackRequest {
  feedback?: string;
  email?: string;
  userId?: string;
  feedbackType?: string;
  rating?: number;
  wouldRecommend?: boolean;
  metadata?: {
    currentPage?: string;
    fullUrl?: string;
    navigationPath?: string[];
    previousPage?: string | null;
    timestamp?: string;
    userAgent?: string;
    screenSize?: string;
    language?: string;
    timezone?: string;
    referrer?: string | null;
    sessionCookies?: string;
    isLoggedIn?: boolean;
    userId?: string | null;
    applicationCount?: number;
    company?: string;
    jobTitle?: string;
  };
}

const ADMIN_EMAIL = "daskuntal@gmail.com";

const handler = async (req: Request): Promise<Response> => {
  const preflightResponse = handleCorsPrelight(req);
  if (preflightResponse) return preflightResponse;
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const data: FeedbackRequest = await req.json();
    const { feedback, email, userId, feedbackType, rating, wouldRecommend, metadata } = data;

    // Store demo feedback in database if it's demo completion feedback
    if (feedbackType === "demo_completion") {
      const supabaseClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        { auth: { persistSession: false } }
      );

      await supabaseClient.from("demo_feedback").insert({
        user_id: userId,
        email: email,
        rating: rating,
        would_recommend: wouldRecommend === true ? "yes" : wouldRecommend === false ? "no" : "maybe",
        feedback: feedback,
        feedback_type: feedbackType,
        application_count: metadata?.applicationCount,
        company: metadata?.company,
        job_title: metadata?.jobTitle,
      });

      console.log("Demo feedback stored in database");
    }

    // Build email content based on feedback type
    let htmlContent: string;
    let subject: string;

    if (feedbackType === "demo_completion") {
      subject = `[Demo Feedback] Rating: ${rating}/5 from ${email || "Anonymous"}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">
            Demo Completion Feedback
          </h1>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #334155;">Rating: ${rating}/5 ⭐</h2>
            <p><strong>Would Recommend:</strong> ${wouldRecommend === true ? "Yes ✅" : wouldRecommend === false ? "No ❌" : "Maybe 🤔"}</p>
            ${feedback ? `<p><strong>Feedback:</strong></p><p style="font-size: 16px; line-height: 1.6; color: #1e293b;">${feedback}</p>` : ""}
          </div>

          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #334155;">User Info</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Email:</td>
                <td style="padding: 8px 0; color: #1e293b;"><strong>${email || "Not provided"}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">User ID:</td>
                <td style="padding: 8px 0; color: #1e293b;">${userId || "Not logged in"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Applications Used:</td>
                <td style="padding: 8px 0; color: #1e293b;">${metadata?.applicationCount || "N/A"}</td>
              </tr>
              ${metadata?.company ? `
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Last Company:</td>
                <td style="padding: 8px 0; color: #1e293b;">${metadata.company}</td>
              </tr>
              ` : ""}
              ${metadata?.jobTitle ? `
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Last Job Title:</td>
                <td style="padding: 8px 0; color: #1e293b;">${metadata.jobTitle}</td>
              </tr>
              ` : ""}
            </table>
          </div>

          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 30px;">
            Demo feedback from CareerCopilot - ${new Date().toLocaleString()}
          </p>
        </div>
      `;
    } else {
      // Original general feedback format
      const navPathFormatted = metadata?.navigationPath
        ?.map((path, i) => `${i + 1}. ${path}`)
        .join("\n") || "No navigation history";

      subject = `[Feedback] from ${email || "Anonymous"} - ${metadata?.currentPage || "Unknown page"}`;
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">
            New Feedback from CareerCopilot
          </h1>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #334155;">Feedback</h2>
            <p style="font-size: 16px; line-height: 1.6; color: #1e293b;">${(feedback || "No feedback text").replace(/\n/g, "<br>")}</p>
          </div>

          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #334155;">User Info</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; width: 140px;">Email:</td>
                <td style="padding: 8px 0; color: #1e293b;"><strong>${email || "Not provided"}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">User ID:</td>
                <td style="padding: 8px 0; color: #1e293b;">${metadata?.userId || "Not logged in"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Logged In:</td>
                <td style="padding: 8px 0; color: #1e293b;">${metadata?.isLoggedIn ? "Yes" : "No"}</td>
              </tr>
            </table>
          </div>

          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #334155;">Context</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; width: 140px;">Current Page:</td>
                <td style="padding: 8px 0; color: #1e293b;"><strong>${metadata?.currentPage || "Unknown"}</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Full URL:</td>
                <td style="padding: 8px 0; color: #1e293b; word-break: break-all;">${metadata?.fullUrl || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Previous Page:</td>
                <td style="padding: 8px 0; color: #1e293b;">${metadata?.previousPage || "None"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Timestamp:</td>
                <td style="padding: 8px 0; color: #1e293b;">${metadata?.timestamp ? new Date(metadata.timestamp).toLocaleString() : "N/A"}</td>
              </tr>
            </table>
          </div>

          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #334155;">Navigation Path</h2>
            <pre style="background: #e2e8f0; padding: 15px; border-radius: 6px; overflow-x: auto; font-size: 13px;">${navPathFormatted}</pre>
          </div>

          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h2 style="margin-top: 0; color: #334155;">Technical Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #64748b; width: 140px;">Screen Size:</td>
                <td style="padding: 8px 0; color: #1e293b;">${metadata?.screenSize || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">Language:</td>
                <td style="padding: 8px 0; color: #1e293b;">${metadata?.language || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #64748b;">User Agent:</td>
                <td style="padding: 8px 0; color: #1e293b; font-size: 12px; word-break: break-all;">${metadata?.userAgent || "N/A"}</td>
              </tr>
            </table>
          </div>

          <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 30px;">
            This feedback was sent from CareerCopilot
          </p>
        </div>
      `;
    }

    const emailResponse = await resend.emails.send({
      from: "CareerCopilot <onboarding@resend.dev>",
      to: [ADMIN_EMAIL],
      reply_to: email && email !== "Not provided" ? email : undefined,
      subject,
      html: htmlContent,
    });

    console.log("Feedback email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending feedback:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
