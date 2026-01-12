import { useState, useEffect, useCallback } from 'react';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

interface DeviceInfo {
  fingerprint: string;
  components: {
    platform: string;
    timezone: string;
    language: string;
    screenResolution: string;
    colorDepth: number;
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };
  isTrusted: boolean;
  firstSeen?: string;
  lastSeen?: string;
}

const TRUSTED_DEVICES_KEY = 'trusted_devices';
const MAX_TRUSTED_DEVICES = 5;

export function useDeviceFingerprint() {
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);
  const [loading, setLoading] = useState(true);

  // Generate device fingerprint on mount
  useEffect(() => {
    const generateFingerprint = async () => {
      try {
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        
        const info: DeviceInfo = {
          fingerprint: result.visitorId,
          components: {
            platform: navigator.platform || 'unknown',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            screenResolution: `${screen.width}x${screen.height}`,
            colorDepth: screen.colorDepth,
            deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
            hardwareConcurrency: navigator.hardwareConcurrency,
          },
          isTrusted: checkIfTrusted(result.visitorId),
        };

        // Update last seen for this device
        updateDeviceSeen(result.visitorId);
        
        setFingerprint(result.visitorId);
        setDeviceInfo(info);
      } catch (error) {
        console.error('Failed to generate fingerprint:', error);
        // Generate a fallback fingerprint
        const fallback = generateFallbackFingerprint();
        setFingerprint(fallback);
        setDeviceInfo({
          fingerprint: fallback,
          components: {
            platform: navigator.platform || 'unknown',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            screenResolution: `${screen.width}x${screen.height}`,
            colorDepth: screen.colorDepth,
          },
          isTrusted: false,
        });
      } finally {
        setLoading(false);
      }
    };

    generateFingerprint();
  }, []);

  // Generate fallback fingerprint from available data
  const generateFallbackFingerprint = (): string => {
    const data = [
      navigator.userAgent,
      navigator.platform,
      navigator.language,
      screen.width,
      screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
    ].join('|');
    
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  };

  // Check if device is in trusted list
  const checkIfTrusted = (fp: string): boolean => {
    try {
      const trusted = localStorage.getItem(TRUSTED_DEVICES_KEY);
      if (!trusted) return false;
      const devices: Record<string, { firstSeen: string; lastSeen: string }> = JSON.parse(trusted);
      return !!devices[fp];
    } catch {
      return false;
    }
  };

  // Update device last seen timestamp
  const updateDeviceSeen = (fp: string): void => {
    try {
      const trusted = localStorage.getItem(TRUSTED_DEVICES_KEY);
      const devices: Record<string, { firstSeen: string; lastSeen: string }> = trusted ? JSON.parse(trusted) : {};
      
      if (devices[fp]) {
        devices[fp].lastSeen = new Date().toISOString();
      }
      
      localStorage.setItem(TRUSTED_DEVICES_KEY, JSON.stringify(devices));
    } catch {
      // Ignore storage errors
    }
  };

  // Mark current device as trusted
  const markAsTrusted = useCallback(() => {
    if (!fingerprint) return;
    
    try {
      const trusted = localStorage.getItem(TRUSTED_DEVICES_KEY);
      const devices: Record<string, { firstSeen: string; lastSeen: string; deviceName?: string }> = trusted ? JSON.parse(trusted) : {};
      
      // Limit to max trusted devices
      const deviceKeys = Object.keys(devices);
      if (deviceKeys.length >= MAX_TRUSTED_DEVICES && !devices[fingerprint]) {
        // Remove oldest device
        const oldest = deviceKeys.reduce((a, b) => 
          new Date(devices[a].lastSeen) < new Date(devices[b].lastSeen) ? a : b
        );
        delete devices[oldest];
      }
      
      const now = new Date().toISOString();
      devices[fingerprint] = {
        firstSeen: devices[fingerprint]?.firstSeen || now,
        lastSeen: now,
        deviceName: getDeviceName(),
      };
      
      localStorage.setItem(TRUSTED_DEVICES_KEY, JSON.stringify(devices));
      
      if (deviceInfo) {
        setDeviceInfo({ ...deviceInfo, isTrusted: true, firstSeen: devices[fingerprint].firstSeen });
      }
    } catch {
      // Ignore storage errors
    }
  }, [fingerprint, deviceInfo]);

  // Remove current device from trusted list
  const removeFromTrusted = useCallback(() => {
    if (!fingerprint) return;
    
    try {
      const trusted = localStorage.getItem(TRUSTED_DEVICES_KEY);
      if (!trusted) return;
      
      const devices: Record<string, { firstSeen: string; lastSeen: string }> = JSON.parse(trusted);
      delete devices[fingerprint];
      
      localStorage.setItem(TRUSTED_DEVICES_KEY, JSON.stringify(devices));
      
      if (deviceInfo) {
        setDeviceInfo({ ...deviceInfo, isTrusted: false });
      }
    } catch {
      // Ignore storage errors
    }
  }, [fingerprint, deviceInfo]);

  // Get all trusted devices
  const getTrustedDevices = useCallback((): Array<{ fingerprint: string; firstSeen: string; lastSeen: string; deviceName?: string }> => {
    try {
      const trusted = localStorage.getItem(TRUSTED_DEVICES_KEY);
      if (!trusted) return [];
      
      const devices: Record<string, { firstSeen: string; lastSeen: string; deviceName?: string }> = JSON.parse(trusted);
      return Object.entries(devices).map(([fp, data]) => ({
        fingerprint: fp,
        ...data,
      }));
    } catch {
      return [];
    }
  }, []);

  // Clear all trusted devices
  const clearTrustedDevices = useCallback(() => {
    try {
      localStorage.removeItem(TRUSTED_DEVICES_KEY);
      if (deviceInfo) {
        setDeviceInfo({ ...deviceInfo, isTrusted: false });
      }
    } catch {
      // Ignore storage errors
    }
  }, [deviceInfo]);

  return {
    fingerprint,
    deviceInfo,
    loading,
    isTrusted: deviceInfo?.isTrusted ?? false,
    markAsTrusted,
    removeFromTrusted,
    getTrustedDevices,
    clearTrustedDevices,
  };
}

// Helper function to get a friendly device name
function getDeviceName(): string {
  const ua = navigator.userAgent;
  
  // Detect OS
  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'Mac';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iOS') || ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
  
  // Detect browser
  let browser = 'Browser';
  if (ua.includes('Chrome') && !ua.includes('Edge')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edge')) browser = 'Edge';
  
  return `${browser} on ${os}`;
}
