import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPrelight, createCorsResponse, createCorsErrorResponse } from "../_shared/cors-utils.ts";

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SETUP-FIRST-ADMIN] ${step}${detailsStr}`);
};

/**
 * Validate setup token for additional security
 * The ADMIN_SETUP_TOKEN should be set as a Supabase secret and only known by authorized personnel
 */
const validateSetupToken = (req: Request): boolean => {
  const setupToken = Deno.env.get("ADMIN_SETUP_TOKEN");

  // If no token is configured, setup is disabled for security
  if (!setupToken) {
    console.warn("ADMIN_SETUP_TOKEN not configured - admin setup is disabled");
    return false;
  }

  const providedToken = req.headers.get("x-setup-token");
  if (!providedToken) {
    return false;
  }

  // Use timing-safe comparison to prevent timing attacks
  if (providedToken.length !== setupToken.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < providedToken.length; i++) {
    result |= providedToken.charCodeAt(i) ^ setupToken.charCodeAt(i);
  }
  return result === 0;
};

serve(async (req) => {
  // Handle CORS preflight
  const preflightResponse = handleCorsPrelight(req);
  if (preflightResponse) return preflightResponse;

  const origin = req.headers.get("origin");

  try {
    logStep("Function started");

    // SECURITY: Validate setup token before any operations
    if (!validateSetupToken(req)) {
      logStep("Invalid or missing setup token");
      return createCorsErrorResponse(
        "Unauthorized. Valid setup token required.",
        origin,
        401
      );
    }

    logStep("Setup token validated");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // CRITICAL: Use advisory lock to prevent race conditions
    // This ensures only one admin setup can proceed at a time
    const lockKey = 12345; // Arbitrary lock ID for admin setup
    const { data: lockAcquired, error: lockError } = await supabaseClient.rpc(
      "pg_try_advisory_lock",
      { key: lockKey }
    ).single();

    if (lockError || !lockAcquired) {
      logStep("Could not acquire lock - another setup may be in progress");
      return createCorsErrorResponse(
        "Setup is already in progress. Please try again.",
        origin,
        409
      );
    }

    try {
      // Check if any admin already exists (within the lock)
      const { data: existingAdmins, error: checkError } = await supabaseClient
        .from("user_roles")
        .select("id")
        .eq("role", "admin")
        .limit(1);

      if (checkError) throw checkError;

      if (existingAdmins && existingAdmins.length > 0) {
        logStep("Admin already exists - blocking setup");
        return createCorsResponse(
          {
            error: "Setup not available. An admin already exists.",
            code: "ADMIN_EXISTS"
          },
          origin,
          403
        );
      }

      logStep("No admin exists - proceeding with setup");

      // Get request body
      const { email, password, fullName } = await req.json();

      if (!email || !password) {
        return createCorsErrorResponse(
          "Email and password are required",
          origin,
          400
        );
      }

      // Validate password strength (minimum 12 characters for admin accounts)
      if (password.length < 12) {
        return createCorsErrorResponse(
          "Admin password must be at least 12 characters",
          origin,
          400
        );
      }

      // Check for password complexity
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

      if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
        return createCorsErrorResponse(
          "Admin password must contain uppercase, lowercase, number, and special character",
          origin,
          400
        );
      }

      logStep("Creating admin user", { email });

      // Create the user using admin API
      const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Auto-confirm the email
        user_metadata: { full_name: fullName || "Admin" },
      });

      if (authError) {
        logStep("Error creating user", { error: authError.message });
        throw authError;
      }

      if (!authData.user) {
        throw new Error("Failed to create user");
      }

      const userId = authData.user.id;
      logStep("User created", { userId });

      // Create profile for the admin
      const { error: profileError } = await supabaseClient
        .from("profiles")
        .insert({
          user_id: userId,
          full_name: fullName || "Admin",
        });

      if (profileError) {
        logStep("Error creating profile", { error: profileError.message });
        // Continue anyway - profile can be created later
      }

      // Grant admin role
      const { error: roleError } = await supabaseClient
        .from("user_roles")
        .insert({
          user_id: userId,
          role: "admin",
        });

      if (roleError) {
        logStep("Error granting admin role", { error: roleError.message });
        // Try to clean up the user if role grant fails
        await supabaseClient.auth.admin.deleteUser(userId);
        throw new Error("Failed to grant admin role: " + roleError.message);
      }

      logStep("Admin role granted successfully");

      return createCorsResponse(
        {
          success: true,
          message: "Admin account created successfully. You can now log in.",
          user_id: userId,
        },
        origin
      );

    } finally {
      // Always release the advisory lock
      try {
        await supabaseClient.rpc("pg_advisory_unlock", { key: lockKey });
      } catch (err) {
        console.error("Failed to release lock:", err);
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return createCorsErrorResponse(errorMessage, origin, 500);
  }
});
