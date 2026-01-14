import { motion, AnimatePresence } from "framer-motion";
import { Timer, RefreshCw, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";

export function SessionTimeoutWarning() {
  const { signOut } = useAuth();
  const { showWarning, formatTimeRemaining, extendSession } = useSessionTimeout();

  return (
    <AnimatePresence>
      {showWarning && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4"
        >
          <div className="bg-warning text-warning-foreground rounded-lg shadow-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <Timer className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm">Session Expiring Soon</h4>
                <p className="text-xs opacity-90 mt-0.5">
                  Your session will expire in <strong>{formatTimeRemaining()}</strong> due to inactivity.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={extendSession}
                className="flex-1 bg-warning-foreground text-warning hover:bg-warning-foreground/90"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Stay Signed In
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => signOut()}
                className="text-warning-foreground hover:bg-warning-foreground/10"
              >
                <LogOut className="w-3 h-3 mr-1" />
                Sign Out
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default SessionTimeoutWarning;
