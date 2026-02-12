import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors-utils.ts";

serve(async (req) => {
  const preflightResponse = handleCorsPrelight(req);
  if (preflightResponse) return preflightResponse;
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Use service role to read admin settings
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data, error } = await supabaseClient
      .from("admin_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["demo_mode", "stripe_enabled"]);

    if (error) throw error;

    const settings = {
      demo_mode: true,
      stripe_enabled: false,
    };

    data?.forEach((row) => {
      if (row.setting_key === "demo_mode") {
        settings.demo_mode = row.setting_value === true || row.setting_value === "true";
      }
      if (row.setting_key === "stripe_enabled") {
        settings.stripe_enabled = row.setting_value === true || row.setting_value === "true";
      }
    });

    return new Response(JSON.stringify(settings), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CHECK-DEMO-MODE] Error:", errorMessage);
    
    // Return defaults on error
    return new Response(JSON.stringify({ demo_mode: true, stripe_enabled: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
