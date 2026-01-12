import { useState, useCallback } from 'react';

interface BreachCheckResult {
  isBreached: boolean;
  occurrences: number;
  checked: boolean;
}

// Use Have I Been Pwned k-Anonymity API
// Only first 5 chars of SHA-1 hash are sent, providing privacy
async function sha1Hash(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function usePasswordBreachCheck() {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<BreachCheckResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkPassword = useCallback(async (password: string): Promise<BreachCheckResult> => {
    if (!password || password.length < 8) {
      return { isBreached: false, occurrences: 0, checked: false };
    }

    setChecking(true);
    setError(null);

    try {
      // Generate SHA-1 hash of password
      const hash = await sha1Hash(password);
      const prefix = hash.slice(0, 5);
      const suffix = hash.slice(5);

      // Query HIBP API with k-Anonymity (only send first 5 chars)
      const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
        headers: {
          'Add-Padding': 'true', // Adds random padding to hide traffic patterns
        },
      });

      if (!response.ok) {
        throw new Error('Failed to check password');
      }

      const text = await response.text();
      const lines = text.split('\n');

      // Check if our suffix is in the response
      for (const line of lines) {
        const [hashSuffix, count] = line.split(':');
        if (hashSuffix.trim() === suffix) {
          const occurrences = parseInt(count.trim(), 10);
          const checkResult = { isBreached: true, occurrences, checked: true };
          setResult(checkResult);
          return checkResult;
        }
      }

      // Password not found in breaches
      const checkResult = { isBreached: false, occurrences: 0, checked: true };
      setResult(checkResult);
      return checkResult;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      console.error('Breach check error:', err);
      // Return unchecked on error to not block users
      return { isBreached: false, occurrences: 0, checked: false };
    } finally {
      setChecking(false);
    }
  }, []);

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return {
    checkPassword,
    checking,
    result,
    error,
    reset,
  };
}

// Standalone function for use outside React components
export async function checkPasswordBreach(password: string): Promise<BreachCheckResult> {
  if (!password || password.length < 8) {
    return { isBreached: false, occurrences: 0, checked: false };
  }

  try {
    const hash = await sha1Hash(password);
    const prefix = hash.slice(0, 5);
    const suffix = hash.slice(5);

    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: {
        'Add-Padding': 'true',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to check password');
    }

    const text = await response.text();
    const lines = text.split('\n');

    for (const line of lines) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix.trim() === suffix) {
        const occurrences = parseInt(count.trim(), 10);
        return { isBreached: true, occurrences, checked: true };
      }
    }

    return { isBreached: false, occurrences: 0, checked: true };
  } catch (err) {
    console.error('Breach check error:', err);
    return { isBreached: false, occurrences: 0, checked: false };
  }
}
