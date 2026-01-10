import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Lock, Loader2, Eye, EyeOff, CheckCircle } from "lucide-react";
import { PasswordStrengthMeter, isPasswordStrong } from "./PasswordStrengthMeter";
import { z } from "zod";

const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(128, "Password too long");

interface ChangePasswordFormProps {
  onSuccess?: () => void;
}

export function ChangePasswordForm({ onSuccess }: ChangePasswordFormProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<{ current?: string; new?: string; confirm?: string }>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    if (!currentPassword) {
      newErrors.current = "Current password is required";
    }

    try {
      passwordSchema.parse(newPassword);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.new = e.errors[0].message;
      }
    }

    if (!isPasswordStrong(newPassword)) {
      newErrors.new = "Please create a stronger password";
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirm = "Passwords do not match";
    }

    if (currentPassword === newPassword) {
      newErrors.new = "New password must be different from current password";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      // First verify the current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        toast.error("Unable to verify current user");
        return;
      }

      // Try to reauthenticate with current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        setErrors({ current: "Current password is incorrect" });
        return;
      }

      // Now update to the new password
      const { error } = await supabase.auth.updateUser({ password: newPassword });

      if (error) {
        toast.error(error.message);
        return;
      }

      setSuccess(true);
      toast.success("Password changed successfully!");
      
      // Reset form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      if (onSuccess) {
        setTimeout(onSuccess, 1500);
      }
    } catch (err) {
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-4"
      >
        <div className="w-12 h-12 mx-auto rounded-full bg-success/10 flex items-center justify-center mb-3">
          <CheckCircle className="w-6 h-6 text-success" />
        </div>
        <p className="text-sm text-success font-medium">Password changed successfully!</p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="current-password">Current password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="current-password"
            type={showPasswords ? "text" : "password"}
            value={currentPassword}
            onChange={(e) => {
              setCurrentPassword(e.target.value);
              setErrors((prev) => ({ ...prev, current: undefined }));
            }}
            placeholder="••••••••"
            className={`pl-10 pr-10 ${errors.current ? "border-destructive" : ""}`}
            required
            autoComplete="current-password"
            maxLength={128}
          />
          <button
            type="button"
            onClick={() => setShowPasswords(!showPasswords)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {errors.current && <p className="text-xs text-destructive">{errors.current}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="new-password-change">New password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="new-password-change"
            type={showPasswords ? "text" : "password"}
            value={newPassword}
            onChange={(e) => {
              setNewPassword(e.target.value);
              setErrors((prev) => ({ ...prev, new: undefined }));
            }}
            placeholder="••••••••"
            className={`pl-10 ${errors.new ? "border-destructive" : ""}`}
            required
            autoComplete="new-password"
            maxLength={128}
          />
        </div>
        {errors.new && <p className="text-xs text-destructive">{errors.new}</p>}
        <PasswordStrengthMeter password={newPassword} showRequirements={newPassword.length > 0} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password-change">Confirm new password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="confirm-password-change"
            type={showPasswords ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setErrors((prev) => ({ ...prev, confirm: undefined }));
            }}
            placeholder="••••••••"
            className={`pl-10 ${errors.confirm ? "border-destructive" : ""}`}
            required
            autoComplete="new-password"
            maxLength={128}
          />
        </div>
        {errors.confirm && <p className="text-xs text-destructive">{errors.confirm}</p>}
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Change password"}
      </Button>
    </form>
  );
}

export default ChangePasswordForm;
