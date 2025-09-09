/**
 * Encryption utilities - Stub implementations
 */

export function maskSensitiveData(data: any): any {
  return data;
}

export function encryptData(data: any): any {
  return data;
}

export function decryptData(data: any): any {
  return data;
}

export function encryptJSON(data: any): string {
  return JSON.stringify(data);
}

export function decryptJSON(encrypted: string): any {
  try {
    return JSON.parse(encrypted);
  } catch {
    return {};
  }
}
