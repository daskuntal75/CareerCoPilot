import Header from "@/components/layout/Header";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Features from "@/components/landing/Features";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/layout/Footer";
import SEOHead from "@/components/seo/SEOHead";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="TailoredApply – AI Cover Letter Generator & Job Fit Matcher"
        description="Generate tailored cover letters, calculate job fit scores, and get AI interview prep in under 5 minutes. Upload your resume, paste a job description—only highlights your real experience."
        path="/"
      />
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <Features />
        <CTA />
      </main>
      <Footer />
    </div>
  );
};

export default Index;