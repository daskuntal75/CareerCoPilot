import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  CheckCircle2, 
  Sparkles, 
  FileText, 
  MessageSquare, 
  Clock, 
  ArrowRight,
  Crown,
  Rocket
} from "lucide-react";

// Simple confetti component
const Confetti = () => {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    delay: number;
    color: string;
    size: number;
  }>>([]);

  useEffect(() => {
    const colors = [
      "hsl(var(--accent))",
      "hsl(var(--primary))",
      "#FFD700",
      "#FF6B6B",
      "#4ECDC4",
      "#45B7D1",
    ];

    const newParticles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 2,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 8 + 4,
    }));

    setParticles(newParticles);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          initial={{ y: -20, x: `${particle.x}vw`, opacity: 1, rotate: 0 }}
          animate={{ 
            y: "110vh", 
            opacity: [1, 1, 0],
            rotate: 360 * (Math.random() > 0.5 ? 1 : -1)
          }}
          transition={{ 
            duration: 3 + Math.random() * 2,
            delay: particle.delay,
            ease: "linear"
          }}
          style={{
            position: "absolute",
            width: particle.size,
            height: particle.size,
            backgroundColor: particle.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
          }}
        />
      ))}
    </div>
  );
};

const SubscriptionSuccess = () => {
  const { subscription, refreshSubscription } = useAuth();
  const navigate = useNavigate();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    // Refresh subscription status
    refreshSubscription();

    // Hide confetti after 5 seconds
    const timer = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timer);
  }, [refreshSubscription]);

  const nextSteps = [
    {
      icon: FileText,
      title: "Create Unlimited Cover Letters",
      description: "Generate tailored cover letters for any job posting",
      link: "/app",
      cta: "Start Now",
    },
    {
      icon: MessageSquare,
      title: "Prepare for Interviews",
      description: "Get AI-powered interview questions and STAR frameworks",
      link: "/app",
      cta: "Practice",
    },
    {
      icon: Clock,
      title: "Track Your Applications",
      description: "Monitor all your job applications in one place",
      link: "/dashboard",
      cta: "View Dashboard",
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {showConfetti && <Confetti />}
      <Header />
      
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          {/* Success Header */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl md:text-5xl font-bold text-foreground mb-4"
            >
              Welcome to {subscription.tier === "premium" ? "Premium" : "Pro"}! 🎉
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="text-xl text-muted-foreground max-w-2xl mx-auto"
            >
              Your subscription is now active. You have full access to all 
              {subscription.tier === "premium" ? " premium" : " pro"} features.
            </motion.p>
          </motion.div>

          {/* Subscription Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex justify-center mb-12"
          >
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-gradient-to-r from-accent/20 to-primary/20 border border-accent/30">
              {subscription.tier === "premium" ? (
                <Crown className="w-5 h-5 text-yellow-500" />
              ) : (
                <Sparkles className="w-5 h-5 text-accent" />
              )}
              <span className="font-semibold capitalize">{subscription.tier} Member</span>
              {subscription.subscription_end && (
                <span className="text-sm text-muted-foreground">
                  · Renews {new Date(subscription.subscription_end).toLocaleDateString()}
                </span>
              )}
            </div>
          </motion.div>

          {/* Next Steps */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="mb-12"
          >
            <h2 className="text-2xl font-bold text-center mb-8">What's Next?</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {nextSteps.map((step, index) => {
                const Icon = step.icon;
                return (
                  <motion.div
                    key={step.title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 + index * 0.1 }}
                  >
                    <Card className="h-full hover:border-accent/50 transition-colors">
                      <CardContent className="p-6 flex flex-col h-full">
                        <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                          <Icon className="w-6 h-6 text-accent" />
                        </div>
                        <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                        <p className="text-sm text-muted-foreground mb-4 flex-1">
                          {step.description}
                        </p>
                        <Button asChild variant="outline" size="sm" className="w-full">
                          <Link to={step.link}>
                            {step.cta}
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
            className="text-center"
          >
            <Button size="lg" asChild className="px-8">
              <Link to="/app">
                <Rocket className="w-5 h-5 mr-2" />
                Start Creating
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              Need help? Visit our{" "}
              <Link to="/settings" className="text-accent hover:underline">
                settings
              </Link>{" "}
              to manage your subscription.
            </p>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default SubscriptionSuccess;
