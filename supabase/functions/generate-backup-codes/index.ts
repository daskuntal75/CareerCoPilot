import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Generate a random backup code
function generateBackupCode(): string {
  const array = new Uint8Array(4);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
}

// Hash a backup code using SHA-256
async function hashCode(code: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Get user from auth header
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { action } = await req.json();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "generate") {
      // Generate 10 backup codes
      const plainCodes: string[] = [];
      const hashedCodes: string[] = [];
      
      for (let i = 0; i < 10; i++) {
        const code = generateBackupCode();
        plainCodes.push(code);
        hashedCodes.push(await hashCode(code));
      }

      // Store hashed codes in admin_settings
      const { error: upsertError } = await supabase
        .from("admin_settings")
        .upsert({
          setting_key: `backup_codes_${user.id}`,
          setting_value: {
            codes: hashedCodes.map((hash, index) => ({
              hash,
              used: false,
              index,
            })),
            generated_at: new Date().toISOString(),
          },
          description: "2FA Backup recovery codes",
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "setting_key",
        });

      if (upsertError) {
        throw upsertError;
      }

      // Log the generation
      await supabase.from("audit_log").insert({
        user_id: user.id,
        action_type: "backup_codes_generated",
        action_data: { code_count: 10 },
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          codes: plainCodes,
          message: "Save these codes in a secure place. Each code can only be used once."
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    } 
    
    if (action === "verify") {
      const { code } = await req.json();
      
      if (!code) {
        return new Response(
          JSON.stringify({ error: "Code is required" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Get stored codes
      const { data: settings, error: getError } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", `backup_codes_${user.id}`)
        .single();

      if (getError || !settings) {
        return new Response(
          JSON.stringify({ error: "No backup codes found" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const codeHash = await hashCode(code.toUpperCase());
      const codes = (settings.setting_value as any).codes;
      const matchingCode = codes.find((c: any) => c.hash === codeHash && !c.used);

      if (!matchingCode) {
        return new Response(
          JSON.stringify({ error: "Invalid or already used code", valid: false }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Mark code as used
      matchingCode.used = true;
      matchingCode.used_at = new Date().toISOString();

      await supabase
        .from("admin_settings")
        .update({
          setting_value: {
            ...settings.setting_value,
            codes,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("setting_key", `backup_codes_${user.id}`);

      // Log the usage
      await supabase.from("audit_log").insert({
        user_id: user.id,
        action_type: "backup_code_used",
        action_data: { code_index: matchingCode.index },
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          valid: true,
          remaining: codes.filter((c: any) => !c.used).length
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (action === "status") {
      // Get stored codes status
      const { data: settings } = await supabase
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", `backup_codes_${user.id}`)
        .single();

      if (!settings) {
        return new Response(
          JSON.stringify({ 
            hasBackupCodes: false,
            remaining: 0
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const codes = (settings.setting_value as any).codes || [];
      const remaining = codes.filter((c: any) => !c.used).length;

      return new Response(
        JSON.stringify({ 
          hasBackupCodes: true,
          remaining,
          generated_at: (settings.setting_value as any).generated_at
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in backup codes function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
