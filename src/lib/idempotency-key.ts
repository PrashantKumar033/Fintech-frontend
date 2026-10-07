/**
 * Creates an RFC 4122 v4-style idempotency key in secure and insecure browser
 * contexts. `crypto.randomUUID()` is unavailable on plain LAN HTTP origins in
 * some browsers, while `crypto.getRandomValues()` remains widely available.
 */
export function createIdempotencyKey(_prefix = "web"): string {
  const cryptoApi = globalThis.crypto;

  if (typeof cryptoApi?.randomUUID === "function") return cryptoApi.randomUUID();

  if (typeof cryptoApi?.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
    return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
  }

  // Last-resort RFC 4122-shaped key. Financial endpoints validate UUID format,
  // so never fall back to a prefixed value that the gateway will reject.
  const randomNibble = () => Math.floor(Math.random() * 16).toString(16);
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (marker) => {
    const value = Number.parseInt(randomNibble(), 16);
    return (marker === "x" ? value : (value & 0x3) | 0x8).toString(16);
  });
}
