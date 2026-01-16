import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to enforce MFA for admin users
 */
export function useAdminMfaEnforcement() {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkAdminStatus = useCallback(async () => {
    if (!user) {
      setIsAdmin(false);
      setMfaRequired(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Check if user is admin
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError) throw roleError;

      const userIsAdmin = !!roleData;
      setIsAdmin(userIsAdmin);

      // Check if MFA is enabled
      const { data: mfaData, error: mfaError } = await supabase.auth.mfa.listFactors();
      
      if (mfaError) throw mfaError;

      const verifiedFactor = mfaData?.totp?.find(f => f.status === "verified");
      const hasMfa = !!verifiedFactor;
      setMfaEnabled(hasMfa);

      // Admin users MUST have MFA enabled
      setMfaRequired(userIsAdmin && !hasMfa);
    } catch (error) {
      console.error("Error checking admin MFA status:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkAdminStatus();
  }, [checkAdminStatus]);

  /**
   * Check if MFA challenge is needed for admin access
   */
  const requireMfaChallenge = useCallback(async (): Promise<boolean> => {
    if (!isAdmin) return false;

    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (error) throw error;

      // Admin users need AAL2 (MFA verified)
      return data.currentLevel !== "aal2";
    } catch (error) {
      console.error("Error checking MFA assurance level:", error);
      return true; // Require MFA on error for security
    }
  }, [isAdmin]);

  /**
   * Get the current MFA assurance level
   */
  const getAssuranceLevel = useCallback(async (): Promise<"aal1" | "aal2" | null> => {
    try {
      const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (error) throw error;

      return data.currentLevel as "aal1" | "aal2";
    } catch {
      return null;
    }
  }, []);

  return {
    isAdmin,
    mfaEnabled,
    mfaRequired,
    loading,
    checkAdminStatus,
    requireMfaChallenge,
    getAssuranceLevel,
  };
}

export default useAdminMfaEnforcement;
