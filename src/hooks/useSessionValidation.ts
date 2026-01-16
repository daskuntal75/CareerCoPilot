import { useEffect, useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SessionValidationConfig {
  refreshIntervalMs: number;
  validateOnFocus: boolean;
  validateOnNetworkReconnect: boolean;
}

const DEFAULT_CONFIG: SessionValidationConfig = {
  refreshIntervalMs: 5 * 60 * 1000, // Refresh token every 5 minutes
  validateOnFocus: true,
  validateOnNetworkReconnect: true,
};

export function useSessionValidation(config: Partial<SessionValidationConfig> = {}) {
  const { session, signOut } = useAuth();
  const [isValidating, setIsValidating] = useState(false);
  const [lastValidated, setLastValidated] = useState<Date | null>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);

  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  /**
   * Validate and refresh the current session
   */
  const validateSession = useCallback(async (): Promise<boolean> => {
    if (!session || isRefreshingRef.current) return !!session;

    isRefreshingRef.current = true;
    setIsValidating(true);

    try {
      // Check if session is about to expire (within 2 minutes)
      const expiresAt = session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = expiresAt ? expiresAt - now : Infinity;

      if (timeUntilExpiry < 120) {
        // Refresh the session
        const { data, error } = await supabase.auth.refreshSession();
        
        if (error) {
          console.error("Session refresh failed:", error);
          
          // Only sign out on specific errors
          if (error.message.includes("refresh_token_not_found") || 
              error.message.includes("Invalid Refresh Token")) {
            toast.error("Your session has expired. Please sign in again.");
            await signOut();
            return false;
          }
        }

        if (data.session) {
          setLastValidated(new Date());
          return true;
        }
      } else {
        // Session is still valid, just verify it
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          console.error("Session validation failed:", error);
          toast.error("Your session is no longer valid. Please sign in again.");
          await signOut();
          return false;
        }
        
        setLastValidated(new Date());
        return true;
      }
    } catch (error) {
      console.error("Session validation error:", error);
      return false;
    } finally {
      isRefreshingRef.current = false;
      setIsValidating(false);
    }

    return !!session;
  }, [session, signOut]);

  /**
   * Proactive token refresh to prevent expiration
   */
  const scheduleTokenRefresh = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    if (!session) return;

    refreshTimerRef.current = setTimeout(async () => {
      const isValid = await validateSession();
      if (isValid) {
        scheduleTokenRefresh(); // Schedule next refresh
      }
    }, mergedConfig.refreshIntervalMs);
  }, [session, validateSession, mergedConfig.refreshIntervalMs]);

  // Set up automatic token refresh
  useEffect(() => {
    if (!session) return;

    scheduleTokenRefresh();

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [session, scheduleTokenRefresh]);

  // Validate on window focus
  useEffect(() => {
    if (!mergedConfig.validateOnFocus || !session) return;

    const handleFocus = () => {
      validateSession();
    };

    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [mergedConfig.validateOnFocus, session, validateSession]);

  // Validate on network reconnect
  useEffect(() => {
    if (!mergedConfig.validateOnNetworkReconnect || !session) return;

    const handleOnline = () => {
      toast.info("Connection restored. Validating session...");
      validateSession();
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [mergedConfig.validateOnNetworkReconnect, session, validateSession]);

  /**
   * Force refresh the session token
   */
  const forceRefresh = useCallback(async (): Promise<boolean> => {
    if (!session) return false;

    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error("Force refresh failed:", error);
        return false;
      }

      if (data.session) {
        setLastValidated(new Date());
        return true;
      }
    } catch (error) {
      console.error("Force refresh error:", error);
    }

    return false;
  }, [session]);

  return {
    isValidating,
    lastValidated,
    validateSession,
    forceRefresh,
  };
}

export default useSessionValidation;
