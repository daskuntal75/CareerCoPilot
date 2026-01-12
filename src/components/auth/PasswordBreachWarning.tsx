import { motion } from "framer-motion";
import { ShieldAlert, AlertTriangle, Loader2 } from "lucide-react";

interface PasswordBreachWarningProps {
  checking: boolean;
  isBreached: boolean;
  occurrences: number;
}

export function PasswordBreachWarning({ checking, isBreached, occurrences }: PasswordBreachWarningProps) {
  if (checking) {
    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: "auto" }}
        className="flex items-center gap-2 p-2 bg-muted/50 border border-border rounded-lg text-xs text-muted-foreground"
      >
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Checking password security...</span>
      </motion.div>
    );
  }

  if (!isBreached) {
    return null;
  }

  const severity = occurrences > 10000 ? "critical" : occurrences > 1000 ? "high" : "moderate";
  
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className={`flex items-start gap-2 p-3 rounded-lg text-xs ${
        severity === "critical"
          ? "bg-destructive/10 border border-destructive/30 text-destructive"
          : severity === "high"
          ? "bg-warning/10 border border-warning/30 text-warning"
          : "bg-warning/5 border border-warning/20 text-warning"
      }`}
    >
      {severity === "critical" ? (
        <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
      ) : (
        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1">
        <p className="font-medium">
          {severity === "critical"
            ? "Critical: Password found in major data breaches!"
            : severity === "high"
            ? "Warning: Password has been exposed in data breaches"
            : "Caution: Password has been seen in data breaches"}
        </p>
        <p className="mt-1 opacity-80">
          This password has appeared in{" "}
          <span className="font-semibold">
            {occurrences.toLocaleString()}
          </span>{" "}
          known data breaches. Please choose a different password to protect your account.
        </p>
      </div>
    </motion.div>
  );
}
