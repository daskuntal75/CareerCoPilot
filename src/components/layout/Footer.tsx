import { Link } from "react-router-dom";
import { Rocket, Shield, Cookie, Accessibility } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-secondary/30 border-t border-border py-12">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
                <Rocket className="w-5 h-5 text-accent-foreground" />
              </div>
              <span className="font-bold text-lg text-foreground">TailoredApply</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm">
              AI-powered job application assistant for senior tech professionals. 
              Generate tailored, truthful materials that get callbacks.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Product</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link to="/app" className="text-muted-foreground hover:text-foreground transition-colors">
                  Get Started
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                  <Cookie className="w-3 h-3" />
                  Cookie Policy
                </Link>
              </li>
              <li>
                <Link to="/accessibility" className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                  <Accessibility className="w-3 h-3" />
                  Accessibility
                </Link>
              </li>
              <li>
                <Link to="/admin/login" className="text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Admin
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © 2026 TailoredApply. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Built with authenticity in mind.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
