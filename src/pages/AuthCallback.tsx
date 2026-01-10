import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type CallbackStatus = "loading" | "success" | "error";

const AuthCallback = () => {
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the token from URL hash or query params
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        const type = hashParams.get("type") || searchParams.get("type");
        const errorDescription = hashParams.get("error_description") || searchParams.get("error_description");

        if (errorDescription) {
          setErrorMessage(errorDescription);
          setStatus("error");
          return;
        }

        if (accessToken && refreshToken) {
          // Set the session
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            setErrorMessage(error.message);
            setStatus("error");
            return;
          }

          setStatus("success");
          
          // Redirect based on callback type
          if (type === "recovery") {
            setTimeout(() => navigate("/auth?mode=reset"), 1500);
          } else {
            setTimeout(() => navigate("/dashboard"), 1500);
          }
        } else {
          // Check if we already have a session (might be a page refresh)
          const { data: { session } } = await supabase.auth.getSession();
          if (session) {
            setStatus("success");
            setTimeout(() => navigate("/dashboard"), 1500);
          } else {
            setErrorMessage("Invalid or expired verification link");
            setStatus("error");
          }
        }
      } catch (err) {
        setErrorMessage("An unexpected error occurred");
        setStatus("error");
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg text-center">
          {status === "loading" && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 flex items-center justify-center mb-6">
                <Loader2 className="w-8 h-8 text-accent animate-spin" />
              </div>
              <h1 className="text-xl font-bold text-foreground mb-2">
                Verifying your email...
              </h1>
              <p className="text-muted-foreground">
                Please wait while we confirm your account.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-6">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h1 className="text-xl font-bold text-foreground mb-2">
                Email verified!
              </h1>
              <p className="text-muted-foreground">
                Your account is now active. Redirecting you...
              </p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-destructive/10 flex items-center justify-center mb-6">
                <XCircle className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="text-xl font-bold text-foreground mb-2">
                Verification failed
              </h1>
              <p className="text-muted-foreground mb-6">
                {errorMessage || "The verification link may have expired or is invalid."}
              </p>
              <div className="space-y-3">
                <Button onClick={() => navigate("/auth")} className="w-full">
                  Back to sign in
                </Button>
                <Button onClick={() => navigate("/auth?signup=true")} variant="outline" className="w-full">
                  Create new account
                </Button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default AuthCallback;
