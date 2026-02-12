import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getLocationFromIP } from "../_shared/geolocation.ts";
import { detectAnomalies, generateRiskSummary, type LoginAttempt, type AnomalyResult } from "../_shared/anomaly-detection.ts";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors-utils.ts";

interface CheckAnomalyRequest {
  userId: string;
  email: string;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}

const handler = async (req: Request): Promise<Response> => {
  const preflightResponse = handleCorsPrelight(req);
  if (preflightResponse) return preflightResponse;
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { userId, email, ipAddress, userAgent, deviceFingerprint }: CheckAnomalyRequest = await req.json();

    // Get real IP from headers
    const realIp = ipAddress || 
      req.headers.get("cf-connecting-ip") || 
      req.headers.get("x-forwarded-for")?.split(",")[0] || 
      req.headers.get("x-real-ip") ||
      "unknown";

    // Get geolocation for current login
    const geoLocation = await getLocationFromIP(realIp);

    // Fetch recent login history for this user (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: recentLogs, error: logsError } = await supabaseClient
      .from("audit_log")
      .select("*")
      .eq("user_id", userId)
      .in("action_type", ["login_success", "login_failed"])
      .gte("created_at", thirtyDaysAgo)
      .order("created_at", { ascending: false })
      .limit(100);

    if (logsError) {
      console.error("Error fetching login history:", logsError);
    }

    // Convert audit logs to LoginAttempt format
    const recentLogins: LoginAttempt[] = (recentLogs || []).map(log => {
      const data = log.action_data as Record<string, unknown> || {};
      return {
        userId: log.user_id,
        timestamp: log.created_at,
        ipAddress: log.ip_address || "unknown",
        userAgent: log.user_agent || "",
        location: {
          city: data.city as string,
          region: data.region as string,
          country: data.country as string,
          countryCode: data.country_code as string,
          lat: data.lat as number,
          lon: data.lon as number,
        },
        deviceFingerprint: data.device_fingerprint as string,
        success: log.action_type === "login_success",
      };
    });

    // Build current login attempt
    const currentLogin: LoginAttempt = {
      userId,
      timestamp: new Date().toISOString(),
      ipAddress: realIp,
      userAgent: userAgent || "",
      location: {
        city: geoLocation.city ?? undefined,
        region: geoLocation.region ?? undefined,
        country: geoLocation.country ?? undefined,
        countryCode: geoLocation.countryCode ?? undefined,
        lat: geoLocation.lat ?? undefined,
        lon: geoLocation.lon ?? undefined,
      },
      deviceFingerprint,
      success: true, // We're checking during login, assuming success
    };

    // Detect anomalies
    const anomalyResult: AnomalyResult = detectAnomalies(currentLogin, recentLogins);
    const riskSummary = generateRiskSummary(anomalyResult);

    // Log the anomaly check result to audit log
    if (anomalyResult.isAnomalous) {
      await supabaseClient.from("audit_log").insert({
        user_id: userId,
        action_type: "login_anomaly_detected",
        action_target: email,
        action_data: {
          risk_score: anomalyResult.riskScore,
          flags: anomalyResult.flags,
          reasons: anomalyResult.reasons,
          ip_address: realIp,
          user_agent: userAgent,
          device_fingerprint: deviceFingerprint,
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

      // If high risk, send email notification
      if (anomalyResult.riskScore >= 50) {
        try {
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-new-device-notification`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
            },
            body: JSON.stringify({
              email,
              deviceInfo: userAgent,
              ipAddress: realIp,
              isAnomaly: true,
              riskSummary,
              anomalyFlags: anomalyResult.flags,
            }),
          });
        } catch (notifyError) {
          console.error("Error sending anomaly notification:", notifyError);
        }
      }
    }

    return new Response(
      JSON.stringify({
        isAnomalous: anomalyResult.isAnomalous,
        riskScore: anomalyResult.riskScore,
        flags: anomalyResult.flags,
        reasons: anomalyResult.reasons,
        riskSummary,
        location: geoLocation.formatted,
        requiresVerification: anomalyResult.riskScore >= 70, // Suggest additional verification for high risk
      }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Anomaly detection error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
