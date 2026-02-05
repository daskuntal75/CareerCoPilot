import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const sectionPrompts: Record<string, string> = {
  opening: "Focus ONLY on the opening paragraph. Create an attention-grabbing, professional introduction.",
  skills: "Focus ONLY on skills/experience section. Highlight relevant skills using STAR format.",
  achievements: "Focus ONLY on achievements. Emphasize quantifiable results with SMART metrics.",
  motivation: "Focus ONLY on 'why this company' section. Express genuine interest and alignment.",
  closing: "Focus ONLY on the closing. Create a strong call-to-action.",
  full: "Regenerate the ENTIRE cover letter with requirements mapping table and fit calculation.",
};

const tipInstructions: Record<string, string> = {
  more_specific: "Include more specific examples.",
  shorter: "Make content more concise.",
  longer: "Expand with more detail.",
  formal: "Use a more formal tone.",
  conversational: "Use a conversational tone.",
  quantify: "Add more metrics.",
  passion: "Express more enthusiasm.",
  unique: "Emphasize unique differentiating factors.",
};

const SYSTEM_PROMPT = `You are a senior professional analyzing a job posting against resume materials to create a compelling cover letter.
Do not invent experience not in the resume. If a requirement has no match, state "No direct match".
Only use information from the delimited <job_description> and <resume> sections.`;

const USER_PROMPT = `# TASK
## Step 1: Extract Top 10 Job Requirements
## Step 2: Map Experience to Requirements
## Step 3: Calculate Fit Score (requirements met / 10 * 100)
## Step 4: Write Cover Letter

## OUTPUT FORMAT
---
[COVER LETTER]
[Full cover letter text]
---
[REQUIREMENTS MAPPING TABLE]
| # | Job Requirement | Your Experience | Evidence |
|---|-----------------|-----------------|----------|
| 1-10 | [Requirements] | [Match level] | [Evidence] |
---
[FIT SCORE CALCULATION]
Requirements Met: X out of 10
**Fit Score: XX%**
---`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { resumeContent, jobDescription, jobTitle, company, sectionToRegenerate, userFeedback, selectedTips, existingCoverLetter, stream = false } = body;

    if (!resumeContent || !jobDescription) {
      return new Response(JSON.stringify({ error: "Resume and job description required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Get model config
    let model = "google/gemini-3-flash-preview";
    const { data: modelSetting } = await supabase.from("admin_settings").select("setting_value").eq("setting_key", "ai_model_cover_letter").maybeSingle();
    if (modelSetting?.setting_value?.model) model = modelSetting.setting_value.model;

    // Build prompts
    const isRegen = sectionToRegenerate && sectionToRegenerate !== "full";
    let userPrompt = `<job_description>\n${jobDescription}\n</job_description>\n<job_title>${jobTitle} at ${company}</job_title>\n<resume>\n${resumeContent}\n</resume>\n\n`;

    if (isRegen && sectionPrompts[sectionToRegenerate]) {
      userPrompt += `REGENERATION: ${sectionPrompts[sectionToRegenerate]}`;
      if (userFeedback) userPrompt += `\nFeedback: ${userFeedback}`;
      if (selectedTips?.length) userPrompt += `\nGuidelines: ${selectedTips.map((t: string) => tipInstructions[t]).filter(Boolean).join("; ")}`;
      if (existingCoverLetter) userPrompt += `\nExisting:\n${existingCoverLetter}`;
      userPrompt += "\n\nReturn ONLY the regenerated section.";
    } else {
      userPrompt += USER_PROMPT;
    }

    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }],
        stream,
        ...(model.startsWith("openai/") ? { max_completion_tokens: isRegen ? 2000 : 4000 } : { temperature: 0.7, max_tokens: isRegen ? 2000 : 4000 }),
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("AI error:", response.status, text);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limits exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits depleted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${response.status}`);
    }

    if (stream) {
      return new Response(response.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
    }

    const data = await response.json();
    const coverLetter = data.choices?.[0]?.message?.content;
    if (!coverLetter) throw new Error("Empty AI response");

    return new Response(JSON.stringify({ coverLetter, regeneratedSection: sectionToRegenerate || null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
