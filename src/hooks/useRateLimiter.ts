import { useState, useEffect, useCallback, useRef } from 'react';

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  lockoutMs: number;
  enableExponentialBackoff?: boolean;
}

interface RateLimitState {
  attempts: number;
  firstAttemptTime: number;
  lockoutUntil: number;
  consecutiveLockouts: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 60000, // 1 minute
  lockoutMs: 60000, // 1 minute base lockout
  enableExponentialBackoff: true,
};

const STORAGE_KEY = 'auth_rate_limit';

function getStoredState(): RateLimitState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return {
    attempts: 0,
    firstAttemptTime: 0,
    lockoutUntil: 0,
    consecutiveLockouts: 0,
  };
}

function saveState(state: RateLimitState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

export function useRateLimiter(config: Partial<RateLimitConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const [state, setState] = useState<RateLimitState>(getStoredState);
  const [countdown, setCountdown] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate if currently locked out
  const isLocked = state.lockoutUntil > Date.now();

  // Update countdown timer
  useEffect(() => {
    if (isLocked) {
      const updateCountdown = () => {
        const remaining = Math.max(0, Math.ceil((state.lockoutUntil - Date.now()) / 1000));
        setCountdown(remaining);
        
        if (remaining <= 0) {
          // Lockout expired, reset attempts but keep consecutive lockout count
          const newState = {
            ...state,
            attempts: 0,
            firstAttemptTime: 0,
            lockoutUntil: 0,
          };
          setState(newState);
          saveState(newState);
        }
      };

      updateCountdown();
      intervalRef.current = setInterval(updateCountdown, 1000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    } else {
      setCountdown(0);
    }
  }, [state.lockoutUntil, isLocked]);

  // Check if an attempt is allowed
  const checkLimit = useCallback((): boolean => {
    const now = Date.now();
    let currentState = getStoredState();

    // If currently locked out, deny
    if (currentState.lockoutUntil > now) {
      return false;
    }

    // Reset attempts if window has passed
    if (now - currentState.firstAttemptTime > finalConfig.windowMs) {
      currentState = {
        attempts: 0,
        firstAttemptTime: 0,
        lockoutUntil: 0,
        consecutiveLockouts: Math.max(0, currentState.consecutiveLockouts - 1), // Decay lockouts over time
      };
    }

    // Increment attempt
    const newAttempts = currentState.attempts + 1;
    const firstAttemptTime = currentState.firstAttemptTime || now;

    // Check if over limit
    if (newAttempts > finalConfig.maxAttempts) {
      // Calculate lockout duration with exponential backoff
      let lockoutDuration = finalConfig.lockoutMs;
      if (finalConfig.enableExponentialBackoff) {
        // Double the lockout for each consecutive lockout, max 30 minutes
        lockoutDuration = Math.min(
          finalConfig.lockoutMs * Math.pow(2, currentState.consecutiveLockouts),
          30 * 60 * 1000
        );
      }

      const newState: RateLimitState = {
        attempts: newAttempts,
        firstAttemptTime,
        lockoutUntil: now + lockoutDuration,
        consecutiveLockouts: currentState.consecutiveLockouts + 1,
      };
      setState(newState);
      saveState(newState);
      return false;
    }

    // Allow attempt, update state
    const newState: RateLimitState = {
      ...currentState,
      attempts: newAttempts,
      firstAttemptTime,
    };
    setState(newState);
    saveState(newState);
    return true;
  }, [finalConfig]);

  // Record a failed attempt (call after auth failure)
  const recordFailedAttempt = useCallback((): void => {
    // The attempt was already recorded in checkLimit
    // This is for additional tracking if needed
  }, []);

  // Reset on successful auth
  const resetOnSuccess = useCallback((): void => {
    const newState: RateLimitState = {
      attempts: 0,
      firstAttemptTime: 0,
      lockoutUntil: 0,
      consecutiveLockouts: 0,
    };
    setState(newState);
    saveState(newState);
  }, []);

  // Get remaining attempts
  const remainingAttempts = Math.max(0, finalConfig.maxAttempts - state.attempts);

  // Format lockout message with time
  const getLockoutMessage = useCallback((): string => {
    if (!isLocked) return '';
    
    if (countdown >= 60) {
      const minutes = Math.ceil(countdown / 60);
      return `Too many failed attempts. Please wait ${minutes} minute${minutes > 1 ? 's' : ''}.`;
    }
    return `Too many failed attempts. Please wait ${countdown} seconds.`;
  }, [isLocked, countdown]);

  return {
    isLocked,
    countdown,
    remainingAttempts,
    checkLimit,
    recordFailedAttempt,
    resetOnSuccess,
    getLockoutMessage,
    consecutiveLockouts: state.consecutiveLockouts,
  };
}
