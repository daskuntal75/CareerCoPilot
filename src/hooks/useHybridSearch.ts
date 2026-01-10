import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SearchResult {
  id: string;
  content: string;
  chunk_type: string;
  chunk_index: number;
  relevance_score: number;
  headline?: string;
}

interface HybridSearchOptions {
  semanticWeight?: number; // 0-1, weight for semantic (vector) search
  keywordWeight?: number; // 0-1, weight for keyword (BM25-style) search
  limit?: number;
  minRelevance?: number;
}

const DEFAULT_OPTIONS: HybridSearchOptions = {
  semanticWeight: 0.7,
  keywordWeight: 0.3,
  limit: 10,
  minRelevance: 0.1,
};

/**
 * Hook for hybrid search combining semantic and keyword matching
 * Implements performance optimization for executive-level searches
 */
export function useHybridSearch() {
  const { user } = useAuth();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Perform hybrid search across resume chunks
   * Combines full-text search (BM25-style) with semantic matching
   */
  const search = useCallback(
    async (
      query: string,
      options: HybridSearchOptions = {}
    ): Promise<SearchResult[]> => {
      if (!user || !query.trim()) {
        setResults([]);
        return [];
      }

      const opts = { ...DEFAULT_OPTIONS, ...options };
      setLoading(true);
      setError(null);

      try {
        // Step 1: Full-text search using PostgreSQL tsvector (BM25-style ranking)
        const { data: keywordResults, error: keywordError } = await supabase
          .from("resume_chunks")
          .select("id, content, chunk_type, chunk_index")
          .eq("user_id", user.id)
          .textSearch("search_vector", query, {
            type: "websearch",
            config: "english",
          })
          .limit(opts.limit! * 2); // Get more for merging

        if (keywordError) {
          console.warn("Keyword search failed, falling back to basic:", keywordError);
        }

        // Step 2: Basic content matching as fallback/supplement
        const { data: contentResults, error: contentError } = await supabase
          .from("resume_chunks")
          .select("id, content, chunk_type, chunk_index")
          .eq("user_id", user.id)
          .ilike("content", `%${query.split(" ").join("%")}%`)
          .limit(opts.limit! * 2);

        if (contentError) throw contentError;

        // Step 3: Merge and score results
        const allResults = new Map<string, SearchResult>();
        const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);

        // Process keyword results (higher base score for exact matches)
        (keywordResults || []).forEach((result, index) => {
          const baseScore = 1 - (index / (keywordResults?.length || 1)) * 0.5;
          const termMatches = queryTerms.filter(term =>
            result.content.toLowerCase().includes(term)
          ).length;
          const termScore = termMatches / Math.max(queryTerms.length, 1);
          
          const score = (baseScore * 0.6 + termScore * 0.4) * (opts.keywordWeight || 0.3);

          if (!allResults.has(result.id) || allResults.get(result.id)!.relevance_score < score) {
            allResults.set(result.id, {
              ...result,
              relevance_score: score,
              headline: highlightTerms(result.content, queryTerms),
            });
          }
        });

        // Process content results (semantic-like matching)
        (contentResults || []).forEach((result, index) => {
          const existing = allResults.get(result.id);
          const baseScore = 1 - (index / (contentResults?.length || 1)) * 0.5;
          
          // Calculate term proximity and density
          const termMatches = queryTerms.filter(term =>
            result.content.toLowerCase().includes(term)
          ).length;
          const termDensity = termMatches / Math.max(queryTerms.length, 1);
          
          const semanticScore = (baseScore * 0.5 + termDensity * 0.5) * (opts.semanticWeight || 0.7);

          if (existing) {
            // Combine scores
            allResults.set(result.id, {
              ...existing,
              relevance_score: existing.relevance_score + semanticScore,
            });
          } else {
            allResults.set(result.id, {
              ...result,
              relevance_score: semanticScore,
              headline: highlightTerms(result.content, queryTerms),
            });
          }
        });

        // Sort by combined relevance score and filter
        const sortedResults = Array.from(allResults.values())
          .filter(r => r.relevance_score >= (opts.minRelevance || 0.1))
          .sort((a, b) => b.relevance_score - a.relevance_score)
          .slice(0, opts.limit);

        setResults(sortedResults);
        return sortedResults;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Search failed";
        setError(message);
        console.error("Hybrid search error:", err);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  /**
   * Search for specific skills or keywords (exact matching for hard skills)
   * Useful for: "Python", "P&L Management", "Series A"
   */
  const searchExact = useCallback(
    async (keywords: string[]): Promise<SearchResult[]> => {
      if (!user || keywords.length === 0) {
        return [];
      }

      setLoading(true);
      try {
        // Use exact keyword matching for hard skills
        const { data, error } = await supabase
          .from("resume_chunks")
          .select("id, content, chunk_type, chunk_index")
          .eq("user_id", user.id);

        if (error) throw error;

        // Filter for exact keyword matches (case-insensitive)
        const matches = (data || [])
          .map(chunk => {
            const matchedKeywords = keywords.filter(kw =>
              chunk.content.toLowerCase().includes(kw.toLowerCase())
            );
            return {
              ...chunk,
              relevance_score: matchedKeywords.length / keywords.length,
              headline: highlightTerms(chunk.content, matchedKeywords),
            };
          })
          .filter(r => r.relevance_score > 0)
          .sort((a, b) => b.relevance_score - a.relevance_score);

        setResults(matches);
        return matches;
      } catch (err) {
        console.error("Exact search error:", err);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [user]
  );

  /**
   * Clear search results
   */
  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    results,
    loading,
    error,
    search,
    searchExact,
    clearResults,
  };
}

/**
 * Highlight search terms in content
 */
function highlightTerms(content: string, terms: string[]): string {
  // Return first 200 chars with term context
  const lowerContent = content.toLowerCase();
  let bestStart = 0;
  let bestScore = 0;

  // Find the segment with most term matches
  for (let i = 0; i < content.length - 200; i += 50) {
    const segment = lowerContent.substring(i, i + 200);
    const score = terms.filter(t => segment.includes(t.toLowerCase())).length;
    if (score > bestScore) {
      bestScore = score;
      bestStart = i;
    }
  }

  return content.substring(bestStart, bestStart + 200) + (content.length > 200 ? "..." : "");
}

export default useHybridSearch;
