const DEVICE_ID_KEY = "umobipay_device_id";

/** Returns a stable, opaque browser-installation identifier accepted by LoginDto. */
export function getDeviceId(): string {
  if (typeof window === "undefined") return "umobipay-web-ssr";

  const existing = window.localStorage.getItem(DEVICE_ID_KEY)?.trim();
  if (existing && existing.length <= 100) return existing;

  const randomId =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const deviceId = `umobipay-web-${randomId}`.slice(0, 100);
  window.localStorage.setItem(DEVICE_ID_KEY, deviceId);
  return deviceId;
}
