import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-DEMO-REMINDER] ${step}${detailsStr}`);
};

interface DemoReminderRequest {
  email: string;
  firstName?: string;
  fullName?: string;
  applicationsUsed: number;
  applicationsRemaining: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { email, firstName, fullName, applicationsUsed, applicationsRemaining }: DemoReminderRequest = await req.json();

    if (!email) {
      throw new Error("email is required");
    }

    const displayName = firstName || fullName?.split(" ")[0] || "there";

    logStep("Sending demo reminder email", { email, applicationsUsed, applicationsRemaining });

    const emailResponse = await resend.emails.send({
      from: "TailoredApply <onboarding@resend.dev>",
      to: [email],
      subject: `⏰ You have ${applicationsRemaining} demo application${applicationsRemaining !== 1 ? 's' : ''} left!`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
                line-height: 1.6; 
                color: #333; 
                background: #f9fafb;
                margin: 0;
                padding: 0;
              }
              .container { 
                max-width: 600px; 
                margin: 0 auto; 
                padding: 20px; 
              }
              .header { 
                background: linear-gradient(135deg, #f59e0b, #d97706); 
                color: white; 
                padding: 40px 30px; 
                border-radius: 12px 12px 0 0; 
                text-align: center; 
              }
              .header h1 {
                margin: 0 0 10px 0;
                font-size: 28px;
              }
              .header p {
                margin: 0;
                opacity: 0.9;
                font-size: 16px;
              }
              .content { 
                background: white; 
                padding: 40px 30px; 
                border: 1px solid #e5e7eb; 
                border-top: none; 
              }
              .progress-box {
                background: #fef3c7;
                border: 1px solid #f59e0b;
                border-radius: 12px;
                padding: 20px;
                margin: 20px 0;
                text-align: center;
              }
              .progress-bar {
                background: #e5e7eb;
                border-radius: 999px;
                height: 12px;
                margin: 15px 0;
                overflow: hidden;
              }
              .progress-fill {
                background: linear-gradient(135deg, #f59e0b, #d97706);
                height: 100%;
                border-radius: 999px;
                width: ${(applicationsUsed / 3) * 100}%;
              }
              .progress-text {
                font-size: 14px;
                color: #92400e;
              }
              .tip-box {
                background: #eff6ff;
                border: 1px solid #bfdbfe;
                border-radius: 8px;
                padding: 16px;
                margin: 25px 0;
              }
              .tip-box h4 {
                margin: 0 0 8px 0;
                color: #1e40af;
                font-size: 14px;
              }
              .tip-box p {
                margin: 0;
                color: #3b82f6;
                font-size: 13px;
              }
              .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                color: white !important;
                text-decoration: none;
                padding: 14px 32px;
                border-radius: 8px;
                font-weight: 600;
                font-size: 16px;
                margin: 20px 0;
              }
              .benefit-reminder {
                background: linear-gradient(135deg, #dcfce7, #bbf7d0);
                border: 1px solid #22c55e;
                border-radius: 12px;
                padding: 20px;
                margin: 25px 0;
                text-align: center;
              }
              .benefit-reminder h3 {
                margin: 0 0 8px 0;
                color: #166534;
                font-size: 16px;
              }
              .benefit-reminder p {
                margin: 0;
                color: #15803d;
                font-size: 14px;
              }
              .footer { 
                background: #f9fafb;
                padding: 25px 30px; 
                border: 1px solid #e5e7eb;
                border-top: none;
                border-radius: 0 0 12px 12px;
                text-align: center; 
              }
              .footer p {
                margin: 5px 0;
                color: #6b7280;
                font-size: 12px;
              }
              .footer a {
                color: #6366f1;
                text-decoration: none;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>⏰ ${applicationsRemaining} Application${applicationsRemaining !== 1 ? 's' : ''} Left!</h1>
                <p>Make the most of your demo, ${displayName}</p>
              </div>
              
              <div class="content">
                <p style="font-size: 16px; color: #374151;">
                  Great progress! You've used <strong>${applicationsUsed} of your 3 demo applications</strong>. 
                  Here's a quick reminder of what you can do with your remaining ${applicationsRemaining === 1 ? 'application' : 'applications'}.
                </p>

                <div class="progress-box">
                  <div class="progress-text">
                    <strong>${applicationsUsed}/3</strong> applications completed
                  </div>
                  <div class="progress-bar">
                    <div class="progress-fill"></div>
                  </div>
                  <p class="progress-text">
                    ${applicationsRemaining} more ${applicationsRemaining === 1 ? 'opportunity' : 'opportunities'} to experience TailoredApply
                  </p>
                </div>

                <div class="tip-box">
                  <h4>💡 Pro Tip</h4>
                  <p>
                    For your ${applicationsRemaining === 1 ? 'final application' : 'remaining applications'}, try targeting a role you're really excited about. 
                    Our AI works best when matching your genuine career interests with job requirements.
                  </p>
                </div>

                <div style="text-align: center; margin-top: 30px;">
                  <a href="https://tailoredapply.lovable.app/app" class="cta-button">
                    Use Your ${applicationsRemaining === 1 ? 'Final' : 'Next'} Application →
                  </a>
                </div>

                <div class="benefit-reminder">
                  <h3>🎁 Remember: Early Adopter Discount</h3>
                  <p>
                    Complete your demo and share feedback to qualify for discounted pricing when we launch!
                  </p>
                </div>
              </div>
              
              <div class="footer">
                <p>Questions? Reply to this email or contact us at support@tailoredapply.com</p>
                <p>© ${new Date().getFullYear()} TailoredApply. All rights reserved.</p>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    logStep("Email sent successfully", { emailResponse });

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});