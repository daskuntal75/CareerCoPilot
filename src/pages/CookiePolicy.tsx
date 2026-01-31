import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Cookie, Shield, Settings, BarChart3, Users, Lock } from "lucide-react";
import { motion } from "framer-motion";

const CookiePolicy = () => {
  const lastUpdated = "January 31, 2026";

  const essentialCookies = [
    {
      name: "sb-auth-token",
      purpose: "Authentication session management",
      duration: "Session / 7 days",
      type: "First-party"
    },
    {
      name: "sb-refresh-token",
      purpose: "Securely refresh authentication sessions",
      duration: "7 days",
      type: "First-party"
    },
    {
      name: "cookie-consent",
      purpose: "Stores your cookie consent preferences",
      duration: "1 year",
      type: "First-party"
    },
    {
      name: "session-timeout",
      purpose: "Tracks session activity for security timeout",
      duration: "Session",
      type: "First-party"
    }
  ];

  const functionalCookies = [
    {
      name: "theme-preference",
      purpose: "Remembers your light/dark mode preference",
      duration: "1 year",
      type: "First-party"
    },
    {
      name: "sidebar-collapsed",
      purpose: "Remembers navigation sidebar state",
      duration: "1 year",
      type: "First-party"
    },
    {
      name: "keyboard-shortcuts",
      purpose: "Stores keyboard shortcut preferences",
      duration: "1 year",
      type: "First-party"
    }
  ];

  const analyticsCookies = [
    {
      name: "analytics-session",
      purpose: "Anonymous usage analytics for improving the service",
      duration: "30 minutes",
      type: "First-party"
    },
    {
      name: "feature-usage",
      purpose: "Tracks which features you use to improve UX",
      duration: "Session",
      type: "First-party"
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 lg:px-8 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-xl bg-accent/10">
                <Cookie className="w-8 h-8 text-accent" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Cookie Policy</h1>
                <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
              </div>
            </div>
          </motion.div>

          <div className="space-y-8">
            {/* Introduction */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-accent" />
                  About This Policy
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  TailoredApply ("we," "our," or "us") uses cookies and similar tracking technologies 
                  on our website and application. This Cookie Policy explains what cookies are, how we 
                  use them, and how you can manage your preferences.
                </p>
                <p>
                  By using our Service, you consent to the use of cookies in accordance with this policy. 
                  You can manage your cookie preferences at any time through your browser settings or our 
                  cookie consent banner.
                </p>
              </CardContent>
            </Card>

            {/* What Are Cookies */}
            <Card>
              <CardHeader>
                <CardTitle>What Are Cookies?</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  Cookies are small text files that are stored on your device (computer, tablet, or mobile) 
                  when you visit a website. They are widely used to make websites work more efficiently 
                  and provide information to website owners.
                </p>
                <p>
                  Cookies can be "persistent" (remaining on your device until deleted or expired) or 
                  "session" cookies (deleted when you close your browser). First-party cookies are set 
                  by the website you're visiting, while third-party cookies are set by other domains.
                </p>
              </CardContent>
            </Card>

            {/* Essential Cookies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5 text-green-500" />
                  Essential Cookies (Required)
                </CardTitle>
                <CardDescription>
                  These cookies are necessary for the website to function and cannot be disabled.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cookie Name</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {essentialCookies.map((cookie) => (
                      <TableRow key={cookie.name}>
                        <TableCell className="font-mono text-sm">{cookie.name}</TableCell>
                        <TableCell>{cookie.purpose}</TableCell>
                        <TableCell>{cookie.duration}</TableCell>
                        <TableCell>{cookie.type}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Functional Cookies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-blue-500" />
                  Functional Cookies (Optional)
                </CardTitle>
                <CardDescription>
                  These cookies enable enhanced functionality and personalization.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cookie Name</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {functionalCookies.map((cookie) => (
                      <TableRow key={cookie.name}>
                        <TableCell className="font-mono text-sm">{cookie.name}</TableCell>
                        <TableCell>{cookie.purpose}</TableCell>
                        <TableCell>{cookie.duration}</TableCell>
                        <TableCell>{cookie.type}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Analytics Cookies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-purple-500" />
                  Analytics Cookies (Optional)
                </CardTitle>
                <CardDescription>
                  These cookies help us understand how visitors interact with our website.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cookie Name</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analyticsCookies.map((cookie) => (
                      <TableRow key={cookie.name}>
                        <TableCell className="font-mono text-sm">{cookie.name}</TableCell>
                        <TableCell>{cookie.purpose}</TableCell>
                        <TableCell>{cookie.duration}</TableCell>
                        <TableCell>{cookie.type}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Third-Party Services */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-500" />
                  Third-Party Services
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>We may use the following third-party services that may set cookies:</p>
                <ul>
                  <li>
                    <strong>Stripe</strong> - For payment processing. Stripe may set cookies for 
                    fraud prevention and to remember your payment preferences. See{" "}
                    <a href="https://stripe.com/cookies-policy/legal" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                      Stripe's Cookie Policy
                    </a>.
                  </li>
                  <li>
                    <strong>Supabase</strong> - For authentication and database services. These are 
                    essential for the core functionality of our application.
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Managing Cookies */}
            <Card>
              <CardHeader>
                <CardTitle>Managing Your Cookie Preferences</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <h4>Browser Settings</h4>
                <p>
                  Most web browsers allow you to control cookies through their settings. You can 
                  typically find these options in your browser's "Options," "Preferences," or 
                  "Settings" menu. Common browser instructions:
                </p>
                <ul>
                  <li><strong>Chrome:</strong> Settings → Privacy and Security → Cookies</li>
                  <li><strong>Firefox:</strong> Options → Privacy & Security → Cookies</li>
                  <li><strong>Safari:</strong> Preferences → Privacy → Cookies</li>
                  <li><strong>Edge:</strong> Settings → Cookies and Site Permissions</li>
                </ul>

                <h4>Our Cookie Banner</h4>
                <p>
                  When you first visit our site, you'll see a cookie consent banner. You can:
                </p>
                <ul>
                  <li>Accept all cookies for the full experience</li>
                  <li>Accept only essential cookies</li>
                  <li>Customize your preferences for functional and analytics cookies</li>
                </ul>

                <h4>Consequences of Disabling Cookies</h4>
                <p>
                  Please note that disabling certain cookies may impact your experience:
                </p>
                <ul>
                  <li>Essential cookies cannot be disabled; the service won't function without them</li>
                  <li>Disabling functional cookies means your preferences won't be remembered</li>
                  <li>Disabling analytics cookies won't affect your experience but limits our ability to improve the service</li>
                </ul>
              </CardContent>
            </Card>

            {/* Updates */}
            <Card>
              <CardHeader>
                <CardTitle>Updates to This Policy</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  We may update this Cookie Policy from time to time. Any changes will be posted on 
                  this page with an updated "Last Updated" date. We encourage you to review this 
                  policy periodically.
                </p>
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Us</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  If you have questions about our use of cookies or this Cookie Policy, please contact us:
                </p>
                <ul>
                  <li>Email: privacy@tailoredapply.com</li>
                  <li>Visit our <Link to="/privacy" className="text-accent hover:underline">Privacy Policy</Link></li>
                </ul>
              </CardContent>
            </Card>

            {/* Related Links */}
            <div className="flex flex-wrap gap-4 pt-4">
              <Link 
                to="/privacy" 
                className="text-accent hover:underline text-sm"
              >
                Privacy Policy →
              </Link>
              <Link 
                to="/terms" 
                className="text-accent hover:underline text-sm"
              >
                Terms of Service →
              </Link>
              <Link 
                to="/accessibility" 
                className="text-accent hover:underline text-sm"
              >
                Accessibility Statement →
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CookiePolicy;
