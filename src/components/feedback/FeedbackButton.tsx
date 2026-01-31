import { useState } from "react";
import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import FeedbackModal from "./FeedbackModal";

const FeedbackButton = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        size="sm"
        className="fixed bottom-4 left-4 z-50 shadow-lg hover:shadow-xl transition-all bg-background border-border"
      >
        <MessageSquarePlus className="w-4 h-4 mr-2" />
        Feedback
      </Button>
      <FeedbackModal open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
};

export default FeedbackButton;
