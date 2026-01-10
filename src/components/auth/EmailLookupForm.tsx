import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { ArrowLeft, Search, User, Mail, HelpCircle } from "lucide-react";

interface EmailLookupFormProps {
  onBack: () => void;
}

export function EmailLookupForm({ onBack }: EmailLookupFormProps) {
  const [fullName, setFullName] = useState("");
  const [partialEmail, setPartialEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    // For security, we don't actually reveal if an email exists
    // Instead, we provide helpful hints
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="text-center">
          <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 flex items-center justify-center mb-4">
            <HelpCircle className="w-8 h-8 text-accent" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Try these suggestions</h2>
          <p className="text-muted-foreground text-sm">
            Here are some ways to find your account email:
          </p>
        </div>

        <div className="space-y-3">
          <div className="p-4 bg-muted/50 border border-border rounded-lg">
            <h3 className="font-medium mb-1">Check your email inbox</h3>
            <p className="text-sm text-muted-foreground">
              Search for "CareerCopilot" or "welcome" in your email accounts to find the signup confirmation.
            </p>
          </div>

          <div className="p-4 bg-muted/50 border border-border rounded-lg">
            <h3 className="font-medium mb-1">Try common email addresses</h3>
            <p className="text-sm text-muted-foreground">
              If you have multiple email addresses, try signing in with each one using "Forgot password".
            </p>
          </div>

          <div className="p-4 bg-muted/50 border border-border rounded-lg">
            <h3 className="font-medium mb-1">Check your browser</h3>
            <p className="text-sm text-muted-foreground">
              Your browser may have saved your email. Check the login form's autocomplete suggestions.
            </p>
          </div>

          {partialEmail && (
            <div className="p-4 bg-accent/10 border border-accent/20 rounded-lg">
              <h3 className="font-medium mb-1">Partial email match</h3>
              <p className="text-sm text-muted-foreground">
                Try completing: <strong>{partialEmail}@...</strong> with common providers like gmail.com, outlook.com, etc.
              </p>
            </div>
          )}
        </div>

        <Button onClick={onBack} variant="outline" className="w-full">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to sign in
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 flex items-center justify-center mb-4">
          <Search className="w-8 h-8 text-accent" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-2">Find your account</h2>
        <p className="text-muted-foreground text-sm">
          Enter any information you remember to help locate your account email.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="lookup-name">Full name (as registered)</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="lookup-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="John Doe"
              className="pl-10"
              maxLength={100}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="partial-email">Part of your email (optional)</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="partial-email"
              type="text"
              value={partialEmail}
              onChange={(e) => setPartialEmail(e.target.value)}
              placeholder="john or johnd"
              className="pl-10"
              maxLength={100}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Enter any part of your email you remember (e.g., "john" or "work")
          </p>
        </div>

        <Button type="submit" variant="hero" className="w-full">
          <Search className="w-4 h-4 mr-2" />
          Find account
        </Button>
      </form>

      <button
        type="button"
        onClick={onBack}
        className="flex items-center justify-center gap-2 w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to sign in
      </button>
    </motion.div>
  );
}

export default EmailLookupForm;
