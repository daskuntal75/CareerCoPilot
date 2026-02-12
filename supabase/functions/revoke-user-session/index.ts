import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { generateSessionRevokedEmail } from "../_shared/email-templates.ts";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors-utils.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface RevokeSessionRequest {
  targetUserId: string;
  sessionInfo?: string;
  sendNotification?: boolean;
}

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MINUTES = 1;
const MAX_REVOCATIONS_PER_WINDOW = 5;

const handler = async (req: Request): Promise<Response> => {
  const preflightResponse = handleCorsPrelight(req);
  if (preflightResponse) return preflightResponse;
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the requesting user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: requestingUser }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if requesting user is admin
    const { data: adminRole } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", requestingUser.id)
      .eq("role", "admin")
      .single();

    if (!adminRole) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Admin access required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Rate limiting: Check how many revocations this admin has done in the last minute
    const rateLimitWindow = new Date();
    rateLimitWindow.setMinutes(rateLimitWindow.getMinutes() - RATE_LIMIT_WINDOW_MINUTES);

    const { data: recentRevocations, error: rateError } = await supabaseClient
      .from("audit_log")
      .select("id")
      .eq("user_id", requestingUser.id)
      .eq("action_type", "session_revoked")
      .gte("created_at", rateLimitWindow.toISOString());

    if (rateError) {
      console.error("Rate limit check error:", rateError);
    }

    const revocationCount = recentRevocations?.length || 0;
    if (revocationCount >= MAX_REVOCATIONS_PER_WINDOW) {
      // Log the rate limit hit
      await supabaseClient.from("audit_log").insert({
        user_id: requestingUser.id,
        action_type: "session_revoke_rate_limited",
        action_data: {
          attempted_at: new Date().toISOString(),
          revocations_in_window: revocationCount,
          limit: MAX_REVOCATIONS_PER_WINDOW,
          window_minutes: RATE_LIMIT_WINDOW_MINUTES,
        },
      });

      return new Response(
        JSON.stringify({ 
          error: `Rate limit exceeded. Maximum ${MAX_REVOCATIONS_PER_WINDOW} session revocations per minute.`,
          retryAfter: 60 - (new Date().getSeconds()),
        }),
        { 
          status: 429, 
          headers: { 
            "Content-Type": "application/json", 
            "Retry-After": "60",
            ...corsHeaders 
          } 
        }
      );
    }

    const { targetUserId, sessionInfo, sendNotification = true }: RevokeSessionRequest = await req.json();

    // Get target user's email for notification
    const { data: targetUser, error: userError } = await supabaseClient.auth.admin.getUserById(targetUserId);

    if (userError || !targetUser.user) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Sign out the user from all sessions
    const { error: signOutError } = await supabaseClient.auth.admin.signOut(targetUserId, "global");

    if (signOutError) {
      console.error("Error signing out user:", signOutError);
      return new Response(
        JSON.stringify({ error: "Failed to revoke session" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Log the action with detailed audit information
    const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                     req.headers.get("x-real-ip") || 
                     "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    await supabaseClient.from("audit_log").insert({
      user_id: requestingUser.id,
      action_type: "session_revoked",
      action_target: targetUserId,
      ip_address: clientIP,
      user_agent: userAgent,
      action_data: {
        target_email: targetUser.user.email,
        session_info: sessionInfo || "All sessions",
        revoked_by: requestingUser.email,
        revoked_by_id: requestingUser.id,
        timestamp: new Date().toISOString(),
        revocations_this_window: revocationCount + 1,
      },
    });

    // Send notification email if enabled
    if (sendNotification && targetUser.user.email) {
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

      const htmlContent = generateSessionRevokedEmail({
        email: targetUser.user.email,
        revokedBy: "Administrator",
        sessionInfo: sessionInfo || "All active sessions",
        timestamp,
        appUrl,
      });

      try {
        await resend.emails.send({
          from: "TailoredApply Security <security@resend.dev>",
          to: [targetUser.user.email],
          subject: "🚫 Session Terminated - Security Notice",
          html: htmlContent,
        });
        console.log("Session revoked notification sent to:", targetUser.user.email);
      } catch (emailError) {
        console.error("Failed to send notification email:", emailError);
        // Don't fail the request if email fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `All sessions revoked for user ${targetUser.user.email}`,
        remainingRevocations: MAX_REVOCATIONS_PER_WINDOW - revocationCount - 1,
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error revoking session:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
