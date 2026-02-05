import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

 const DEFAULT_DEMO_APP_LIMIT = 3;
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
  const [isWhitelisted, setIsWhitelisted] = useState(false);
   const [demoLimit, setDemoLimit] = useState(DEFAULT_DEMO_APP_LIMIT);

  const checkDemoMode = useCallback(async () => {
    try {
      const { data } = await supabase.functions.invoke("check-demo-mode");
      setIsDemoMode(data?.demo_mode && !data?.stripe_enabled);
       
       // Also fetch the configurable demo limit
       const { data: limitData } = await supabase
         .from("admin_settings")
         .select("setting_value")
         .eq("setting_key", "demo_app_limit")
         .maybeSingle();
       
       if (limitData?.setting_value) {
         const limit = typeof limitData.setting_value === 'number' 
           ? limitData.setting_value 
           : (limitData.setting_value as { limit?: number })?.limit || DEFAULT_DEMO_APP_LIMIT;
         setDemoLimit(limit);
       }
    } catch (error) {
      console.error("Error checking demo mode:", error);
    }
  }, []);

  const checkWhitelist = useCallback(async () => {
    if (!user?.email) return;

    try {
      // Check if user is in whitelist by email
      const { data, error } = await supabase
        .from("demo_whitelist")
        .select("id")
        .eq("email", user.email.toLowerCase())
        .maybeSingle();

      if (error) {
        console.error("Error checking whitelist:", error);
        return;
      }

      setIsWhitelisted(!!data);
    } catch (error) {
      console.error("Error checking whitelist:", error);
    }
  }, [user?.email]);

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
      // User can bypass limit if whitelisted
       const limitReached = isDemoMode && !isWhitelisted && appCount >= demoLimit;

      setState({
        applicationCount: appCount,
        isLimitReached: limitReached,
        loading: false,
         canCreateApplication: !isDemoMode || isWhitelisted || appCount < demoLimit,
      });
    } catch (error) {
      console.error("Error fetching application count:", error);
      setState(prev => ({ ...prev, loading: false }));
    }
   }, [user?.id, isDemoMode, isWhitelisted, demoLimit]);

  useEffect(() => {
    checkDemoMode();
  }, [checkDemoMode]);

  useEffect(() => {
    if (user?.email) {
      checkWhitelist();
    }
  }, [user?.email, checkWhitelist]);

  useEffect(() => {
     if (isDemoMode !== undefined && demoLimit > 0) {
      fetchApplicationCount();
    }
   }, [fetchApplicationCount, isDemoMode, isWhitelisted, demoLimit]);

  const refreshCount = useCallback(() => {
    fetchApplicationCount();
  }, [fetchApplicationCount]);

  return {
    ...state,
    isDemoMode,
    isWhitelisted,
     demoLimit,
    supportEmail: SUPPORT_EMAIL,
    refreshCount,
     remainingJobApplications: Math.max(0, demoLimit - state.applicationCount),
  };
}
