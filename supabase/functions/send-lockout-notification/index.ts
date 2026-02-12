import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { generateLockoutEmail } from "../_shared/email-templates.ts";
import { getLocationFromIP } from "../_shared/geolocation.ts";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors-utils.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface LockoutNotificationRequest {
  email: string;
  ipAddress: string;
  attemptCount: number;
  userAgent?: string;
  location?: string;
}

const handler = async (req: Request): Promise<Response> => {
  const preflightResponse = handleCorsPrelight(req);
  if (preflightResponse) return preflightResponse;
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const { email, ipAddress, attemptCount, userAgent, location: providedLocation }: LockoutNotificationRequest = await req.json();

    // Get geolocation if not provided
    let location = providedLocation;
    if (!location && ipAddress) {
      const geoData = await getLocationFromIP(ipAddress);
      location = geoData.formatted;
    }

    const timestamp = new Date().toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });

    const appUrl = Deno.env.get("APP_URL") || "https://tailoredapply.lovable.app";

    const htmlContent = generateLockoutEmail({
      email,
      ipAddress,
      attemptCount,
      userAgent,
      timestamp,
      appUrl,
      location,
    });

    const emailResponse = await resend.emails.send({
      from: "TailoredApply Security <security@resend.dev>",
      to: [email],
      subject: "🔒 Security Alert: Account Access Temporarily Locked",
      html: htmlContent,
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
