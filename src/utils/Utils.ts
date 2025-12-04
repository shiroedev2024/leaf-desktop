export class Utils {
  static getRelativeTime(date: Date): string {
    const diffInMillis = new Date().getTime() - date.getTime();

    if (diffInMillis < 0) {
      return 'in the future';
    }

    const diffInSeconds = Math.floor(diffInMillis / 1000);
    const diffInMinutes = Math.floor(diffInMillis / 1000 / 60);
    const diffInHours = Math.floor(diffInMillis / 1000 / 60 / 60);
    const diffInDays = Math.floor(diffInMillis / 1000 / 60 / 60 / 24);

    if (diffInSeconds < 60) {
      return 'Just now';
    } else if (diffInMinutes === 1) {
      return '1 minute ago';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInHours === 1) {
      return 'An hour ago';
    } else if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    } else if (diffInDays === 1) {
      return 'Yesterday';
    } else {
      return `${diffInDays} days ago`;
    }
  }

  static formatBytes(bytes: number): string {
    if (bytes <= 0) return '0 B';

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let value = bytes;

    for (let i = 0; i < units.length; i++) {
      if (i < units.length - 1) {
        const nextUnitValue = value / 1024;
        if (nextUnitValue < 1) {
          return `${value.toFixed(2)} ${units[i]}`;
        }
        value = nextUnitValue;
      } else {
        return `${value.toFixed(2)} ${units[i]}`;
      }
    }

    return `${value.toFixed(2)} ${units[units.length - 1]}`;
  }

  static isValidUUIDv4(uuid: string): boolean {
    const uuidV4Regex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidV4Regex.test(uuid);
  }

  static async waitFor(
    predicate: () => Promise<boolean>,
    timeout = 10000,
    interval = 250
  ): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      try {
        if (await predicate()) return true;
      } catch {
        // ignore and retry
      }
      await (await import('delay')).default(interval);
    }
    return false;
  }
}
