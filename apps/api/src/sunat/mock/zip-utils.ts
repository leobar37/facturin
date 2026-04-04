// ZIP encoding/decoding utilities using Bun native APIs

/**
 * Zip an XML string into a base64-encoded content.
 * For the mock, we base64-encode directly since the CDRParser handles both formats.
 */
export async function zipXml(xmlContent: string): Promise<string> {
  return btoa(xmlContent);
}

/**
 * Decode a base64-encoded ZIP or raw content.
 * Tries base64 decode, returns the raw string.
 */
export async function unzipBase64(base64Content: string): Promise<string> {
  return atob(base64Content);
}
