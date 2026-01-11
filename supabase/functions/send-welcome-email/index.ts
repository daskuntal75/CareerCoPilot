import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-WELCOME-EMAIL] ${step}${detailsStr}`);
};

interface WelcomeEmailRequest {
  email: string;
  firstName?: string;
  fullName?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { email, firstName, fullName }: WelcomeEmailRequest = await req.json();

    if (!email) {
      throw new Error("email is required");
    }

    const displayName = firstName || fullName?.split(" ")[0] || "there";

    logStep("Sending welcome email", { email, displayName });

    const emailResponse = await resend.emails.send({
      from: "TailoredApply <onboarding@resend.dev>",
      to: [email],
      subject: "🎉 Welcome to TailoredApply - You're an Early Adopter!",
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
                background: linear-gradient(135deg, #6366f1, #8b5cf6); 
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
              .benefit-box {
                background: linear-gradient(135deg, #fef3c7, #fde68a);
                border: 1px solid #f59e0b;
                border-radius: 12px;
                padding: 20px;
                margin: 25px 0;
                text-align: center;
              }
              .benefit-box h3 {
                margin: 0 0 8px 0;
                color: #92400e;
                font-size: 18px;
              }
              .benefit-box p {
                margin: 0;
                color: #a16207;
                font-size: 14px;
              }
              .step-box {
                background: #f9fafb;
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                padding: 15px;
                margin: 10px 0;
                display: flex;
                align-items: flex-start;
                gap: 15px;
              }
              .step-number {
                background: #6366f1;
                color: white;
                width: 28px;
                height: 28px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 14px;
                flex-shrink: 0;
              }
              .step-content h4 {
                margin: 0 0 4px 0;
                font-size: 15px;
                color: #111827;
              }
              .step-content p {
                margin: 0;
                font-size: 13px;
                color: #6b7280;
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
              .demo-info {
                background: #eff6ff;
                border: 1px solid #bfdbfe;
                border-radius: 8px;
                padding: 16px;
                margin: 25px 0;
              }
              .demo-info h4 {
                margin: 0 0 8px 0;
                color: #1e40af;
                font-size: 14px;
              }
              .demo-info p {
                margin: 0;
                color: #3b82f6;
                font-size: 13px;
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
                <h1>🚀 Welcome, ${displayName}!</h1>
                <p>You're now an official TailoredApply Early Adopter</p>
              </div>
              
              <div class="content">
                <p style="font-size: 16px; color: #374151;">
                  Thank you for signing up! We're excited to have you as one of our early adopters. 
                  You're helping us build the future of AI-powered job applications.
                </p>

                <div class="benefit-box">
                  <h3>🎁 Early Adopter Exclusive</h3>
                  <p>
                    As a thank you for your feedback, you'll receive <strong>discounted pricing</strong> 
                    when we launch the full version!
                  </p>
                </div>

                <h3 style="margin-bottom: 15px; color: #111827;">Here's how to get started:</h3>
                
                <div class="step-box">
                  <div class="step-number">1</div>
                  <div class="step-content">
                    <h4>Upload Your Resume</h4>
                    <p>Go to Career Documents and upload your detailed resume for the best results.</p>
                  </div>
                </div>
                
                <div class="step-box">
                  <div class="step-number">2</div>
                  <div class="step-content">
                    <h4>Paste a Job Description</h4>
                    <p>Find a job you're interested in and paste the description into our analyzer.</p>
                  </div>
                </div>
                
                <div class="step-box">
                  <div class="step-number">3</div>
                  <div class="step-content">
                    <h4>Get Your Tailored Materials</h4>
                    <p>Receive a personalized cover letter and interview prep based on your experience.</p>
                  </div>
                </div>

                <div style="text-align: center; margin-top: 30px;">
                  <a href="https://tailoredapply.lovable.app/app" class="cta-button">
                    Start Your First Application →
                  </a>
                </div>

                <div class="demo-info">
                  <h4>📊 Your Demo Access</h4>
                  <p>
                    You have <strong>3 free applications</strong> to explore TailoredApply. 
                    Make the most of them and share your feedback with us!
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