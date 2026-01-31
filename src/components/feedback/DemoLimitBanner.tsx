import { AlertTriangle, Mail, Sparkles } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface DemoLimitBannerProps {
  supportEmail: string;
  applicationCount: number;
  demoLimit: number;
}

const DemoLimitBanner = ({ supportEmail, applicationCount, demoLimit }: DemoLimitBannerProps) => {
  const handleContactSupport = () => {
    const subject = encodeURIComponent("Request Full Access - TailoredApply");
    const body = encodeURIComponent(
      `Hi,\n\nI've been using TailoredApply to find my perfect job fit and have completed ${demoLimit} applications. I'd love to continue using the platform with full access.\n\nThank you!`
    );
    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle className="text-lg">You've Found Great Fits!</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">
          You've used all {demoLimit} free applications ({applicationCount} created) to find your perfect fit. 
          Ready to unlock unlimited access and keep discovering ideal job matches?
        </p>
        <Button 
          onClick={handleContactSupport}
          variant="outline"
          className="bg-background hover:bg-background/80"
        >
          <Mail className="w-4 h-4 mr-2" />
          Get Full Access
        </Button>
        <div className="flex items-center gap-2 text-xs mt-3 opacity-80">
          <Sparkles className="w-3 h-3" />
          <span>Early adopters get discounted pricing!</span>
        </div>
        <p className="text-xs mt-1 opacity-70">
          Contact: {supportEmail}
        </p>
      </AlertDescription>
    </Alert>
  );
};

export default DemoLimitBanner;
