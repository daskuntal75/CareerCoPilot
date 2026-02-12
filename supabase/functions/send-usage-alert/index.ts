import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors-utils.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface UsageAlertRequest {
  userId: string;
  email: string;
  fullName?: string;
  remaining: number;
  limit: number;
  featureType: string;
}

const handler = async (req: Request): Promise<Response> => {
  const preflightResponse = handleCorsPrelight(req);
  if (preflightResponse) return preflightResponse;
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const { userId, email, fullName, remaining, limit, featureType }: UsageAlertRequest = await req.json();

    const name = fullName || email.split("@")[0];
    const featureLabel = featureType === "cover_letter" ? "cover letters" : "interview prep sessions";

    const emailResponse = await resend.emails.send({
      from: "TailoredApply <notifications@resend.dev>",
      to: [email],
      subject: `⚠️ You have ${remaining} ${featureLabel} remaining this month`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
            .alert-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .cta-button { display: inline-block; background: #f97316; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">📊 Usage Alert</h1>
            </div>
            <div class="content">
              <p>Hi ${name},</p>
              
              <div class="alert-box">
                <strong>You have ${remaining} of ${limit} ${featureLabel} remaining this month.</strong>
              </div>
              
              <p>You're making great progress on your job search! To continue creating unlimited ${featureLabel} and unlock all premium features, consider upgrading to Pro.</p>
              
              <h3>🚀 Pro includes:</h3>
              <ul>
                <li>Unlimited cover letters</li>
                <li>Full interview preparation</li>
                <li>STAR answer frameworks</li>
                <li>Version history</li>
                <li>Priority support</li>
              </ul>
              
              <a href="https://tailoredapply.lovable.app/pricing" class="cta-button">Upgrade to Pro →</a>
              
              <div class="footer">
                <p>Keep crushing your job search! 💪</p>
                <p>The TailoredApply Team</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Usage alert email sent:", emailResponse);

    // Log the notification
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    await supabaseClient.from("email_notifications").insert({
      user_id: userId,
      notification_type: "usage_alert",
      subject: `Usage alert: ${remaining} ${featureLabel} remaining`,
      metadata: { remaining, limit, featureType },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending usage alert:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
