// IP Geolocation utilities using free ip-api.com service

export interface GeoLocation {
  city: string | null;
  region: string | null;
  country: string | null;
  countryCode: string | null;
  timezone: string | null;
  isp: string | null;
  lat: number | null;
  lon: number | null;
  formatted: string;
}

export async function getLocationFromIP(ip: string): Promise<GeoLocation> {
  const defaultLocation: GeoLocation = {
    city: null,
    region: null,
    country: null,
    countryCode: null,
    timezone: null,
    isp: null,
    lat: null,
    lon: null,
    formatted: "Unknown location",
  };

  // Skip lookup for private/local IPs
  if (
    ip === "unknown" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("172.") ||
    ip.startsWith("127.") ||
    ip === "::1" ||
    ip === "localhost"
  ) {
    return { ...defaultLocation, formatted: "Local network" };
  }

  try {
    // Using ip-api.com (free tier, 45 requests/minute)
    const response = await fetch(
      `http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,timezone,isp,lat,lon`,
      { 
        signal: AbortSignal.timeout(5000) // 5 second timeout
      }
    );

    if (!response.ok) {
      console.warn(`Geolocation API returned status ${response.status}`);
      return defaultLocation;
    }

    const data = await response.json();

    if (data.status === "fail") {
      console.warn(`Geolocation lookup failed: ${data.message}`);
      return defaultLocation;
    }

    const location: GeoLocation = {
      city: data.city || null,
      region: data.regionName || null,
      country: data.country || null,
      countryCode: data.countryCode || null,
      timezone: data.timezone || null,
      isp: data.isp || null,
      lat: data.lat || null,
      lon: data.lon || null,
      formatted: formatLocation(data.city, data.regionName, data.country),
    };

    return location;
  } catch (error) {
    console.error("Geolocation lookup error:", error);
    return defaultLocation;
  }
}

function formatLocation(
  city: string | null,
  region: string | null,
  country: string | null
): string {
  const parts: string[] = [];
  
  if (city) parts.push(city);
  if (region && region !== city) parts.push(region);
  if (country) parts.push(country);
  
  return parts.length > 0 ? parts.join(", ") : "Unknown location";
}

// Country flag emoji from country code
export function getCountryFlag(countryCode: string | null): string {
  if (!countryCode || countryCode.length !== 2) return "🌍";
  
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  
  return String.fromCodePoint(...codePoints);
}