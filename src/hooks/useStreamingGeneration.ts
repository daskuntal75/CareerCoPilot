import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type StreamingStage = "connecting" | "analyzing" | "generating" | "complete" | "error";

interface StreamingState {
  stage: StreamingStage;
  content: string;
  progress: number;
  error: string | null;
}

interface UseStreamingGenerationOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullContent: string) => void;
  onError?: (error: string) => void;
  onStageChange?: (stage: StreamingStage) => void;
}

export const useStreamingGeneration = (options: UseStreamingGenerationOptions = {}) => {
  const [state, setState] = useState<StreamingState>({
    stage: "connecting",
    content: "",
    progress: 0,
    error: null,
  });
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const isActiveRef = useRef(false);

  const updateState = (updates: Partial<StreamingState>) => {
    setState(prev => {
      const newState = { ...prev, ...updates };
      if (updates.stage && options.onStageChange) {
        options.onStageChange(updates.stage);
      }
      return newState;
    });
  };

  const startGeneration = useCallback(async (
    functionName: string,
    payload: Record<string, any>
  ): Promise<string | null> => {
    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    isActiveRef.current = true;

    updateState({
      stage: "connecting",
      content: "",
      progress: 0,
      error: null,
    });

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Authentication required");
      }

      updateState({ stage: "analyzing", progress: 10 });

      // Start the streaming request
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Accept: "text/event-stream",
          },
          body: JSON.stringify({ ...payload, stream: true }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Request failed with status ${response.status}`);
      }

      // Check if response is streaming
      const contentType = response.headers.get("content-type");
      
      if (contentType?.includes("text/event-stream")) {
        // Handle SSE stream
        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let fullContent = "";
        let buffer = "";

        updateState({ stage: "generating", progress: 20 });

        while (isActiveRef.current) {
          const { done, value } = await reader.read();
          
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
          // Process SSE events
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              
              if (data === "[DONE]") {
                updateState({ stage: "complete", progress: 100 });
                break;
              }

              try {
                const parsed = JSON.parse(data);
                
                if (parsed.error) {
                  throw new Error(parsed.error);
                }

                if (parsed.chunk) {
                  fullContent += parsed.chunk;
                  updateState({ content: fullContent });
                  options.onChunk?.(parsed.chunk);
                }

                if (parsed.stage) {
                  updateState({ stage: parsed.stage as StreamingStage });
                }

                if (parsed.progress) {
                  updateState({ progress: parsed.progress });
                }
              } catch {
                // Not JSON, treat as raw content
                fullContent += data;
                updateState({ content: fullContent });
                options.onChunk?.(data);
              }
            }
          }
        }

        updateState({ stage: "complete", progress: 100 });
        options.onComplete?.(fullContent);
        return fullContent;
      } else {
        // Handle regular JSON response
        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error);
        }

        const content = data.coverLetter || data.interviewPrep || JSON.stringify(data);
        updateState({ 
          stage: "complete", 
          content, 
          progress: 100 
        });
        options.onComplete?.(content);
        return content;
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        updateState({ stage: "error", error: "Generation cancelled" });
        return null;
      }

      const errorMessage = error instanceof Error ? error.message : "Generation failed";
      updateState({ stage: "error", error: errorMessage });
      options.onError?.(errorMessage);
      throw error;
    } finally {
      isActiveRef.current = false;
    }
  }, [options]);

  const cancel = useCallback(() => {
    isActiveRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    updateState({ stage: "error", error: "Cancelled by user" });
  }, []);

  const reset = useCallback(() => {
    cancel();
    setState({
      stage: "connecting",
      content: "",
      progress: 0,
      error: null,
    });
  }, [cancel]);

  return {
    ...state,
    isGenerating: state.stage !== "complete" && state.stage !== "error",
    startGeneration,
    cancel,
    reset,
  };
};
