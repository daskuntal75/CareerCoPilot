import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, Mail, Lock, User, AlertCircle, Eye, EyeOff, Building, MapPin, Target, Sparkles, ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";
import { z } from "zod";
import { useAnalytics } from "@/hooks/useAnalytics";
import { PasswordStrengthMeter, isPasswordStrong } from "@/components/auth/PasswordStrengthMeter";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { TwoFactorVerify } from "@/components/auth/TwoFactorVerify";
import { BiometricLogin } from "@/components/auth/BiometricLogin";
import { EmailLookupForm } from "@/components/auth/EmailLookupForm";
import { PasswordBreachWarning } from "@/components/auth/PasswordBreachWarning";
import { NewDeviceVerification } from "@/components/auth/NewDeviceVerification";
import { supabase } from "@/integrations/supabase/client";
import { useRateLimiter } from "@/hooks/useRateLimiter";
import { useDeviceFingerprint } from "@/hooks/useDeviceFingerprint";
import { usePasswordBreachCheck } from "@/hooks/usePasswordBreachCheck";

// Input validation schemas
const emailSchema = z.string().trim().email("Invalid email address").max(255, "Email too long");
const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(128, "Password too long");
const nameSchema = z.string().trim().min(1, "Required").max(100, "Too long");
const purposeSchema = z.string().trim().min(10, "Please describe your purpose (min 10 characters)").max(500, "Purpose too long");
const companySchema = z.string().trim().min(1, "Company is required").max(100, "Company name too long");
const zipCodeSchema = z.string().trim().min(3, "Invalid zip code").max(20, "Zip code too long");

type AuthMode = "login" | "signup" | "forgot-password" | "reset" | "2fa" | "find-email" | "device-verification";

