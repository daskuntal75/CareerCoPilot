import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Shield, Zap } from "lucide-react";

const Hero = () => {
  return (
    <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-secondary/30 -z-10" />
      
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 opacity-[0.02] -z-10" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
        backgroundSize: '40px 40px'
      }} />

      <div className="container mx-auto px-4 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full text-sm font-medium mb-6"
          >
            <Sparkles className="w-4 h-4" />
            AI-Powered Job Applications
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6"
          >
            Your Skills. Their Job.
            <br />
            <motion.span 
              className="text-accent inline-block"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                duration: 0.6, 
                delay: 0.4,
                type: "spring",
                stiffness: 200
              }}
            >
              Perfect Fit.
            </motion.span>
          </motion.h1>

          {/* Subheadline with extended description */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="text-lg md:text-xl text-foreground/80 max-w-2xl mx-auto mb-4"
          >
            AI-generated cover letters, fit scores & interview guides grounded in your actual experience
          </motion.p>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8"
          >
            Upload your resume, paste a job description, and get a tailored cover letter 
            plus complete interview prep—all in under 5 minutes.
          </motion.p>

          {/* Early Adopter Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="mb-6"
          >
            <div className="inline-flex items-center gap-2 bg-success/10 text-success px-4 py-2 rounded-full text-sm font-medium border border-success/20">
              <Sparkles className="w-4 h-4" />
              Early adopters get discounted pricing when we launch!
            </div>
          </motion.div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
          >
            <Link to="/auth?mode=signup">
              <Button variant="hero" size="xl" className="group shimmer-button glow-button">
                Find Your Perfect Fit
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/how-it-works">
              <Button variant="outline" size="xl">
                See How It Works
              </Button>
            </Link>
          </motion.div>

          {/* Demo limit notice */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.35 }}
            className="text-sm text-muted-foreground mb-8"
          >
            Try 3 free job applications to find your perfect fit. Early feedback unlocks discounted pricing!
          </motion.p>

          {/* Trust indicators */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-success" />
              <span>Your data stays private</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-warning" />
              <span>5 min to polished materials</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent" />
              <span>Enterprise-grade security</span>
            </div>
          </motion.div>
        </div>

        {/* Hero Visual */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-16 max-w-5xl mx-auto"
        >
          <div className="relative rounded-2xl bg-card border border-border shadow-xl overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-secondary/30">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/60" />
                <div className="w-3 h-3 rounded-full bg-warning/60" />
                <div className="w-3 h-3 rounded-full bg-success/60" />
              </div>
              <div className="flex-1 mx-4">
                <div className="h-7 bg-secondary rounded-md flex items-center px-3">
                  <span className="text-xs text-muted-foreground">tailoredapply.com/analyze</span>
                </div>
              </div>
            </div>
            
            {/* App preview */}
            <div className="p-6 lg:p-10 bg-gradient-to-br from-secondary/20 to-secondary/40">
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Left - Analysis Result */}
                <div className="bg-card rounded-xl p-6 shadow-md border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground">Job Fit Analysis</h3>
                    <span className="text-xs text-muted-foreground">Director of Product</span>
                  </div>
                  
                  {/* Fit Score */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="relative w-20 h-20">
                      <svg className="w-20 h-20 -rotate-90">
                        <circle
                          cx="40"
                          cy="40"
                          r="35"
                          stroke="currentColor"
                          strokeWidth="6"
                          fill="none"
                          className="text-secondary"
                        />
                        <circle
                          cx="40"
                          cy="40"
                          r="35"
                          stroke="currentColor"
                          strokeWidth="6"
                          fill="none"
                          strokeDasharray={`${0.78 * 220} 220`}
                          className="text-success"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-foreground">
                        78%
                      </span>
                    </div>
                    <div>
                      <span className="inline-block px-2 py-1 bg-success/10 text-success text-xs font-medium rounded-full">
                        Strong Fit
                      </span>
                      <p className="text-sm text-muted-foreground mt-1">7 of 10 requirements matched</p>
                    </div>
                  </div>

                  {/* Requirements */}
                  <div className="space-y-2">
                    {[
                      { req: "10+ years product leadership", match: true },
                      { req: "Enterprise B2B experience", match: true },
                      { req: "Cross-functional collaboration", match: true },
                      { req: "AI/ML product experience", match: "partial" },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          item.match === true ? 'bg-success' : 
                          item.match === 'partial' ? 'bg-warning' : 'bg-muted'
                        }`} />
                        <span className="text-muted-foreground">{item.req}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right - Cover Letter Preview */}
                <div className="bg-card rounded-xl p-6 shadow-md border border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-foreground">Generated Cover Letter</h3>
                    <span className="px-2 py-1 bg-accent/10 text-accent text-xs font-medium rounded-full">
                      AI Generated
                    </span>
                  </div>
                  
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p className="leading-relaxed">
                      Dear Hiring Manager,
                    </p>
                    <p className="leading-relaxed">
                      When I led the product strategy for Splunk's hybrid cloud platform, 
                      I reduced customer onboarding from 2 days to under 2 hours...
                    </p>
                    <p className="leading-relaxed opacity-60">
                      [Your experience mapped to job requirements...]
                    </p>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <Button size="sm" variant="accent">Download PDF</Button>
                    <Button size="sm" variant="outline">Edit</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
