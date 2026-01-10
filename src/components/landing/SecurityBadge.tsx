import { motion } from "framer-motion";
import { Shield, Lock, Eye, Server, CheckCircle2 } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SecurityBadgeProps {
  variant?: "compact" | "full";
  className?: string;
}

const securityFeatures = [
  {
    icon: Lock,
    title: "End-to-End Encryption",
    description: "AES-256 encryption for all data at rest and in transit",
  },
  {
    icon: Eye,
    title: "Zero-Retention AI",
    description: "AI models never store or train on your personal data",
  },
  {
    icon: Shield,
    title: "PII Redaction",
    description: "Sensitive info automatically redacted before processing",
  },
  {
    icon: Server,
    title: "GDPR/CCPA Compliant",
    description: "Full data portability and right to erasure support",
  },
];

const SecurityBadge = ({ variant = "compact", className = "" }: SecurityBadgeProps) => {
  if (variant === "compact") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 border border-success/20 text-success text-xs font-medium cursor-help ${className}`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Enterprise-Grade Security</span>
            </motion.div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs p-4">
            <div className="space-y-3">
              <p className="font-medium text-sm">Your data is protected by:</p>
              <ul className="space-y-2">
                {securityFeatures.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-success mt-0.5 flex-shrink-0" />
                    <span>{feature.title}</span>
                  </li>
                ))}
              </ul>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-xl bg-gradient-to-br from-success/5 to-success/10 border border-success/20 ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-5 h-5 text-success" />
        <h4 className="font-semibold text-sm text-foreground">Enterprise-Grade Privacy</h4>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {securityFeatures.map((feature, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-2"
          >
            <feature.icon className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">{feature.title}</p>
              <p className="text-xs text-muted-foreground">{feature.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default SecurityBadge;
