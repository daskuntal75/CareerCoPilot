import { Mail, Heart, Clock, UserCheck } from "lucide-react";
import JobSearchEmailSection, { EmailSectionConfig } from "./JobSearchEmailSection";

interface JobSearchEmailsContainerProps {
  jobTitle: string;
  company: string;
  coverLetterContent: string;
  applicationId?: string | null;
  userId?: string;
}

const emailConfigs: EmailSectionConfig[] = [
  {
    icon: Mail,
    title: "Reference Request Email",
    description: "Request a professional reference for your application",
    functionName: "generate-reference-email",
    fields: [
      {
        name: "referenceName",
        label: "Reference Name (optional)",
        placeholder: "e.g., John Smith",
      },
      {
        name: "referenceRelationship",
        label: "Your Relationship (optional)",
        placeholder: "e.g., Former Manager at ABC Corp",
      },
    ],
  },
  {
    icon: Heart,
    title: "Thank You Email",
    description: "Send a thank you note after an interview",
    functionName: "generate-thank-you-email",
    fields: [
      {
        name: "interviewerName",
        label: "Interviewer Name (optional)",
        placeholder: "e.g., Sarah Johnson",
      },
      {
        name: "interviewDate",
        label: "Interview Date (optional)",
        placeholder: "e.g., January 15, 2025",
      },
      {
        name: "keyTopics",
        label: "Key Topics Discussed (optional)",
        placeholder: "e.g., Team culture, upcoming projects",
      },
    ],
  },
  {
    icon: Clock,
    title: "Follow-Up Email",
    description: "Follow up on your application status",
    functionName: "generate-follow-up-email",
    fields: [
      {
        name: "recipientName",
        label: "Recipient Name (optional)",
        placeholder: "e.g., Hiring Manager",
      },
      {
        name: "applicationDate",
        label: "Application Date (optional)",
        placeholder: "e.g., 2 weeks ago",
      },
      {
        name: "additionalContext",
        label: "Additional Context (optional)",
        placeholder: "e.g., New certification earned, portfolio updates",
      },
    ],
  },
  {
    icon: UserCheck,
    title: "Networking Email",
    description: "Reach out to a connection about the opportunity",
    functionName: "generate-networking-email",
    fields: [
      {
        name: "contactName",
        label: "Contact Name (optional)",
        placeholder: "e.g., Alex Chen",
      },
      {
        name: "connectionContext",
        label: "How You Know Them (optional)",
        placeholder: "e.g., Met at Tech Conference 2024",
      },
      {
        name: "requestType",
        label: "Your Ask (optional)",
        placeholder: "e.g., Informational interview, referral",
      },
    ],
  },
];

const JobSearchEmailsContainer = ({
  jobTitle,
  company,
  coverLetterContent,
  applicationId,
  userId,
}: JobSearchEmailsContainerProps) => {
  return (
    <div className="mt-6 space-y-2">
      <h3 className="text-lg font-semibold text-foreground mb-4">
        Job Search Emails
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        Generate professional emails to support your application
      </p>
      
      {emailConfigs.map((config) => (
        <JobSearchEmailSection
          key={config.functionName}
          config={config}
          jobTitle={jobTitle}
          company={company}
          coverLetterContent={coverLetterContent}
          applicationId={applicationId}
          userId={userId}
        />
      ))}
    </div>
  );
};

export default JobSearchEmailsContainer;
