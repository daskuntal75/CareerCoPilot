// Login anomaly detection utilities

export interface LoginAttempt {
  userId: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  location?: {
    city?: string;
    region?: string;
    country?: string;
    countryCode?: string;
    lat?: number;
    lon?: number;
  };
  deviceFingerprint?: string;
  success: boolean;
}

export interface AnomalyResult {
  isAnomalous: boolean;
  riskScore: number; // 0-100
  reasons: string[];
  flags: AnomalyFlag[];
}

export type AnomalyFlag = 
  | "new_device"
  | "new_location"
  | "unusual_time"
  | "impossible_travel"
  | "multiple_failed_attempts"
  | "vpn_detected"
  | "tor_exit_node"
  | "high_risk_country";

// Countries commonly associated with cyberattacks (adjust based on your threat model)
const HIGH_RISK_COUNTRIES = ["RU", "CN", "KP", "IR"];

// Common VPN/datacenter ASN ranges (simplified check)
const DATACENTER_KEYWORDS = ["hosting", "cloud", "datacenter", "vps", "linode", "digitalocean", "aws", "azure", "google"];

export function detectAnomalies(
  currentLogin: LoginAttempt,
  recentLogins: LoginAttempt[],
  userTypicalPatterns?: {
    commonLocations: string[];
    commonDevices: string[];
    typicalLoginHours: number[]; // hours 0-23
  }
): AnomalyResult {
  const reasons: string[] = [];
  const flags: AnomalyFlag[] = [];
  let riskScore = 0;

  // Get successful logins for pattern analysis
  const successfulLogins = recentLogins.filter(l => l.success);
  
  // 1. Check for new device
  if (currentLogin.deviceFingerprint) {
    const knownDevices = new Set(successfulLogins.map(l => l.deviceFingerprint).filter(Boolean));
    if (knownDevices.size > 0 && !knownDevices.has(currentLogin.deviceFingerprint)) {
      flags.push("new_device");
      reasons.push("Login from a new device");
      riskScore += 20;
    }
  }

  // 2. Check for new location
  if (currentLogin.location?.country) {
    const knownCountries = new Set(
      successfulLogins
        .map(l => l.location?.countryCode)
        .filter(Boolean)
    );
    
    if (knownCountries.size > 0 && !knownCountries.has(currentLogin.location.countryCode)) {
      flags.push("new_location");
      reasons.push(`Login from new country: ${currentLogin.location.country}`);
      riskScore += 25;
    }
  }

  // 3. Check for unusual login time
  const loginHour = new Date(currentLogin.timestamp).getUTCHours();
  if (userTypicalPatterns?.typicalLoginHours && userTypicalPatterns.typicalLoginHours.length > 0) {
    if (!userTypicalPatterns.typicalLoginHours.includes(loginHour)) {
      flags.push("unusual_time");
      reasons.push(`Login at unusual time: ${loginHour}:00 UTC`);
      riskScore += 15;
    }
  } else if (successfulLogins.length >= 5) {
    // Build pattern from history
    const historicalHours = successfulLogins.map(l => new Date(l.timestamp).getUTCHours());
    const hourCounts: Record<number, number> = {};
    historicalHours.forEach(h => { hourCounts[h] = (hourCounts[h] || 0) + 1; });
    
    // Check if current hour is very unusual (not in top 50% of login hours)
    const sortedHours = Object.entries(hourCounts).sort((a, b) => b[1] - a[1]);
    const commonHours = sortedHours.slice(0, Math.ceil(sortedHours.length / 2)).map(([h]) => parseInt(h));
    
    if (commonHours.length > 0 && !commonHours.includes(loginHour)) {
      flags.push("unusual_time");
      reasons.push(`Login at unusual time: ${loginHour}:00 UTC`);
      riskScore += 10;
    }
  }

  // 4. Check for impossible travel
  if (currentLogin.location?.lat && currentLogin.location?.lon) {
    const lastLogin = successfulLogins.find(l => l.location?.lat && l.location?.lon);
    
    if (lastLogin && lastLogin.location?.lat && lastLogin.location?.lon) {
      const timeDiffHours = (new Date(currentLogin.timestamp).getTime() - new Date(lastLogin.timestamp).getTime()) / (1000 * 60 * 60);
      
      if (timeDiffHours < 24) { // Only check for recent logins
        const distance = calculateDistance(
          currentLogin.location.lat,
          currentLogin.location.lon,
          lastLogin.location.lat,
          lastLogin.location.lon
        );
        
        // Assuming max travel speed of 1000 km/h (commercial flight)
        const maxPossibleDistance = timeDiffHours * 1000;
        
        if (distance > maxPossibleDistance && distance > 500) { // 500km minimum to flag
          flags.push("impossible_travel");
          reasons.push(`Impossible travel detected: ${Math.round(distance)}km in ${timeDiffHours.toFixed(1)} hours`);
          riskScore += 40;
        }
      }
    }
  }

  // 5. Check for multiple failed attempts
  const recentFailures = recentLogins.filter(
    l => !l.success && 
    new Date(l.timestamp).getTime() > Date.now() - 60 * 60 * 1000 // Last hour
  );
  
  if (recentFailures.length >= 3) {
    flags.push("multiple_failed_attempts");
    reasons.push(`${recentFailures.length} failed login attempts in the last hour`);
    riskScore += Math.min(30, recentFailures.length * 5);
  }

  // 6. Check for high-risk country
  if (currentLogin.location?.countryCode && HIGH_RISK_COUNTRIES.includes(currentLogin.location.countryCode)) {
    flags.push("high_risk_country");
    reasons.push(`Login from high-risk region: ${currentLogin.location.country}`);
    riskScore += 15;
  }

  // Cap risk score at 100
  riskScore = Math.min(100, riskScore);

  return {
    isAnomalous: riskScore >= 30 || flags.length >= 2,
    riskScore,
    reasons,
    flags,
  };
}

// Haversine formula for distance between two coordinates in km
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Generate a risk summary for email notifications
export function generateRiskSummary(anomaly: AnomalyResult): string {
  if (!anomaly.isAnomalous) {
    return "This login appears normal based on your account history.";
  }

  const riskLevel = anomaly.riskScore >= 70 ? "high" : anomaly.riskScore >= 40 ? "medium" : "low";
  
  return `This login has been flagged as ${riskLevel} risk due to: ${anomaly.reasons.join("; ")}. If this wasn't you, please change your password immediately.`;
}
