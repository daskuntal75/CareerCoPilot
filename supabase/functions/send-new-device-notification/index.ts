import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { generateNewDeviceEmail } from "../_shared/email-templates.ts";
import { getLocationFromIP } from "../_shared/geolocation.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NewDeviceNotificationRequest {
  email: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
}

function parseUserAgent(userAgent: string): string {
  // Simple device type detection
  if (/mobile|android|iphone|ipad|ipod/i.test(userAgent)) {
    if (/iphone|ipad|ipod/i.test(userAgent)) {
      return "iOS Device";
    }
    return "Android Device";
  }
  if (/windows/i.test(userAgent)) {
    return "Windows Computer";
  }
  if (/macintosh|mac os/i.test(userAgent)) {
    return "Mac Computer";
  }
  if (/linux/i.test(userAgent)) {
    return "Linux Computer";
  }
  return "Unknown Device";
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, ipAddress, userAgent, location: providedLocation }: NewDeviceNotificationRequest = await req.json();

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

    const deviceType = parseUserAgent(userAgent);
    const appUrl = Deno.env.get("APP_URL") || "https://tailoredapply.lovable.app";

    const htmlContent = generateNewDeviceEmail({
      email,
      ipAddress,
      userAgent,
      location,
      timestamp,
      appUrl,
      deviceType,
    });

    const emailResponse = await resend.emails.send({
      from: "TailoredApply Security <security@resend.dev>",
      to: [email],
      subject: "📱 New Device Sign-In to Your Account",
      html: htmlContent,
    });

    console.log("New device notification sent:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending new device notification:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
