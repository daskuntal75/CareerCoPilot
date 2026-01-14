import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const userId = url.searchParams.get("userId");

    if (!token || !userId) {
      return new Response(
        generateHtmlResponse(false, "Invalid verification link"),
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find the pending verification
    const { data: verificationLog, error: findError } = await supabase
      .from("audit_log")
      .select("*")
      .eq("user_id", userId)
      .eq("action_type", "device_verification_pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (findError || !verificationLog) {
      return new Response(
        generateHtmlResponse(false, "Verification link not found or already used"),
        { status: 404, headers: { "Content-Type": "text/html" } }
      );
    }

    const actionData = verificationLog.action_data as any;
    
    // Check if token matches
    if (actionData.token !== token) {
      return new Response(
        generateHtmlResponse(false, "Invalid verification token"),
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }

    // Check if expired
    if (new Date(actionData.expires_at) < new Date()) {
      return new Response(
        generateHtmlResponse(false, "Verification link has expired. Please try logging in again."),
        { status: 400, headers: { "Content-Type": "text/html" } }
      );
    }

    // Mark device as verified
    await supabase.from("audit_log").update({
      action_type: "device_verified",
      action_data: {
        ...actionData,
        verified_at: new Date().toISOString(),
      },
    }).eq("id", verificationLog.id);

    // Log successful verification
    await supabase.from("audit_log").insert({
      user_id: userId,
      action_type: "new_device_verified",
      action_target: actionData.device_fingerprint,
      action_data: {
        device_fingerprint: actionData.device_fingerprint,
        ip_address: actionData.ip_address,
        location: actionData.location,
      },
      ip_address: actionData.ip_address,
      user_agent: actionData.user_agent,
    });

    // Redirect to success page
    const appUrl = "https://tailoredapply.lovable.app";
    return new Response(
      generateHtmlResponse(true, "Device verified successfully!", appUrl),
      { status: 200, headers: { "Content-Type": "text/html" } }
    );
  } catch (error: any) {
    console.error("Error verifying device:", error);
    return new Response(
      generateHtmlResponse(false, "An error occurred during verification"),
      { status: 500, headers: { "Content-Type": "text/html" } }
    );
  }
};

function generateHtmlResponse(success: boolean, message: string, redirectUrl?: string): string {
  const icon = success ? "✅" : "❌";
  const bgColor = success ? "#10b981" : "#ef4444";
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${success ? 'Device Verified' : 'Verification Failed'} - TailoredApply</title>
      ${success && redirectUrl ? `<meta http-equiv="refresh" content="3;url=${redirectUrl}/auth">` : ''}
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background: linear-gradient(135deg, #18181b 0%, #27272a 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0;
          padding: 20px;
        }
        .container {
          background: #ffffff;
          border-radius: 16px;
          padding: 48px;
          max-width: 400px;
          text-align: center;
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
        }
        .icon {
          font-size: 64px;
          margin-bottom: 24px;
        }
        h1 {
          color: #18181b;
          font-size: 24px;
          margin: 0 0 16px 0;
        }
        p {
          color: #71717a;
          font-size: 16px;
          line-height: 1.6;
          margin: 0 0 24px 0;
        }
        .button {
          display: inline-block;
          background-color: ${bgColor};
          color: #ffffff;
          text-decoration: none;
          padding: 14px 32px;
          border-radius: 8px;
          font-weight: 600;
          transition: opacity 0.2s;
        }
        .button:hover {
          opacity: 0.9;
        }
        .redirect-note {
          color: #a1a1aa;
          font-size: 14px;
          margin-top: 24px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="icon">${icon}</div>
        <h1>${success ? 'Device Verified!' : 'Verification Failed'}</h1>
        <p>${message}</p>
        ${success && redirectUrl ? `
          <a href="${redirectUrl}/auth" class="button">Continue to Login</a>
          <p class="redirect-note">You'll be redirected automatically in 3 seconds...</p>
        ` : `
          <a href="${redirectUrl || '#'}/auth" class="button">Try Again</a>
        `}
      </div>
    </body>
    </html>
  `;
}

serve(handler);
