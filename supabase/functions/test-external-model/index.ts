 import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
 import { getCorsHeaders, handleCorsPrelight } from "../_shared/cors-utils.ts";
 
 serve(async (req) => {
   const preflightResponse = handleCorsPrelight(req);
   if (preflightResponse) return preflightResponse;
   const origin = req.headers.get("origin");
   const corsHeaders = getCorsHeaders(origin);
 
   try {
     const { modelId, apiEndpoint, apiKeyEnvVar } = await req.json();
 
     if (!modelId || !apiEndpoint || !apiKeyEnvVar) {
       return new Response(
         JSON.stringify({ success: false, error: "Missing required parameters" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Get the API key from environment
     const apiKey = Deno.env.get(apiKeyEnvVar);
     if (!apiKey) {
       return new Response(
         JSON.stringify({ 
           success: false, 
           error: `API key not found. Please add ${apiKeyEnvVar} to your Lovable Cloud secrets.` 
         }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
    // Detect provider based on endpoint to format request correctly
    const isAnthropic = apiEndpoint.includes("anthropic.com");
    
    // Build appropriate payload based on provider
    let testPayload: Record<string, unknown>;
    let headers: Record<string, string>;
    
    if (isAnthropic) {
      // Anthropic Messages API format
      testPayload = {
        model: modelId,
        messages: [
          { role: "user", content: "Say 'Hello, I am working!' in exactly 5 words." }
        ],
        max_tokens: 50,
      };
      headers = {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
      };
    } else {
      // OpenAI-compatible format
      testPayload = {
        model: modelId,
        messages: [
          { role: "user", content: "Say 'Hello, I am working!' in exactly 5 words." }
        ],
        max_tokens: 50,
        temperature: 0.1,
      };
      headers = {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };
    }

    console.log(`Testing model ${modelId} at ${apiEndpoint} (Anthropic: ${isAnthropic})`);

    const response = await fetch(apiEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(testPayload),
    });
 
     if (!response.ok) {
       const errorText = await response.text();
       console.error(`Model test failed: ${response.status} - ${errorText}`);
       return new Response(
         JSON.stringify({ 
           success: false, 
           error: `API returned ${response.status}: ${errorText.slice(0, 200)}` 
         }),
         { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     const data = await response.json();
     
     // Check if we got a valid response
     const hasContent = data.choices?.[0]?.message?.content || 
                        data.content?.[0]?.text || // Anthropic format
                        data.response; // Some other formats
 
     if (hasContent) {
       console.log(`Model ${modelId} test successful`);
       return new Response(
         JSON.stringify({ success: true, response: hasContent }),
         { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     } else {
       return new Response(
         JSON.stringify({ success: false, error: "No content in response" }),
         { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
   } catch (error) {
     console.error("Error testing model:", error);
     return new Response(
       JSON.stringify({ 
         success: false, 
         error: error instanceof Error ? error.message : "Unknown error" 
       }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });