import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Shield, Copy, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface TwoFactorSetupProps {
  onSetupComplete?: () => void;
}

export function TwoFactorSetup({ onSetupComplete }: TwoFactorSetupProps) {
  const [loading, setLoading] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    checkMfaStatus();
  }, []);

  const checkMfaStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) throw error;
      
      const verifiedFactor = data?.totp?.find(f => f.status === "verified");
      setMfaEnabled(!!verifiedFactor);
      if (verifiedFactor) {
        setFactorId(verifiedFactor.id);
      }
    } catch (err) {
      console.error("Error checking MFA status:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator App",
      });

      if (error) throw error;

      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
    } catch (err: any) {
      toast.error(err.message || "Failed to set up 2FA");
    } finally {
      setEnrolling(false);
    }
  };

  const handleVerify = async () => {
    if (!factorId || verificationCode.length !== 6) return;

    setVerifying(true);
    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: verificationCode,
      });

      if (error) throw error;

      setMfaEnabled(true);
      setQrCode(null);
      setSecret(null);
      setVerificationCode("");
      toast.success("Two-factor authentication enabled!");
      onSetupComplete?.();
    } catch (err: any) {
      toast.error(err.message || "Invalid verification code");
    } finally {
      setVerifying(false);
    }
  };

  const handleDisable = async () => {
    if (!factorId) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;

      setMfaEnabled(false);
      setFactorId(null);
      setShowDisableDialog(false);
      toast.success("Two-factor authentication disabled");
    } catch (err: any) {
      toast.error(err.message || "Failed to disable 2FA");
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Secret copied to clipboard");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (mfaEnabled) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-success/10 border border-success/20 rounded-lg">
          <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
          <div>
            <p className="font-medium text-success">Two-factor authentication is enabled</p>
            <p className="text-sm text-muted-foreground">Your account is protected with an authenticator app</p>
          </div>
        </div>
        
        <Button
          variant="destructive"
          onClick={() => setShowDisableDialog(true)}
          className="w-full"
        >
          Disable Two-Factor Authentication
        </Button>

        <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                Disable 2FA?
              </DialogTitle>
              <DialogDescription>
                This will make your account less secure. Are you sure you want to disable two-factor authentication?
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowDisableDialog(false)} className="flex-1">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDisable} disabled={loading} className="flex-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Disable 2FA"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (qrCode && secret) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
          </p>
          <div className="inline-block p-4 bg-white rounded-lg shadow-sm">
            <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Or enter this secret manually:</Label>
          <div className="flex gap-2">
            <Input
              value={secret}
              readOnly
              className="font-mono text-sm"
            />
            <Button variant="outline" size="icon" onClick={copySecret}>
              {copied ? <CheckCircle className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="verification-code">Enter the 6-digit code from your app:</Label>
          <Input
            id="verification-code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="000000"
            className="text-center text-2xl tracking-widest font-mono"
            maxLength={6}
          />
        </div>

        <Button
          onClick={handleVerify}
          disabled={verifying || verificationCode.length !== 6}
          className="w-full"
        >
          {verifying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          Verify and Enable
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 p-4 bg-muted/50 border border-border rounded-lg">
        <Shield className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium">Add an extra layer of security</p>
          <p className="text-sm text-muted-foreground">
            Use an authenticator app to generate verification codes when you sign in.
          </p>
        </div>
      </div>
      
      <Button onClick={handleEnroll} disabled={enrolling} className="w-full">
        {enrolling ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
        Set Up Two-Factor Authentication
      </Button>
    </div>
  );
}

export default TwoFactorSetup;
