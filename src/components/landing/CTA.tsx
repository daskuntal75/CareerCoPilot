import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-20 lg:py-32 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Become an Early Adopter
          </h2>
          <p className="text-lg opacity-80 mb-4">
            Sign up now to try our demo and help shape the future of job applications.
          </p>
          <p className="text-base opacity-90 mb-8 font-medium">
            🎁 Early adopters who provide feedback get discounted pricing when we launch!
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth?mode=signup">
              <Button 
                size="xl" 
                className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg hover:shadow-xl transition-all group"
              >
                Join Early Access
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </div>
          
          <p className="text-sm opacity-60 mt-6">
            No credit card required. Try 3 applications free in demo mode.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
