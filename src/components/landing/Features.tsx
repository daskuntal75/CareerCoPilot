import { motion } from "framer-motion";
import { 
  Shield, 
  Target, 
  Clock, 
  Eye, 
  Sparkles, 
  Download 
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
    title: "Senior-Role Aware",
    description: "Optimized for Director, VP, and Principal narratives—not entry-level templates.",
  },
  {
    icon: Download,
    title: "ATS-Friendly Export",
    description: "Download in PDF, DOCX, or plain text. Formatted to pass automated screening.",
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
            Built for Senior Professionals
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Features designed for Directors, VPs, and Principal-level candidates who need precision, not fluff.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      </div>
    </section>
  );
};

export default Features;
