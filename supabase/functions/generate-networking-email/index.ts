import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors-utils.ts";

const SYSTEM_PROMPT = `You are a professional career coach helping craft effective networking emails.
Your emails should be:
- Warm and personable
- Reference the existing connection clearly
- Have a specific, reasonable ask
- Offer value or mutual benefit when possible
- Respectful of the recipient's time
- Professional yet friendly`;

const USER_PROMPT_TEMPLATE = `Generate a professional networking email about a job opportunity.

JOB OPPORTUNITY:
- Position: {jobTitle}
- Company: {company}

CONNECTION DETAILS:
{connectionContext}

CANDIDATE BACKGROUND (from cover letter):
{coverLetterExcerpt}

REQUIREMENTS:
1. Open with a warm, personalized greeting
2. Briefly remind them of your connection
3. Mention the opportunity you're interested in
4. Explain why you're reaching out to them specifically
5. Make a clear, reasonable request (informational interview, referral, advice)
6. Offer to make it easy for them (short call, coffee chat)
7. Express gratitude
8. Professional closing

OUTPUT FORMAT:
Subject: [Email subject line]

[Email body]

Keep the email personable and concise (180-250 words).`;

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
      contactName,
      connectionContext,
      requestType,
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

    if (userId) {
      await supabase.from("usage_logs").insert({
        user_id: userId,
        action: "generate_networking_email",
        metadata: { applicationId, company, jobTitle },
      });
    }

    let contextDetails = "";
    if (contactName || connectionContext || requestType) {
      contextDetails = "NETWORKING DETAILS:";
      if (contactName) contextDetails += `\n- Contact: ${contactName}`;
      if (connectionContext) contextDetails += `\n- Connection: ${connectionContext}`;
      if (requestType) contextDetails += `\n- Ask: ${requestType}`;
    }

    const coverLetterExcerpt = coverLetterContent.slice(0, 1500);

    const userPrompt = USER_PROMPT_TEMPLATE
      .replace("{jobTitle}", jobTitle)
      .replace("{company}", company)
      .replace("{connectionContext}", contextDetails)
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
