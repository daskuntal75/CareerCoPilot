import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors-utils.ts";

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
## Step 1: Review the pre-analyzed requirements mapping provided in the analysis data
## Step 2: Write a compelling, tailored cover letter that addresses the key requirements

Use the fit score and requirements mapping from the analysis data exactly as provided - do NOT recalculate them.

## OUTPUT FORMAT
---
[COVER LETTER]
[Full cover letter text]
---
[REQUIREMENTS MAPPING TABLE]
| # | Job Requirement | Your Experience | Evidence |
|---|-----------------|-----------------|----------|
| 1-10 | [From analysis data] | [Match level from analysis] | [Evidence from analysis] |
---
[FIT SCORE]
Use the exact fit score from the analysis: {FIT_SCORE}%
---`;

// Rate limiting
async function checkRateLimit(supabase: SupabaseClient, userId: string): Promise<{ allowed: boolean; tier: string }> {
  const { data: sub } = await supabase.from("subscriptions").select("tier, status").eq("user_id", userId).eq("status", "active").maybeSingle();
  const tier = sub?.tier || "free";
  const limits: Record<string, number> = { free: 10, basic: 50, pro: 200, premium: 500, enterprise: -1 };
  const maxRequests = limits[tier] ?? 10;
  if (maxRequests === -1) return { allowed: true, tier };
  
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const { count } = await supabase.from("usage_logs").select("*", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", oneHourAgo);
  return { allowed: (count || 0) < maxRequests, tier };
}

// Get RAG verified experience
async function getVerifiedExperience(supabase: SupabaseClient, appId: string): Promise<string> {
  const { data: matches } = await supabase
    .from("requirement_matches")
    .select("similarity_score, match_evidence, requirement:job_requirements!inner(requirement_text), chunk:resume_chunks!inner(content)")
    .eq("requirement.application_id", appId)
    .gte("similarity_score", 0.5)
    .order("similarity_score", { ascending: false });
  
  if (!matches?.length) return "";
  const chunks = new Set<string>();
  const verified: string[] = [];
  for (const m of matches) {
    if (m.chunk?.content) chunks.add(m.chunk.content);
    if (m.requirement?.requirement_text && m.match_evidence) verified.push(`- ${m.requirement.requirement_text}: ${m.match_evidence}`);
  }
  return `\nVERIFIED EXPERIENCE:\n${[...chunks].join('\n\n')}\n\nVERIFIED MATCHES:\n${verified.slice(0, 10).join('\n')}`;
}

// Resolve model configuration
async function resolveModel(supabase: SupabaseClient, isRegen: boolean, override?: string): Promise<{
  model: string; isExternal: boolean; endpoint?: string; apiKeyVar?: string;
}> {
  let model = isRegen ? "google/gemini-2.5-flash-lite" : "google/gemini-3-flash-preview";
  let isExternal = false, endpoint: string | undefined, apiKeyVar: string | undefined;
  
  if (override) {
    model = override;
    isExternal = override.startsWith("external/");
  } else if (!isRegen) {
    const { data } = await supabase.from("admin_settings").select("setting_value").eq("setting_key", "ai_model_cover_letter").maybeSingle();
    if (data?.setting_value?.model) {
      model = data.setting_value.model;
      isExternal = model.startsWith("external/");
    }
  }
  
  if (isExternal) {
    const extId = model.replace("external/", "");
    const { data } = await supabase.from("admin_settings").select("setting_value").eq("setting_key", "external_ai_models").maybeSingle();
    const extModel = data?.setting_value?.models?.find((m: any) => m.id === extId);
    if (extModel) {
      model = extModel.modelId;
      endpoint = extModel.apiEndpoint;
      apiKeyVar = extModel.apiKeyEnvVar;
    }
  }
  return { model, isExternal, endpoint, apiKeyVar };
}

// Make AI request - returns { response, isAnthropicNonStreaming }
async function callAI(params: {
  model: string; systemPrompt: string; userPrompt: string; maxTokens: number; stream: boolean;
  isExternal: boolean; endpoint?: string; apiKeyVar?: string;
}): Promise<{ response: Response; isAnthropicNonStreaming: boolean }> {
  const { model, systemPrompt, userPrompt, maxTokens, stream, isExternal, endpoint, apiKeyVar } = params;
  
  if (isExternal && endpoint) {
    const apiKey = Deno.env.get(apiKeyVar || "");
    if (!apiKey) throw new Error(`API key ${apiKeyVar} not configured`);
    
    if (endpoint.includes("anthropic.com")) {
      // Anthropic API - always non-streaming for now
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "x-api-key": apiKey, "Content-Type": "application/json", "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model, system: systemPrompt, messages: [{ role: "user", content: userPrompt }], max_tokens: maxTokens }),
      });
      return { response, isAnthropicNonStreaming: true };
    }
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }], temperature: 0.7, max_tokens: maxTokens, stream }),
    });
    return { response, isAnthropicNonStreaming: false };
  }
  
  const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_KEY) throw new Error("LOVABLE_API_KEY not configured");
  
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
      stream,
      ...(model.startsWith("openai/") ? { max_completion_tokens: maxTokens } : { temperature: 0.7, max_tokens: maxTokens }),
    }),
  });
  return { response, isAnthropicNonStreaming: false };
}

// Create SSE stream from content for Anthropic responses
function createSseStream(content: string): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let sent = false;
  
  return new ReadableStream({
    start(controller) {
      if (!sent) {
        // Send the content as an SSE event in OpenAI format
        const event = {
          choices: [{ delta: { content }, index: 0 }]
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        sent = true;
        controller.close();
      }
    }
  });
}

serve(async (req) => {
  const preflightResponse = handleCorsPrelight(req);
  if (preflightResponse) return preflightResponse;
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const body = await req.json();
    const { resumeContent, jobDescription, jobTitle, company, analysisData, applicationId, userId,
      sectionToRegenerate, userFeedback, selectedTips, existingCoverLetter, stream = false, overrideModel } = body;

    if (!resumeContent || !jobDescription) {
      return new Response(JSON.stringify({ error: "Resume and job description required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Rate limit check
    if (userId) {
      const { allowed } = await checkRateLimit(supabase, userId);
      if (!allowed) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      await supabase.from("usage_logs").insert({ user_id: userId, action: "generate_cover_letter", metadata: { applicationId, company, jobTitle } });
    }

    const isRegen = !!(sectionToRegenerate && sectionToRegenerate !== "full");
    const modelConfig = await resolveModel(supabase, isRegen, overrideModel);

    // Get RAG context
    const verifiedExp = applicationId && userId ? await getVerifiedExperience(supabase, applicationId) : "";

    // Build analysis context
    let analysisContext = "";
    if (analysisData?.requirements) {
      const matches = analysisData.requirements.filter((r: any) => r.status === "yes").map((r: any) => `- ${r.requirement}: ${r.evidence}`).join("\n");
      const gaps = analysisData.requirements.filter((r: any) => r.status !== "yes").map((r: any) => `- ${r.requirement}: ${r.evidence}`).join("\n");
      analysisContext = `\nKEY MATCHES:\n${matches}\n\nGAPS:\n${gaps}`;
    }

    // Build user prompt
    let userPrompt = `<job_description>\n${jobDescription}\n</job_description>\n<job_title>${jobTitle} at ${company}</job_title>\n${verifiedExp || `<resume>\n${resumeContent}\n</resume>`}${analysisContext}\n\n`;

    if (isRegen && sectionPrompts[sectionToRegenerate]) {
      userPrompt += `REGENERATION: ${sectionPrompts[sectionToRegenerate]}`;
      if (userFeedback) userPrompt += `\nFeedback: ${userFeedback}`;
      if (selectedTips?.length) userPrompt += `\nGuidelines: ${selectedTips.map((t: string) => tipInstructions[t]).filter(Boolean).join("; ")}`;
      if (existingCoverLetter) userPrompt += `\nExisting:\n${existingCoverLetter}`;
      userPrompt += "\n\nReturn ONLY the regenerated section.";
    } else {
      const fitScore = analysisData?.fitScore || "N/A";
      userPrompt += USER_PROMPT.replace("{FIT_SCORE}", String(fitScore));
    }

    const { response, isAnthropicNonStreaming } = await callAI({
      model: modelConfig.model, systemPrompt: SYSTEM_PROMPT, userPrompt,
      maxTokens: isRegen ? 2000 : 4000, stream,
      isExternal: modelConfig.isExternal, endpoint: modelConfig.endpoint, apiKeyVar: modelConfig.apiKeyVar,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("AI error:", response.status, text);
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limits exceeded" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits depleted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error: ${response.status}`);
    }

    // For Anthropic, always parse JSON and optionally convert to SSE format
    if (isAnthropicNonStreaming) {
      const data = await response.json();
      const coverLetter = data.content?.[0]?.text;
      if (!coverLetter) throw new Error("Empty AI response");
      
      if (stream) {
        // Convert to SSE format for frontend compatibility
        const sseStream = createSseStream(coverLetter);
        return new Response(sseStream, { headers: { ...corsHeaders, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
      }
      return new Response(JSON.stringify({ coverLetter, regeneratedSection: sectionToRegenerate || null }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
