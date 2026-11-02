export type BrowserLocation = {
  latitude: number;
  longitude: number;
  capturedAt: number;
};

type BrowserLocationOptions = {
  forceRefresh?: boolean;
  maximumAgeMs?: number;
  timeoutMs?: number;
  allowMockDevelopmentFallback?: boolean;
};

export const SHARED_LOCATION_MAX_AGE_MS = 5 * 60 * 1000;
const LOCATION_PERMISSION_DENIED = 1;
const LOCATION_POSITION_UNAVAILABLE = 2;

let cachedLocation: BrowserLocation | null = null;
let pendingLocation: Promise<BrowserLocation> | null = null;

function requestBrowserPosition(options?: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (options) navigator.geolocation.getCurrentPosition(resolve, reject, options);
    else navigator.geolocation.getCurrentPosition(resolve, reject);
  });
}

function locationFailureMessage(error: unknown): string {
  const failure = error as Partial<GeolocationPositionError> | null;
  if (failure?.code === LOCATION_PERMISSION_DENIED) {
    return "Location permission was denied. Allow location for this site and try again.";
  }
  if (failure?.code === LOCATION_POSITION_UNAVAILABLE) {
    return "The browser could not determine this device's location. Check Windows/macOS location services and internet access, then try again.";
  }
  return "Location capture timed out. Check GPS/network and try again.";
}

export function configuredMockDevelopmentLocation(config: {
  isDevelopment: boolean;
  mockPidEnabled: boolean;
  latitude?: string;
  longitude?: string;
}): BrowserLocation | null {
  if (!config.isDevelopment || !config.mockPidEnabled) return null;
  if (!config.latitude?.trim() || !config.longitude?.trim()) return null;
  const latitude = Number(config.latitude);
  const longitude = Number(config.longitude);
  if (
    !Number.isFinite(latitude) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(longitude) ||
    longitude < -180 ||
    longitude > 180
  )
    return null;
  return { latitude, longitude, capturedAt: Date.now() };
}

function mockDevelopmentLocation(): BrowserLocation | null {
  return configuredMockDevelopmentLocation({
    isDevelopment: import.meta.env.DEV,
    mockPidEnabled: String(import.meta.env.VITE_AEPS_USE_MOCK_PID).toLowerCase() === "true",
    latitude: import.meta.env.VITE_MOCK_LATITUDE,
    longitude: import.meta.env.VITE_MOCK_LONGITUDE,
  });
}

export function getCachedBrowserLocation(
  maximumAgeMs = SHARED_LOCATION_MAX_AGE_MS,
): BrowserLocation | null {
  if (!cachedLocation || Date.now() - cachedLocation.capturedAt > maximumAgeMs) return null;
  return cachedLocation;
}

export function browserLocationMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Current location could not be determined. Check GPS/network and try again.";
}

export function getBrowserLocation({
  forceRefresh = false,
  maximumAgeMs = SHARED_LOCATION_MAX_AGE_MS,
  timeoutMs = 15_000,
  allowMockDevelopmentFallback = false,
}: BrowserLocationOptions = {}): Promise<BrowserLocation> {
  if (!forceRefresh) {
    const available = getCachedBrowserLocation(maximumAgeMs);
    if (available) return Promise.resolve(available);
    if (pendingLocation) return pendingLocation;
  }

  if (typeof window === "undefined") {
    return Promise.reject(new Error("Location capture is only available in the browser."));
  }
  if (!window.isSecureContext) {
    return Promise.reject(
      new Error(
        "Location is blocked on an insecure address. Open UMOBIPAY through HTTPS or localhost, then try again.",
      ),
    );
  }
  if (!navigator.geolocation) {
    return Promise.reject(new Error("This browser does not support secure location capture."));
  }

  const request = (async (): Promise<BrowserLocation> => {
    let position: GeolocationPosition;
    try {
      // Keep the browser-default call first. This is the most reliable mode on
      // desktop Chrome and matches the original AEPS flow that worked before
      // shared location caching was introduced.
      position = await requestBrowserPosition();
    } catch (defaultLocationFailure) {
      const failure = defaultLocationFailure as Partial<GeolocationPositionError> | null;
      if (failure?.code === LOCATION_PERMISSION_DENIED) {
        throw new Error(locationFailureMessage(defaultLocationFailure));
      }
      try {
        position = await requestBrowserPosition({
          enableHighAccuracy: true,
          timeout: timeoutMs,
          maximumAge: forceRefresh ? 0 : maximumAgeMs,
        });
      } catch (highAccuracyFailure) {
        const highAccuracyError = highAccuracyFailure as Partial<GeolocationPositionError> | null;
        if (highAccuracyError?.code === LOCATION_PERMISSION_DENIED) {
          throw new Error(locationFailureMessage(highAccuracyFailure));
        }
        try {
          position = await requestBrowserPosition({
            enableHighAccuracy: false,
            timeout: Math.max(timeoutMs, 20_000),
            maximumAge: Math.max(maximumAgeMs, 30 * 60 * 1000),
          });
        } catch (networkLocationFailure) {
          const developmentLocation = allowMockDevelopmentFallback
            ? mockDevelopmentLocation()
            : null;
          if (developmentLocation) {
            cachedLocation = developmentLocation;
            return developmentLocation;
          }
          throw new Error(locationFailureMessage(networkLocationFailure));
        }
      }
    }

    const location = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      capturedAt: Date.now(),
    };
    cachedLocation = location;
    return location;
  })();

  pendingLocation = request;
  void request.then(
    () => {
      if (pendingLocation === request) pendingLocation = null;
    },
    () => {
      if (pendingLocation === request) pendingLocation = null;
    },
  );
  return request;
}

export function asAepsCoordinates(location: BrowserLocation): { lat: string; long: string } {
  return {
    lat: String(location.latitude),
    long: String(location.longitude),
  };
}
