import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getLocationFromIP } from "../_shared/geolocation.ts";
import { getCorsHeaders, handleCorsPrelight, createCorsResponse, createCorsErrorResponse } from "../_shared/cors-utils.ts";

interface RateLimitRequest {
  action: "check" | "log_failure" | "log_success" | "check_lockout";
  email?: string;
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
}

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  lockoutMs: number;
  maxLockoutMs: number;
}

const CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 60 * 1000, // 1 minute
  lockoutMs: 60 * 1000, // 1 minute base lockout
  maxLockoutMs: 30 * 60 * 1000, // 30 minutes max lockout
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  const preflightResponse = handleCorsPrelight(req);
  if (preflightResponse) return preflightResponse;

  const origin = req.headers.get("origin");

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { action, email, ipAddress, userAgent, userId }: RateLimitRequest = await req.json();

    // Get real IP from headers (Cloudflare/proxy)
    const realIp = ipAddress ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0] ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const windowStart = new Date(Date.now() - CONFIG.windowMs).toISOString();

    if (action === "check" || action === "check_lockout") {
      // Check for recent failed attempts from this IP
      const { data: recentAttempts, error: attemptsError } = await supabaseClient
        .from("audit_log")
        .select("created_at, action_data")
        .eq("action_type", "login_failed")
        .eq("ip_address", realIp)
        .gte("created_at", windowStart)
        .order("created_at", { ascending: false });

      if (attemptsError) {
        // SECURITY: Fail CLOSED - deny the attempt if we can't verify rate limit status
        // This prevents bypass attacks when the database is unavailable
        console.error("Error checking rate limit - failing closed:", attemptsError);
        return createCorsResponse(
          {
            allowed: false,
            remainingAttempts: 0,
            error: "Unable to verify rate limit. Please try again.",
            failedClosed: true,
          },
          origin,
          503
        );
      }

      const attemptCount = recentAttempts?.length || 0;
      const remainingAttempts = Math.max(0, CONFIG.maxAttempts - attemptCount);
      
      // Check if user is in lockout
      const consecutiveLockouts = recentAttempts?.filter(a => {
        const data = a.action_data as Record<string, unknown>;
        return data?.lockout_triggered;
      }).length || 0;

      // Calculate lockout duration with exponential backoff
      const lockoutMs = Math.min(
        CONFIG.lockoutMs * Math.pow(2, consecutiveLockouts),
        CONFIG.maxLockoutMs
      );

      // Check if there's an active lockout
      const lastLockout = recentAttempts?.find(a => {
        const data = a.action_data as Record<string, unknown>;
        return data?.lockout_triggered;
      });

      let isLocked = false;
      let lockoutRemainingMs = 0;

      if (lastLockout) {
        const lockoutEnd = new Date(lastLockout.created_at).getTime() + lockoutMs;
        if (Date.now() < lockoutEnd) {
          isLocked = true;
          lockoutRemainingMs = lockoutEnd - Date.now();
        }
      }

      return createCorsResponse(
        {
          allowed: !isLocked && remainingAttempts > 0,
          remainingAttempts,
          isLocked,
          lockoutRemainingMs,
          lockoutSeconds: Math.ceil(lockoutRemainingMs / 1000),
        },
        origin
      );
    }

    if (action === "log_failure") {
      // Check current attempt count to see if this triggers a lockout
      const { data: recentAttempts } = await supabaseClient
        .from("audit_log")
        .select("created_at")
        .eq("action_type", "login_failed")
        .eq("ip_address", realIp)
        .gte("created_at", windowStart);

      const attemptCount = (recentAttempts?.length || 0) + 1;
      const triggersLockout = attemptCount >= CONFIG.maxAttempts;

      // Get geolocation for the IP
      const geoLocation = await getLocationFromIP(realIp);

      // Log the failed attempt to audit_log
      const { error: logError } = await supabaseClient.from("audit_log").insert({
        user_id: userId || "00000000-0000-0000-0000-000000000000", // Anonymous user placeholder
        action_type: "login_failed",
        action_target: email || "unknown",
        action_data: {
          email,
          ip_address: realIp,
          user_agent: userAgent,
          attempt_number: attemptCount,
          lockout_triggered: triggersLockout,
          timestamp: new Date().toISOString(),
          location: geoLocation.formatted,
          city: geoLocation.city,
          region: geoLocation.region,
          country: geoLocation.country,
          country_code: geoLocation.countryCode,
        },
        ip_address: realIp,
        user_agent: userAgent,
        approval_status: "approved", // Auto-approved log entry
      });

      if (logError) {
        console.error("Error logging failed attempt:", logError);
      }

      // If lockout triggered, send notification email
      if (triggersLockout && email) {
        try {
          // Send lockout notification to the user
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-lockout-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({
              email,
              ipAddress: realIp,
              attemptCount,
              userAgent,
            }),
          });

          // Check if this is an admin account and send admin alert
          const { data: adminCheck } = await supabaseClient
            .from("user_roles")
            .select("role, user_id")
            .eq("role", "admin")
            .limit(1);

          // If we have admins, check if the target email belongs to an admin
          if (adminCheck && adminCheck.length > 0) {
            // Look up if the email being targeted is an admin
            const { data: { users: targetUsers } } = await supabaseClient.auth.admin.listUsers();
            const targetUser = targetUsers?.find(u => u.email === email);
            
            if (targetUser) {
              const { data: isTargetAdmin } = await supabaseClient
                .from("user_roles")
                .select("role")
                .eq("user_id", targetUser.id)
                .eq("role", "admin")
                .maybeSingle();

              if (isTargetAdmin) {
                // Send high-priority admin alert for failed admin login
                await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-security-alert`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
                  },
                  body: JSON.stringify({
                    alertType: "failed_admin_login",
                    severity: "high",
                    details: `Multiple failed login attempts detected for admin account: ${email}. The account has been temporarily locked.`,
                    ipAddress: realIp,
                    userEmail: email,
                    location: geoLocation.formatted,
                    eventCount: attemptCount,
                    actionRequired: "Review the security logs and ensure this is not a targeted attack on admin accounts.",
                  }),
                });
                console.log("Admin security alert sent for failed admin login");
              }
            }
          }
        } catch (notifyError) {
          console.error("Error sending lockout notification:", notifyError);
        }
      }

      return createCorsResponse(
        {
          logged: true,
          attemptCount,
          triggersLockout,
          remainingAttempts: Math.max(0, CONFIG.maxAttempts - attemptCount),
        },
        origin
      );
    }

    if (action === "log_success") {
      // Get geolocation for the IP
      const geoLocation = await getLocationFromIP(realIp);

      // Log successful login
      const { error: logError } = await supabaseClient.from("audit_log").insert({
        user_id: userId || "00000000-0000-0000-0000-000000000000",
        action_type: "login_success",
        action_target: email || "unknown",
        action_data: {
          email,
          ip_address: realIp,
          user_agent: userAgent,
          timestamp: new Date().toISOString(),
          location: geoLocation.formatted,
          city: geoLocation.city,
          region: geoLocation.region,
          country: geoLocation.country,
          country_code: geoLocation.countryCode,
        },
        ip_address: realIp,
        user_agent: userAgent,
        approval_status: "approved",
      });

      if (logError) {
        console.error("Error logging successful login:", logError);
      }

      return createCorsResponse(
        { logged: true, location: geoLocation.formatted },
        origin
      );
    }

    return createCorsErrorResponse("Invalid action", origin, 400);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Rate limit error:", errorMessage);
    return createCorsErrorResponse(errorMessage, origin, 500);
  }
};

serve(handler);
