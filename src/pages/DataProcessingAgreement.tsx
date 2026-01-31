import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { motion } from "framer-motion";
import { Shield, FileText, Lock, Server, Users, AlertTriangle, Scale, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DataProcessingAgreement = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-accent/10 rounded-full">
                  <Scale className="w-12 h-12 text-accent" />
                </div>
              </div>
              <h1 className="text-4xl font-bold text-foreground">Data Processing Agreement</h1>
              <p className="text-muted-foreground text-lg">
                GDPR-Compliant Data Processing Terms for Enterprise Customers
              </p>
              <p className="text-sm text-muted-foreground">
                Effective Date: January 1, 2025 | Version 2.0
              </p>
            </div>

            {/* Introduction */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent" />
                  1. Introduction and Scope
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4">
                <p>
                  This Data Processing Agreement ("DPA") forms part of the Terms of Service between 
                  TailoredApply ("Processor," "we," "us," or "our") and the enterprise customer 
                  ("Controller," "you," or "your") and governs the processing of personal data 
                  in connection with the Services.
                </p>
                <p>
                  This DPA is designed to ensure compliance with the European Union General Data 
                  Protection Regulation (GDPR), the UK GDPR, the California Consumer Privacy Act 
                  (CCPA), the California Privacy Rights Act (CPRA), and other applicable data 
                  protection laws.
                </p>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="font-medium mb-2">This DPA applies when:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>You are an enterprise customer with a paid subscription</li>
                    <li>We process personal data on your behalf as a data processor</li>
                    <li>The processing involves personal data of EU/EEA, UK, or California residents</li>
                    <li>You have employees or candidates whose data is processed through our Services</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Definitions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent" />
                  2. Definitions
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <dl className="space-y-4">
                  <div>
                    <dt className="font-semibold">"Personal Data"</dt>
                    <dd className="text-muted-foreground">
                      Any information relating to an identified or identifiable natural person, 
                      including names, email addresses, employment history, educational background, 
                      skills, and any other information contained in resumes, CVs, or cover letters.
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold">"Processing"</dt>
                    <dd className="text-muted-foreground">
                      Any operation performed on Personal Data, including collection, storage, 
                      adaptation, analysis, transmission, erasure, or destruction.
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold">"Data Subject"</dt>
                    <dd className="text-muted-foreground">
                      The identified or identifiable natural person to whom the Personal Data relates, 
                      including job applicants, candidates, and employees.
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold">"Sub-processor"</dt>
                    <dd className="text-muted-foreground">
                      Any third party engaged by the Processor to process Personal Data on behalf 
                      of the Controller.
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold">"Standard Contractual Clauses (SCCs)"</dt>
                    <dd className="text-muted-foreground">
                      The contractual clauses approved by the European Commission for the transfer 
                      of personal data to third countries, as set out in Commission Implementing 
                      Decision (EU) 2021/914.
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Data Processing Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="w-5 h-5 text-accent" />
                  3. Subject Matter and Details of Processing
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">3.1 Nature and Purpose of Processing</h4>
                  <p>We process Personal Data solely to provide the Services, which include:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>AI-powered analysis of job descriptions and candidate qualifications</li>
                    <li>Generation of personalized cover letters and interview preparation materials</li>
                    <li>Resume parsing and skills matching</li>
                    <li>Application tracking and management</li>
                    <li>Analytics and reporting on application activities</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">3.2 Categories of Personal Data</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Identity Data:</strong> Names, titles, professional identifiers</li>
                    <li><strong>Contact Data:</strong> Email addresses, phone numbers, addresses</li>
                    <li><strong>Professional Data:</strong> Employment history, job titles, company names, dates of employment</li>
                    <li><strong>Educational Data:</strong> Degrees, institutions, certifications, graduation dates</li>
                    <li><strong>Skills Data:</strong> Technical skills, languages, competencies</li>
                    <li><strong>Application Data:</strong> Cover letters, application status, interview notes</li>
                    <li><strong>Usage Data:</strong> Service interaction logs, feature usage statistics</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">3.3 Categories of Data Subjects</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Job applicants and candidates</li>
                    <li>Current and former employees</li>
                    <li>Authorized users of the Controller's account</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">3.4 Duration of Processing</h4>
                  <p>
                    Personal Data will be processed for the duration of the Service Agreement. 
                    Upon termination, data will be retained for a maximum of 30 days before 
                    secure deletion, unless legally required to retain longer or the Controller 
                    requests earlier deletion.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Processor Obligations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-accent" />
                  4. Processor Obligations
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">4.1 Processing Instructions</h4>
                  <p>The Processor shall:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Process Personal Data only on documented instructions from the Controller</li>
                    <li>Inform the Controller if any instruction infringes applicable data protection law</li>
                    <li>Not process Personal Data for any purpose other than providing the Services</li>
                    <li>Not sell, rent, or lease Personal Data to third parties</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">4.2 Confidentiality</h4>
                  <p>The Processor shall:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Ensure all personnel processing Personal Data are bound by confidentiality obligations</li>
                    <li>Limit access to Personal Data to personnel who require access for Service provision</li>
                    <li>Conduct background checks on personnel with access to Personal Data</li>
                    <li>Provide regular data protection training to all relevant personnel</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">4.3 Assistance to Controller</h4>
                  <p>The Processor shall assist the Controller with:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Responding to Data Subject requests (access, rectification, erasure, portability)</li>
                    <li>Conducting Data Protection Impact Assessments (DPIAs) where required</li>
                    <li>Prior consultation with supervisory authorities</li>
                    <li>Demonstrating compliance with GDPR obligations</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Security Measures */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-accent" />
                  5. Technical and Organizational Security Measures
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
                <p>
                  The Processor implements and maintains appropriate technical and organizational 
                  measures to ensure a level of security appropriate to the risk, including:
                </p>

                <div>
                  <h4 className="font-semibold mb-2">5.1 Encryption</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>AES-256 encryption for data at rest</li>
                    <li>TLS 1.3 encryption for data in transit</li>
                    <li>End-to-end encryption for sensitive document transfers</li>
                    <li>Encrypted backups with separate key management</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">5.2 Access Controls</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Role-based access control (RBAC) with principle of least privilege</li>
                    <li>Multi-factor authentication (MFA) for all administrative access</li>
                    <li>Unique user identifiers and strong password policies</li>
                    <li>Automatic session timeouts and account lockout policies</li>
                    <li>Regular access reviews and revocation procedures</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">5.3 Infrastructure Security</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>SOC 2 Type II certified cloud infrastructure</li>
                    <li>Network segmentation and firewalls</li>
                    <li>Intrusion detection and prevention systems (IDS/IPS)</li>
                    <li>Regular vulnerability scanning and penetration testing</li>
                    <li>DDoS protection and mitigation</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">5.4 Operational Security</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Comprehensive audit logging of all data access</li>
                    <li>24/7 security monitoring and alerting</li>
                    <li>Documented incident response procedures</li>
                    <li>Business continuity and disaster recovery plans</li>
                    <li>Regular security training for all staff</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Sub-processors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-accent" />
                  6. Sub-processors
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">6.1 Authorization</h4>
                  <p>
                    The Controller provides general authorization for the Processor to engage 
                    Sub-processors, subject to the conditions in this section. A current list 
                    of Sub-processors is available upon request.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">6.2 Sub-processor Requirements</h4>
                  <p>Before engaging any Sub-processor, the Processor shall:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Conduct due diligence on the Sub-processor's security practices</li>
                    <li>Enter into a written agreement imposing equivalent data protection obligations</li>
                    <li>Remain fully liable for Sub-processor compliance</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">6.3 Notification of Changes</h4>
                  <p>
                    The Processor shall notify the Controller at least 30 days before engaging 
                    any new Sub-processor. The Controller may object to the new Sub-processor 
                    on reasonable data protection grounds within 14 days of notification.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">6.4 Current Sub-processors</h4>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2">Sub-processor</th>
                          <th className="text-left py-2">Purpose</th>
                          <th className="text-left py-2">Location</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border/50">
                          <td className="py-2">Cloud Infrastructure Provider</td>
                          <td className="py-2">Hosting & compute</td>
                          <td className="py-2">EU/US (SCCs)</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2">AI Model Provider</td>
                          <td className="py-2">Content generation</td>
                          <td className="py-2">US (SCCs)</td>
                        </tr>
                        <tr className="border-b border-border/50">
                          <td className="py-2">Email Service Provider</td>
                          <td className="py-2">Transactional emails</td>
                          <td className="py-2">EU</td>
                        </tr>
                        <tr>
                          <td className="py-2">Payment Processor</td>
                          <td className="py-2">Billing</td>
                          <td className="py-2">US (SCCs)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* International Transfers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="w-5 h-5 text-accent" />
                  7. International Data Transfers
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">7.1 Transfer Mechanisms</h4>
                  <p>
                    For transfers of Personal Data outside the EU/EEA or UK to countries not 
                    recognized as providing adequate protection, the Processor relies on:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>EU Standard Contractual Clauses (2021/914) with appropriate modules</li>
                    <li>UK International Data Transfer Agreement (IDTA) where applicable</li>
                    <li>Supplementary measures as required by Schrems II guidance</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">7.2 Transfer Impact Assessments</h4>
                  <p>
                    The Processor conducts Transfer Impact Assessments (TIAs) for each third 
                    country destination to evaluate the level of protection and implement 
                    appropriate supplementary measures where necessary.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">7.3 Government Access Requests</h4>
                  <p>
                    If the Processor receives a legally binding request from a government 
                    authority to disclose Personal Data, it shall:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Notify the Controller before disclosure (unless legally prohibited)</li>
                    <li>Challenge the request if there are reasonable grounds</li>
                    <li>Provide only the minimum amount of data required</li>
                    <li>Document and report on such requests annually</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Data Breach */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-accent" />
                  8. Data Breach Notification
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">8.1 Notification Obligations</h4>
                  <p>
                    In the event of a Personal Data breach, the Processor shall notify the 
                    Controller without undue delay and in any event within 48 hours of becoming 
                    aware of the breach.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">8.2 Notification Content</h4>
                  <p>The notification shall include:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Description of the nature of the breach</li>
                    <li>Categories and approximate number of Data Subjects affected</li>
                    <li>Categories and approximate number of records affected</li>
                    <li>Likely consequences of the breach</li>
                    <li>Measures taken or proposed to address the breach</li>
                    <li>Contact details for the Processor's Data Protection Officer</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">8.3 Remediation</h4>
                  <p>
                    The Processor shall take immediate steps to contain and remediate the breach, 
                    cooperate with the Controller's investigation, and assist with regulatory 
                    notifications and communications to affected Data Subjects.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Audits and Inspections */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent" />
                  9. Audits and Inspections
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">9.1 Audit Rights</h4>
                  <p>
                    The Processor shall make available to the Controller all information 
                    necessary to demonstrate compliance with this DPA and allow for and 
                    contribute to audits, including inspections, conducted by the Controller 
                    or an auditor mandated by the Controller.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">9.2 Audit Procedures</h4>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>The Controller shall provide at least 30 days' written notice for audits</li>
                    <li>Audits shall be conducted during normal business hours</li>
                    <li>The Controller shall bear the costs of the audit</li>
                    <li>Auditors must sign appropriate confidentiality agreements</li>
                    <li>Audit scope shall be limited to compliance with this DPA</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">9.3 Certifications</h4>
                  <p>
                    The Processor maintains SOC 2 Type II certification and shall provide 
                    certification reports upon reasonable request. These reports may satisfy 
                    audit requirements where mutually agreed.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Termination */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent" />
                  10. Data Return and Deletion
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">10.1 Upon Termination</h4>
                  <p>
                    Upon termination or expiry of the Service Agreement, and upon the 
                    Controller's written request, the Processor shall:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Return all Personal Data to the Controller in a commonly used format</li>
                    <li>Delete all copies of Personal Data within 30 days</li>
                    <li>Provide written certification of deletion upon request</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">10.2 Retention Exceptions</h4>
                  <p>
                    The Processor may retain Personal Data where required by applicable law, 
                    provided that the Processor ensures confidentiality and processes such 
                    data only for the legally required purpose.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Liability */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-accent" />
                  11. Liability and Indemnification
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">11.1 Liability</h4>
                  <p>
                    Each party's liability arising under or in connection with this DPA 
                    is subject to the limitations and exclusions set out in the Service 
                    Agreement. The Processor shall be liable for damages caused by processing 
                    where it has not complied with GDPR obligations specifically directed 
                    at processors or acted outside lawful instructions.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">11.2 Indemnification</h4>
                  <p>
                    The Processor shall indemnify the Controller against all claims, damages, 
                    losses, costs, and expenses arising from the Processor's breach of this 
                    DPA or applicable data protection laws, except to the extent caused by 
                    the Controller's instructions or non-compliance.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* General Provisions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-accent" />
                  12. General Provisions
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">12.1 Governing Law</h4>
                  <p>
                    This DPA shall be governed by the laws specified in the Service Agreement. 
                    For matters relating to GDPR compliance, the laws of the Republic of Ireland 
                    shall apply, and for UK GDPR matters, the laws of England and Wales shall apply.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">12.2 Precedence</h4>
                  <p>
                    In the event of conflict between this DPA and the Service Agreement, this 
                    DPA shall prevail with respect to data protection matters.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">12.3 Amendments</h4>
                  <p>
                    This DPA may be amended to reflect changes in applicable data protection 
                    laws. Material changes will be notified to the Controller at least 30 days 
                    in advance.
                  </p>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">12.4 Data Protection Officer</h4>
                  <p>
                    For questions about this DPA or to exercise audit rights, contact our 
                    Data Protection Officer at <a href="mailto:dpo@tailoredapply.com" className="text-accent hover:underline">dpo@tailoredapply.com</a>.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Signature Block */}
            <Card className="border-accent/30">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <Shield className="w-12 h-12 text-accent mx-auto" />
                  <h3 className="text-xl font-semibold">Enterprise Agreement</h3>
                  <p className="text-muted-foreground">
                    This DPA is incorporated into and forms part of the TailoredApply Enterprise 
                    Service Agreement. For enterprise pricing and custom DPA negotiations, please 
                    contact our enterprise sales team.
                  </p>
                  <a 
                    href="mailto:enterprise@tailoredapply.com" 
                    className="inline-flex items-center justify-center px-6 py-3 bg-accent text-accent-foreground rounded-lg font-medium hover:bg-accent/90 transition-colors"
                  >
                    Contact Enterprise Sales
                  </a>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default DataProcessingAgreement;
