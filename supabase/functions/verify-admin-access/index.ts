import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPrelight, createCorsResponse, createCorsErrorResponse } from "../_shared/cors-utils.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-ADMIN-ACCESS] ${step}${detailsStr}`);
};

serve(async (req) => {
  const preflightResponse = handleCorsPrelight(req);
  if (preflightResponse) return preflightResponse;

  const origin = req.headers.get("origin");

  try {
    logStep("Verifying admin access");

    // Extract the user's JWT from the Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      logStep("Missing or invalid Authorization header");
      return createCorsErrorResponse("Unauthorized", origin, 401);
    }

    const jwt = authHeader.replace("Bearer ", "");

    // Create a client with the user's JWT to validate the session
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        auth: { persistSession: false },
        global: { headers: { Authorization: `Bearer ${jwt}` } },
      }
    );

    // Validate the JWT and get the user
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      logStep("Invalid JWT or no user", { error: userError?.message });
      return createCorsErrorResponse("Invalid session", origin, 401);
    }

    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check MFA assurance level - admins MUST have AAL2
    const { data: aalData, error: aalError } = await supabaseUser.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError) {
      logStep("Failed to check MFA level", { error: aalError.message });
      return createCorsErrorResponse("Failed to verify MFA status", origin, 403);
    }

    const currentLevel = aalData?.currentLevel;
    const nextLevel = aalData?.nextLevel;

    logStep("MFA assurance level", { currentLevel, nextLevel });

    // Use service role to check admin status (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Server-side admin role verification
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (roleError) {
      logStep("Error checking admin role", { error: roleError.message });
      return createCorsErrorResponse("Failed to verify permissions", origin, 500);
    }

    if (!roleData) {
      logStep("User is NOT admin", { userId: user.id });

      // Log unauthorized admin access attempt
      await supabaseAdmin.from("audit_log").insert({
        user_id: user.id,
        action_type: "admin_access_denied",
        action_target: "admin_dashboard",
        action_data: {
          email: user.email,
          ip: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
          user_agent: req.headers.get("user-agent"),
        },
        ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
        user_agent: req.headers.get("user-agent"),
      }).catch((e: Error) => console.error("Audit log insert failed:", e));

      return createCorsResponse(
        { verified: false, reason: "not_admin" },
        origin,
        403
      );
    }

    // Admin confirmed - check if MFA is set up
    const { data: mfaFactors } = await supabaseUser.auth.mfa.listFactors();
    const hasVerifiedFactor = mfaFactors?.totp?.some(f => f.status === "verified");

    // If admin has MFA set up, they MUST be at AAL2
    if (hasVerifiedFactor && currentLevel !== "aal2") {
      logStep("Admin has MFA but not at AAL2", { userId: user.id });
      return createCorsResponse(
        { verified: false, reason: "mfa_required", mfa_enrolled: true },
        origin,
        403
      );
    }

    // If admin hasn't set up MFA yet, flag it
    if (!hasVerifiedFactor) {
      logStep("Admin has no MFA - setup required", { userId: user.id });
      return createCorsResponse(
        { verified: false, reason: "mfa_setup_required", mfa_enrolled: false },
        origin,
        403
      );
    }

    // All checks passed - log successful admin access
    await supabaseAdmin.from("audit_log").insert({
      user_id: user.id,
      action_type: "admin_access_granted",
      action_target: "admin_dashboard",
      action_data: {
        email: user.email,
        mfa_level: currentLevel,
        ip: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
      },
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip"),
      user_agent: req.headers.get("user-agent"),
    }).catch((e: Error) => console.error("Audit log insert failed:", e));

    logStep("Admin access GRANTED", { userId: user.id, mfaLevel: currentLevel });

    return createCorsResponse(
      {
        verified: true,
        user_id: user.id,
        email: user.email,
        mfa_level: currentLevel,
      },
      origin
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return createCorsErrorResponse("Internal server error", origin, 500);
  }
});
