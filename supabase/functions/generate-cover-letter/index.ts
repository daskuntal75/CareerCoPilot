import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Section-specific prompts for regeneration
const sectionPrompts: Record<string, string> = {
  opening: `Focus ONLY on regenerating the opening paragraph. Create an attention-grabbing, professional yet engaging introduction that immediately captures the reader's interest. Return ONLY the new opening paragraph text.`,
  skills: `Focus ONLY on regenerating the skills and experience section. Highlight the most relevant skills and experiences that match the job requirements. Use STAR format for key achievements. Return ONLY the skills/experience paragraphs.`,
  achievements: `Focus ONLY on regenerating the key achievements section. Emphasize quantifiable results and impactful accomplishments from the resume. Use SMART metrics where available. Return ONLY the achievements content.`,
  motivation: `Focus ONLY on regenerating the "why this company" section. Express genuine interest in the company, its mission, culture, and how the candidate's values align. Return ONLY the motivation paragraph.`,
  closing: `Focus ONLY on regenerating the closing paragraph. Create a strong call-to-action that expresses enthusiasm and invites further discussion. Return ONLY the closing paragraph.`,
  full: `Regenerate the ENTIRE cover letter with improvements based on the feedback provided. Create a complete, polished cover letter.`,
};

const tipInstructions: Record<string, string> = {
  more_specific: "Include more specific examples with concrete details from the candidate's actual experience.",
  shorter: "Make the content more concise - reduce word count and get to the point faster.",
  longer: "Expand with more detail and elaboration to provide richer context.",
  formal: "Use a more formal, professional, traditional tone throughout.",
  conversational: "Use a more conversational, friendly, approachable tone.",
  quantify: "Add more metrics, numbers, and quantifiable achievements.",
  passion: "Express more genuine enthusiasm, interest, and passion for the role and company.",
  unique: "Emphasize unique differentiating factors that set this candidate apart.",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      resumeContent, 
      jobDescription, 
      jobTitle, 
      company, 
      analysisData, 
      applicationId, 
      userId,
      // New fields for section-based regeneration
      sectionToRegenerate,
      userFeedback,
      selectedTips,
      existingCoverLetter,
    } = await req.json();
    
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

    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // RAG: Retrieve only verified, matched resume chunks for cover letter generation
    let verifiedExperience = "";
    
    if (applicationId && userId) {
      // Get matched chunks with high similarity scores
      const { data: matches } = await supabase
        .from("requirement_matches")
        .select(`
          similarity_score,
          match_evidence,
          requirement:job_requirements!inner(requirement_text, application_id),
          chunk:resume_chunks!inner(content, chunk_type)
        `)
        .eq("requirement.application_id", applicationId)
        .gte("similarity_score", 0.5)
        .order("similarity_score", { ascending: false });

      if (matches && matches.length > 0) {
        // Build verified experience from matched chunks
        const uniqueChunks = new Map<string, string>();
        const verifiedRequirements: string[] = [];

        for (const match of matches) {
          const chunk = match.chunk as any;
          const requirement = match.requirement as any;
          
          if (chunk?.content && !uniqueChunks.has(chunk.content)) {
            uniqueChunks.set(chunk.content, chunk.content);
          }
          
          if (requirement?.requirement_text && match.match_evidence) {
            verifiedRequirements.push(`- ${requirement.requirement_text}: ${match.match_evidence}`);
          }
        }

        verifiedExperience = `
VERIFIED EXPERIENCE (RAG-Retrieved - USE ONLY THIS):
${Array.from(uniqueChunks.values()).join('\n\n')}

VERIFIED REQUIREMENT MATCHES:
${verifiedRequirements.slice(0, 10).join('\n')}
`;
      }
    }

    // Build analysis context from analysisData
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

    // Build regeneration context if this is a regeneration request
    let regenerationContext = "";
    if (sectionToRegenerate && sectionPrompts[sectionToRegenerate]) {
      regenerationContext = `\n\n# REGENERATION REQUEST\n`;
      regenerationContext += `You are regenerating a SPECIFIC SECTION of an existing cover letter.\n`;
      regenerationContext += `\n## Section to Regenerate: ${sectionToRegenerate.toUpperCase()}\n`;
      regenerationContext += `\n## Instructions:\n${sectionPrompts[sectionToRegenerate]}\n`;
      
      if (userFeedback) {
        regenerationContext += `\n## User Feedback (IMPORTANT - address this specifically):\n${userFeedback}\n`;
      }
      
      if (selectedTips && selectedTips.length > 0) {
        regenerationContext += `\n## Improvement Guidelines:\n`;
        for (const tip of selectedTips) {
          if (tipInstructions[tip]) {
            regenerationContext += `- ${tipInstructions[tip]}\n`;
          }
        }
      }
      
      if (existingCoverLetter) {
        regenerationContext += `\n## Existing Cover Letter (for context):\n${existingCoverLetter}\n`;
      }
    }

    const systemPrompt = `You are acting as a senior professional who is considering external opportunities. Your task is to analyze a job posting, compare it against the resume materials, and create a compelling cover letter that demonstrates fit for the role. Maintain a professional yet light-hearted and engaging tone.

# CRITICAL TRUTHFULNESS CONSTRAINT:
You must not invent, infer, or embellish any experience, scope, metrics, or responsibilities that are not explicitly supported by the provided VERIFIED EXPERIENCE. If a job requirement cannot be directly supported by resume evidence, explicitly state "No direct match" in the mapping table and do not imply experience in the cover letter.

# RAG GROUNDING RULE:
You MUST ONLY use experiences, metrics, and achievements that appear in the VERIFIED EXPERIENCE section. Do not fabricate or infer any additional qualifications.`;

    let userPrompt: string;
    
    if (sectionToRegenerate && sectionToRegenerate !== "full") {
      // Section-specific regeneration
      userPrompt = `Here is the job posting information:

<job_posting>
${jobDescription}
</job_posting>

<job_title>
${jobTitle} at ${company}
</job_title>

${verifiedExperience || `<resume>
${resumeContent}
</resume>`}
${analysisContext}
${regenerationContext}

IMPORTANT: Return ONLY the regenerated section content. Do not include the full cover letter or any other sections.`;
    } else {
      // Full cover letter generation (original or full regeneration)
      userPrompt = `Here is the job posting information:

<job_posting>
${jobDescription}
</job_posting>

Here is the job title:
<job_title>
${jobTitle} at ${company}
</job_title>

${verifiedExperience || `Here is the resume:
<resume>
${resumeContent}
</resume>`}
${analysisContext}
${regenerationContext}

# Checklist of Sub-Tasks

Before beginning substantive work, perform these conceptual sub-tasks:

1. Review the job posting and extract the top 10 specific job requirements
2. Analyze the VERIFIED EXPERIENCE to identify relevant skills, experiences, and achievements
3. Map actual skills and experiences to each of the top 10 job requirements (be honest - do not embellish or fabricate)
4. Calculate a job fit percentage based on how many requirements are genuinely met
5. Draft a cover letter that weaves matching qualifications into compelling narratives using STAR + SMART format (without spelling out the acronym)
6. Validate all outputs for completeness, accuracy, and clarity

# Detailed Instructions

## Step 1: Extract the 10 most decision-critical job requirements
Focus only on requirements that would materially influence a hiring decision for this role.

## Step 2: Analyze Qualifications
Review the VERIFIED EXPERIENCE thoroughly and extract all relevant skills, experiences, achievements, and qualifications.

## Step 3: Create Honest Mapping
For each matched requirement, explicitly name why this experience matters for this specific role. Only claim matches where there is genuine, documented experience in the VERIFIED EXPERIENCE section.

## Step 4: Calculate Job Fit Percentage
Count how many of the top 10 requirements are genuinely met and calculate percentage.

## Step 5: Draft the Cover Letter

Write a professional, concise cover letter:
- **Opening Paragraph**: Light-hearted and attention-grabbing while remaining professional
- **Body Paragraphs**: Focus on the top 3 job requirements using ONLY verified experience
- **Job Fit Statement**: Reference the calculated fit percentage
- **Closing**: Polite, professional, and impactful
- **Tone**: Professional yet engaging, ATS-friendly

## Step 6: Create Job Requirements Mapping Table
Show all 10 requirements with matching evidence or "No direct match"

## Step 7: Self-Validation
Verify all claims are factually accurate based on VERIFIED EXPERIENCE only.

# Output Format

Your final response should contain:
1. **Professional Cover Letter**: Complete, ready-to-send
2. **Job Requirements to Experience Mapping Table**: 10 requirements with evidence
3. **Job Fit Calculation**: Methodology and percentage`;
    }

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
    const coverLetter = data.choices?.[0]?.message?.content;

    return new Response(JSON.stringify({ 
      coverLetter,
      regeneratedSection: sectionToRegenerate || null,
    }), {
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
