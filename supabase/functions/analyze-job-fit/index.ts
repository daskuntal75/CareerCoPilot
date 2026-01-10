import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { resumeContent, jobDescription, jobTitle, company, applicationId, userId } = await req.json();
    
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

    // Create Supabase client for database operations
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Extract top 10 job requirements from job description
    const extractPrompt = `Analyze this job description and extract the TOP 10 most decision-critical requirements.

Focus only on requirements that would materially influence a hiring decision for this role (e.g., ownership scope, leadership level, domain expertise, specific technical skills, years of experience). 

Exclude generic skills (e.g., "communication", "collaboration") unless they are uniquely emphasized in the posting.

JOB DESCRIPTION:
${jobDescription}

Return a JSON array of exactly 10 requirements in this format:
{
  "requirements": [
    {
      "index": 1,
      "text": "requirement text",
      "category": "technical|experience|leadership|domain|soft_skills",
      "is_critical": true|false
    }
  ]
}

Only return the JSON, no other text.`;

    const extractResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "user", content: extractPrompt },
        ],
      }),
    });

    if (!extractResponse.ok) {
      if (extractResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (extractResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Failed to extract requirements");
    }

    const extractData = await extractResponse.json();
    const extractContent = extractData.choices?.[0]?.message?.content || "";
    
    // Parse requirements
    const jsonMatch = extractContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse requirements JSON");
    }
    
    const { requirements: extractedRequirements } = JSON.parse(jsonMatch[0]);

    // Store requirements in database if applicationId provided
    if (applicationId) {
      // Delete existing requirements
      await supabase
        .from("job_requirements")
        .delete()
        .eq("application_id", applicationId);

      // Insert new requirements
      const reqsToInsert = extractedRequirements.map((req: any) => ({
        application_id: applicationId,
        requirement_index: req.index,
        requirement_text: req.text,
        category: req.category,
        is_critical: req.is_critical,
        metadata: {},
      }));

      await supabase.from("job_requirements").insert(reqsToInsert);
    }

    // Step 2: Get resume chunks from database or chunk the content
    let resumeChunks: { id?: string; content: string; chunk_type: string }[] = [];
    
    if (applicationId && userId) {
      const { data: chunks } = await supabase
        .from("resume_chunks")
        .select("id, content, chunk_type")
        .eq("user_id", userId)
        .order("chunk_index");
      
      if (chunks && chunks.length > 0) {
        resumeChunks = chunks;
      }
    }

    // If no chunks in DB, create temporary chunks from content
    if (resumeChunks.length === 0) {
      const words = resumeContent.split(/\s+/);
      const chunkSize = 650; // ~500 tokens worth of words
      for (let i = 0; i < words.length; i += 520) { // 100 token overlap
        const chunk = words.slice(i, i + chunkSize).join(' ');
        if (chunk.length > 50) {
          resumeChunks.push({ content: chunk, chunk_type: 'general' });
        }
      }
    }

    // Step 3: Semantic matching - find best resume chunks for each requirement
    const matchPrompt = `You are performing semantic matching between job requirements and resume content.

For each job requirement, identify which resume chunks (if any) provide evidence that the candidate meets this requirement.

JOB REQUIREMENTS:
${extractedRequirements.map((r: any, i: number) => `${i + 1}. ${r.text}`).join('\n')}

RESUME CHUNKS:
${resumeChunks.map((c, i) => `[CHUNK ${i}]: ${c.content}`).join('\n\n')}

For each requirement, return:
1. The matching chunk indices (0-indexed, up to 3 best matches)
2. A similarity score (0.0 to 1.0) indicating how well the resume evidence matches
3. The specific evidence from the resume (quote or paraphrase)
4. A match status: "yes" (strong match), "partial" (some evidence), "no" (no evidence)

CRITICAL: Only claim matches where there is genuine, documented experience. If a requirement cannot be directly supported, mark it as "no".

Return JSON in this format:
{
  "matches": [
    {
      "requirement_index": 1,
      "matching_chunk_indices": [0, 2],
      "similarity_score": 0.85,
      "evidence": "specific evidence from resume",
      "status": "yes|partial|no"
    }
  ]
}

Only return the JSON.`;

    const matchResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "user", content: matchPrompt },
        ],
      }),
    });

    if (!matchResponse.ok) {
      if (matchResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (matchResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add funds to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Failed to perform semantic matching");
    }

    const matchData = await matchResponse.json();
    const matchContent = matchData.choices?.[0]?.message?.content || "";
    
    const matchJsonMatch = matchContent.match(/\{[\s\S]*\}/);
    if (!matchJsonMatch) {
      throw new Error("Failed to parse matching JSON");
    }
    
    const { matches } = JSON.parse(matchJsonMatch[0]);

    // Store matches in database if applicationId provided
    if (applicationId) {
      // Get requirement IDs from database
      const { data: dbRequirements } = await supabase
        .from("job_requirements")
        .select("id, requirement_index")
        .eq("application_id", applicationId);

      if (dbRequirements && resumeChunks.some(c => c.id)) {
        // Delete existing matches
        for (const req of dbRequirements) {
          await supabase
            .from("requirement_matches")
            .delete()
            .eq("requirement_id", req.id);
        }

        // Insert new matches
        for (const match of matches) {
          const requirement = dbRequirements.find((r: any) => r.requirement_index === match.requirement_index);
          if (requirement && match.matching_chunk_indices) {
            for (const chunkIdx of match.matching_chunk_indices) {
              const chunk = resumeChunks[chunkIdx];
              if (chunk?.id) {
                await supabase.from("requirement_matches").insert({
                  requirement_id: requirement.id,
                  chunk_id: chunk.id,
                  similarity_score: match.similarity_score,
                  match_evidence: match.evidence,
                  is_verified: true,
                });
              }
            }
          }
        }
      }
    }

    // Step 4: Calculate fit score and prepare response
    const yesMatches = matches.filter((m: any) => m.status === "yes").length;
    const partialMatches = matches.filter((m: any) => m.status === "partial").length;
    const fitScore = Math.round((yesMatches * 10 + partialMatches * 5));
    
    let fitLevel: "strong" | "good" | "partial" | "low";
    if (fitScore >= 80) fitLevel = "strong";
    else if (fitScore >= 60) fitLevel = "good";
    else if (fitScore >= 40) fitLevel = "partial";
    else fitLevel = "low";

    // Build requirements response with matched evidence
    const requirements = extractedRequirements.map((req: any) => {
      const match = matches.find((m: any) => m.requirement_index === req.index);
      return {
        requirement: req.text,
        category: req.category,
        is_critical: req.is_critical,
        status: match?.status || "no",
        evidence: match?.evidence || "No direct match found in resume",
        similarity_score: match?.similarity_score || 0,
        matched_chunks: match?.matching_chunk_indices || [],
      };
    });

    return new Response(
      JSON.stringify({
        fitScore,
        fitLevel,
        requirements,
        totalRequirements: 10,
        strongMatches: yesMatches,
        partialMatches,
        noMatches: 10 - yesMatches - partialMatches,
        chunksAnalyzed: resumeChunks.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in analyze-job-fit:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
