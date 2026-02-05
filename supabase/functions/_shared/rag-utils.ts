/**
 * RAG (Retrieval Augmented Generation) Utilities
 * 
 * Handles retrieval of verified resume chunks and requirement matches
 * to provide grounded context for cover letter generation.
 */

import { SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface RequirementMatch {
  similarity_score: number;
  match_evidence: string;
  requirement: {
    requirement_text: string;
    application_id: string;
  };
  chunk: {
    content: string;
    chunk_type: string;
  };
}

/**
 * Retrieve verified experience from RAG system
 */
export async function retrieveVerifiedExperience(
  supabase: SupabaseClient,
  applicationId: string,
  userId: string
): Promise<string> {
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

  if (!matches || matches.length === 0) {
    return "";
  }

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

  return `
VERIFIED EXPERIENCE (USE ONLY THIS):
${Array.from(uniqueChunks.values()).join('\n\n')}

VERIFIED MATCHES:
${verifiedRequirements.slice(0, 10).join('\n')}
`;
}

/**
 * Fetch custom prompts from admin settings
 */
export async function fetchCustomPrompts(
  supabase: SupabaseClient
): Promise<{
  customSystemPrompt: string | null;
  customUserPromptTemplate: string | null;
}> {
  const { data: promptSettings } = await supabase
    .from("admin_settings")
    .select("setting_key, setting_value")
    .in("setting_key", ["ai_cover_letter_system_prompt", "ai_cover_letter_user_prompt"]);

  let customSystemPrompt: string | null = null;
  let customUserPromptTemplate: string | null = null;

  promptSettings?.forEach((setting: { setting_key: string; setting_value: { prompt?: string } }) => {
    if (setting.setting_key === "ai_cover_letter_system_prompt" && setting.setting_value?.prompt) {
      customSystemPrompt = setting.setting_value.prompt;
    }
    if (setting.setting_key === "ai_cover_letter_user_prompt" && setting.setting_value?.prompt) {
      customUserPromptTemplate = setting.setting_value.prompt;
    }
  });

  return { customSystemPrompt, customUserPromptTemplate };
}
