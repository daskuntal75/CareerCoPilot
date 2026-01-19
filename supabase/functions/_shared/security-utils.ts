/**
 * Security Utilities for OWASP LLM Top 10 Compliance
 * 
 * Implements:
 * - LLM01: Prompt Injection Mitigation
 * - LLM06: Excessive Agency Prevention (HITL)
 * - Data Sanitization Layer
 * - PII Redaction
 */

// Patterns that indicate potential prompt injection attempts
const PROMPT_INJECTION_PATTERNS = [
  // Instruction override attempts
  /ignore\s+(all\s+)?(previous|prior|above|earlier)\s+(instructions?|prompts?|rules?)/gi,
  /disregard\s+(all\s+)?(previous|prior|above|earlier)/gi,
  /forget\s+(everything|all|what)\s+(you|i)\s+(told|said|know)/gi,
  /new\s+instructions?:/gi,
  /system\s*:\s*/gi,
  /\[system\]/gi,
  /\[inst(ruction)?s?\]/gi,
  /override\s+(the\s+)?(system|previous|default)/gi,
  /bypass\s+(the\s+)?(safety|restriction|filter|rule)/gi,
  /disable\s+(your\s+)?(safety|restriction|filter|guard|protection)/gi,
  
  // Role manipulation attempts
  /you\s+are\s+(now|no\s+longer)/gi,
  /act\s+as\s+(a\s+)?(different|new|another)/gi,
  /pretend\s+(to\s+be|you('re|are))/gi,
  /roleplay\s+as/gi,
  /imagine\s+you('re|are)\s+(a\s+)?(different|not)/gi,
  /switch\s+(to|into)\s+(a\s+)?(different|new)\s+(mode|persona|character)/gi,
  /from\s+now\s+on\s+(you('re|are)|act|behave)/gi,
  
  // Jailbreak persona attempts (DAN, etc.)
  /\b(DAN|do\s+anything\s+now)\b/gi,
  /\bjailbreak(ed)?\b/gi,
  /\bunlock(ed)?\s+(mode|yourself|your\s+potential)/gi,
  /\bdeveloper\s+mode\b/gi,
  /\broot\s+access\b/gi,
  /\badmin(istrator)?\s+mode\b/gi,
  /\bsudo\s+mode\b/gi,
  /\bno\s+(limit|restriction|filter|rule)s?\s+mode\b/gi,
  /\bevil\s+(mode|version|persona)\b/gi,
  /\buncensored\s+(mode|version)\b/gi,
  /\balter\s+ego\b/gi,
  /\bshadow\s+self\b/gi,
  /\bopposite\s+day\b/gi,
  /\bopposite\s+mode\b/gi,
  /\breverse\s+psychology\b/gi,
  /enabled?\s+(jailbreak|developer|admin|root|evil)/gi,
  /activate\s+(jailbreak|developer|admin|root|evil)/gi,
  
  // Roleplay exploit attempts
  /let's\s+(play|pretend|roleplay)/gi,
  /you('re|are)\s+playing\s+(the\s+role|a\s+character)/gi,
  /this\s+is\s+(just\s+)?(a\s+)?(roleplay|game|fiction|hypothetical)/gi,
  /in\s+this\s+(hypothetical|fictional)\s+scenario/gi,
  /for\s+(educational|research|testing)\s+purposes/gi,
  /purely\s+hypothetical/gi,
  /no\s+ethical\s+concern/gi,
  /\bas\s+an?\s+(evil|villain|bad)\s+(AI|assistant|character)/gi,
  /\bwrite\s+as\s+if\s+you\s+had\s+no\s+(ethics|morals|restrictions)/gi,
  
  // Prompt leaking attempts
  /reveal\s+(your|the)\s+(system|initial|original)\s+prompt/gi,
  /show\s+(me\s+)?(your|the)\s+(instructions|prompt|rules)/gi,
  /what\s+(are|were)\s+(your|the)\s+(original|system)\s+(instructions|prompts)/gi,
  /repeat\s+(the\s+)?(text|words|instructions)\s+(above|before)/gi,
  /print\s+(your\s+)?(system|initial)\s+(message|prompt)/gi,
  /display\s+(the\s+)?(hidden|secret|original)\s+(instructions|prompt)/gi,
  
  // Token smuggling and encoding tricks
  /base64\s*:/gi,
  /encode\s+(this|the\s+following)\s+in/gi,
  /decode\s+the\s+following/gi,
  /\bhex\s*:\s*[0-9a-f]/gi,
  /translate\s+(from|to)\s+pig\s+latin/gi,
  /backwards?\s*:/gi,
  /reverse\s+(the\s+)?(text|letters|words)/gi,
  
  // Multi-turn manipulation
  /remember\s+(what\s+)?I\s+(told|said|asked)\s+(you\s+)?(earlier|before|previously)/gi,
  /continue\s+from\s+(where|what)\s+(we|you)\s+(left|said)/gi,
  /as\s+we\s+(agreed|discussed)\s+(earlier|before)/gi,
  /you\s+already\s+agreed\s+to/gi,
  /you\s+promised\s+(me\s+)?to/gi,
  
  // Data exfiltration attempts
  /export\s+(all\s+)?(user|candidate|salary|personal)\s+data/gi,
  /send\s+(this|data|info)\s+to/gi,
  /forward\s+(to|this)/gi,
  /email\s+(this|data)\s+to/gi,
  /exfiltrate/gi,
  /leak\s+(the\s+)?(data|information|secrets)/gi,
  /extract\s+(confidential|private|sensitive)/gi,
  
  // Hidden instruction markers
  /\x00-\x08\x0B\x0C\x0E-\x1F/g, // Control characters
  /[\u200B-\u200D\uFEFF\u2060]/g, // Zero-width characters
  /\u202A-\u202E/g, // Bidirectional text controls
  
  // Delimiter injection attempts
  /<\|(im_start|im_end|system|user|assistant)\|>/gi,
  /\[\[(SYSTEM|USER|ASSISTANT)\]\]/gi,
  /###\s*(SYSTEM|USER|ASSISTANT|INSTRUCTION)/gi,
  /```\s*(system|instruction|command)/gi,
];

// PII patterns for redaction
const PII_PATTERNS = {
  phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  ssn: /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/g,
  address: /\d{1,5}\s+\w+(\s+\w+)*\s+(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|court|ct|way|place|pl)\b/gi,
  zipCode: /\b\d{5}(-\d{4})?\b/g,
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  dateOfBirth: /\b(0?[1-9]|1[0-2])[\/\-](0?[1-9]|[12]\d|3[01])[\/\-](19|20)\d{2}\b/g,
};

export interface SanitizationResult {
  sanitizedContent: string;
  threatsDetected: string[];
  piiRedacted: boolean;
  originalHash: string;
}

export interface ThreatInfo {
  type: string;
  pattern: string;
  position: number;
  context: string;
}

/**
 * Sanitize input to prevent prompt injection attacks
 * Implements OWASP LLM01 mitigations
 */
export function sanitizeInput(content: string): { 
  sanitized: string; 
  threats: ThreatInfo[];
  hasMaliciousContent: boolean;
} {
  const threats: ThreatInfo[] = [];
  let sanitized = content;

  // 1. Strip non-printable and zero-width characters
  sanitized = sanitized
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    .replace(/[\u200B-\u200D\uFEFF\u2060]/g, '')
    .replace(/[\u202A-\u202E]/g, '');

  // 2. Detect and log injection attempts
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    const matches = content.matchAll(pattern);
    for (const match of matches) {
      if (match.index !== undefined) {
        threats.push({
          type: 'prompt_injection',
          pattern: pattern.source,
          position: match.index,
          context: content.substring(
            Math.max(0, match.index - 20),
            Math.min(content.length, match.index + match[0].length + 20)
          ),
        });
      }
    }
    // Remove the malicious patterns
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  }

  // 3. Normalize unicode to prevent homograph attacks
  sanitized = sanitized.normalize('NFKC');

  // 4. Limit content length to prevent DoS
  const MAX_LENGTH = 100000; // 100KB
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH);
    threats.push({
      type: 'content_overflow',
      pattern: 'max_length_exceeded',
      position: MAX_LENGTH,
      context: `Content truncated from ${content.length} to ${MAX_LENGTH} characters`,
    });
  }

  return {
    sanitized,
    threats,
    hasMaliciousContent: threats.length > 0,
  };
}

/**
 * Wrap untrusted input with XML tags for prompt sandboxing
 * This segregates user-provided data from system instructions
 */
export function sandboxUntrustedInput(content: string, label: string): string {
  // Sanitize first
  const { sanitized } = sanitizeInput(content);
  
  // Wrap in clear delimiters that the LLM can recognize
  return `<untrusted_input type="${label}">
${sanitized}
</untrusted_input>`;
}

/**
 * Redact PII from content before vector storage
 * Implements GDPR Data Minimization principle
 */
export function redactPII(content: string): {
  redacted: string;
  piiTypes: string[];
  originalHash: string;
} {
  let redacted = content;
  const piiTypes: string[] = [];

  // Create hash of original for audit purposes
  const originalHash = hashString(content);

  // Redact each PII type
  for (const [piiType, pattern] of Object.entries(PII_PATTERNS)) {
    if (pattern.test(redacted)) {
      piiTypes.push(piiType);
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0;
      redacted = redacted.replace(pattern, `[${piiType.toUpperCase()}_REDACTED]`);
    }
  }

  return {
    redacted,
    piiTypes,
    originalHash,
  };
}

/**
 * Simple hash function for content fingerprinting
 * Used for audit logging, not cryptographic security
 */
export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

/**
 * Generate cryptographic approval hash for HITL actions
 * Combines action data with timestamp and user ID for non-repudiation
 */
export async function generateApprovalHash(
  userId: string,
  actionType: string,
  actionData: Record<string, unknown>,
  timestamp: Date
): Promise<string> {
  const payload = JSON.stringify({
    userId,
    actionType,
    actionData,
    timestamp: timestamp.toISOString(),
  });

  // Use Web Crypto API available in Deno
  const encoder = new TextEncoder();
  const data = encoder.encode(payload);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate an action approval hash
 */
export async function validateApprovalHash(
  hash: string,
  userId: string,
  actionType: string,
  actionData: Record<string, unknown>,
  timestamp: Date
): Promise<boolean> {
  const expectedHash = await generateApprovalHash(userId, actionType, actionData, timestamp);
  return hash === expectedHash;
}

/**
 * Rate limiting helper
 * Returns true if the request should be allowed
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 10) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    const timestamps = this.requests.get(identifier) || [];
    const validTimestamps = timestamps.filter(t => t > windowStart);
    
    if (validTimestamps.length >= this.maxRequests) {
      return false;
    }
    
    validTimestamps.push(now);
    this.requests.set(identifier, validTimestamps);
    return true;
  }

  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const timestamps = this.requests.get(identifier) || [];
    const validTimestamps = timestamps.filter(t => t > windowStart);
    return Math.max(0, this.maxRequests - validTimestamps.length);
  }
}

/**
 * Sanitize and prepare job description for LLM processing
 * Main entry point for job description sanitization
 */
export function sanitizeJobDescription(jobDescription: string): SanitizationResult {
  // Step 1: Basic sanitization
  const { sanitized, threats } = sanitizeInput(jobDescription);
  
  // Step 2: PII redaction (job descriptions shouldn't have PII but check anyway)
  const { redacted, piiTypes, originalHash } = redactPII(sanitized);
  
  return {
    sanitizedContent: redacted,
    threatsDetected: [
      ...threats.map(t => `${t.type}: ${t.context}`),
      ...piiTypes.map(p => `pii_${p}`),
    ],
    piiRedacted: piiTypes.length > 0,
    originalHash,
  };
}

/**
 * Prepare resume content with PII redaction for vector storage
 */
export function sanitizeResumeForStorage(resumeContent: string): SanitizationResult {
  // Step 1: Basic sanitization
  const { sanitized, threats } = sanitizeInput(resumeContent);
  
  // Step 2: Redact PII
  const { redacted, piiTypes, originalHash } = redactPII(sanitized);
  
  return {
    sanitizedContent: redacted,
    threatsDetected: threats.map(t => `${t.type}: ${t.context}`),
    piiRedacted: piiTypes.length > 0,
    originalHash,
  };
}
