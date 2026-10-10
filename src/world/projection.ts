/**
 * WGS84 geographic coordinates <-> UTM zone 31N (EPSG:32631).
 *
 * UTM 31N is a transverse Mercator projection with its central meridian at 3 degrees east.
 * Eastings and northings are in metres. Lagos (about 3.4 E, 6.5 N) is well inside the zone.
 *
 * The maths is the Kruger series, fourth order in the third flattening n. Within this zone it is
 * accurate to well under a millimetre. Only the northern hemisphere is supported.
 */

/** Degrees. `lon` is positive east, `lat` is positive north. */
export interface LonLat {
  lon: number;
  lat: number;
}

/** Metres in UTM zone 31N. */
export interface UtmPoint {
  easting: number;
  northing: number;
}

export const UTM_31N_EPSG = 'EPSG:32631';
export const UTM_31N_CENTRAL_MERIDIAN_DEG = 3;

const DEG_TO_RAD = Math.PI / 180;
const WGS84_A = 6378137;
const WGS84_F = 1 / 298.257223563;
const UTM_SCALE = 0.9996;
const UTM_FALSE_EASTING = 500000;

const N = WGS84_F / (2 - WGS84_F);
const N2 = N * N;
const N3 = N2 * N;
const N4 = N3 * N;

/** Radius of a sphere with the same meridian length as the ellipsoid. */
const RECTIFYING_RADIUS = (WGS84_A / (1 + N)) * (1 + N2 / 4 + N4 / 64);
const SCALED_RADIUS = UTM_SCALE * RECTIFYING_RADIUS;
const CONFORMAL_FACTOR = (2 * Math.sqrt(N)) / (1 + N);

/** Forward series coefficients (geodetic -> transverse Mercator). */
const ALPHA: readonly number[] = [
  N / 2 - (2 * N2) / 3 + (5 * N3) / 16 + (41 * N4) / 180,
  (13 * N2) / 48 - (3 * N3) / 5 + (557 * N4) / 1440,
  (61 * N3) / 240 - (103 * N4) / 140,
  (49561 * N4) / 161280,
];

/** Inverse series coefficients (transverse Mercator -> conformal latitude). */
const BETA: readonly number[] = [
  N / 2 - (2 * N2) / 3 + (37 * N3) / 96 - N4 / 360,
  N2 / 48 + N3 / 15 - (437 * N4) / 1440,
  (17 * N3) / 480 - (37 * N4) / 840,
  (4397 * N4) / 161280,
];

/** Conformal latitude -> geodetic latitude. */
const DELTA: readonly number[] = [
  2 * N - (2 * N2) / 3 - 2 * N3 + (116 * N4) / 45,
  (7 * N2) / 3 - (8 * N3) / 5 - (227 * N4) / 45,
  (56 * N3) / 15 - (136 * N4) / 35,
  (4279 * N4) / 630,
];

/** Converts degrees to UTM 31N metres. Throws RangeError outside lon 0..6, lat 0..84. */
export function lonLatToUtm31N(point: LonLat): UtmPoint {
  const { lon, lat } = point;
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) {
    throw new RangeError('lon and lat must be finite numbers');
  }
  if (lat < 0 || lat > 84) {
    throw new RangeError('lat must be between 0 and 84 degrees (northern hemisphere only)');
  }
  if (lon < 0 || lon > 6) {
    throw new RangeError('lon must be between 0 and 6 degrees east (UTM zone 31)');
  }

  const phi = lat * DEG_TO_RAD;
  const lambda = (lon - UTM_31N_CENTRAL_MERIDIAN_DEG) * DEG_TO_RAD;
  const sinPhi = Math.sin(phi);

  const t = Math.sinh(
    Math.atanh(sinPhi) - CONFORMAL_FACTOR * Math.atanh(CONFORMAL_FACTOR * sinPhi),
  );
  const xiPrime = Math.atan2(t, Math.cos(lambda));
  const etaPrime = Math.atanh(Math.sin(lambda) / Math.sqrt(1 + t * t));

  let xi = xiPrime;
  let eta = etaPrime;
  for (let j = 1; j <= ALPHA.length; j += 1) {
    xi += ALPHA[j - 1] * Math.sin(2 * j * xiPrime) * Math.cosh(2 * j * etaPrime);
    eta += ALPHA[j - 1] * Math.cos(2 * j * xiPrime) * Math.sinh(2 * j * etaPrime);
  }

  return {
    easting: UTM_FALSE_EASTING + SCALED_RADIUS * eta,
    northing: SCALED_RADIUS * xi,
  };
}

/** Converts UTM 31N metres to degrees. Throws RangeError for impossible values. */
export function utm31NToLonLat(point: UtmPoint): LonLat {
  const { easting, northing } = point;
  if (!Number.isFinite(easting) || !Number.isFinite(northing)) {
    throw new RangeError('easting and northing must be finite numbers');
  }
  if (northing < 0 || easting < 100000 || easting > 900000) {
    throw new RangeError('easting or northing is outside the supported UTM range');
  }

  const xi = northing / SCALED_RADIUS;
  const eta = (easting - UTM_FALSE_EASTING) / SCALED_RADIUS;

  let xiPrime = xi;
  let etaPrime = eta;
  for (let j = 1; j <= BETA.length; j += 1) {
    xiPrime -= BETA[j - 1] * Math.sin(2 * j * xi) * Math.cosh(2 * j * eta);
    etaPrime -= BETA[j - 1] * Math.cos(2 * j * xi) * Math.sinh(2 * j * eta);
  }

  const chi = Math.asin(Math.sin(xiPrime) / Math.cosh(etaPrime));
  let phi = chi;
  for (let j = 1; j <= DELTA.length; j += 1) {
    phi += DELTA[j - 1] * Math.sin(2 * j * chi);
  }
  const lambda = Math.atan2(Math.sinh(etaPrime), Math.cos(xiPrime));

  return {
    lon: UTM_31N_CENTRAL_MERIDIAN_DEG + lambda / DEG_TO_RAD,
    lat: phi / DEG_TO_RAD,
  };
}
