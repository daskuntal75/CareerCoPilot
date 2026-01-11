import { AlertTriangle, Mail } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

interface DemoLimitBannerProps {
  supportEmail: string;
  applicationCount: number;
  demoLimit: number;
}

const DemoLimitBanner = ({ supportEmail, applicationCount, demoLimit }: DemoLimitBannerProps) => {
  const handleContactSupport = () => {
    const subject = encodeURIComponent("Request to Enable Full Access - TailoredApply");
    const body = encodeURIComponent(
      `Hi,\n\nI've been using TailoredApply in demo mode and have reached the ${demoLimit} application limit. I would like to request full access to continue using the platform.\n\nThank you!`
    );
    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <Alert variant="destructive" className="mb-6">
      <AlertTriangle className="h-5 w-5" />
      <AlertTitle className="text-lg">Demo Limit Reached</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">
          You've used all {demoLimit} demo job applications ({applicationCount} created). 
          To continue using TailoredApply with unlimited access, please contact our support team.
        </p>
        <Button 
          onClick={handleContactSupport}
          variant="outline"
          className="bg-background hover:bg-background/80"
        >
          <Mail className="w-4 h-4 mr-2" />
          Contact Support to Enable Full Access
        </Button>
        <p className="text-xs mt-2 opacity-80">
          Email: {supportEmail}
        </p>
      </AlertDescription>
    </Alert>
  );
};

export default DemoLimitBanner;
