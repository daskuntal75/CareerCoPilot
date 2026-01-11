import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const DEMO_APP_LIMIT = 3;
const SUPPORT_EMAIL = "daskuntal@gmail.com";

interface DemoLimitState {
  applicationCount: number;
  isLimitReached: boolean;
  loading: boolean;
  canCreateApplication: boolean;
}

export function useDemoLimit() {
  const { user } = useAuth();
  const [state, setState] = useState<DemoLimitState>({
    applicationCount: 0,
    isLimitReached: false,
    loading: true,
    canCreateApplication: true,
  });
  const [isDemoMode, setIsDemoMode] = useState(false);

  const checkDemoMode = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke("check-demo-mode");
      setIsDemoMode(data?.demo_mode && !data?.stripe_enabled);
    } catch (error) {
      console.error("Error checking demo mode:", error);
    }
  }, []);

  const fetchApplicationCount = useCallback(async () => {
    if (!user?.id) {
      setState(prev => ({ ...prev, loading: false }));
      return;
    }

    try {
      const { count, error } = await supabase
        .from("applications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      if (error) throw error;

      const appCount = count || 0;
      const limitReached = isDemoMode && appCount >= DEMO_APP_LIMIT;

      setState({
        applicationCount: appCount,
        isLimitReached: limitReached,
        loading: false,
        canCreateApplication: !isDemoMode || appCount < DEMO_APP_LIMIT,
      });
    } catch (error) {
      console.error("Error fetching application count:", error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [user?.id, isDemoMode]);

  useEffect(() => {
    checkDemoMode();
  }, [checkDemoMode]);

  useEffect(() => {
    if (isDemoMode !== undefined) {
      fetchApplicationCount();
    }
  }, [fetchApplicationCount, isDemoMode]);

  const refreshCount = useCallback(() => {
    fetchApplicationCount();
  }, [fetchApplicationCount]);

  return {
    ...state,
    isDemoMode,
    demoLimit: DEMO_APP_LIMIT,
    supportEmail: SUPPORT_EMAIL,
    refreshCount,
    remainingApps: Math.max(0, DEMO_APP_LIMIT - state.applicationCount),
  };
}
