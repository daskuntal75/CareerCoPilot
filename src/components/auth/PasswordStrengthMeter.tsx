import { useMemo } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface PasswordRequirement {
  label: string;
  validator: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  { label: "At least 8 characters", validator: (p) => p.length >= 8 },
  { label: "One uppercase letter", validator: (p) => /[A-Z]/.test(p) },
  { label: "One lowercase letter", validator: (p) => /[a-z]/.test(p) },
  { label: "One number", validator: (p) => /\d/.test(p) },
  { label: "One special character (!@#$%^&*)", validator: (p) => /[!@#$%^&*(),.?":{}|<>]/.test(p) },
];

interface PasswordStrengthMeterProps {
  password: string;
  showRequirements?: boolean;
}

export function getPasswordStrength(password: string): {
  score: number;
  level: "weak" | "fair" | "good" | "strong";
  percentage: number;
} {
  const passedCount = requirements.filter((r) => r.validator(password)).length;
  const percentage = (passedCount / requirements.length) * 100;

  if (passedCount <= 1) return { score: passedCount, level: "weak", percentage };
  if (passedCount <= 2) return { score: passedCount, level: "fair", percentage };
  if (passedCount <= 4) return { score: passedCount, level: "good", percentage };
  return { score: passedCount, level: "strong", percentage };
}

export function isPasswordStrong(password: string): boolean {
  const { level } = getPasswordStrength(password);
  return level === "good" || level === "strong";
}

export function PasswordStrengthMeter({ password, showRequirements = true }: PasswordStrengthMeterProps) {
  const { level, percentage } = useMemo(() => getPasswordStrength(password), [password]);

  const colorClass = {
    weak: "bg-destructive",
    fair: "bg-warning",
    good: "bg-success/70",
    strong: "bg-success",
  }[level];

  const labelClass = {
    weak: "text-destructive",
    fair: "text-warning",
    good: "text-success/70",
    strong: "text-success",
  }[level];

  const labelText = {
    weak: "Weak",
    fair: "Fair",
    good: "Good",
    strong: "Strong",
  }[level];

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Password strength</span>
        <span className={cn("text-xs font-medium", labelClass)}>{labelText}</span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", colorClass)}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <AnimatePresence>
        {showRequirements && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-1 mt-2"
          >
            {requirements.map((req, index) => {
              const passed = req.validator(password);
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-2 text-xs"
                >
                  {passed ? (
                    <Check className="w-3 h-3 text-success" />
                  ) : (
                    <X className="w-3 h-3 text-muted-foreground" />
                  )}
                  <span className={passed ? "text-success" : "text-muted-foreground"}>
                    {req.label}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PasswordStrengthMeter;
