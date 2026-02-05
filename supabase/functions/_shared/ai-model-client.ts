/**
 * AI Model Client Utilities
 * 
 * Handles model selection and API calls for different AI providers:
 * - Lovable AI Gateway (default)
 * - Anthropic (Claude models)
 * - OpenAI-compatible external models
 */

import { SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface ModelConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  isExternalModel: boolean;
  externalConfig?: {
    apiEndpoint?: string;
    apiKeyEnvVar?: string;
  };
}

export interface ExternalModel {
  id: string;
  apiEndpoint: string;
  apiKeyEnvVar: string;
  modelId: string;
  maxTokens: number;
  defaultTemperature: number;
}

export interface AIRequestParams {
  systemPrompt: string;
  userPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  stream: boolean;
}

/**
 * Fetch admin-configured model for a specific setting key
 */
export async function fetchAdminConfiguredModel(
  supabase: SupabaseClient,
  settingKey: string
): Promise<string | null> {
  try {
    const { data: modelSetting } = await supabase
      .from("admin_settings")
      .select("setting_value")
      .eq("setting_key", settingKey)
      .maybeSingle();
    
    if (modelSetting?.setting_value) {
      const setting = modelSetting.setting_value as { model?: string };
      if (setting.model) {
        console.log(`Using admin-configured model: ${setting.model}`);
        return setting.model;
      }
    }
  } catch (e) {
    console.error("Failed to fetch model setting:", e);
  }
  return null;
}

/**
 * Fetch external model configuration by ID
 */
export async function fetchExternalModelConfig(
  supabase: SupabaseClient,
  externalModelId: string
): Promise<ExternalModel | null> {
  try {
    const { data: extModels } = await supabase
      .from("admin_settings")
      .select("setting_value")
      .eq("setting_key", "external_ai_models")
      .maybeSingle();
    
    if (extModels?.setting_value) {
      const modelsData = extModels.setting_value as { models?: ExternalModel[] };
      const extModel = modelsData.models?.find(m => m.id === externalModelId);
      if (extModel) {
        console.log(`Using external model: ${extModel.modelId} via ${extModel.apiEndpoint}`);
        return extModel;
      }
    }
  } catch (e) {
    console.error("Failed to fetch external model config:", e);
  }
  return null;
}

/**
 * Determine model configuration based on settings and overrides
 */
export async function resolveModelConfig(
  supabase: SupabaseClient,
  options: {
    isRegeneration: boolean;
    overrideModel?: string;
    overrideTemperature?: number;
    overrideMaxTokens?: number;
    settingKey?: string;
  }
): Promise<ModelConfig> {
  const {
    isRegeneration,
    overrideModel,
    overrideTemperature,
    overrideMaxTokens,
    settingKey = "ai_model_cover_letter",
  } = options;

  // Default model selection
  let model = isRegeneration 
    ? "google/gemini-2.5-flash-lite" 
    : "google/gemini-3-flash-preview";
  let temperature = overrideTemperature ?? 0.7;
  let maxTokens = overrideMaxTokens ?? (isRegeneration ? 2000 : 4000);
  let isExternalModel = false;
  let externalConfig: ModelConfig["externalConfig"] = {};

  // Check for model override (used in comparisons)
  if (overrideModel) {
    model = overrideModel;
    isExternalModel = overrideModel.startsWith("external/");
  } else if (!isRegeneration) {
    // Fetch admin-configured model
    const configuredModel = await fetchAdminConfiguredModel(supabase, settingKey);
    if (configuredModel) {
      model = configuredModel;
      isExternalModel = configuredModel.startsWith("external/");
    }
  }

  // If external model, fetch its configuration
  if (isExternalModel) {
    const externalModelId = model.replace("external/", "");
    const extModel = await fetchExternalModelConfig(supabase, externalModelId);
    
    if (extModel) {
      externalConfig = {
        apiEndpoint: extModel.apiEndpoint,
        apiKeyEnvVar: extModel.apiKeyEnvVar,
      };
      model = extModel.modelId;
      maxTokens = overrideMaxTokens ?? extModel.maxTokens;
      temperature = overrideTemperature ?? extModel.defaultTemperature;
    }
  }

  return {
    model,
    temperature,
    maxTokens,
    isExternalModel,
    externalConfig,
  };
}

/**
 * Call Anthropic API (Claude models)
 */
export async function callAnthropicAPI(
  params: AIRequestParams,
  apiEndpoint: string,
  apiKey: string,
  signal: AbortSignal
): Promise<Response> {
  return await fetch(apiEndpoint, {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: params.model,
      system: params.systemPrompt,
      messages: [{ role: "user", content: params.userPrompt }],
      max_tokens: params.maxTokens,
    }),
    signal,
  });
}

/**
 * Call OpenAI-compatible API
 */
export async function callOpenAICompatibleAPI(
  params: AIRequestParams,
  apiEndpoint: string,
  apiKey: string,
  signal: AbortSignal
): Promise<Response> {
  return await fetch(apiEndpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
      temperature: params.temperature,
      max_tokens: params.maxTokens,
      stream: params.stream,
    }),
    signal,
  });
}

/**
 * Call Lovable AI Gateway
 */
export async function callLovableAIGateway(
  params: AIRequestParams,
  apiKey: string,
  signal: AbortSignal
): Promise<Response> {
  return await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: params.model,
      messages: [
        { role: "system", content: params.systemPrompt },
        { role: "user", content: params.userPrompt },
      ],
      stream: params.stream,
      // OpenAI GPT-5 models don't support custom temperature, only default (1)
      ...(params.model.startsWith("openai/") ? {} : { temperature: params.temperature }),
      // Use max_completion_tokens for OpenAI models, max_tokens for others
      ...(params.model.startsWith("openai/") 
        ? { max_completion_tokens: params.maxTokens }
        : { max_tokens: params.maxTokens }),
    }),
    signal,
  });
}

/**
 * Make AI request to the appropriate provider
 */
export async function makeAIRequest(
  config: ModelConfig,
  params: AIRequestParams,
  signal: AbortSignal
): Promise<Response> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (config.isExternalModel && config.externalConfig?.apiEndpoint) {
    const apiKey = Deno.env.get(config.externalConfig.apiKeyEnvVar || "");
    if (!apiKey) {
      throw new Error(`API key ${config.externalConfig.apiKeyEnvVar} is not configured`);
    }
    
    const isAnthropic = config.externalConfig.apiEndpoint.includes("anthropic.com");
    
    if (isAnthropic) {
      return callAnthropicAPI(params, config.externalConfig.apiEndpoint, apiKey, signal);
    } else {
      return callOpenAICompatibleAPI(params, config.externalConfig.apiEndpoint, apiKey, signal);
    }
  }
  
  // Default to Lovable AI Gateway
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }
  
  return callLovableAIGateway(params, LOVABLE_API_KEY, signal);
}

/**
 * Parse AI response content from different provider formats
 */
export function parseAIResponseContent(
  data: any,
  isExternalModel: boolean,
  apiEndpoint?: string
): string | null {
  if (isExternalModel && apiEndpoint?.includes("anthropic.com")) {
    // Anthropic format
    return data.content?.[0]?.text;
  }
  // OpenAI-compatible format (including Lovable AI Gateway)
  return data.choices?.[0]?.message?.content;
}
