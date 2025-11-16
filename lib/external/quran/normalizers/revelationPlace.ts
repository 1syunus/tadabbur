export type RevelationPlace = 'makkah' | 'madinah' | 'unknown';

export function normalizeRevelationPlace(place?: string): RevelationPlace {
  if (!place) return 'unknown';

  const normalized = place.toLowerCase().trim();

  if (normalized === 'madinah' || normalized === 'madina') return 'madinah';
  if (normalized === 'makkah' || normalized === 'mecca') return 'makkah';

  return 'unknown'
}
