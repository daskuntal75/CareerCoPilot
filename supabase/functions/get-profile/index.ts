import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory rate limiting (resets on function cold start)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = {
  maxRequests: 30, // 30 requests
  windowMs: 60 * 1000, // per minute
};

function checkRateLimit(userId: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const key = userId;
  
  let entry = rateLimitMap.get(key);
  
  // Clean up old entries periodically
  if (rateLimitMap.size > 10000) {
    for (const [k, v] of rateLimitMap.entries()) {
      if (v.resetAt < now) {
        rateLimitMap.delete(k);
      }
    }
  }
  
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + RATE_LIMIT.windowMs };
    rateLimitMap.set(key, entry);
  }
  
  entry.count++;
  
  const remaining = Math.max(0, RATE_LIMIT.maxRequests - entry.count);
  const resetIn = Math.ceil((entry.resetAt - now) / 1000);
  
  return {
    allowed: entry.count <= RATE_LIMIT.maxRequests,
    remaining,
    resetIn,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    // Apply rate limiting
    const rateLimit = checkRateLimit(user.id);
    
    const rateLimitHeaders = {
      "X-RateLimit-Limit": String(RATE_LIMIT.maxRequests),
      "X-RateLimit-Remaining": String(rateLimit.remaining),
      "X-RateLimit-Reset": String(rateLimit.resetIn),
    };
    
    if (!rateLimit.allowed) {
      console.warn(`Rate limit exceeded for user ${user.id}`);
      
      return new Response(JSON.stringify({ 
        error: "Too many requests",
        message: `Rate limit exceeded. Try again in ${rateLimit.resetIn} seconds.`,
      }), {
        status: 429,
        headers: { 
          ...corsHeaders, 
          ...rateLimitHeaders,
          "Content-Type": "application/json",
          "Retry-After": String(rateLimit.resetIn),
        },
      });
    }
    
    // Fetch user's own profile only
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (profileError) {
      throw new Error(`Failed to fetch profile: ${profileError.message}`);
    }
    
    return new Response(JSON.stringify({ 
      profile,
      user: {
        id: user.id,
        email: user.email,
      },
    }), {
      headers: { 
        ...corsHeaders, 
        ...rateLimitHeaders,
        "Content-Type": "application/json",
      },
    });
    
  } catch (error: unknown) {
    console.error("Get profile error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
