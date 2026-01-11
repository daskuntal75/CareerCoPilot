import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FeedbackRequest {
  feedback: string;
  email: string;
  metadata: {
    currentPage: string;
    fullUrl: string;
    navigationPath: string[];
    previousPage: string | null;
    timestamp: string;
    userAgent: string;
    screenSize: string;
    language: string;
    timezone: string;
    referrer: string | null;
    sessionCookies: string;
    isLoggedIn: boolean;
    userId: string | null;
  };
}

const ADMIN_EMAIL = "daskuntal@gmail.com";

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { feedback, email, metadata }: FeedbackRequest = await req.json();

    const navPathFormatted = metadata.navigationPath
      .map((path, i) => `${i + 1}. ${path}`)
      .join("\n") || "No navigation history";

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">
          New Feedback from CareerCopilot
        </h1>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0; color: #334155;">Feedback</h2>
          <p style="font-size: 16px; line-height: 1.6; color: #1e293b;">${feedback.replace(/\n/g, "<br>")}</p>
        </div>

        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0; color: #334155;">User Info</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 140px;">Email:</td>
              <td style="padding: 8px 0; color: #1e293b;"><strong>${email}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">User ID:</td>
              <td style="padding: 8px 0; color: #1e293b;">${metadata.userId || "Not logged in"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Logged In:</td>
              <td style="padding: 8px 0; color: #1e293b;">${metadata.isLoggedIn ? "Yes" : "No"}</td>
            </tr>
          </table>
        </div>

        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0; color: #334155;">Context</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b; width: 140px;">Current Page:</td>
              <td style="padding: 8px 0; color: #1e293b;"><strong>${metadata.currentPage}</strong></td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Full URL:</td>
              <td style="padding: 8px 0; color: #1e293b; word-break: break-all;">${metadata.fullUrl}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Previous Page:</td>
              <td style="padding: 8px 0; color: #1e293b;">${metadata.previousPage || "None"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Referrer:</td>
              <td style="padding: 8px 0; color: #1e293b;">${metadata.referrer || "Direct"}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Timestamp:</td>
              <td style="padding: 8px 0; color: #1e293b;">${new Date(metadata.timestamp).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Timezone:</td>
              <td style="padding: 8px 0; color: #1e293b;">${metadata.timezone}</td>
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
              <td style="padding: 8px 0; color: #1e293b;">${metadata.screenSize}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Language:</td>
              <td style="padding: 8px 0; color: #1e293b;">${metadata.language}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">User Agent:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 12px; word-break: break-all;">${metadata.userAgent}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Session Cookies:</td>
              <td style="padding: 8px 0; color: #1e293b; font-size: 12px;">${metadata.sessionCookies}</td>
            </tr>
          </table>
        </div>

        <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 30px;">
          This feedback was sent from CareerCopilot
        </p>
      </div>
    `;

    const emailResponse = await resend.emails.send({
      from: "CareerCopilot <onboarding@resend.dev>",
      to: [ADMIN_EMAIL],
      reply_to: email !== "Not provided" ? email : undefined,
      subject: `[Feedback] from ${email} - ${metadata.currentPage}`,
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
