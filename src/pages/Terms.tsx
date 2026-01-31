import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-4xl font-bold text-foreground mb-8">Terms of Service</h1>
            <p className="text-muted-foreground mb-6">Last updated: January 31, 2026</p>
            <p className="text-muted-foreground mb-8">
              Please read these Terms of Service ("Terms", "Agreement") carefully before using TailoredApply 
              (the "Service") operated by TailoredApply, Inc. ("Company", "we", "us", or "our").
            </p>
            
            <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">1. Acceptance of Terms</h2>
                <p className="text-muted-foreground mb-4">
                  By accessing or using TailoredApply, you acknowledge that you have read, understood, and agree to be 
                  bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, you must 
                  not access or use our Service.
                </p>
                <p className="text-muted-foreground">
                  We reserve the right to modify these Terms at any time. We will provide notice of material changes 
                  by posting the updated Terms on our website and updating the "Last updated" date. Your continued use 
                  of the Service after any changes constitutes acceptance of the modified Terms.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">2. Eligibility</h2>
                <p className="text-muted-foreground mb-4">
                  You must be at least 18 years of age to use this Service. By using TailoredApply, you represent and 
                  warrant that:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>You are at least 18 years of age</li>
                  <li>You have the legal capacity to enter into a binding agreement</li>
                  <li>You are not prohibited from using the Service under applicable laws</li>
                  <li>You will use the Service only for lawful purposes related to legitimate job seeking activities</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">3. Description of Service</h2>
                <p className="text-muted-foreground mb-4">
                  TailoredApply provides AI-powered tools designed to assist job seekers in creating tailored application 
                  materials, including but not limited to:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>AI-generated cover letters customized to specific job descriptions</li>
                  <li>Resume analysis and job-fit scoring</li>
                  <li>Interview preparation guides and practice questions</li>
                  <li>Skills gap analysis and recommendations</li>
                </ul>
                <p className="text-muted-foreground">
                  The Service is intended to assist and augment your job search efforts. It is not a guarantee of 
                  employment, interviews, or job offers. Success in obtaining employment depends on numerous factors 
                  beyond the scope of our Service.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">4. User Accounts and Security</h2>
                <p className="text-muted-foreground mb-4">
                  To access certain features, you must create an account. You agree to:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Provide accurate, current, and complete information during registration</li>
                  <li>Maintain and promptly update your account information</li>
                  <li>Maintain the security and confidentiality of your login credentials</li>
                  <li>Accept responsibility for all activities that occur under your account</li>
                  <li>Immediately notify us of any unauthorized access or security breach</li>
                  <li>Not share your account or credentials with any third party</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">5. User Responsibilities and Conduct</h2>
                <p className="text-muted-foreground mb-4">
                  You agree to use the Service responsibly and in compliance with all applicable laws. Specifically, you agree to:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li><strong>Provide Truthful Information:</strong> All information you provide, including resume content, 
                  work history, skills, and qualifications, must be accurate and truthful. Misrepresentation of credentials 
                  may constitute fraud and could have legal consequences.</li>
                  <li><strong>Review Generated Content:</strong> You are solely responsible for reviewing, verifying, and 
                  editing all AI-generated content before using it in any job application or professional context.</li>
                  <li><strong>Comply with Employment Laws:</strong> You will not use the Service to engage in discriminatory 
                  practices, misrepresentation to employers, or any activity that violates employment laws.</li>
                  <li><strong>Respect Third-Party Rights:</strong> You will not upload content that infringes on the 
                  intellectual property rights, privacy rights, or other rights of third parties.</li>
                </ul>
                <p className="text-muted-foreground font-medium">
                  You agree NOT to:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Use the Service for any unlawful purpose or to promote illegal activities</li>
                  <li>Attempt to reverse engineer, decompile, or extract source code from the Service</li>
                  <li>Use automated systems (bots, scrapers) to access or interact with the Service</li>
                  <li>Interfere with or disrupt the Service or servers connected to the Service</li>
                  <li>Impersonate another person or entity</li>
                  <li>Sell, resell, or commercially exploit the Service without authorization</li>
                  <li>Use the Service to generate content for fraudulent job applications</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">6. AI-Generated Content Disclaimer</h2>
                <p className="text-muted-foreground mb-4">
                  <strong>IMPORTANT:</strong> Content generated by our AI systems is created based on the information you 
                  provide and general patterns learned from training data. You acknowledge and agree that:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>AI-generated content may contain errors, inaccuracies, or inappropriate suggestions</li>
                  <li>The AI may misinterpret your qualifications or the job requirements</li>
                  <li>Generated content should be treated as a starting point, not a final product</li>
                  <li>You are solely responsible for reviewing and editing all content before use</li>
                  <li>We make no guarantees about the effectiveness of AI-generated content</li>
                  <li>AI recommendations are not professional career advice</li>
                </ul>
                <p className="text-muted-foreground">
                  By using AI-generated content in your job applications, you assume all risk associated with that content. 
                  We are not liable for any consequences arising from your use of AI-generated materials, including but not 
                  limited to rejected applications, damaged professional relationships, or legal issues arising from 
                  misrepresentation.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">7. Subscription and Payment Terms</h2>
                <p className="text-muted-foreground mb-4">
                  Certain features of TailoredApply require a paid subscription. By subscribing, you agree to:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li><strong>Recurring Billing:</strong> Subscriptions are billed on a recurring basis (monthly or annually) 
                  until cancelled. You authorize us to charge your payment method automatically.</li>
                  <li><strong>Price Changes:</strong> We may change subscription prices with 30 days' notice. Continued use 
                  after the price change constitutes acceptance of the new pricing.</li>
                  <li><strong>Refunds:</strong> Subscription fees are generally non-refundable, except as required by law 
                  or at our sole discretion.</li>
                  <li><strong>Free Trials:</strong> Free trial periods, if offered, will convert to paid subscriptions 
                  automatically unless cancelled before the trial ends.</li>
                  <li><strong>Cancellation:</strong> You may cancel your subscription at any time through your account 
                  settings. Cancellation takes effect at the end of the current billing period.</li>
                </ul>
                <p className="text-muted-foreground">
                  Payment processing is handled by third-party payment processors. By providing payment information, 
                  you agree to their terms of service and authorize them to charge your payment method.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">8. Intellectual Property Rights</h2>
                <p className="text-muted-foreground mb-4">
                  <strong>Our Intellectual Property:</strong> The Service, including its original content, features, 
                  functionality, software, and branding, is owned by TailoredApply and protected by copyright, trademark, 
                  and other intellectual property laws. You may not copy, modify, distribute, sell, or lease any part 
                  of our Service without written permission.
                </p>
                <p className="text-muted-foreground mb-4">
                  <strong>Your Content:</strong> You retain ownership of the original content you upload to the Service 
                  (resumes, work samples, etc.). By uploading content, you grant us a limited, non-exclusive, royalty-free 
                  license to use, process, and store that content solely for the purpose of providing the Service to you.
                </p>
                <p className="text-muted-foreground">
                  <strong>AI-Generated Content:</strong> Content generated by our AI based on your inputs becomes your 
                  property upon creation, subject to our right to use anonymized, aggregated data for Service improvement.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">9. Privacy and Data Protection</h2>
                <p className="text-muted-foreground mb-4">
                  Your privacy is important to us. Our collection, use, and protection of your personal information is 
                  governed by our Privacy Policy, which is incorporated into these Terms by reference.
                </p>
                <p className="text-muted-foreground">
                  Given the sensitive nature of employment-related information, we implement industry-standard security 
                  measures. However, no method of electronic transmission or storage is 100% secure, and we cannot 
                  guarantee absolute security of your data.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">10. Disclaimer of Warranties</h2>
                <p className="text-muted-foreground mb-4">
                  THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR 
                  IMPLIED, INCLUDING BUT NOT LIMITED TO:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>Warranties of merchantability or fitness for a particular purpose</li>
                  <li>Warranties that the Service will be uninterrupted, secure, or error-free</li>
                  <li>Warranties regarding the accuracy or reliability of AI-generated content</li>
                  <li>Warranties that the Service will meet your specific requirements or expectations</li>
                  <li>Warranties regarding the results you may obtain from using the Service</li>
                </ul>
                <p className="text-muted-foreground font-medium">
                  WE EXPRESSLY DISCLAIM ANY WARRANTY THAT:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Use of our Service will result in job interviews, offers, or employment</li>
                  <li>AI-generated content will be suitable for any particular employer or position</li>
                  <li>Our job-fit analysis accurately predicts your suitability for any role</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">11. Limitation of Liability</h2>
                <p className="text-muted-foreground mb-4">
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, TAILOREDAPPLY AND ITS OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, 
                  AND AFFILIATES SHALL NOT BE LIABLE FOR ANY:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>Indirect, incidental, special, consequential, or punitive damages</li>
                  <li>Loss of profits, revenue, data, or business opportunities</li>
                  <li>Damages arising from your use of AI-generated content</li>
                  <li>Damages resulting from unauthorized access to your account</li>
                  <li>Career-related damages, including but not limited to rejected applications, lost job opportunities, 
                  or damage to professional reputation</li>
                </ul>
                <p className="text-muted-foreground">
                  IN NO EVENT SHALL OUR TOTAL LIABILITY EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE (12) MONTHS 
                  PRECEDING THE CLAIM, OR ONE HUNDRED DOLLARS ($100), WHICHEVER IS GREATER.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">12. Indemnification</h2>
                <p className="text-muted-foreground">
                  You agree to indemnify, defend, and hold harmless TailoredApply and its officers, directors, employees, 
                  agents, and affiliates from and against any claims, damages, losses, liabilities, costs, and expenses 
                  (including reasonable attorneys' fees) arising from or related to: (a) your use of the Service; 
                  (b) your violation of these Terms; (c) your violation of any third-party rights; (d) any content you 
                  submit to the Service; or (e) your use of AI-generated content in job applications or professional contexts.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">13. Account Termination</h2>
                <p className="text-muted-foreground mb-4">
                  We reserve the right to suspend or terminate your account at any time, with or without cause, and with 
                  or without notice, including for:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
                  <li>Violation of these Terms of Service</li>
                  <li>Fraudulent, abusive, or illegal activity</li>
                  <li>Conduct that harms other users or third parties</li>
                  <li>Extended periods of inactivity</li>
                  <li>At our sole discretion for any reason</li>
                </ul>
                <p className="text-muted-foreground">
                  You may delete your account at any time through your account settings. Upon termination, your right to 
                  use the Service ceases immediately. We may retain certain data as required by law or for legitimate 
                  business purposes, as described in our Privacy Policy.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">14. Dispute Resolution and Arbitration</h2>
                <p className="text-muted-foreground mb-4">
                  <strong>Informal Resolution:</strong> Before initiating any formal dispute resolution, you agree to 
                  first contact us at legal@tailoredapply.com to attempt to resolve any dispute informally. Most concerns 
                  can be resolved through direct communication.
                </p>
                <p className="text-muted-foreground mb-4">
                  <strong>Binding Arbitration:</strong> Any dispute, controversy, or claim arising out of or relating to 
                  these Terms or the Service that cannot be resolved informally shall be settled by binding arbitration 
                  in accordance with the rules of the American Arbitration Association. The arbitration shall be conducted 
                  in [Your State], and judgment on the arbitration award may be entered in any court having jurisdiction.
                </p>
                <p className="text-muted-foreground mb-4">
                  <strong>Class Action Waiver:</strong> YOU AGREE THAT ANY DISPUTE RESOLUTION PROCEEDINGS WILL BE CONDUCTED 
                  ONLY ON AN INDIVIDUAL BASIS AND NOT IN A CLASS, CONSOLIDATED, OR REPRESENTATIVE ACTION.
                </p>
                <p className="text-muted-foreground">
                  <strong>Exceptions:</strong> Nothing in this section shall prevent either party from seeking injunctive 
                  or other equitable relief in court for matters related to intellectual property or unauthorized access.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">15. Governing Law</h2>
                <p className="text-muted-foreground">
                  These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, 
                  United States, without regard to its conflict of law provisions. You agree to submit to the personal 
                  and exclusive jurisdiction of the courts located in Delaware for any legal proceedings.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">16. Third-Party Services</h2>
                <p className="text-muted-foreground">
                  The Service may integrate with or contain links to third-party websites, services, or content. We are 
                  not responsible for the content, privacy policies, or practices of third-party services. Your use of 
                  third-party services is at your own risk and subject to those services' respective terms and policies.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">17. Severability</h2>
                <p className="text-muted-foreground">
                  If any provision of these Terms is found to be unenforceable or invalid by a court of competent 
                  jurisdiction, that provision shall be limited or eliminated to the minimum extent necessary, and the 
                  remaining provisions shall continue in full force and effect.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">18. Entire Agreement</h2>
                <p className="text-muted-foreground">
                  These Terms, together with our Privacy Policy and any other legal notices published by us on the Service, 
                  constitute the entire agreement between you and TailoredApply regarding your use of the Service and 
                  supersede all prior agreements and understandings, whether written or oral.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-foreground mb-4">19. Contact Information</h2>
                <p className="text-muted-foreground mb-4">
                  For questions, concerns, or notices regarding these Terms of Service, please contact us at:
                </p>
                <div className="text-muted-foreground space-y-1">
                  <p><strong>TailoredApply, Inc.</strong></p>
                  <p>Email: legal@tailoredapply.com</p>
                  <p>Support: support@tailoredapply.com</p>
                </div>
              </section>

              <section className="border-t border-border pt-8">
                <p className="text-sm text-muted-foreground italic">
                  By using TailoredApply, you acknowledge that you have read, understood, and agree to be bound by these 
                  Terms of Service. If you do not agree to these Terms, please do not use our Service.
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

export default Terms;
