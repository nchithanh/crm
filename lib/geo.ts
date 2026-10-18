/** Haversine distance in meters. */
export function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export type BranchGeo = {
  lat?: number;
  lng?: number;
  checkInRadiusM?: number;
};

export type GeoCheckResult =
  | { ok: true; meters: number; radiusM: number; simulated?: boolean }
  | { ok: false; reason: "unsupported" | "denied" | "unavailable" | "outside" | "no-branch"; meters?: number; radiusM?: number };

const DEFAULT_RADIUS_M = 150;

export function branchRadiusM(branch: BranchGeo | null | undefined) {
  return branch?.checkInRadiusM && branch.checkInRadiusM > 0 ? branch.checkInRadiusM : DEFAULT_RADIUS_M;
}

export function branchHasGeo(branch: BranchGeo | null | undefined): branch is BranchGeo & { lat: number; lng: number } {
  return typeof branch?.lat === "number" && typeof branch?.lng === "number" && Number.isFinite(branch.lat) && Number.isFinite(branch.lng);
}

/** Real GPS check against branch center (demo geofence). */
export function readCurrentPosition(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) reject(new Error("denied"));
        else reject(new Error("unavailable"));
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 0 },
    );
  });
}

export async function verifyAtBranch(
  branch: BranchGeo | null | undefined,
  opts?: { simulateAtCenter?: boolean },
): Promise<GeoCheckResult> {
  if (!branchHasGeo(branch)) return { ok: false, reason: "no-branch" };
  const radiusM = branchRadiusM(branch);
  const center = { lat: branch.lat, lng: branch.lng };

  if (opts?.simulateAtCenter) {
    return { ok: true, meters: 0, radiusM, simulated: true };
  }

  try {
    const here = await readCurrentPosition();
    const meters = distanceMeters(here, center);
    if (meters > radiusM) return { ok: false, reason: "outside", meters: Math.round(meters), radiusM };
    return { ok: true, meters: Math.round(meters), radiusM };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "unavailable";
    if (reason === "denied" || reason === "unsupported" || reason === "unavailable") {
      return { ok: false, reason };
    }
    return { ok: false, reason: "unavailable" };
  }
}
