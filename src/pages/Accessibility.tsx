import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accessibility as AccessibilityIcon, Eye, Keyboard, Monitor, MessageSquare, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const Accessibility = () => {
  const lastUpdated = "January 31, 2026";

  const accessibilityFeatures = [
    {
      icon: Keyboard,
      title: "Keyboard Navigation",
      description: "Full keyboard support for navigating the entire application without a mouse"
    },
    {
      icon: Eye,
      title: "Screen Reader Support",
      description: "Semantic HTML and ARIA labels for compatibility with screen readers"
    },
    {
      icon: Monitor,
      title: "Responsive Design",
      description: "Optimized layouts for all screen sizes from mobile to desktop"
    },
    {
      icon: CheckCircle,
      title: "Color Contrast",
      description: "High contrast ratios meeting WCAG 2.1 AA standards"
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
                <AccessibilityIcon className="w-8 h-8 text-accent" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">Accessibility Statement</h1>
                <p className="text-muted-foreground">Last updated: {lastUpdated}</p>
              </div>
            </div>
          </motion.div>

          <div className="space-y-8">
            {/* Commitment */}
            <Card>
              <CardHeader>
                <CardTitle>Our Commitment to Accessibility</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  TailoredApply is committed to ensuring digital accessibility for people with 
                  disabilities. We continually improve the user experience for everyone and apply 
                  the relevant accessibility standards to ensure we provide equal access to all users.
                </p>
                <p>
                  We aim to conform to the Web Content Accessibility Guidelines (WCAG) 2.1, Level AA. 
                  These guidelines explain how to make web content more accessible for people with 
                  disabilities and more user-friendly for everyone.
                </p>
              </CardContent>
            </Card>

            {/* Accessibility Features */}
            <Card>
              <CardHeader>
                <CardTitle>Accessibility Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  {accessibilityFeatures.map((feature) => (
                    <div 
                      key={feature.title}
                      className="flex gap-3 p-4 rounded-lg border border-border"
                    >
                      <div className="p-2 rounded-lg bg-accent/10 h-fit">
                        <feature.icon className="w-5 h-5 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">{feature.title}</h3>
                        <p className="text-sm text-muted-foreground">{feature.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Detailed Features */}
            <Card>
              <CardHeader>
                <CardTitle>What We've Done</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>We have taken the following measures to ensure accessibility:</p>
                <ul>
                  <li>
                    <strong>Semantic HTML:</strong> We use proper heading hierarchy (H1-H6), 
                    landmark regions, and semantic elements to provide structure.
                  </li>
                  <li>
                    <strong>Alternative Text:</strong> All meaningful images include descriptive 
                    alternative text for screen readers.
                  </li>
                  <li>
                    <strong>Focus Indicators:</strong> Clear visual focus indicators are provided 
                    for all interactive elements when navigating with a keyboard.
                  </li>
                  <li>
                    <strong>Form Labels:</strong> All form inputs are associated with descriptive 
                    labels for screen reader users.
                  </li>
                  <li>
                    <strong>Error Identification:</strong> Form validation errors are clearly 
                    identified and described in text.
                  </li>
                  <li>
                    <strong>Color Independence:</strong> Information is not conveyed by color alone; 
                    we use text labels and icons as well.
                  </li>
                  <li>
                    <strong>Resizable Text:</strong> Text can be resized up to 200% without loss 
                    of content or functionality.
                  </li>
                  <li>
                    <strong>Skip Links:</strong> Skip navigation links are available to bypass 
                    repetitive content.
                  </li>
                  <li>
                    <strong>Motion Control:</strong> Animations respect the user's reduced motion 
                    preferences when set in their operating system.
                  </li>
                  <li>
                    <strong>Dark Mode:</strong> A dark color theme is available for users who 
                    prefer reduced brightness.
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Keyboard Shortcuts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Keyboard className="w-5 h-5 text-accent" />
                  Keyboard Shortcuts
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>The following keyboard shortcuts are available throughout the application:</p>
                <table className="w-full">
                  <thead>
                    <tr>
                      <th className="text-left">Shortcut</th>
                      <th className="text-left">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td><kbd className="px-2 py-1 bg-secondary rounded text-sm">Tab</kbd></td>
                      <td>Move to next focusable element</td>
                    </tr>
                    <tr>
                      <td><kbd className="px-2 py-1 bg-secondary rounded text-sm">Shift + Tab</kbd></td>
                      <td>Move to previous focusable element</td>
                    </tr>
                    <tr>
                      <td><kbd className="px-2 py-1 bg-secondary rounded text-sm">Enter</kbd></td>
                      <td>Activate buttons and links</td>
                    </tr>
                    <tr>
                      <td><kbd className="px-2 py-1 bg-secondary rounded text-sm">Space</kbd></td>
                      <td>Toggle checkboxes and expand menus</td>
                    </tr>
                    <tr>
                      <td><kbd className="px-2 py-1 bg-secondary rounded text-sm">Escape</kbd></td>
                      <td>Close modals and menus</td>
                    </tr>
                    <tr>
                      <td><kbd className="px-2 py-1 bg-secondary rounded text-sm">Arrow keys</kbd></td>
                      <td>Navigate within menus and lists</td>
                    </tr>
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Assistive Technologies */}
            <Card>
              <CardHeader>
                <CardTitle>Assistive Technology Compatibility</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>TailoredApply is designed to be compatible with the following assistive technologies:</p>
                <ul>
                  <li>Screen readers (NVDA, JAWS, VoiceOver, TalkBack)</li>
                  <li>Screen magnification software</li>
                  <li>Speech recognition software</li>
                  <li>Keyboard-only navigation</li>
                  <li>Switch devices and alternative input methods</li>
                </ul>
                <p>
                  We test our application with popular screen readers including VoiceOver (macOS/iOS), 
                  NVDA (Windows), and TalkBack (Android).
                </p>
              </CardContent>
            </Card>

            {/* Known Issues */}
            <Card>
              <CardHeader>
                <CardTitle>Known Limitations</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  While we strive for full accessibility, some areas may have limitations we are 
                  actively working to address:
                </p>
                <ul>
                  <li>
                    <strong>PDF Exports:</strong> Generated PDF documents may have limited accessibility 
                    features. We recommend using the in-app editor for the best accessible experience.
                  </li>
                  <li>
                    <strong>Complex Charts:</strong> Some data visualizations in the analytics 
                    dashboard may require alternative text descriptions, which we are implementing.
                  </li>
                  <li>
                    <strong>Third-Party Content:</strong> Some embedded content from third-party 
                    services may not meet our accessibility standards.
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Feedback */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-accent" />
                  Feedback & Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>
                  We welcome your feedback on the accessibility of TailoredApply. If you experience 
                  any accessibility barriers or have suggestions for improvement, please contact us:
                </p>
                <ul>
                  <li><strong>Email:</strong> accessibility@tailoredapply.com</li>
                  <li><strong>Response time:</strong> We aim to respond within 3 business days</li>
                </ul>
                <p>
                  When contacting us, please include:
                </p>
                <ul>
                  <li>A description of the accessibility problem you encountered</li>
                  <li>The page URL where you experienced the issue</li>
                  <li>The assistive technology you were using (if any)</li>
                  <li>Your browser and operating system</li>
                </ul>
              </CardContent>
            </Card>

            {/* Standards */}
            <Card>
              <CardHeader>
                <CardTitle>Standards & Compliance</CardTitle>
              </CardHeader>
              <CardContent className="prose prose-sm dark:prose-invert max-w-none">
                <p>We aim to meet the following accessibility standards:</p>
                <ul>
                  <li>
                    <strong>WCAG 2.1 Level AA:</strong> Web Content Accessibility Guidelines 2.1 
                    at conformance level AA
                  </li>
                  <li>
                    <strong>Section 508:</strong> U.S. federal accessibility requirements
                  </li>
                  <li>
                    <strong>EN 301 549:</strong> European accessibility standard for ICT products 
                    and services
                  </li>
                  <li>
                    <strong>ADA:</strong> Americans with Disabilities Act compliance
                  </li>
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
                to="/cookies" 
                className="text-accent hover:underline text-sm"
              >
                Cookie Policy →
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Accessibility;
