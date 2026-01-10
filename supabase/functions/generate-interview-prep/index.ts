import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeContent, jobDescription, jobTitle, company, analysisData } = await req.json();
    
    if (!resumeContent || !jobDescription) {
      return new Response(
        JSON.stringify({ error: "Resume content and job description are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are acting as a senior professional preparing for an interview at a new company. Your task is to conduct comprehensive research, strategic analysis, and interview preparation for a specific role.

# CRITICAL RULES

## Accuracy Requirements:
- Base ALL interview question responses ONLY on actual experiences, achievements, and metrics from the provided resume
- DO NOT fabricate, embellish, or invent any metrics, outcomes, or experiences not present in the resume
- DO NOT combine metrics or details from different projects into a single response
- Maintain complete accuracy and truthfulness to the resume content

## Response Behavior:
- Answer directly using your best judgment
- Do not ask clarifying questions unless absolutely necessary
- If the job description is empty, missing, or inaccessible, immediately state: "I need the full job description text to proceed."

Return your response as a JSON object with this structure:
{
  "applicationContext": "string - brief summary of the role at company",
  "companyIntelligence": {
    "visionMission": "string - company vision and mission",
    "industryMarket": "string - sector, position, size",
    "financialPerformance": "string - recent revenue/performance if known",
    "productsServices": "string - key offerings"
  },
  "keyDomainConcepts": ["string - relevant technical/domain concepts to understand"],
  "strategicAnalysis": {
    "strengths": ["string - company strengths"],
    "criticalStrength": "string - #1 critical strength",
    "weaknesses": ["string - company weaknesses"],
    "criticalWeakness": "string - #1 critical weakness",
    "opportunities": ["string - company opportunities"],
    "criticalOpportunity": "string - #1 critical opportunity",
    "threats": ["string - company threats"],
    "criticalThreat": "string - #1 critical threat",
    "competitors": ["string - main competitors"],
    "competitivePosition": "string - market positioning"
  },
  "cultureAndBenefits": {
    "cultureInsights": ["string - key cultural attributes"],
    "standoutBenefits": ["string - unique benefits"]
  },
  "interviewStructure": {
    "coreRequirements": ["string - 3-5 critical requirements"],
    "keyCompetencies": ["string - traits and skills sought"],
    "predictedFormat": "string - format prediction"
  },
  "uniqueValueProposition": "string - candidate's unique value prop for this role",
  "whyThisCompany": "string - compelling reason for choosing this company",
  "questions": [
    {
      "question": "string - the interview question",
      "category": "recruiter" | "hiring_manager" | "peer" | "technical" | "vp" | "panel",
      "difficulty": "easy" | "medium" | "hard",
      "whyAsked": "string - why this question is likely",
      "starAnswer": {
        "situation": "string - specific situation from resume",
        "task": "string - the challenge from resume",
        "action": "string - actions taken from resume",
        "result": "string - SMART outcome (Specific, Measurable, Achievable, Relevant, Time-bound) from resume"
      },
      "tips": ["string - additional tips"]
    }
  ],
  "questionsToAsk": {
    "forRecruiter": ["string - 3 strategic questions"],
    "forHiringManager": ["string - 3 strategic questions"],
    "forPeer": ["string - 3 strategic questions"],
    "forTechnicalLead": ["string - 3 strategic questions"],
    "forVP": ["string - 3 strategic questions"]
  },
  "keyStrengths": ["string - strengths to emphasize based on resume"],
  "potentialConcerns": ["string - concerns to address proactively"]
}

Generate 8-12 interview questions covering different interviewer types (recruiter, hiring manager, peer, technical, VP, panel).
For EACH question, use the STAR + SMART format with content ONLY from the resume.`;

    const analysisContext = analysisData ? `
ANALYSIS SUMMARY:
Fit Score: ${analysisData.fitScore}%
${analysisData.requirements
  .map((r: any) => `- ${r.requirement}: ${r.status} - ${r.evidence}`)
  .join("\n")}
` : "";

    const userPrompt = `Here is the resume containing actual skills, experiences, and achievements:

<resume>
${resumeContent}
</resume>

Here is the job description for this role:

<job_description>
${jobDescription}
</job_description>

<job_title>
${jobTitle}
</job_title>

<company_name>
${company}
</company_name>
${analysisContext}

# YOUR TASK

Complete a comprehensive interview preparation covering five phases:

## Phase 1: Information Gathering & Validation
- Acknowledge the application context (job title at company)
- Review and validate the job description is complete
- Research concrete company data:
  - Current vision/mission statement
  - Industry sector and market position
  - Specific employee count if available
  - Recent financial performance (revenue, profit with timeframes)
  - Key products/services and customer segments

## Phase 2: Strategic Analysis
- Conduct comprehensive SWOT analysis:
  - List key items in each quadrant (Strengths, Weaknesses, Opportunities, Threats)
  - Identify the #1 most critical factor in each quadrant
- Map competitive landscape

## Phase 3: Cultural & Benefits Research
- Research company culture and work environment insights
- Focus on insights relevant to director-level or senior roles
- Identify unique or standout employee benefits

## Phase 4: Interview Preparation
- Define core role requirements and key competencies the company seeks
- Create a Unique Value Proposition statement based on resume experience and how it helps with the company's vision
- Prepare a statement about why this company would be chosen
- Predict interview structure (behavioral, product sense, technical, case studies)
- Generate 8-12 highly probable, role-specific interview questions segmented by interviewer type:
  - Recruiter Screen (2-3 questions)
  - Hiring Manager (2-3 questions)
  - Product Director/Peer (2-3 questions)
  - Technical Lead/Engineering mgr (2-3 questions)
  - VP (assessing culture fit) (2-3 questions)
  - Group/Panel (1-2 questions)

For EACH question, draft the best possible answer using STAR + SMART format:
- Situation: Set context from actual resume experience
- Task: Describe the challenge from resume
- Action: Detail specific actions taken (from resume only)
- Result: Provide concrete outcomes using SMART framework (Specific, Measurable, Achievable, Relevant, Time-bound) - from resume only

## Phase 5: Question Generation
Develop 3 insightful, strategic questions for the candidate to ask at each stage:
- Questions for Recruiter
- Questions for Hiring Manager
- Questions for Product Director/Peer
- Questions for Technical Lead/Engineering mgr
- Questions for VP (assessing culture fit)

Return the complete analysis as a JSON object following the structure in the system prompt.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    // Parse the JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse AI response");
    }
    
    const interviewPrep = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(interviewPrep), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-interview-prep:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
