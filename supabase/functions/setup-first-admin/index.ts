import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SETUP-FIRST-ADMIN] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // CRITICAL: First check if any admin already exists
    const { data: existingAdmins, error: checkError } = await supabaseClient
      .from("user_roles")
      .select("id")
      .eq("role", "admin")
      .limit(1);

    if (checkError) throw checkError;

    if (existingAdmins && existingAdmins.length > 0) {
      logStep("Admin already exists - blocking setup");
      return new Response(
        JSON.stringify({ 
          error: "Setup not available. An admin already exists.",
          code: "ADMIN_EXISTS" 
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 403,
        }
      );
    }

    logStep("No admin exists - proceeding with setup");

    // Get request body
    const { email, password, fullName } = await req.json();

    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: "Email and password are required" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        }
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

    return new Response(
      JSON.stringify({ 
        success: true,
        message: "Admin account created successfully. You can now log in.",
        user_id: userId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
