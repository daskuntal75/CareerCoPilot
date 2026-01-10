import { motion } from "framer-motion";
import { Upload, FileSearch, FileText, CheckCircle } from "lucide-react";

const steps = [
  {
    icon: Upload,
    title: "Upload Resume",
    description: "Drop your PDF or DOCX resume. We parse and understand your complete experience.",
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    icon: FileSearch,
    title: "Paste Job Description",
    description: "Add the target job posting. Our AI extracts the top 10 requirements.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: FileText,
    title: "Generate Materials",
    description: "Get a tailored cover letter, fit analysis, and interview prep—all grounded in your real experience.",
    color: "text-success",
    bg: "bg-success/10",
  },
  {
    icon: CheckCircle,
    title: "Review & Apply",
    description: "Edit, refine, and export. You're always in control before submitting.",
    color: "text-warning",
    bg: "bg-warning/10",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-20 lg:py-32 bg-secondary/30">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            From Resume to Ready in Minutes
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            A simple workflow designed for busy professionals who value their time.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="relative"
            >
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[60%] w-[calc(100%-20%)] h-0.5 bg-border" />
              )}
              
              <div className="bg-card rounded-xl p-6 border border-border shadow-sm hover:shadow-md transition-shadow h-full">
                {/* Step number */}
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl ${step.bg} flex items-center justify-center`}>
                    <step.icon className={`w-6 h-6 ${step.color}`} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Step {index + 1}
                  </span>
                </div>
                
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
