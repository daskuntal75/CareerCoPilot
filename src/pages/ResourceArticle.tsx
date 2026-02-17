import { useParams, Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEOHead from "@/components/seo/SEOHead";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { articles } from "./Resources";

const ResourceArticle = () => {
  const { slug } = useParams<{ slug: string }>();
  const article = articles.find(a => a.slug === slug);
  
  if (!article) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 pt-24 pb-12 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">Article Not Found</h1>
            <Link to="/resources">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Resources
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const Icon = article.icon;
  const articleIndex = articles.indexOf(article);
  const nextArticle = articles[(articleIndex + 1) % articles.length];

  // JSON-LD for the article
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": article.title,
    "description": article.description,
    "author": { "@type": "Organization", "name": "TailoredApply" },
    "publisher": { "@type": "Organization", "name": "TailoredApply", "url": "https://tailoredapply.lovable.app" },
    "mainEntityOfPage": `https://tailoredapply.lovable.app/resources/${article.slug}`,
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title={article.title}
        description={article.description}
        path={`/resources/${article.slug}`}
        type="article"
      />
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <article className="container mx-auto px-4 lg:px-8 max-w-3xl">
          {/* Breadcrumb */}
          <Link
            to="/resources"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Resources
          </Link>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Badge variant="outline">{article.category}</Badge>
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  {article.readTime}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4 leading-tight">
                {article.title}
              </h1>
              <p className="text-lg text-muted-foreground">
                {article.description}
              </p>
            </div>

            {/* Content */}
            <div className="prose prose-lg dark:prose-invert max-w-none">
              {article.content.map((paragraph, i) => (
                <p key={i} className="text-foreground/90 leading-relaxed mb-6">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-12 bg-accent/5 border border-accent/20 rounded-2xl p-8 text-center">
              <h3 className="text-xl font-bold text-foreground mb-3">
                Ready to Apply These Tips?
              </h3>
              <p className="text-muted-foreground mb-4">
                TailoredApply generates cover letters, fit scores, and interview prep automatically from your resume.
              </p>
              <Link to="/app">
                <Button variant="hero" size="lg">
                  Try TailoredApply Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>

            {/* Next article */}
            {nextArticle && (
              <div className="mt-8 pt-8 border-t border-border">
                <p className="text-sm text-muted-foreground mb-2">Next article</p>
                <Link
                  to={`/resources/${nextArticle.slug}`}
                  className="text-lg font-semibold text-foreground hover:text-accent transition-colors flex items-center gap-2"
                >
                  {nextArticle.title}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </motion.div>
        </article>

        {/* JSON-LD */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
        />
      </main>
      <Footer />
    </div>
  );
};

export default ResourceArticle;
