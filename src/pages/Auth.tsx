import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Lock, User, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { useAnalytics } from "@/hooks/useAnalytics";
import { PasswordStrengthMeter, isPasswordStrong } from "@/components/auth/PasswordStrengthMeter";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

// Input validation schemas
const emailSchema = z.string().trim().email("Invalid email address").max(255, "Email too long");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(128, "Password too long");
const nameSchema = z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name too long");

// Rate limiting
const RATE_LIMIT_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW = 60000; // 1 minute

type AuthMode = "login" | "signup" | "forgot-password" | "reset";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") as AuthMode || "login";
  
  const [mode, setMode] = useState<AuthMode>(initialMode === "reset" ? "reset" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; name?: string }>({});
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { trackAuthEvent, trackPageView } = useAnalytics();
  
  // Rate limiting state
  const attemptCountRef = useRef(0);
  const lastAttemptTimeRef = useRef(0);
  const [rateLimited, setRateLimited] = useState(false);
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);

  // Track page view and redirect if already logged in
  useEffect(() => {
    trackPageView("auth", { mode });
    if (user && mode !== "reset") {
      navigate("/dashboard");
    }
  }, [user, navigate, mode]);

  // Check for reset mode from URL
  useEffect(() => {
    const urlMode = searchParams.get("mode");
    if (urlMode === "reset") {
      setMode("reset");
    }
  }, [searchParams]);

  // Rate limit countdown
  useEffect(() => {
    if (rateLimitCountdown > 0) {
      const timer = setTimeout(() => setRateLimitCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (rateLimited) {
      setRateLimited(false);
      attemptCountRef.current = 0;
    }
  }, [rateLimitCountdown, rateLimited]);

  const checkRateLimit = (): boolean => {
    const now = Date.now();
    if (now - lastAttemptTimeRef.current > RATE_LIMIT_WINDOW) {
      attemptCountRef.current = 0;
    }
    
    attemptCountRef.current++;
    lastAttemptTimeRef.current = now;
    
    if (attemptCountRef.current > RATE_LIMIT_ATTEMPTS) {
      setRateLimited(true);
      setRateLimitCountdown(60);
      toast.error("Too many attempts. Please wait 60 seconds.");
      return false;
    }
    return true;
  };

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};
    
    try {
      emailSchema.parse(email);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.email = e.errors[0].message;
      }
    }
    
    try {
      passwordSchema.parse(password);
    } catch (e) {
      if (e instanceof z.ZodError) {
        newErrors.password = e.errors[0].message;
      }
    }
    
    if (mode === "signup") {
      try {
        nameSchema.parse(fullName);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.name = e.errors[0].message;
        }
      }
      
      // Enforce password strength on signup
      if (!isPasswordStrong(password)) {
        newErrors.password = "Please create a stronger password";
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (!checkRateLimit()) return;
    
    setLoading(true);

    try {
      if (mode === "login") {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          // Don't reveal if email exists or not
          toast.error("Invalid email or password");
          trackAuthEvent("login_failed");
        } else {
          toast.success("Welcome back!");
          trackAuthEvent("login_success");
          navigate("/dashboard");
        }
      } else if (mode === "signup") {
        const { error } = await signUp(email.trim(), password, fullName.trim());
        if (error) {
          toast.error(error.message);
          trackAuthEvent("signup_failed", { error: error.message });
        } else {
          toast.success("Account created! You can now sign in.");
          trackAuthEvent("signup_success");
          navigate("/dashboard");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const renderContent = () => {
    if (mode === "forgot-password") {
      return <ForgotPasswordForm onBack={() => setMode("login")} />;
    }

    if (mode === "reset") {
      return <ResetPasswordForm />;
    }

    const isLogin = mode === "login";

    return (
      <>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {isLogin ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-muted-foreground">
            {isLogin 
              ? "Sign in to access your applications" 
              : "Get started with CareerCopilot AI"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {rateLimited && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Too many attempts. Please wait {rateLimitCountdown}s</span>
            </div>
          )}
          
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setErrors(prev => ({ ...prev, name: undefined }));
                  }}
                  placeholder="John Doe"
                  className={`pl-10 ${errors.name ? "border-destructive" : ""}`}
                  required={!isLogin}
                  autoComplete="name"
                  maxLength={100}
                />
              </div>
              {errors.name && (
                <p className="text-xs text-destructive">{errors.name}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors(prev => ({ ...prev, email: undefined }));
                }}
                placeholder="you@example.com"
                className={`pl-10 ${errors.email ? "border-destructive" : ""}`}
                required
                autoComplete="email"
                maxLength={255}
              />
            </div>
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {isLogin && (
                <button
                  type="button"
                  onClick={() => setMode("forgot-password")}
                  className="text-xs text-accent hover:text-accent/80 transition-colors"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors(prev => ({ ...prev, password: undefined }));
                }}
                placeholder="••••••••"
                className={`pl-10 pr-10 ${errors.password ? "border-destructive" : ""}`}
                required
                autoComplete={isLogin ? "current-password" : "new-password"}
                minLength={8}
                maxLength={128}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password}</p>
            )}
            {!isLogin && <PasswordStrengthMeter password={password} />}
          </div>

          <Button 
            type="submit" 
            variant="hero" 
            className="w-full" 
            disabled={loading || rateLimited}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
            ) : (
              isLogin ? "Sign In" : "Create Account"
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setMode(isLogin ? "signup" : "login");
              setErrors({});
            }}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isLogin 
              ? "Don't have an account? Sign up" 
              : "Already have an account? Sign in"}
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Link 
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          {renderContent()}
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
