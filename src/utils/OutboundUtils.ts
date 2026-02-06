export interface NodeDetails {
  country: string;
  region: string;
  ip: string;
}

export class OutboundUtils {
  /**
   * Parses a node tag in the format COUNTRY_REGION_IP_WITH_UNDERSCORES
   * Example: US_DELAWARE_103_35_190_8 -> { country: "US", region: "DELAWARE", ip: "103.35.190.8" }
   */
  public static parseNodeTag(tag: string): NodeDetails | null {
    const nodePattern = /^([A-Z]{2})_([A-Z_]+)_(\d+(_\d+){3})$/;
    const match = tag.match(nodePattern);
    if (match) {
      return {
        country: match[1],
        region: match[2].replace(/_/g, ' '),
        ip: match[3].replace(/_/g, '.'),
      };
    }
    return null;
  }

  /**
   * Converts a country code to a flag emoji.
   */
  public static getCountryEmoji(countryCode: string): string {
    const offset = 127397;
    return String.fromCodePoint(
      ...countryCode
        .toUpperCase()
        .split('')
        .map((char: string) => char.charCodeAt(0) + offset)
    );
  }
}
