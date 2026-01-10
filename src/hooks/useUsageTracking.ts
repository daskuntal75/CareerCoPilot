import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TIER_FEATURES, SubscriptionTier } from "@/lib/stripe-config";

interface UsageData {
  cover_letter: number;
  interview_prep: number;
}

interface UsageLimits {
  cover_letter: number;
  interview_prep: number;
}

export function useUsageTracking() {
  const { user, subscription } = useAuth();
  const [usage, setUsage] = useState<UsageData>({ cover_letter: 0, interview_prep: 0 });
  const [loading, setLoading] = useState(true);

  const getCurrentMonth = () => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  };

  const getLimits = useCallback((): UsageLimits => {
    const tier = subscription.tier as SubscriptionTier;
    const features = TIER_FEATURES[tier] || TIER_FEATURES.free;
    return {
      cover_letter: features.coverLettersPerMonth,
      interview_prep: features.interviewPrep ? -1 : 0, // -1 = unlimited
    };
  }, [subscription.tier]);

  const fetchUsage = useCallback(async () => {
    if (!user) {
      setUsage({ cover_letter: 0, interview_prep: 0 });
      setLoading(false);
      return;
    }

    try {
      const currentMonth = getCurrentMonth();
      const { data, error } = await supabase
        .from("usage_tracking")
        .select("feature_type, usage_count")
        .eq("user_id", user.id)
        .eq("usage_month", currentMonth);

      if (error) throw error;

      const usageMap: UsageData = { cover_letter: 0, interview_prep: 0 };
      data?.forEach((row) => {
        if (row.feature_type === "cover_letter" || row.feature_type === "interview_prep") {
          usageMap[row.feature_type] = row.usage_count;
        }
      });

      setUsage(usageMap);
    } catch (error) {
      console.error("Error fetching usage:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const incrementUsage = useCallback(async (featureType: "cover_letter" | "interview_prep") => {
    if (!user) return false;

    const limits = getLimits();
    const limit = limits[featureType];

    // Check if at limit (unless unlimited)
    if (limit !== -1 && usage[featureType] >= limit) {
      return false;
    }

    try {
      const currentMonth = getCurrentMonth();
      
      // Try to upsert the usage record
      const { data: existing } = await supabase
        .from("usage_tracking")
        .select("id, usage_count")
        .eq("user_id", user.id)
        .eq("feature_type", featureType)
        .eq("usage_month", currentMonth)
        .single();

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from("usage_tracking")
          .update({ usage_count: existing.usage_count + 1 })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from("usage_tracking")
          .insert({
            user_id: user.id,
            feature_type: featureType,
            usage_month: currentMonth,
            usage_count: 1,
          });

        if (error) throw error;
      }

      // Update local state
      setUsage((prev) => ({
        ...prev,
        [featureType]: prev[featureType] + 1,
      }));

      return true;
    } catch (error) {
      console.error("Error incrementing usage:", error);
      return false;
    }
  }, [user, usage, getLimits]);

  const canUseFeature = useCallback((featureType: "cover_letter" | "interview_prep"): boolean => {
    const limits = getLimits();
    const limit = limits[featureType];
    
    // -1 means unlimited
    if (limit === -1) return true;
    // 0 means feature not available
    if (limit === 0) return false;
    
    return usage[featureType] < limit;
  }, [usage, getLimits]);

  const getRemainingUsage = useCallback((featureType: "cover_letter" | "interview_prep"): number | null => {
    const limits = getLimits();
    const limit = limits[featureType];
    
    // -1 means unlimited
    if (limit === -1) return null;
    
    return Math.max(0, limit - usage[featureType]);
  }, [usage, getLimits]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  return {
    usage,
    loading,
    incrementUsage,
    canUseFeature,
    getRemainingUsage,
    refreshUsage: fetchUsage,
    limits: getLimits(),
  };
}
