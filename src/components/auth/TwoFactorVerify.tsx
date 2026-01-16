import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Shield, Loader2, ArrowLeft, Key } from "lucide-react";
import { BackupCodeVerify } from "./BackupCodeVerify";

interface TwoFactorVerifyProps {
  onVerified: () => void;
  onBack: () => void;
}

export function TwoFactorVerify({ onVerified, onBack }: TwoFactorVerifyProps) {
  const [verificationCode, setVerificationCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [useBackupCode, setUseBackupCode] = useState(false);

  useEffect(() => {
    initiateMfaChallenge();
  }, []);

  const initiateMfaChallenge = async () => {
    try {
      const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();
      if (factorsError) throw factorsError;

      const verifiedFactor = factorsData?.totp?.find(f => f.status === "verified");
      if (!verifiedFactor) {
        // No 2FA set up, proceed without verification
        onVerified();
        return;
      }

      setFactorId(verifiedFactor.id);

      // Create a challenge
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: verifiedFactor.id,
      });

      if (challengeError) throw challengeError;
      setChallengeId(challengeData.id);
    } catch (err: any) {
      console.error("Error initiating MFA challenge:", err);
      toast.error("Failed to initiate verification");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!factorId || !challengeId || verificationCode.length !== 6) return;

    setVerifying(true);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: verificationCode,
      });

      if (error) throw error;

      toast.success("Verification successful!");
      onVerified();
    } catch (err: any) {
      toast.error(err.message || "Invalid verification code");
      setVerificationCode("");
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show backup code verification screen - rendered as conditional content, not early return with hooks
  const renderBackupCodeVerify = () => (
    <BackupCodeVerify
      onVerified={onVerified}
      onBack={() => setUseBackupCode(false)}
    />
  );

  if (useBackupCode) {
    return renderBackupCodeVerify();
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 flex items-center justify-center mb-4">
          <Shield className="w-8 h-8 text-accent" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Two-factor authentication</h2>
        <p className="text-muted-foreground text-sm">
          Enter the 6-digit code from your authenticator app to continue.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="mfa-code">Verification code</Label>
        <Input
          id="mfa-code"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="000000"
          className="text-center text-2xl tracking-widest font-mono"
          maxLength={6}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && verificationCode.length === 6) {
              handleVerify();
            }
          }}
        />
      </div>

      <Button
        onClick={handleVerify}
        disabled={verifying || verificationCode.length !== 6}
        className="w-full"
        variant="hero"
      >
        {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
        Verify
      </Button>

      {/* Backup code option */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">or</span>
        </div>
      </div>

      <Button
        variant="outline"
        onClick={() => setUseBackupCode(true)}
        className="w-full"
      >
        <Key className="w-4 h-4 mr-2" />
        Use a Backup Code
      </Button>

      <button
        type="button"
        onClick={onBack}
        className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to login
      </button>
    </motion.div>
  );
}

export default TwoFactorVerify;
