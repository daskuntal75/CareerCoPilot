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

    const systemPrompt = `You are acting as a senior professional who is considering external opportunities. Your task is to analyze a job posting, compare it against the resume materials, and create a compelling cover letter that demonstrates fit for the role. Maintain a professional yet light-hearted and engaging tone.

# Truthfulness Constraint:
You must not invent, infer, or embellish any experience, scope, metrics, or responsibilities that are not explicitly supported by the provided resume. If a job requirement cannot be directly supported by resume evidence, explicitly state "No direct match" in the mapping table and do not imply experience in the cover letter.`;

    const analysisContext = analysisData ? `
KEY MATCHES FROM ANALYSIS:
${analysisData.requirements
  .filter((r: any) => r.status === "yes")
  .map((r: any) => `- ${r.requirement}: ${r.evidence}`)
  .join("\n")}

GAPS TO ADDRESS:
${analysisData.requirements
  .filter((r: any) => r.status === "no" || r.status === "partial")
  .map((r: any) => `- ${r.requirement}: ${r.evidence}`)
  .join("\n")}
` : "";

    const userPrompt = `Here is the job posting information:

<job_posting>
${jobDescription}
</job_posting>

Here is the job title:
<job_title>
${jobTitle} at ${company}
</job_title>

Here is the resume:
<resume>
${resumeContent}
</resume>
${analysisContext}

# Checklist of Sub-Tasks

Before beginning substantive work, perform these conceptual sub-tasks:

1. Review the job posting and extract the top 10 specific job requirements
2. Analyze the resume to identify relevant skills, experiences, and achievements
3. Map actual skills and experiences to each of the top 10 job requirements (be honest - do not embellish or fabricate)
4. Calculate a job fit percentage based on how many requirements are genuinely met
5. Draft a cover letter that weaves matching qualifications into compelling narratives using STAR + SMART format (without spelling out the acronym)
6. Validate all outputs for completeness, accuracy, and clarity

# Detailed Instructions

## Step 1: Extract the 10 most decision-critical job requirements
Focus only on requirements that would materially influence a hiring decision for this role (e.g., ownership scope, leadership level, domain expertise). Exclude generic skills (e.g., "communication", "collaboration") unless they are uniquely emphasized in the posting.

## Step 2: Analyze Qualifications
Review the resume thoroughly and extract all relevant skills, experiences, achievements, and qualifications that could potentially match the job requirements. Pay special attention to:
- Specific product/domain experiences
- Technical skills and domain expertise
- Leadership and team management examples

## Step 3: Create Honest Mapping
For each matched requirement, explicitly name why this experience matters for this specific role, not just what was done previously.

For each of the top 10 job requirements, determine whether there is matching experience from the resume. Be completely honest - only claim matches where there is genuine, documented experience. For each match:
- Identify the specific resume content that demonstrates this qualification
- Note any measurable outcomes or metrics
- Prepare to describe this using STAR + SMART format without spelling out the acronym

## Step 4: Calculate Job Fit Percentage
Calculate the job fit percentage using this method:
- Count how many of the top 10 requirements are genuinely met (based on honest mapping)
- Divide by 10 and multiply by 100 to get the percentage
- Clearly document this calculation and methodology

## Step 5: Draft the Cover Letter

Write a professional, concise cover letter with the following characteristics:

- **Opening Paragraph**: Make it light-hearted and attention-grabbing while remaining professional. This should stand out from typical cover letters and draw the reader in.
- **Body Paragraphs**: Focus on the top 3 job requirements and weave matching experiences into compelling, easy-flowing stories. Make the narrative flow naturally rather than feeling like a checklist.
- **Job Fit Statement**: Explicitly state why this role is a top choice by referencing the calculated fit percentage. Show the calculation method clearly.
- **Relocation Statement**: Mention willingness to relocate for the right role and incentives, if applicable.
- **Closing**: Keep it polite, professional, and impactful.
- **Overall Tone**: Professional yet light-hearted and engaging. Easy to read. Should pass ATS filters by including relevant keywords from the job posting.

## Step 6: Create Job Requirements Mapping Table

After the cover letter, create a structured table showing:
- All 10 job requirements
- Matching skills/experiences for each (or "No direct match" if honest assessment shows no match)
- Brief supporting evidence from the resume
- The job fit percentage calculation with clear methodology

## Step 7: Self-Validation

Before finalizing, check that:
- Each of the top 10 job requirements has been addressed in the analysis
- The top 3 requirements are woven into the cover letter body
- All claims are factually accurate based on the resume provided
- The job fit calculation is correct and methodology is clearly explained
- No embellishment or fabrication has occurred
- The cover letter is concise, clear, and professionally formatted
- The tone is appropriately light-hearted in the opening while remaining professional throughout

If any requirement is missing or incorrectly mapped, self-correct before providing final output.

# Output Format

Your final response should contain:

1. **Professional Cover Letter**: A complete, ready-to-send cover letter following all guidelines above. Format it properly with appropriate spacing and structure.

2. **Job Requirements to Experience Mapping Table**: A clear table showing:
   - All 10 identified job requirements
   - Matching qualifications for each
   - Supporting evidence from resume

3. **Job Fit Calculation**: A clear explanation of methodology and the calculated percentage, showing the work.

Do not include scratchwork, internal deliberations, or step-by-step processing notes in your final output. Provide only the polished final deliverables.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
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
    const coverLetter = data.choices?.[0]?.message?.content;

    return new Response(JSON.stringify({ coverLetter }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in generate-cover-letter:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
