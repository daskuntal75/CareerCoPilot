import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import SEOHead from "@/components/seo/SEOHead";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, MessageSquare, Search, Briefcase, ArrowRight, BookOpen, Lightbulb, Target } from "lucide-react";
import { motion } from "framer-motion";

interface Article {
  slug: string;
  title: string;
  description: string;
  category: string;
  icon: React.ElementType;
  readTime: string;
  content: string[];
}

const articles: Article[] = [
  {
    slug: "how-to-write-cover-letter-2026",
    title: "How to Write a Cover Letter in 2026: The Complete Guide",
    description: "Learn the proven structure, tone, and strategy behind cover letters that land interviews—including how AI tools like TailoredApply can help.",
    category: "Cover Letters",
    icon: FileText,
    readTime: "8 min read",
    content: [
      "A strong cover letter in 2026 is concise, specific, and tailored to the job description. Gone are the days of generic openers like 'I am writing to express my interest.' Hiring managers scan hundreds of applications—yours needs to prove fit in under 30 seconds.",
      "Start with a hook that references the company's mission or a recent achievement. Then map 2–3 of the job's top requirements to your proven experience using the STAR method (Situation, Task, Action, Result). Quantify impact wherever possible: 'Increased retention by 18%' beats 'Improved customer experience.'",
      "Close with a forward-looking statement that shows enthusiasm and invites conversation. Avoid restating your resume—the cover letter's job is to contextualize your experience for this specific role.",
      "AI tools like TailoredApply can accelerate this process by semantically matching your resume against the job description, identifying which of your experiences best address each requirement, and generating a draft that you can refine. The key is that good AI tools only reference experience you actually have—never fabricating qualifications.",
      "Finally, always export as PDF to preserve formatting, and keep it under one page. ATS systems can parse well-structured PDFs, and recruiters appreciate brevity.",
    ],
  },
  {
    slug: "job-fit-score-explained",
    title: "What Is a Job Fit Score and Why It Matters",
    description: "Understand how AI calculates resume-to-job matching scores, what a good score looks like, and how to use it to prioritize your applications.",
    category: "Job Search",
    icon: Target,
    readTime: "5 min read",
    content: [
      "A job fit score is a percentage that measures how well your resume matches a specific job description. Unlike keyword matching, modern AI tools use semantic analysis to understand context—recognizing that 'led a cross-functional team' matches a requirement for 'project management experience' even without exact keyword overlap.",
      "TailoredApply extracts the top 10 requirements from a job posting and maps each one against your resume. A score of 70%+ indicates a strong fit and high likelihood of callback. Scores between 50–70% suggest you're competitive but may need to address gaps in your cover letter. Below 50%, consider whether the role is realistic.",
      "The real power of a fit score isn't the number itself—it's the breakdown. Seeing exactly which requirements you meet, partially meet, or miss helps you decide whether to apply and how to position your application. It also saves time: rather than applying to 50 jobs blindly, focus on the 15 where you're genuinely competitive.",
      "For career changers, fit scores highlight transferable skills you might not have recognized. For senior candidates, they ensure you're not overlooking technical requirements buried in the posting.",
    ],
  },
  {
    slug: "star-method-interview-answers",
    title: "Master the STAR Method: Interview Answers That Get Offers",
    description: "Step-by-step guide to structuring behavioral interview answers using the STAR framework, with examples for common questions.",
    category: "Interview Prep",
    icon: MessageSquare,
    readTime: "7 min read",
    content: [
      "The STAR method (Situation, Task, Action, Result) is the gold standard for answering behavioral interview questions like 'Tell me about a time you handled conflict' or 'Describe a project you led.' Interviewers use these questions to predict future performance based on past behavior.",
      "Situation: Set the scene in 1–2 sentences. Include the company, your role, and the relevant context. 'At Acme Corp, I was the lead engineer on a team of 8 building our customer portal.'",
      "Task: Define what you were responsible for. 'I was tasked with reducing page load time by 40% before our Q3 product launch.'",
      "Action: Describe specifically what YOU did (not 'we'). This is the longest part. 'I profiled the application, identified three database queries causing bottlenecks, implemented Redis caching, and coordinated with the DevOps team to optimize our CDN configuration.'",
      "Result: Quantify the outcome. 'We achieved a 52% reduction in load time, which contributed to a 15% increase in user engagement post-launch.'",
      "The key mistake candidates make is being too vague in the Action step. Interviewers want to understand your specific contribution, not the team's collective effort. Practice 5–7 STAR stories that cover themes like leadership, conflict resolution, failure/learning, innovation, and collaboration.",
      "TailoredApply's interview prep feature generates predicted questions based on the specific job description and creates STAR-formatted answer frameworks using examples from your actual resume—so you walk in prepared, not scripted.",
    ],
  },
  {
    slug: "ats-friendly-resume-tips",
    title: "ATS-Friendly Resume Tips: Get Past the Robots",
    description: "Practical formatting and content tips to ensure your resume passes Applicant Tracking Systems and reaches human reviewers.",
    category: "Resume Tips",
    icon: Search,
    readTime: "6 min read",
    content: [
      "Applicant Tracking Systems (ATS) are used by over 98% of Fortune 500 companies and most mid-size employers. If your resume isn't ATS-friendly, it may never reach a human reviewer—regardless of your qualifications.",
      "Use a clean, single-column layout. Avoid tables, text boxes, headers/footers, and graphics. ATS parsers read documents top-to-bottom, left-to-right. Complex layouts cause parsing failures that can scramble your information.",
      "Use standard section headings: 'Work Experience,' 'Education,' 'Skills,' 'Certifications.' Creative headings like 'Where I've Made an Impact' confuse ATS parsers. Stick to conventions.",
      "Include keywords from the job description naturally in your experience bullets. Don't keyword-stuff—modern ATS systems detect this. Instead, mirror the language of the posting. If they say 'stakeholder management,' use that phrase rather than 'client relations.'",
      "Save as PDF unless specifically asked for DOCX. Modern ATS systems handle PDFs well, and PDF preserves your formatting across devices. Name the file 'FirstName-LastName-Resume.pdf' for professionalism.",
      "Quantify achievements wherever possible. '12% revenue increase' parses better and impresses more than 'significant growth.' Numbers are universal language that both ATS and humans understand.",
    ],
  },
  {
    slug: "job-search-strategy-guide",
    title: "The 2026 Job Search Strategy: Quality Over Quantity",
    description: "Why applying to fewer, better-matched jobs gets more interviews than mass-applying, and how to build a systematic search process.",
    category: "Job Search",
    icon: Briefcase,
    readTime: "6 min read",
    content: [
      "The #1 mistake job seekers make is the 'spray and pray' approach—sending identical applications to 100+ jobs hoping something sticks. Research consistently shows that tailored applications to 15–20 well-matched roles outperform 100 generic ones.",
      "Start by defining your target: role type, industry, company size, location/remote preference, and compensation range. This narrows your search and ensures every application is intentional.",
      "For each target job, invest 20–30 minutes: analyze the job description, assess your genuine fit (tools like TailoredApply can calculate this instantly), tailor your cover letter to address the top requirements, and research the company for your cover letter hook.",
      "Track everything. Use a spreadsheet or tool with columns for: Company, Role, Date Applied, Fit Score, Status, Follow-up Date, and Notes. This prevents duplicate applications and ensures timely follow-ups.",
      "Network strategically. After applying, find 1–2 people at the company on LinkedIn. A brief, genuine message ('I just applied for the PM role and noticed your team shipped X—impressive work') can move your application to the top of the pile.",
      "Set a sustainable pace: 3–5 high-quality applications per day beats 20 rushed ones. Quality applications have a 15–25% callback rate versus 2–5% for generic submissions.",
    ],
  },
  {
    slug: "career-change-cover-letter",
    title: "Writing a Cover Letter for a Career Change",
    description: "How to position transferable skills and reframe your experience when switching industries or roles.",
    category: "Cover Letters",
    icon: Lightbulb,
    readTime: "6 min read",
    content: [
      "Career change cover letters require a different strategy than standard applications. You can't rely on direct experience—instead, you must draw compelling parallels between what you've done and what the role requires.",
      "Open by acknowledging the transition directly: 'After 7 years in financial analysis, I'm excited to bring my data-driven approach to product management at [Company].' This shows self-awareness and confidence.",
      "Identify 3–4 transferable skills that bridge your past and target role. A teacher moving to corporate training might highlight: curriculum design → program development, classroom management → facilitation skills, student assessment → performance measurement.",
      "For each transferable skill, provide a concrete STAR example. Don't just claim you're adaptable—prove it: 'When our school transitioned to remote learning in 48 hours, I redesigned the entire semester curriculum for virtual delivery, maintaining a 94% student satisfaction score.'",
      "Address the elephant in the room: why this change, why now, and why this company. Hiring managers want to know you've thought this through and aren't just fleeing your current field.",
      "TailoredApply can be particularly helpful for career changers because its semantic matching identifies transferable skill connections that keyword-based tools miss. It maps your actual experience to job requirements by understanding context, not just terminology.",
    ],
  },
];

