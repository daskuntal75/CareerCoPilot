import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Zap, Crown, Building2, Loader2, TestTube } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { STRIPE_PLANS } from "@/lib/stripe-config";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import SEOHead from "@/components/seo/SEOHead";

const Pricing = () => {
  const [isAnnual, setIsAnnual] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const { user, subscription } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    checkSettings();
  }, []);

  const checkSettings = async () => {
    try {
      const { data } = await supabase.functions.invoke("check-demo-mode");
      if (data) {
        setDemoMode(data.demo_mode ?? false);
        setStripeEnabled(data.stripe_enabled ?? false);
      }
    } catch (error) {
      console.error("Error checking settings:", error);
    }
  };

  const handleSubscribe = async (priceId: string, planName: string) => {
    // If Stripe is not enabled, show demo message
    if (!stripeEnabled) {
      toast.info("Payments are not yet enabled. Enjoy Pro features in demo mode!");
      navigate(user ? "/app" : "/auth");
      return;
    }

    if (!user) {
      toast.info("Please sign in to subscribe");
      navigate("/auth");
      return;
    }

    setLoadingPlan(planName);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId },
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Failed to start checkout. Please try again.");
    } finally {
      setLoadingPlan(null);
    }
  };

  const plans = [
    {
      name: "Free",
      icon: Zap,
      monthlyPrice: 0,
      annualPrice: 0,
      period: "forever",
      description: "Trial for conversion; captures email for nurture",
      features: [
        "3 cover letters per month",
        "Basic fit score analysis",
        "PDF export",
        "Job description parsing",
      ],
      notIncluded: [
        "Interview prep",
        "STAR guides",
        "Version history",
      ],
      cta: "Get Started Free",
      ctaAction: () => navigate(user ? "/app" : "/auth"),
      highlighted: false,
      priceId: null,
    },
    {
      name: "Pro",
      icon: Sparkles,
      monthlyPrice: 29,
      annualPrice: 199,
      annualSavings: "Save 43%",
      period: isAnnual ? "year" : "month",
      description: "1.4% of monthly value delivered ($2K); < 1 hr saved justifies",
      features: [
        "Unlimited cover letters",
        "Advanced fit mapping",
        "Interview questions",
        "Version history",
        "PDF & DOCX export",
        "Priority support",
      ],
      notIncluded: [
        "Full STAR guides",
        "Tone customization",
        "Priority AI",
      ],
      cta: "Start Pro Trial",
      ctaAction: () => handleSubscribe(
        isAnnual ? STRIPE_PLANS.pro_annual.price_id : STRIPE_PLANS.pro_monthly.price_id,
        "Pro"
      ),
      highlighted: true,
      priceId: isAnnual ? STRIPE_PLANS.pro_annual.price_id : STRIPE_PLANS.pro_monthly.price_id,
    },
    {
      name: "Premium",
      icon: Crown,
      monthlyPrice: 79,
      annualPrice: 599,
      annualSavings: "Save 37%",
      period: isAnnual ? "year" : "month",
      description: "Less than a single coaching session—unlocks unlimited prep",
      features: [
        "Everything in Pro",
        "Full interview prep",
        "STAR answer guides",
        "Tone customization",
        "Priority AI processing",
        "Advanced analytics",
      ],
      notIncluded: [],
      cta: "Go Premium",
      ctaAction: () => handleSubscribe(
        isAnnual ? STRIPE_PLANS.premium_annual.price_id : STRIPE_PLANS.premium_monthly.price_id,
        "Premium"
      ),
      highlighted: false,
      priceId: isAnnual ? STRIPE_PLANS.premium_annual.price_id : STRIPE_PLANS.premium_monthly.price_id,
    },
    {
      name: "Enterprise",
      icon: Building2,
      monthlyPrice: null,
      annualPrice: null,
      period: "custom",
      description: "Outplacement firms, career services; priced per seat",
      features: [
        "Everything in Premium",
        "Team licenses",
        "SSO integration",
        "Admin dashboard",
        "API access",
        "Dedicated support",
        "Custom branding",
      ],
      notIncluded: [],
      cta: "Contact Sales",
      ctaAction: () => window.open("mailto:enterprise@tailoredapply.com?subject=Enterprise Inquiry", "_blank"),
      highlighted: false,
      priceId: null,
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Pricing – AI Cover Letter Generator Plans"
        description="Free, Pro, Premium & Enterprise plans for AI-powered cover letters, job fit scoring, and interview prep. Start free with 3 cover letters per month. 14-day money-back guarantee."
        path="/pricing"
      />
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Demo Mode Banner */}
          {demoMode && !stripeEnabled && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <Alert className="border-amber-500/50 bg-amber-500/10 max-w-2xl mx-auto">
                <TestTube className="h-4 w-4 text-amber-500" />
                <AlertDescription className="text-amber-700 dark:text-amber-300">
                  <strong>Demo Mode Active:</strong> All users currently have access to Pro features for free! 
                  {user ? " Start using the app now." : " Sign up to get started."}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          {/* Current subscription indicator */}
          {user && subscription.subscribed && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <Alert className="border-accent/50 bg-accent/10 max-w-2xl mx-auto">
                <Sparkles className="h-4 w-4 text-accent" />
                <AlertDescription>
                  You're currently on the <strong className="capitalize">{subscription.tier}</strong> plan. 
                  {demoMode ? " (Demo mode)" : ""}
                </AlertDescription>
              </Alert>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto mb-12"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Invest in Your Career
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Choose the plan that matches your job search intensity. All plans include a 14-day money-back guarantee.
            </p>
            
            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4">
              <Label 
                htmlFor="billing-toggle" 
                className={`text-sm font-medium ${!isAnnual ? "text-foreground" : "text-muted-foreground"}`}
              >
                Monthly
              </Label>
              <Switch
                id="billing-toggle"
                checked={isAnnual}
                onCheckedChange={setIsAnnual}
              />
              <Label 
                htmlFor="billing-toggle" 
                className={`text-sm font-medium ${isAnnual ? "text-foreground" : "text-muted-foreground"}`}
              >
                Annual
                <span className="ml-2 text-xs bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                  Save up to 43%
                </span>
              </Label>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {plans.map((plan, index) => {
              const Icon = plan.icon;
              const displayPrice = isAnnual ? plan.annualPrice : plan.monthlyPrice;
              
              return (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`relative rounded-2xl border p-6 flex flex-col ${
                    plan.highlighted
                      ? "border-accent bg-accent/5 shadow-lg shadow-accent/10 scale-105"
                      : "border-border bg-card"
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-accent text-accent-foreground text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        Most Popular
                      </span>
                    </div>
                  )}

                  {isAnnual && plan.annualSavings && (
                    <div className="absolute -top-3 right-4">
                      <span className="bg-green-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                        {plan.annualSavings}
                      </span>
                    </div>
                  )}

                  <div className="text-center mb-6">
                    <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
                      <Icon className="w-6 h-6 text-accent" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">{plan.name}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      {displayPrice !== null ? (
                        <>
                          <span className="text-4xl font-bold text-foreground">${displayPrice}</span>
                          <span className="text-muted-foreground">/{plan.period}</span>
                        </>
                      ) : (
                        <span className="text-2xl font-bold text-foreground">Custom</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{plan.description}</p>
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                    {plan.notIncluded.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm opacity-50">
                        <span className="w-4 h-4 flex-shrink-0 mt-0.5 text-center">—</span>
                        <span className="text-muted-foreground line-through">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={plan.highlighted ? "default" : "outline"}
                    className="w-full"
                    onClick={plan.ctaAction}
                    disabled={loadingPlan === plan.name}
                  >
                    {loadingPlan === plan.name ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      plan.cta
                    )}
                  </Button>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-16 space-y-4"
          >
            <p className="text-muted-foreground">
              All plans include a 14-day money-back guarantee. No questions asked.
            </p>
            <p className="text-sm text-muted-foreground">
              Need help choosing? <Link to="/auth" className="text-accent hover:underline">Contact our team</Link>
            </p>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
