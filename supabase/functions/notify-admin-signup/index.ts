import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ADMIN_EMAIL = "daskuntal@gmail.com";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[NOTIFY-ADMIN-SIGNUP] ${step}${detailsStr}`);
};

interface SignupNotificationRequest {
  userId: string;
  email: string;
  fullName?: string;
  signupMethod?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { userId, email, fullName, signupMethod }: SignupNotificationRequest = await req.json();

    if (!userId || !email) {
      throw new Error("userId and email are required");
    }

    logStep("Processing signup notification", { userId, email, signupMethod });

    // Get total user count
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { count } = await supabaseClient
      .from("profiles")
      .select("id", { count: "exact", head: true });

    const totalUsers = count || 0;

    logStep("Total users count", { totalUsers });

    // Send email to admin
    const emailResponse = await resend.emails.send({
      from: "TailoredApply <onboarding@resend.dev>",
      to: [ADMIN_EMAIL],
      subject: `🎉 New User Signup - ${email}`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
              .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px; }
              .stat-box { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 15px; margin: 10px 0; display: inline-block; width: calc(50% - 12px); box-sizing: border-box; }
              .stat-number { font-size: 24px; font-weight: bold; color: #6366f1; }
              .stat-label { font-size: 12px; color: #6b7280; text-transform: uppercase; }
              .user-info { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0; }
              .label { font-size: 12px; color: #6b7280; text-transform: uppercase; margin-bottom: 4px; }
              .value { font-size: 16px; font-weight: 500; color: #111827; }
              .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; font-size: 24px;">🚀 New User Signed Up!</h1>
                <p style="margin: 10px 0 0 0; opacity: 0.9;">TailoredApply just got a new user</p>
              </div>
              <div class="content">
                <div class="user-info">
                  <div style="margin-bottom: 15px;">
                    <div class="label">Email</div>
                    <div class="value">${email}</div>
                  </div>
                  ${fullName ? `
                  <div style="margin-bottom: 15px;">
                    <div class="label">Full Name</div>
                    <div class="value">${fullName}</div>
                  </div>
                  ` : ''}
                  <div style="margin-bottom: 15px;">
                    <div class="label">Signup Method</div>
                    <div class="value">${signupMethod || 'Email/Password'}</div>
                  </div>
                  <div>
                    <div class="label">User ID</div>
                    <div class="value" style="font-size: 12px; font-family: monospace;">${userId}</div>
                  </div>
                </div>
                
                <div style="text-align: center;">
                  <div class="stat-box">
                    <div class="stat-number">${totalUsers}</div>
                    <div class="stat-label">Total Users</div>
                  </div>
                </div>
                
                <div class="footer">
                  <p>Signup Time: ${new Date().toLocaleString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZoneName: 'short'
                  })}</p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `,
    });

    logStep("Email sent", { emailResponse });

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
