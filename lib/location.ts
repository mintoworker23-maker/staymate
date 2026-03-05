import { KENYAN_TERTIARY_INSTITUTIONS, type KenyanInstitution } from '@/data/kenyan-tertiary-institutions';

export const DEFAULT_LOCATION_RADIUS_KM = 8;
export const MIN_LOCATION_RADIUS_KM = 1;
export const MAX_LOCATION_RADIUS_KM = 40;

type LocationPermissionResult = {
  granted: boolean;
};

type PositionResult = {
  coords?: {
    latitude?: number;
    longitude?: number;
  };
};

type ReverseGeocodeResult = Array<Record<string, unknown>>;

type ExpoLocationModule = {
  requestForegroundPermissionsAsync: () => Promise<LocationPermissionResult>;
  getCurrentPositionAsync: (options?: Record<string, unknown>) => Promise<PositionResult>;
  reverseGeocodeAsync: (coords: {
    latitude: number;
    longitude: number;
  }) => Promise<ReverseGeocodeResult>;
  Accuracy?: {
    Balanced?: number;
    High?: number;
  };
};

export type LocationSnapshot = {
  latitude: number;
  longitude: number;
  town: string;
  estate: string;
};

export type RequestLocationSnapshotResult =
  | {
      ok: true;
      snapshot: LocationSnapshot;
    }
  | {
      ok: false;
      code: 'module-missing' | 'permission-denied' | 'location-unavailable';
      message: string;
    };

export function normalizeLookupKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function normalizeRadiusKm(value: unknown, fallback = DEFAULT_LOCATION_RADIUS_KM) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }

  const rounded = Math.round(numericValue);
  return Math.max(MIN_LOCATION_RADIUS_KM, Math.min(MAX_LOCATION_RADIUS_KM, rounded));
}

export function getEmailDomain(email: string) {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes('@')) return '';

  const domain = normalized.split('@')[1] ?? '';
  return domain.trim();
}

export function inferInstitutionFromEmail(email: string): KenyanInstitution | null {
  const domain = getEmailDomain(email);
  if (!domain) return null;

  for (const institution of KENYAN_TERTIARY_INSTITUTIONS) {
    const matchedDomain = institution.emailDomains.find((entry) => {
      const normalizedDomain = entry.trim().toLowerCase();
      if (!normalizedDomain) return false;
      return domain === normalizedDomain || domain.endsWith(`.${normalizedDomain}`);
    });

    if (matchedDomain) {
      return institution;
    }
  }

  return null;
}

export function searchKenyanInstitutions(query: string, limit = 30) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return KENYAN_TERTIARY_INSTITUTIONS.slice(0, limit);
  }

  return KENYAN_TERTIARY_INSTITUTIONS.filter((institution) =>
    institution.name.toLowerCase().includes(normalizedQuery)
  ).slice(0, limit);
}

export function sanitizeLocationText(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function asString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function requestLocationSnapshot(): Promise<RequestLocationSnapshotResult> {
  try {
    const moduleName = 'expo-location';
    const locationModule = (await import(moduleName)) as unknown as ExpoLocationModule;

    const permission = await locationModule.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      return {
        ok: false,
        code: 'permission-denied',
        message: 'Location permission was denied. You can still enter your location manually.',
      };
    }

    const accuracy =
      locationModule.Accuracy?.Balanced ?? locationModule.Accuracy?.High ?? undefined;
    const position = await locationModule.getCurrentPositionAsync(
      accuracy ? { accuracy } : undefined
    );

    const latitude = Number(position.coords?.latitude);
    const longitude = Number(position.coords?.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return {
        ok: false,
        code: 'location-unavailable',
        message: 'Unable to fetch your current coordinates. Please enter location manually.',
      };
    }

    const reverseGeocode = await locationModule.reverseGeocodeAsync({ latitude, longitude });
    const primaryResult = reverseGeocode[0] ?? {};

    const town =
      asString(primaryResult.city) ||
      asString(primaryResult.subregion) ||
      asString(primaryResult.region);
    const estate =
      asString(primaryResult.district) ||
      asString(primaryResult.name) ||
      asString(primaryResult.street);

    return {
      ok: true,
      snapshot: {
        latitude,
        longitude,
        town,
        estate,
      },
    };
  } catch {
    return {
      ok: false,
      code: 'module-missing',
      message:
        'Location access module is unavailable. Install expo-location, or enter your location manually.',
    };
  }
}

export function haversineDistanceKm(args: {
  fromLat: number;
  fromLng: number;
  toLat: number;
  toLng: number;
}) {
  const earthRadiusKm = 6371;
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  const deltaLat = toRadians(args.toLat - args.fromLat);
  const deltaLng = toRadians(args.toLng - args.fromLng);
  const fromLatRadians = toRadians(args.fromLat);
  const toLatRadians = toRadians(args.toLat);

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2) *
      Math.cos(fromLatRadians) *
      Math.cos(toLatRadians);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}
