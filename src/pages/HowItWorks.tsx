import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { FileText, Search, Sparkles, MessageSquare, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const steps = [
  {
    icon: FileText,
    title: "Upload Your Resume",
    description: "Upload your detailed resume once. Our AI analyzes and chunks it for optimal matching against any job description.",
  },
  {
    icon: Search,
    title: "Paste Job Description",
    description: "Copy any job posting. Our AI extracts requirements and matches them against your verified experience—no fabrication.",
  },
  {
    icon: Sparkles,
    title: "Get Your Cover Letter",
    description: "Receive a tailored cover letter highlighting your genuine qualifications. Edit, regenerate sections, or export as PDF/DOCX.",
  },
  {
    icon: MessageSquare,
    title: "Prepare for Interview",
    description: "Get predicted interview questions with STAR-formatted answers, company research, and strategic talking points.",
  },
];

const HowItWorks = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto mb-16"
          >
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              How TailoredApply Works
            </h1>
            <p className="text-xl text-muted-foreground">
              From resume to interview-ready in under 5 minutes. Here's how our AI helps you stand out.
            </p>
          </motion.div>

          <div className="max-w-4xl mx-auto">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.15 }}
                className="relative flex items-start gap-6 mb-12 last:mb-0"
              >
                {/* Step number and icon */}
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center relative">
                    <step.icon className="w-7 h-7 text-accent" />
                    <span className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center">
                      {index + 1}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="absolute left-8 top-20 h-12 w-0.5 bg-border" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 pt-2">
                  <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-center mt-16"
          >
            <div className="bg-accent/5 border border-accent/20 rounded-2xl p-8 max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Ready to Get Started?
              </h2>
              <p className="text-muted-foreground mb-6">
                Join thousands of job seekers who've increased their callback rate by 25%+
              </p>
              <Link to="/app">
                <Button variant="hero" size="lg">
                  Try TailoredApply Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HowItWorks;
