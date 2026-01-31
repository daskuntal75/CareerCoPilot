import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Building2, Scale, Accessibility, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { toast } from "sonner";

type InquiryType = "legal" | "enterprise" | "accessibility" | "general";

interface ContactFormData {
  name: string;
  email: string;
  company: string;
  inquiryType: InquiryType | "";
  subject: string;
  message: string;
}

const Contact = () => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: "",
    email: "",
    company: "",
    inquiryType: "",
    subject: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const inquiryTypes = [
    { value: "legal", label: "Legal Inquiry", icon: Scale, description: "Privacy, GDPR, terms questions" },
    { value: "enterprise", label: "Enterprise Sales", icon: Building2, description: "Custom plans & volume pricing" },
    { value: "accessibility", label: "Accessibility Feedback", icon: Accessibility, description: "Report barriers or suggestions" },
    { value: "general", label: "General Inquiry", icon: Mail, description: "Other questions or feedback" },
  ];

  const handleInputChange = (field: keyof ContactFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.inquiryType || !formData.message) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);

    // Simulate form submission (in production, this would call an edge function)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setIsSubmitted(true);
      toast.success("Your message has been sent successfully!");
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 pt-24 pb-12 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md mx-auto px-4"
          >
            <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-accent" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Message Sent Successfully
            </h1>
            <p className="text-muted-foreground mb-6">
              Thank you for reaching out. We'll review your inquiry and respond within 2-3 business days.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={() => setIsSubmitted(false)}>
                Send Another Message
              </Button>
              <Button asChild>
                <Link to="/">Return Home</Link>
              </Button>
            </div>
          </motion.div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          {/* Back link */}
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-accent/10 rounded-xl flex items-center justify-center">
                <Mail className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Contact Us</h1>
                <p className="text-muted-foreground">
                  We're here to help with any questions or concerns
                </p>
              </div>
            </div>
          </motion.div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Inquiry Type Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="lg:col-span-1 space-y-4"
            >
              <h2 className="font-semibold text-foreground mb-4">How can we help?</h2>
              {inquiryTypes.map((type) => (
                <Card
                  key={type.value}
                  className={`cursor-pointer transition-all duration-200 ${
                    formData.inquiryType === type.value
                      ? "border-accent bg-accent/5"
                      : "hover:border-accent/50"
                  }`}
                  onClick={() => handleInputChange("inquiryType", type.value)}
                >
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${
                      formData.inquiryType === type.value ? "bg-accent/20" : "bg-muted"
                    }`}>
                      <type.icon className={`w-5 h-5 ${
                        formData.inquiryType === type.value ? "text-accent" : "text-muted-foreground"
                      }`} />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{type.label}</h3>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="lg:col-span-2"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Send a Message</CardTitle>
                  <CardDescription>
                    Fill out the form below and we'll get back to you within 2-3 business days.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name *</Label>
                        <Input
                          id="name"
                          placeholder="John Smith"
                          value={formData.name}
                          onChange={(e) => handleInputChange("name", e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@company.com"
                          value={formData.email}
                          onChange={(e) => handleInputChange("email", e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="company">Company (Optional)</Label>
                        <Input
                          id="company"
                          placeholder="Your company name"
                          value={formData.company}
                          onChange={(e) => handleInputChange("company", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="inquiryType">Inquiry Type *</Label>
                        <Select
                          value={formData.inquiryType}
                          onValueChange={(value) => handleInputChange("inquiryType", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {inquiryTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject">Subject</Label>
                      <Input
                        id="subject"
                        placeholder="Brief summary of your inquiry"
                        value={formData.subject}
                        onChange={(e) => handleInputChange("subject", e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message *</Label>
                      <Textarea
                        id="message"
                        placeholder="Please describe your inquiry in detail..."
                        rows={6}
                        value={formData.message}
                        onChange={(e) => handleInputChange("message", e.target.value)}
                        required
                      />
                    </div>

                    <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
                      <p>
                        By submitting this form, you agree to our{" "}
                        <Link to="/privacy" className="text-accent hover:underline">
                          Privacy Policy
                        </Link>
                        . We'll only use your information to respond to your inquiry.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Direct Contact Info */}
              <Card className="mt-6">
                <CardContent className="p-6">
                  <h3 className="font-semibold text-foreground mb-4">Other Ways to Reach Us</h3>
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-foreground">Legal Inquiries</p>
                      <p className="text-muted-foreground">legal@tailoredapply.com</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Enterprise Sales</p>
                      <p className="text-muted-foreground">enterprise@tailoredapply.com</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Accessibility Support</p>
                      <p className="text-muted-foreground">accessibility@tailoredapply.com</p>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">General Support</p>
                      <p className="text-muted-foreground">support@tailoredapply.com</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
