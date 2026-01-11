import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LockoutNotificationRequest {
  email: string;
  ipAddress: string;
  attemptCount: number;
  userAgent?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, ipAddress, attemptCount, userAgent }: LockoutNotificationRequest = await req.json();

    const timestamp = new Date().toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });

    const emailResponse = await resend.emails.send({
      from: "TailoredApply Security <security@resend.dev>",
      to: [email],
      subject: "🔒 Security Alert: Account Access Temporarily Locked",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a2e; background: #f8fafc; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); color: white; padding: 40px 30px; border-radius: 12px 12px 0 0; text-align: center; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
            .alert-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0; }
            .info-box { background: #f1f5f9; padding: 15px; border-radius: 8px; margin: 20px 0; }
            .info-item { display: flex; margin: 8px 0; }
            .info-label { font-weight: 600; min-width: 120px; color: #64748b; }
            .info-value { color: #1a1a2e; }
            .cta-button { display: inline-block; background: #1a1a2e; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; color: #64748b; font-size: 13px; }
            .security-icon { font-size: 48px; margin-bottom: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="security-icon">🔒</div>
              <h1>Security Alert</h1>
            </div>
            <div class="content">
              <div class="alert-box">
                <strong>⚠️ Multiple Failed Login Attempts Detected</strong>
                <p style="margin: 10px 0 0 0;">We've temporarily locked access to your account for your protection.</p>
              </div>
              
              <p>Someone (hopefully you) attempted to sign in to your TailoredApply account multiple times with incorrect credentials.</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0; color: #1a1a2e;">Attempt Details:</h3>
                <div class="info-item">
                  <span class="info-label">Time:</span>
                  <span class="info-value">${timestamp}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">IP Address:</span>
                  <span class="info-value">${ipAddress}</span>
                </div>
                <div class="info-item">
                  <span class="info-label">Failed Attempts:</span>
                  <span class="info-value">${attemptCount}</span>
                </div>
                ${userAgent ? `
                <div class="info-item">
                  <span class="info-label">Browser:</span>
                  <span class="info-value" style="font-size: 12px; word-break: break-all;">${userAgent.substring(0, 80)}...</span>
                </div>
                ` : ""}
              </div>
              
              <h3>🛡️ What should you do?</h3>
              <ul>
                <li><strong>If this was you:</strong> Wait a few minutes and try again with the correct password. Consider resetting your password if you've forgotten it.</li>
                <li><strong>If this wasn't you:</strong> We recommend changing your password immediately and enabling two-factor authentication for added security.</li>
              </ul>
              
              <a href="https://tailoredapply.lovable.app/auth?mode=forgot-password" class="cta-button">
                Reset Your Password →
              </a>
              
              <div class="footer">
                <p>This is an automated security notification from TailoredApply.</p>
                <p>If you have questions, contact our support team.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Lockout notification sent:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending lockout notification:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
