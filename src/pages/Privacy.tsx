import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-bold text-foreground mb-8">Privacy Policy</h1>
            <p className="text-muted-foreground mb-6">Last updated: January 31, 2026</p>
            <p className="text-muted-foreground mb-8">
              TailoredApply, Inc. ("Company", "we", "us", or "our") is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your information when 
              you use our AI-powered job application assistant service ("Service").
            </p>
            
            <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">1. Information We Collect</h2>
                
                <h3 className="text-xl font-medium text-foreground mb-3">1.1 Information You Provide Directly</h3>
                <p className="text-muted-foreground mb-4">
                  We collect information you voluntarily provide when using our Service:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li><strong>Account Information:</strong> Name, email address, password (encrypted), and optional profile details</li>
                  <li><strong>Career Documents:</strong> Resumes, CVs, cover letters, and work samples you upload</li>
                  <li><strong>Professional Information:</strong> Work history, skills, education, certifications, and career objectives</li>
                  <li><strong>Job Search Data:</strong> Job descriptions you analyze, companies you target, and application preferences</li>
                  <li><strong>Generated Content:</strong> AI-generated cover letters, interview prep materials, and analysis results</li>
                  <li><strong>Payment Information:</strong> Billing details processed through secure third-party payment processors</li>
                  <li><strong>Communications:</strong> Messages, feedback, and support requests you send to us</li>
                </ul>

                <h3 className="text-xl font-medium text-foreground mb-3">1.2 Information Collected Automatically</h3>
                <p className="text-muted-foreground mb-4">
                  When you access our Service, we automatically collect certain information:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li><strong>Device Information:</strong> Browser type, operating system, device identifiers, and screen resolution</li>
                  <li><strong>Usage Data:</strong> Pages visited, features used, time spent, click patterns, and navigation paths</li>
                  <li><strong>Log Data:</strong> IP address, access times, referring URLs, and error logs</li>
                  <li><strong>Cookies and Tracking:</strong> Session cookies, preference cookies, and analytics trackers (with your consent)</li>
                </ul>

                <h3 className="text-xl font-medium text-foreground mb-3">1.3 Sensitive Information</h3>
                <p className="text-muted-foreground">
                  We understand that career documents may contain sensitive information. While we don't require you to provide 
                  sensitive personal data (such as race, religion, health information, or social security numbers), your 
                  uploaded documents may incidentally contain such information. We treat all career-related data with 
                  enhanced security measures and never use sensitive information for purposes other than providing the Service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">2. How We Use Your Information</h2>
                <p className="text-muted-foreground mb-4">
                  We use your information for the following purposes:
                </p>
                
                <h3 className="text-xl font-medium text-foreground mb-3">2.1 Service Provision</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>Generate personalized cover letters and interview preparation materials</li>
                  <li>Analyze job descriptions and match them to your qualifications</li>
                  <li>Provide job-fit scores and recommendations</li>
                  <li>Maintain and improve your account and preferences</li>
                  <li>Process payments and manage subscriptions</li>
                </ul>

                <h3 className="text-xl font-medium text-foreground mb-3">2.2 Service Improvement</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>Analyze usage patterns to improve features and user experience</li>
                  <li>Train and improve our AI models using anonymized, aggregated data</li>
                  <li>Develop new features and services</li>
                  <li>Conduct research and analytics</li>
                </ul>

                <h3 className="text-xl font-medium text-foreground mb-3">2.3 Communications</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>Send service-related notifications and updates</li>
                  <li>Respond to your inquiries and support requests</li>
                  <li>Send marketing communications (with your consent)</li>
                  <li>Alert you to security issues or policy changes</li>
                </ul>

                <h3 className="text-xl font-medium text-foreground mb-3">2.4 Legal and Safety</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Comply with legal obligations and respond to legal requests</li>
                  <li>Enforce our Terms of Service</li>
                  <li>Protect against fraud, abuse, and security threats</li>
                  <li>Protect the rights, property, and safety of our users and the public</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">3. How We Share Your Information</h2>
                <p className="text-muted-foreground mb-4">
                  We do not sell your personal information. We may share your information only in the following circumstances:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Service Providers:</strong> With trusted third parties who assist in operating our Service 
                  (hosting, analytics, payment processing), bound by confidentiality obligations</li>
                  <li><strong>AI Processing:</strong> With AI service providers for content generation, using data 
                  minimization and encryption</li>
                  <li><strong>Legal Requirements:</strong> When required by law, court order, or government request</li>
                  <li><strong>Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets, 
                  with appropriate confidentiality protections</li>
                  <li><strong>With Your Consent:</strong> For any other purpose with your explicit consent</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">4. Data Security</h2>
                <p className="text-muted-foreground mb-4">
                  We implement comprehensive security measures to protect your information:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li><strong>Encryption:</strong> TLS 1.3 for data in transit; AES-256 for data at rest</li>
                  <li><strong>Access Controls:</strong> Role-based access, multi-factor authentication, and audit logging</li>
                  <li><strong>Infrastructure Security:</strong> Secure cloud hosting with SOC 2 compliance, regular security audits</li>
                  <li><strong>Database Security:</strong> Row-level security policies, encrypted backups, and intrusion detection</li>
                  <li><strong>AI Security:</strong> Prompt injection protection, zero data retention with AI providers</li>
                  <li><strong>Employee Training:</strong> Regular security awareness training for all personnel</li>
                </ul>
                <p className="text-muted-foreground">
                  Despite these measures, no method of electronic storage or transmission is 100% secure. We cannot 
                  guarantee absolute security but are committed to promptly addressing any security incidents.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">5. Data Retention</h2>
                <p className="text-muted-foreground mb-4">
                  We retain your information for as long as necessary to provide the Service and fulfill the purposes 
                  described in this policy:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li><strong>Active Accounts:</strong> Data is retained while your account is active</li>
                  <li><strong>Inactive Accounts:</strong> Accounts inactive for 2 years may be subject to data deletion 
                  after notification</li>
                  <li><strong>Deleted Accounts:</strong> Personal data is deleted within 30 days of account deletion request, 
                  except where retention is required by law</li>
                  <li><strong>Backup Data:</strong> May persist in encrypted backups for up to 90 days</li>
                  <li><strong>Anonymized Data:</strong> Aggregated, anonymized data may be retained indefinitely for analytics</li>
                </ul>
                <p className="text-muted-foreground">
                  Certain data may be retained longer for legal compliance, dispute resolution, or fraud prevention.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">6. Your Rights and Choices</h2>
                <p className="text-muted-foreground mb-4">
                  Depending on your location, you may have the following rights regarding your personal information:
                </p>
                
                <h3 className="text-xl font-medium text-foreground mb-3">6.1 Access and Portability</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>Request a copy of the personal data we hold about you</li>
                  <li>Export your data in a structured, machine-readable format (JSON)</li>
                  <li>View your data processing history</li>
                </ul>

                <h3 className="text-xl font-medium text-foreground mb-3">6.2 Correction and Deletion</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>Update or correct inaccurate personal information</li>
                  <li>Request deletion of your personal data ("right to be forgotten")</li>
                  <li>Delete your account and all associated data</li>
                </ul>

                <h3 className="text-xl font-medium text-foreground mb-3">6.3 Control Over Processing</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>Object to certain processing of your data</li>
                  <li>Restrict processing in certain circumstances</li>
                  <li>Withdraw consent for consent-based processing</li>
                  <li>Opt out of marketing communications</li>
                </ul>

                <p className="text-muted-foreground">
                  To exercise these rights, visit your Account Settings or contact us at privacy@tailoredapply.com. 
                  We will respond within 30 days (or as required by applicable law).
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">7. Cookies and Tracking Technologies</h2>
                <p className="text-muted-foreground mb-4">
                  We use cookies and similar technologies to enhance your experience:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li><strong>Essential Cookies:</strong> Required for Service functionality (authentication, security)</li>
                  <li><strong>Functional Cookies:</strong> Remember your preferences and settings</li>
                  <li><strong>Analytics Cookies:</strong> Help us understand how you use the Service (with consent)</li>
                  <li><strong>Marketing Cookies:</strong> Used for relevant advertising (with consent)</li>
                </ul>
                <p className="text-muted-foreground">
                  You can manage cookie preferences through our cookie consent banner or your browser settings. 
                  Note that disabling essential cookies may affect Service functionality.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">8. International Data Transfers</h2>
                <p className="text-muted-foreground mb-4">
                  Your information may be transferred to and processed in countries other than your country of residence. 
                  We ensure appropriate safeguards are in place:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Standard Contractual Clauses approved by relevant authorities</li>
                  <li>Data processing agreements with all service providers</li>
                  <li>Compliance with applicable data protection frameworks</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">9. California Privacy Rights (CCPA/CPRA)</h2>
                <p className="text-muted-foreground mb-4">
                  California residents have additional rights under the California Consumer Privacy Act (CCPA) 
                  and California Privacy Rights Act (CPRA):
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li><strong>Right to Know:</strong> Request disclosure of what personal information we collect, use, and share</li>
                  <li><strong>Right to Delete:</strong> Request deletion of your personal information</li>
                  <li><strong>Right to Opt-Out:</strong> Opt out of the sale or sharing of personal information</li>
                  <li><strong>Right to Non-Discrimination:</strong> Exercise your rights without discriminatory treatment</li>
                  <li><strong>Right to Correct:</strong> Request correction of inaccurate personal information</li>
                  <li><strong>Right to Limit:</strong> Limit use of sensitive personal information</li>
                </ul>
                <p className="text-muted-foreground">
                  <strong>We do not sell personal information.</strong> To exercise your California privacy rights, 
                  contact us at privacy@tailoredapply.com or call [toll-free number].
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">10. European Privacy Rights (GDPR)</h2>
                <p className="text-muted-foreground mb-4">
                  If you are located in the European Economic Area (EEA), United Kingdom, or Switzerland, you have 
                  additional rights under the General Data Protection Regulation (GDPR):
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>All rights listed in Section 6 above</li>
                  <li>Right to lodge a complaint with your local data protection authority</li>
                  <li>Right to know the legal basis for processing your data</li>
                </ul>
                <p className="text-muted-foreground mb-4">
                  <strong>Legal Bases for Processing:</strong>
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Contract:</strong> Processing necessary to provide the Service you requested</li>
                  <li><strong>Legitimate Interests:</strong> Improving our Service, preventing fraud, ensuring security</li>
                  <li><strong>Consent:</strong> Marketing communications, analytics cookies</li>
                  <li><strong>Legal Obligation:</strong> Compliance with applicable laws</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">11. Children's Privacy</h2>
                <p className="text-muted-foreground">
                  Our Service is not directed to individuals under 18 years of age. We do not knowingly collect 
                  personal information from children. If we become aware that we have collected personal information 
                  from a child without parental consent, we will take steps to delete that information promptly.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">12. Third-Party Links</h2>
                <p className="text-muted-foreground">
                  Our Service may contain links to third-party websites or services. We are not responsible for the 
                  privacy practices of these third parties. We encourage you to review the privacy policies of any 
                  third-party sites you visit.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">13. Changes to This Privacy Policy</h2>
                <p className="text-muted-foreground">
                  We may update this Privacy Policy from time to time. We will notify you of material changes by 
                  posting the updated policy on our website, updating the "Last updated" date, and where appropriate, 
                  notifying you via email. Your continued use of the Service after changes constitutes acceptance 
                  of the updated policy.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">14. Contact Us</h2>
                <p className="text-muted-foreground mb-4">
                  If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, 
                  please contact us:
                </p>
                <div className="text-muted-foreground space-y-1 mb-4">
                  <p><strong>TailoredApply, Inc.</strong></p>
                  <p>Privacy Team</p>
                  <p>Email: privacy@tailoredapply.com</p>
                  <p>General Support: support@tailoredapply.com</p>
                </div>
                <p className="text-muted-foreground">
                  For data protection inquiries in the EEA, you may also contact our EU Representative at 
                  eu-privacy@tailoredapply.com.
                </p>
              </section>

              <section className="border-t border-border pt-8">
                <p className="text-sm text-muted-foreground italic">
                  By using TailoredApply, you acknowledge that you have read and understood this Privacy Policy. 
                  If you do not agree with our practices, please do not use our Service.
                </p>
              </section>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
