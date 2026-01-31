/**
 * CORS Utilities for Edge Functions
 *
 * Provides secure, environment-aware CORS configuration.
 * NEVER use "*" in production - always specify allowed origins.
 */

// Get allowed origins from environment variable
// Set ALLOWED_ORIGINS as comma-separated list: "https://app.example.com,https://www.example.com"
const getAllowedOrigins = (): string[] => {
  const originsEnv = Deno.env.get("ALLOWED_ORIGINS");

  if (originsEnv) {
    return originsEnv.split(",").map(origin => origin.trim()).filter(Boolean);
  }

  // Default allowed origins for Lovable projects
  // Includes all Lovable preview and production domains
  return [
    // Lovable preview domains
    "https://id-preview--70f9a460-b040-4f1b-a4d1-53f34b83932c.lovable.app",
    "https://70f9a460-b040-4f1b-a4d1-53f34b83932c.lovableproject.com",
    // Lovable published domain
    "https://tailoredapply.lovable.app",
    // Local development
    "http://localhost:8080",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:8080",
    "http://127.0.0.1:5173",
  ];
};

/**
 * Check if an origin is allowed
 */
export const isOriginAllowed = (origin: string | null): boolean => {
  if (!origin) return false;

  const allowedOrigins = getAllowedOrigins();
  return allowedOrigins.includes(origin);
};

/**
 * Get CORS headers for a request
 * Returns headers with the specific origin if allowed, or no Access-Control-Allow-Origin if not
 */
export const getCorsHeaders = (requestOrigin: string | null): Record<string, string> => {
  const baseHeaders: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-setup-token",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Max-Age": "86400", // 24 hours
  };

  if (requestOrigin && isOriginAllowed(requestOrigin)) {
    return {
      ...baseHeaders,
      "Access-Control-Allow-Origin": requestOrigin,
      "Access-Control-Allow-Credentials": "true",
    };
  }

  // For disallowed origins, don't set Access-Control-Allow-Origin
  // This will cause browser CORS errors for unauthorized origins
  return baseHeaders;
};

/**
 * Handle preflight OPTIONS request
 */
export const handleCorsPrelight = (req: Request): Response | null => {
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("origin");
    return new Response(null, {
      status: 204,
      headers: getCorsHeaders(origin),
    });
  }
  return null;
};

/**
 * Create a JSON response with proper CORS headers
 */
export const createCorsResponse = (
  body: unknown,
  requestOrigin: string | null,
  status: number = 200
): Response => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(requestOrigin),
      "Content-Type": "application/json",
    },
  });
};

/**
 * Create an error response with proper CORS headers
 */
export const createCorsErrorResponse = (
  error: string,
  requestOrigin: string | null,
  status: number = 500
): Response => {
  return createCorsResponse({ error }, requestOrigin, status);
};
