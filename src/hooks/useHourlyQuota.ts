import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface HourlyQuotaState {
  remaining: number;
  limit: number;
  tier: string;
  loading: boolean;
  resetAt: Date | null;
}

const TIER_LIMITS: Record<string, number> = {
  free: 10,
  basic: 50,
  pro: 200,
  enterprise: -1,
};

export const useHourlyQuota = () => {
  const { user, subscription } = useAuth();
  const [quota, setQuota] = useState<HourlyQuotaState>({
    remaining: 10,
    limit: 10,
    tier: "free",
    loading: true,
    resetAt: null,
  });

  const fetchQuota = useCallback(async () => {
    if (!user) {
      setQuota({
        remaining: 0,
        limit: 0,
        tier: "free",
        loading: false,
        resetAt: null,
      });
      return;
    }

    try {
      const tier = subscription?.tier || "free";
      const limit = TIER_LIMITS[tier] ?? TIER_LIMITS.free;

      // Unlimited tier
      if (limit === -1) {
        setQuota({
          remaining: -1,
          limit: -1,
          tier,
          loading: false,
          resetAt: null,
        });
        return;
      }

      // Count usage in the last hour
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

      const { count, error } = await supabase
        .from("usage_logs")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", oneHourAgo);

      if (error) {
        console.error("Error fetching quota:", error);
        // Default to allowing if error
        setQuota({
          remaining: limit,
          limit,
          tier,
          loading: false,
          resetAt: new Date(Date.now() + 60 * 60 * 1000),
        });
        return;
      }

      const currentCount = count || 0;
      const remaining = Math.max(0, limit - currentCount);

      setQuota({
        remaining,
        limit,
        tier,
        loading: false,
        resetAt: new Date(Date.now() + 60 * 60 * 1000),
      });
    } catch (error) {
      console.error("Error in useHourlyQuota:", error);
      setQuota((prev) => ({ ...prev, loading: false }));
    }
  }, [user, subscription?.tier]);

  // Fetch quota on mount and when user/subscription changes
  useEffect(() => {
    fetchQuota();
  }, [fetchQuota]);

  // Refresh quota every minute
  useEffect(() => {
    const interval = setInterval(fetchQuota, 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchQuota]);

  const decrementQuota = useCallback(() => {
    setQuota((prev) => ({
      ...prev,
      remaining: prev.remaining === -1 ? -1 : Math.max(0, prev.remaining - 1),
    }));
  }, []);

  const isUnlimited = quota.limit === -1;
  const canGenerate = isUnlimited || quota.remaining > 0;
  const isLow = !isUnlimited && quota.remaining <= 3 && quota.remaining > 0;
  const isExhausted = !isUnlimited && quota.remaining === 0;

  return {
    ...quota,
    isUnlimited,
    canGenerate,
    isLow,
    isExhausted,
    refreshQuota: fetchQuota,
    decrementQuota,
  };
};