const categories = [...new Set(articles.map(a => a.category))];

const Resources = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEOHead
        title="Job Search Resources – Cover Letter Tips, Interview Prep & Career Guides"
        description="Free expert guides on writing cover letters, acing interviews with the STAR method, optimizing your resume for ATS, and building an effective job search strategy. Updated for 2026."
        path="/resources"
      />
      <Header />
      <main className="flex-1 pt-24 pb-12">
        <div className="container mx-auto px-4 lg:px-8">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-3xl mx-auto mb-12"
          >
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-7 h-7 text-accent" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Career Resources & Guides
            </h1>
            <p className="text-xl text-muted-foreground">
              Expert advice on cover letters, interview preparation, resume optimization, and job search strategy—written by career professionals.
            </p>
          </motion.div>

          {/* Category filters */}
          <div className="flex flex-wrap gap-2 justify-center mb-10">
            {categories.map(cat => (
              <Badge key={cat} variant="secondary" className="text-sm px-3 py-1">
                {cat}
              </Badge>
            ))}
          </div>

          {/* Articles grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {articles.map((article, index) => {
              const Icon = article.icon;
              return (
                <motion.div
                  key={article.slug}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.08 }}
                >
                  <Link to={`/resources/${article.slug}`}>
                    <Card className="h-full hover:border-accent/50 transition-all duration-200 hover:shadow-lg cursor-pointer group">
                      <CardHeader>
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline" className="text-xs">
                            {article.category}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{article.readTime}</span>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center mb-3">
                          <Icon className="w-5 h-5 text-accent" />
                        </div>
                        <CardTitle className="text-lg leading-snug group-hover:text-accent transition-colors">
                          {article.title}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {article.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <span className="text-sm text-accent flex items-center gap-1 group-hover:gap-2 transition-all">
                          Read article <ArrowRight className="w-3 h-3" />
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              );
            })}
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center mt-16"
          >
            <div className="bg-accent/5 border border-accent/20 rounded-2xl p-8 max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Put These Tips Into Action
              </h2>
              <p className="text-muted-foreground mb-6">
                TailoredApply applies all these best practices automatically—generating tailored cover letters, calculating fit scores, and building interview prep from your real experience.
              </p>
              <Link to="/app">
                <Button variant="hero" size="lg">
                  Try TailoredApply Free
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Resources;
export { articles };
