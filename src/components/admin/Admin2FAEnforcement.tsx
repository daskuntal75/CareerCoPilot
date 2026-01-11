import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Loader2, Lock, AlertTriangle } from "lucide-react";
import { TwoFactorSetup } from "@/components/auth/TwoFactorSetup";
import { motion } from "framer-motion";

interface Admin2FAEnforcementProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that enforces 2FA for admin accounts.
 * If the admin hasn't set up 2FA, they must complete setup before accessing admin features.
 */
const Admin2FAEnforcement = ({ children }: Admin2FAEnforcementProps) => {
  const [loading, setLoading] = useState(true);
  const [has2FA, setHas2FA] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkMfaStatus();
  }, []);

  const checkMfaStatus = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Check if user is admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      setIsAdmin(!!roleData);

      // If not an admin, no need to check 2FA
      if (!roleData) {
        setLoading(false);
        return;
      }

      // Check 2FA status
      const { data: mfaData, error: mfaError } = await supabase.auth.mfa.listFactors();
      
      if (mfaError) {
        console.error("Error checking MFA:", mfaError);
        setLoading(false);
        return;
      }

      const hasVerifiedFactor = mfaData?.totp?.some(f => f.status === "verified");
      setHas2FA(!!hasVerifiedFactor);
    } catch (error) {
      console.error("Error checking admin 2FA status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handle2FAComplete = () => {
    setHas2FA(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
          <p className="text-muted-foreground">Verifying security settings...</p>
        </div>
      </div>
    );
  }

  // If not admin or has 2FA, render children
  if (!isAdmin || has2FA) {
    return <>{children}</>;
  }

  // Admin without 2FA - show enforcement screen
  return (
    <div className="container mx-auto px-4 py-8 max-w-xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-warning" />
            </div>
            <CardTitle className="text-2xl">Two-Factor Authentication Required</CardTitle>
            <CardDescription className="text-base">
              As an administrator, you must enable two-factor authentication to access the admin dashboard.
              This helps protect sensitive data and prevent unauthorized access.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Security Notice */}
            <div className="flex items-start gap-3 p-4 rounded-lg bg-warning/10 border border-warning/20">
              <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-warning">Security Requirement</p>
                <p className="text-muted-foreground mt-1">
                  Admin accounts have elevated privileges and access to sensitive user data. 
                  2FA provides an essential layer of protection against unauthorized access.
                </p>
              </div>
            </div>

            {/* 2FA Setup Component */}
            <TwoFactorSetup onSetupComplete={handle2FAComplete} />
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default Admin2FAEnforcement;
