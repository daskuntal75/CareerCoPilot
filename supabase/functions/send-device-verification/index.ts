import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeviceVerificationRequest {
  email: string;
  userId: string;
  deviceFingerprint: string;
  userAgent: string;
  ipAddress?: string;
  location?: string;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Generate a secure verification token
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// Parse user agent to get device info
function parseUserAgent(userAgent: string): string {
  if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
    return "iOS Device";
  } else if (userAgent.includes("Android")) {
    return "Android Device";
  } else if (userAgent.includes("Windows")) {
    return "Windows Computer";
  } else if (userAgent.includes("Mac")) {
    return "Mac Computer";
  } else if (userAgent.includes("Linux")) {
    return "Linux Computer";
  }
  return "Unknown Device";
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, userId, deviceFingerprint, userAgent, ipAddress, location }: DeviceVerificationRequest = await req.json();

    if (!email || !userId || !deviceFingerprint) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate verification token
    const token = generateToken();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store verification token in audit_log
    await supabase.from("audit_log").insert({
      user_id: userId,
      action_type: "device_verification_pending",
      action_target: deviceFingerprint,
      action_data: {
        token,
        email,
        device_fingerprint: deviceFingerprint,
        user_agent: userAgent,
        ip_address: ipAddress,
        location,
        expires_at: expiresAt.toISOString(),
      },
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    const deviceName = parseUserAgent(userAgent);
    const verificationUrl = `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '')}/functions/v1/verify-device?token=${token}&userId=${userId}`;

    // Send verification email
    const emailResponse = await resend.emails.send({
      from: "TailoredApply Security <security@tailoredapply.com>",
      to: [email],
      subject: "Verify Your New Device - TailoredApply",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Device</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
              <div style="text-align: center; margin-bottom: 30px;">
                <div style="width: 60px; height: 60px; background-color: #f59e0b; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                  <span style="font-size: 28px;">🔐</span>
                </div>
                <h1 style="color: #18181b; font-size: 24px; margin: 0;">New Device Login Attempt</h1>
              </div>
              
              <p style="color: #71717a; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                We detected a login attempt from a new device. For your security, please verify this is you by clicking the button below.
              </p>
              
              <div style="background-color: #fef3c7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 14px; color: #92400e;">
                  <strong>Device:</strong> ${deviceName}<br>
                  ${location ? `<strong>Location:</strong> ${location}<br>` : ''}
                  ${ipAddress ? `<strong>IP Address:</strong> ${ipAddress}<br>` : ''}
                  <strong>Time:</strong> ${new Date().toLocaleString()}
                </p>
              </div>
              
              <div style="text-align: center; margin-bottom: 24px;">
                <a href="${verificationUrl}" style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  ✓ Verify This Device
                </a>
              </div>
              
              <p style="color: #71717a; font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
                This link will expire in <strong>15 minutes</strong>. If you didn't try to log in, someone else may have your password. Please <a href="#" style="color: #10b981;">change your password</a> immediately.
              </p>
              
              <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
              
              <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin: 0;">
                If the button doesn't work, copy and paste this link:<br>
                <a href="${verificationUrl}" style="color: #10b981; word-break: break-all;">${verificationUrl}</a>
              </p>
            </div>
            
            <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin-top: 20px;">
              © ${new Date().getFullYear()} TailoredApply. All rights reserved.
            </p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Device verification email sent:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Verification email sent",
        token // Return token for verification pending state
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending device verification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
