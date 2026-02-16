import { motion } from "framer-motion";
import { 
  Shield, 
  Target, 
  Clock, 
  Eye, 
  Sparkles, 
  Download,
  Lock,
  Server
} from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Zero Hallucinations",
    description: "Every claim traced back to your resume. We show gaps honestly—never fabricate experience.",
  },
  {
    icon: Target,
    title: "Semantic Matching",
    description: "AI understands context, not just keywords. Your 'led cross-functional teams' matches their 'collaboration'.",
  },
  {
    icon: Clock,
    title: "5 Minutes, Not 60",
    description: "What used to take an hour now takes minutes. Apply to more high-fit roles, faster.",
  },
  {
    icon: Eye,
    title: "Human in the Loop",
    description: "Review, edit, and approve everything before export. You're always in control.",
  },
  {
    icon: Sparkles,
    title: "Every Level, Every Role",
    description: "Adapts to your career stage—whether you're landing your first role or your next leadership position.",
  },
  {
    icon: Download,
    title: "ATS-Friendly Export",
    description: "Download in PDF, DOCX, or plain text. Formatted to pass automated screening.",
  },
];

const securityFeatures = [
  {
    icon: Lock,
    title: "Data Encryption",
    description: "Your resume and career data are encrypted at every stage—at rest and in transit.",
  },
  {
    icon: Eye,
    title: "AI That Forgets",
    description: "AI processes your data in real time but never stores or learns from it.",
  },
  {
    icon: Shield,
    title: "Privacy by Design",
    description: "Personal information is automatically protected before any processing occurs.",
  },
  {
    icon: Server,
    title: "You Own Your Data",
    description: "Export or permanently delete all your data at any time with one click.",
  },
];

const Features = () => {
  return (
    <section className="py-20 lg:py-32">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
         <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Built for Every Job Seeker
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features for anyone who wants precision-crafted applications—from first job to C-suite.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group p-6 rounded-xl border border-border bg-card hover:border-accent/30 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-4 group-hover:bg-accent/10 transition-colors">
                <feature.icon className="w-6 h-6 text-muted-foreground group-hover:text-accent transition-colors" />
              </div>
              
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Security Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/20 text-success mb-6">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">Enterprise-Grade Security</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Your Privacy, Our Priority
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We built TailoredApply with privacy at its core. Your career data is protected with industry-leading security practices so you can focus on landing your next role.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {securityFeatures.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group p-6 rounded-xl border border-success/20 bg-success/5 hover:border-success/40 hover:shadow-lg transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-success" />
              </div>
              
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
