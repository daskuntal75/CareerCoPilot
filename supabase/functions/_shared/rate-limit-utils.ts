/**
 * Rate Limiting Utilities for AI Generation Edge Functions
 *
 * Implements hourly rate limits per user:
 * - Free tier: 10 AI generations per hour
 * - Paid tiers: Higher or unlimited limits
 *
 * Also provides distributed rate limiting using database-backed
 * sliding window algorithm for scalability across edge function instances.
 */

import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitConfig {
  maxRequestsPerHour: number;
  actionType: string;
}

export interface RateLimitResult {
  allowed: boolean;
  currentCount: number;
  remaining: number;
  resetAt: Date;
  tier: string;
}

export interface DistributedRateLimitResult {
  allowed: boolean;
  remaining: number;
  total: number;
  resetAt: Date;
}

// Tier-based rate limits per hour
const TIER_LIMITS: Record<string, number> = {
  free: 10,
  basic: 50,
  pro: 200,
  premium: 500,
  enterprise: -1, // Unlimited
};

// Concurrent request limits per resource
const CONCURRENT_LIMITS: Record<string, number> = {
  "cover-letter-generation": 50,
  "interview-prep-generation": 50,
  "job-fit-analysis": 100,
  default: 100,
};

/**
 * Get subscription tier for a user
 */
async function getUserTier(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data } = await supabase
    .from("subscriptions")
    .select("tier, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  
  return data?.tier || "free";
}

/**
 * Check if a user is allowed to make an AI generation request
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  actionType: string
): Promise<RateLimitResult> {
  // Get user's subscription tier
  const tier = await getUserTier(supabase, userId);
  const maxRequests = TIER_LIMITS[tier] ?? TIER_LIMITS.free;
  
  // Unlimited tier - always allow
  if (maxRequests === -1) {
    return {
      allowed: true,
      currentCount: 0,
      remaining: -1,
      resetAt: new Date(),
      tier,
    };
  }
  
  // Check current usage in the last hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { count, error } = await supabase
    .from("usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", oneHourAgo);
  
  if (error) {
    console.error("Error checking rate limit:", error);
    // On error, allow the request but log it
    return {
      allowed: true,
      currentCount: 0,
      remaining: maxRequests,
      resetAt: new Date(Date.now() + 60 * 60 * 1000),
      tier,
    };
  }
  
  const currentCount = count || 0;
  const remaining = Math.max(0, maxRequests - currentCount);
  
  return {
    allowed: currentCount < maxRequests,
    currentCount,
    remaining,
    resetAt: new Date(Date.now() + 60 * 60 * 1000),
    tier,
  };
}

/**
 * Log an AI generation usage event
 */
export async function logUsage(
  supabase: SupabaseClient,
  userId: string,
  actionType: string,
  metadata: Record<string, unknown> = {},
  ipAddress?: string
): Promise<void> {
  const { error } = await supabase
    .from("usage_logs")
    .insert({
      user_id: userId,
      action: actionType,
      metadata,
      ip_address: ipAddress,
    });
  
  if (error) {
    console.error("Error logging usage:", error);
  }
}

/**
 * Get remaining quota for a user
 */
export async function getRemainingQuota(
  supabase: SupabaseClient,
  userId: string
): Promise<{ remaining: number; limit: number; tier: string }> {
  const tier = await getUserTier(supabase, userId);
  const limit = TIER_LIMITS[tier] ?? TIER_LIMITS.free;
  
  if (limit === -1) {
    return { remaining: -1, limit: -1, tier };
  }
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  
  const { count } = await supabase
    .from("usage_logs")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", oneHourAgo);
  
  const currentCount = count || 0;
  
  return {
    remaining: Math.max(0, limit - currentCount),
    limit,
    tier,
  };
}

/**
 * Create a rate limit error response
 */
export function createRateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  const resetInMinutes = Math.ceil((result.resetAt.getTime() - Date.now()) / 60000);

  return new Response(
    JSON.stringify({
      error: "Rate limit exceeded",
      message: `You have exceeded the hourly limit of ${TIER_LIMITS[result.tier] || 10} AI generations. Please try again in ${resetInMinutes} minutes or upgrade your plan for higher limits.`,
      remaining: 0,
      resetAt: result.resetAt.toISOString(),
      tier: result.tier,
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "X-RateLimit-Limit": String(TIER_LIMITS[result.tier] || 10),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": result.resetAt.toISOString(),
        "Retry-After": String(resetInMinutes * 60),
      },
    }
  );
}

// ============================================================================
// DISTRIBUTED RATE LIMITING (Database-backed for scalability)
// ============================================================================

/**
 * Check distributed rate limit using database-backed sliding window.
 * This works across all edge function instances.
 *
 * @param supabase - Supabase client with service role
 * @param bucketKey - Unique identifier (user_id, IP, etc.)
 * @param resource - The resource being rate limited
 * @param maxRequests - Maximum requests allowed in window
 * @param windowMs - Window duration in milliseconds
 */
export async function checkDistributedRateLimit(
  supabase: SupabaseClient,
  bucketKey: string,
  resource: string,
  maxRequests: number = 100,
  windowMs: number = 60000
): Promise<DistributedRateLimitResult> {
  try {
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_bucket_key: bucketKey,
      p_resource: resource,
      p_max_requests: maxRequests,
      p_window_ms: windowMs,
    });

    if (error) {
      console.error("Distributed rate limit check failed:", error);
      // Fail open but log the error
      return {
        allowed: true,
        remaining: maxRequests,
        total: maxRequests,
        resetAt: new Date(Date.now() + windowMs),
      };
    }

    return {
      allowed: data.allowed,
      remaining: data.remaining,
      total: data.total,
      resetAt: new Date(data.reset_at),
    };
  } catch (err) {
    console.error("Distributed rate limit error:", err);
    // Fail open on unexpected errors
    return {
      allowed: true,
      remaining: maxRequests,
      total: maxRequests,
      resetAt: new Date(Date.now() + windowMs),
    };
  }
}

/**
 * Check concurrent request limit for a resource.
 * Uses database-backed counter instead of in-memory.
 */
export async function checkConcurrentLimit(
  supabase: SupabaseClient,
  resource: string
): Promise<{ allowed: boolean; current: number; max: number }> {
  const maxConcurrent = CONCURRENT_LIMITS[resource] || CONCURRENT_LIMITS.default;

  // Use a short window (5 seconds) to track "active" requests
  const result = await checkDistributedRateLimit(
    supabase,
    `concurrent:${resource}`,
    "concurrent",
    maxConcurrent,
    5000 // 5 second window
  );

  return {
    allowed: result.allowed,
    current: result.total - result.remaining,
    max: maxConcurrent,
  };
}

/**
 * Create a concurrency limit error response
 */
export function createConcurrencyLimitResponse(
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: "Server is busy",
      message: "High demand detected. Please try again in a few seconds.",
      retryAfter: 5,
    }),
    {
      status: 503,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": "5",
      },
    }
  );
}
