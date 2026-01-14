import { motion } from "framer-motion";
import { Mail, Shield, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NewDeviceVerificationProps {
  email: string;
  onBack: () => void;
  onResend: () => void;
}

export function NewDeviceVerification({ email, onBack, onResend }: NewDeviceVerificationProps) {
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    setResending(true);
    try {
      await onResend();
      toast.success("Verification email sent!");
    } finally {
      setResending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-6"
    >
      <div className="flex justify-center">
        <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center">
          <Shield className="w-8 h-8 text-warning" />
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          New Device Detected
        </h2>
        <p className="text-muted-foreground text-sm">
          For your security, we need to verify this device before you can continue.
        </p>
      </div>

      <div className="bg-muted/50 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-3 text-left">
          <Mail className="w-5 h-5 text-accent flex-shrink-0" />
          <div>
            <p className="font-medium text-sm">Check your email</p>
            <p className="text-xs text-muted-foreground">
              We sent a verification link to <span className="font-medium">{email}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Click the link in your email to verify this device. The link expires in 15 minutes.
        </p>

        <Button
          variant="outline"
          onClick={handleResend}
          disabled={resending}
          className="w-full"
        >
          {resending ? (
            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Mail className="w-4 h-4 mr-2" />
          )}
          Resend Verification Email
        </Button>

        <Button
          variant="ghost"
          onClick={onBack}
          className="w-full"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Try Different Account
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        If you didn't request this, please{" "}
        <a href="/auth?mode=reset" className="text-accent hover:underline">
          change your password
        </a>{" "}
        immediately.
      </p>
    </motion.div>
  );
}
