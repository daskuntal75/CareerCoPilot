import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors-utils.ts";

const SYSTEM_PROMPT = `You are a professional career coach helping craft thoughtful post-interview thank you emails.
Your emails should be:
- Warm and genuine
- Reference specific conversation points from the interview
- Reinforce the candidate's fit for the role
- Professional but personable
- Concise (under 200 words)`;

const USER_PROMPT_TEMPLATE = `Generate a professional thank you email after a job interview.

JOB DETAILS:
- Position: {jobTitle}
- Company: {company}

INTERVIEW CONTEXT:
{interviewContext}

COVER LETTER CONTEXT (use this to understand the candidate's background):
{coverLetterExcerpt}

REQUIREMENTS:
1. Thank the interviewer for their time
2. Reference a specific topic or moment from the interview (or make a reasonable assumption)
3. Reinforce enthusiasm for the role
4. Briefly highlight why you're a great fit
5. Express interest in next steps
6. Professional sign-off

OUTPUT FORMAT:
Subject: [Email subject line]

[Email body]

Keep the email concise and genuine (150-200 words).`;

serve(async (req) => {
  const preflightResponse = handleCorsPrelight(req);
  if (preflightResponse) return preflightResponse;
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const body = await req.json();
    const { 
      jobTitle, 
      company, 
      coverLetterContent, 
      interviewerName,
      interviewDate,
      keyTopics,
      applicationId, 
      userId 
    } = body;

    if (!jobTitle || !company || !coverLetterContent) {
      return new Response(
        JSON.stringify({ error: "Job title, company, and cover letter content are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Log usage if userId provided
    if (userId) {
      await supabase.from("usage_logs").insert({
        user_id: userId,
        action: "generate_thank_you_email",
        metadata: { applicationId, company, jobTitle },
      });
    }

    // Build interview context
    let interviewContext = "";
    if (interviewerName || interviewDate || keyTopics) {
      interviewContext = "INTERVIEW DETAILS:";
      if (interviewerName) interviewContext += `\n- Interviewer: ${interviewerName}`;
      if (interviewDate) interviewContext += `\n- Date: ${interviewDate}`;
      if (keyTopics) interviewContext += `\n- Key Topics: ${keyTopics}`;
    }

    const coverLetterExcerpt = coverLetterContent.slice(0, 1500);

    const userPrompt = USER_PROMPT_TEMPLATE
      .replace("{jobTitle}", jobTitle)
      .replace("{company}", company)
      .replace("{interviewContext}", interviewContext)
      .replace("{coverLetterExcerpt}", coverLetterExcerpt);

    const LOVABLE_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI error:", aiResponse.status, errorText);
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const email = aiData.choices?.[0]?.message?.content;

    if (!email) throw new Error("Empty AI response");

    return new Response(
      JSON.stringify({ email }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
