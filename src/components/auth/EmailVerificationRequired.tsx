import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Mail, RefreshCw, CheckCircle, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface EmailVerificationRequiredProps {
  email: string;
}

export function EmailVerificationRequired({ email }: EmailVerificationRequiredProps) {
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const { signOut } = useAuth();

  const handleResend = async () => {
    setResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error(error.message);
      } else {
        setResent(true);
        toast.success("Verification email sent!");
        setTimeout(() => setResent(false), 30000); // Allow resend after 30s
      }
    } catch (err) {
      toast.error("Failed to resend verification email");
    } finally {
      setResending(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-warning/10 flex items-center justify-center mb-6">
            <Mail className="w-8 h-8 text-warning" />
          </div>

          <h1 className="text-2xl font-bold text-foreground mb-2">
            Verify your email
          </h1>
          <p className="text-muted-foreground mb-6">
            We sent a verification link to <strong className="text-foreground">{email}</strong>. 
            Please check your inbox and click the link to verify your account.
          </p>

          <div className="space-y-3">
            <Button
              onClick={handleResend}
              variant="outline"
              className="w-full"
              disabled={resending || resent}
            >
              {resending ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : resent ? (
                <CheckCircle className="w-4 h-4 mr-2 text-success" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {resent ? "Email sent!" : "Resend verification email"}
            </Button>

            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="w-full text-muted-foreground"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out and use different email
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Didn't receive the email? Check your spam folder or try resending.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default EmailVerificationRequired;