const Auth = () => {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") as AuthMode || "login";
  
  const [mode, setMode] = useState<AuthMode>(initialMode === "reset" ? "reset" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [company, setCompany] = useState("");
  const [zipCode, setZipCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ 
    email?: string; 
    password?: string; 
    firstName?: string;
    lastName?: string;
    purpose?: string;
    company?: string;
    zipCode?: string;
  }>({});
  const [pendingMfa, setPendingMfa] = useState(false);
  const [pendingDeviceVerification, setPendingDeviceVerification] = useState(false);
  const [breachWarning, setBreachWarning] = useState<{ isBreached: boolean; occurrences: number }>({ isBreached: false, occurrences: 0 });
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const { trackAuthEvent, trackPageView } = useAnalytics();
  
  // Device fingerprinting
  const { fingerprint, markAsTrusted, isTrusted, deviceInfo } = useDeviceFingerprint();
  
  // Password breach checking
  const { checkPassword, checking: checkingBreach } = usePasswordBreachCheck();
  
  // Enhanced rate limiting with exponential backoff
  const rateLimiter = useRateLimiter({
    maxAttempts: 5,
    windowMs: 60000, // 1 minute window
    lockoutMs: 60000, // 1 minute base lockout
    enableExponentialBackoff: true, // Doubles lockout each time
  });

  // Track page view and redirect if already logged in and verified
  useEffect(() => {
    trackPageView("auth", { mode });
    if (user && mode !== "reset" && mode !== "2fa") {
      // Check if email is confirmed
      if (user.email_confirmed_at) {
        navigate("/dashboard");
      }
    }
  }, [user, navigate, mode]);

  // Check for reset mode from URL
  useEffect(() => {
    const urlMode = searchParams.get("mode");
    if (urlMode === "reset") {
      setMode("reset");
    }
  }, [searchParams]);

  // Check rate limit on form submit
  const checkRateLimit = (): boolean => {
    if (rateLimiter.isLocked) {
      toast.error(rateLimiter.getLockoutMessage());
      return false;
    }
    
    if (!rateLimiter.checkLimit()) {
      toast.error(rateLimiter.getLockoutMessage());
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
        nameSchema.parse(firstName);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.firstName = e.errors[0].message;
        }
      }
      
      try {
        nameSchema.parse(lastName);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.lastName = e.errors[0].message;
        }
      }
      
      try {
        purposeSchema.parse(purpose);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.purpose = e.errors[0].message;
        }
      }
      
      try {
        companySchema.parse(company);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.company = e.errors[0].message;
        }
      }
      
      try {
        zipCodeSchema.parse(zipCode);
      } catch (e) {
        if (e instanceof z.ZodError) {
          newErrors.zipCode = e.errors[0].message;
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

  const checkMfaRequired = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      if (error) return false;
      
      const verifiedFactor = data?.totp?.find(f => f.status === "verified");
      return !!verifiedFactor;
    } catch {
      return false;
    }
  };

  // Log authentication attempt to backend for IP-based tracking and anomaly detection
  const logAuthAttempt = async (action: "log_failure" | "log_success", userEmail: string, userId?: string) => {
    try {
      await supabase.functions.invoke("auth-rate-limit", {
        body: {
          action,
          email: userEmail,
          userId,
          userAgent: navigator.userAgent,
          deviceFingerprint: fingerprint,
        },
      });
      
      // For successful logins, check for anomalies
      if (action === "log_success" && userId) {
        const { data: anomalyData } = await supabase.functions.invoke("check-login-anomaly", {
          body: {
            userId,
            email: userEmail,
            userAgent: navigator.userAgent,
            deviceFingerprint: fingerprint,
          },
        });
        
        // If anomaly detected but not super high risk, show a warning
        if (anomalyData?.isAnomalous && anomalyData?.riskScore < 70) {
          toast.warning("New login detected from an unfamiliar device or location.", {
            description: anomalyData.riskSummary || "Check your email for details.",
            duration: 8000,
          });
        }
        
        // Mark device as trusted on successful login
        markAsTrusted();
      }
    } catch (error) {
      console.error("Failed to log auth attempt:", error);
    }
  };
  
  // Check password against breach database when password changes
  const handlePasswordChange = async (newPassword: string) => {
    setPassword(newPassword);
    setErrors(prev => ({ ...prev, password: undefined }));
    
    // Only check for breaches during signup
    if (mode === "signup" && newPassword.length >= 8) {
      const result = await checkPassword(newPassword);
      setBreachWarning({ isBreached: result.isBreached, occurrences: result.occurrences });
    }
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
          toast.error("Invalid email or password");
          trackAuthEvent("login_failed");
          
          // Log failed attempt to backend for IP-based rate limiting
          await logAuthAttempt("log_failure", email.trim());
        } else {
          // Success - reset rate limiter
          rateLimiter.resetOnSuccess();
          
          // Log successful login
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          await logAuthAttempt("log_success", email.trim(), currentUser?.id);
          
          // Check if device is trusted
          const deviceIsTrusted = isTrusted || !fingerprint;
          
          // If device is not trusted, require email verification
          if (!deviceIsTrusted && currentUser) {
            try {
              const { error: verifyError } = await supabase.functions.invoke("send-device-verification", {
                body: {
                  email: email.trim(),
                  userId: currentUser.id,
                  deviceFingerprint: fingerprint,
                  userAgent: navigator.userAgent,
                },
              });
              
              if (!verifyError) {
                setMode("device-verification");
                setPendingDeviceVerification(true);
                toast.info("New device detected. Please check your email to verify.");
                return;
              }
            } catch (e) {
              console.error("Device verification error:", e);
              // Continue with login if verification fails
            }
          }
          
          // Check if MFA is required
          const mfaRequired = await checkMfaRequired();
          if (mfaRequired) {
            setMode("2fa");
            setPendingMfa(true);
          } else {
            // Mark device as trusted on successful login
            markAsTrusted();
            toast.success("Welcome back!");
            trackAuthEvent("login_success");
            navigate("/dashboard");
          }
        }
      } else if (mode === "signup") {
        const fullName = `${firstName.trim()} ${lastName.trim()}`;
        const { error } = await signUp(email.trim(), password, fullName);
        if (error) {
          toast.error(error.message);
          trackAuthEvent("signup_failed", { error: error.message });
        } else {
          // Success - reset rate limiter
          rateLimiter.resetOnSuccess();
          
          // Update profile with additional fields
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await supabase.from("profiles").update({
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              purpose: purpose.trim(),
              company: company.trim(),
              zip_code: zipCode.trim(),
              is_early_adopter: true,
            }).eq("user_id", user.id);
          }
          toast.success("Welcome! Check your email to verify your account.");
          trackAuthEvent("signup_success");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerified = () => {
    setPendingMfa(false);
    markAsTrusted(); // Mark device as trusted after successful MFA
    toast.success("Welcome back!");
    trackAuthEvent("login_success", { mfa: true });
    navigate("/dashboard");
  };

  const handleBiometricSuccess = () => {
    navigate("/dashboard");
  };

  const renderContent = () => {
    if (mode === "forgot-password") {
      return <ForgotPasswordForm onBack={() => setMode("login")} />;
    }

    if (mode === "reset") {
      return <ResetPasswordForm />;
    }

    if (mode === "2fa") {
      return (
        <TwoFactorVerify
          onVerified={handleMfaVerified}
          onBack={() => {
            setMode("login");
            setPendingMfa(false);
          }}
        />
      );
    }

    if (mode === "device-verification") {
      return (
        <NewDeviceVerification
          email={email}
          onBack={() => {
            setMode("login");
            setPendingDeviceVerification(false);
          }}
          onResend={async () => {
            try {
              const { data: { user: currentUser } } = await supabase.auth.getUser();
              if (currentUser) {
                await supabase.functions.invoke("send-device-verification", {
                  body: {
                    email: email.trim(),
                    userId: currentUser.id,
                    deviceFingerprint: fingerprint,
                    userAgent: navigator.userAgent,
                  },
                });
                toast.success("Verification email sent!");
              }
            } catch (e) {
              toast.error("Failed to resend verification email");
            }
          }}
        />
      );
    }

    if (mode === "find-email") {
      return <EmailLookupForm onBack={() => setMode("login")} />;
    }

    const isLogin = mode === "login";

    return (
      <>
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {isLogin ? "Welcome back" : "Join as an Early Adopter"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isLogin 
              ? "Sign in to access your applications" 
              : "Try our demo with 3 free applications"}
          </p>
          {!isLogin && (
            <div className="mt-3 flex items-center justify-center gap-2 text-xs text-accent bg-accent/10 px-3 py-2 rounded-full">
              <Sparkles className="w-3 h-3" />
              <span>Early adopters get discounted pricing!</span>
            </div>
          )}
        </div>

        {/* Biometric Login - only show on login mode */}
        {isLogin && (
          <div className="mb-4">
            <BiometricLogin onSuccess={handleBiometricSuccess} mode="login" />
          </div>
        )}

        {isLogin && (
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or continue with email</span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {rateLimiter.isLocked && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              <ShieldAlert className="w-4 h-4 flex-shrink-0" />
              <div className="flex-1">
                <span className="font-medium">Account protection active</span>
                <p className="text-xs mt-0.5">{rateLimiter.getLockoutMessage()}</p>
              </div>
            </div>
          )}
          
          {!rateLimiter.isLocked && rateLimiter.remainingAttempts <= 2 && rateLimiter.remainingAttempts > 0 && (
            <div className="flex items-center gap-2 p-2 bg-warning/10 border border-warning/20 rounded-lg text-xs text-warning">
              <AlertCircle className="w-3 h-3 flex-shrink-0" />
              <span>{rateLimiter.remainingAttempts} attempt{rateLimiter.remainingAttempts !== 1 ? 's' : ''} remaining</span>
            </div>
          )}
          
          {!isLogin && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => {
                        setFirstName(e.target.value);
                        setErrors(prev => ({ ...prev, firstName: undefined }));
                      }}
                      placeholder="John"
                      className={`pl-10 ${errors.firstName ? "border-destructive" : ""}`}
                      required
                      autoComplete="given-name"
                      maxLength={100}
                    />
                  </div>
                  {errors.firstName && (
                    <p className="text-xs text-destructive">{errors.firstName}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => {
                      setLastName(e.target.value);
                      setErrors(prev => ({ ...prev, lastName: undefined }));
                    }}
                    placeholder="Doe"
                    className={`${errors.lastName ? "border-destructive" : ""}`}
                    required
                    autoComplete="family-name"
                    maxLength={100}
                  />
                  {errors.lastName && (
                    <p className="text-xs text-destructive">{errors.lastName}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="company"
                      type="text"
                      value={company}
                      onChange={(e) => {
                        setCompany(e.target.value);
                        setErrors(prev => ({ ...prev, company: undefined }));
                      }}
                      placeholder="Acme Inc."
                      className={`pl-10 ${errors.company ? "border-destructive" : ""}`}
                      required
                      autoComplete="organization"
                      maxLength={100}
                    />
                  </div>
                  {errors.company && (
                    <p className="text-xs text-destructive">{errors.company}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">Zip Code</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="zipCode"
                      type="text"
                      value={zipCode}
                      onChange={(e) => {
                        setZipCode(e.target.value);
                        setErrors(prev => ({ ...prev, zipCode: undefined }));
                      }}
                      placeholder="12345"
                      className={`pl-10 ${errors.zipCode ? "border-destructive" : ""}`}
                      required
                      autoComplete="postal-code"
                      maxLength={20}
                    />
                  </div>
                  {errors.zipCode && (
                    <p className="text-xs text-destructive">{errors.zipCode}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="purpose">What do you want to use TailoredApply for?</Label>
                <div className="relative">
                  <Target className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Textarea
                    id="purpose"
                    value={purpose}
                    onChange={(e) => {
                      setPurpose(e.target.value);
                      setErrors(prev => ({ ...prev, purpose: undefined }));
                    }}
                    placeholder="I'm looking for a new role as a Product Manager and want to create tailored cover letters..."
                    className={`pl-10 min-h-[80px] ${errors.purpose ? "border-destructive" : ""}`}
                    required
                    maxLength={500}
                  />
                </div>
                {errors.purpose && (
                  <p className="text-xs text-destructive">{errors.purpose}</p>
                )}
              </div>
            </>
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
                onChange={(e) => handlePasswordChange(e.target.value)}
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
            {!isLogin && (
              <PasswordBreachWarning 
                checking={checkingBreach} 
                isBreached={breachWarning.isBreached} 
                occurrences={breachWarning.occurrences} 
              />
            )}
          </div>

          <Button 
            type="submit" 
            variant="hero" 
            className="w-full" 
            disabled={loading || rateLimiter.isLocked}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
            ) : (
              isLogin ? "Sign In" : "Create Account"
            )}
          </Button>
        </form>

        <div className="mt-6 space-y-2 text-center">
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

          {isLogin && (
            <div>
              <button
                type="button"
                onClick={() => setMode("find-email")}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Forgot which email you used?
              </button>
            </div>
          )}
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
