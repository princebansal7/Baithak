/**
 * Given a rotation (radians, clockwise), return the index of the segment
 * currently under the pointer (top = -π/2 = 12 o'clock position).
 *
 * Drawing convention: segment i starts at angle  -π/2 + rotation + i * segmentAngle
 * So the pointer at -π/2 lands on segment where:
 *   normalized = ((-rotation) mod 2π + 2π) mod 2π
 *   index = floor(normalized / segmentAngle)
 */
export function getSegmentAtRotation(rotation: number, numSegments: number): number {
  if (numSegments === 0) return -1;
  const segmentAngle = (2 * Math.PI) / numSegments;
  const normalized = ((-rotation) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  return Math.floor(normalized / segmentAngle) % numSegments;
}

/**
 * Returns true ONLY when the pointer is sitting right on a segment boundary —
 * a genuine "too close to call" tie. The ambiguous band is a tiny absolute
 * angle (≈0.34° each side ≈ a few pixels at the rim), not a fraction of the
 * wedge, so a clear winner a degree or two off the line is never flagged.
 */
export function isNearBoundary(
  rotation: number,
  numSegments: number,
  thresholdRad = 0.006
): { near: boolean; adjacentIndex: number } {
  if (numSegments <= 1) return { near: false, adjacentIndex: -1 };
  const segmentAngle = (2 * Math.PI) / numSegments;
  // Clamp so the band can never exceed a small slice of a (possibly huge) wedge.
  const threshold = Math.min(thresholdRad, segmentAngle * 0.12);
  const normalized = ((-rotation) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
  const posInSegment = normalized % segmentAngle;
  const currentIndex = Math.floor(normalized / segmentAngle) % numSegments;

  if (posInSegment < threshold) {
    // Near start of this segment = near end of previous
    const prevIndex = (currentIndex - 1 + numSegments) % numSegments;
    return { near: true, adjacentIndex: prevIndex };
  } else if (posInSegment > segmentAngle - threshold) {
    // Near end of this segment = near start of next
    const nextIndex = (currentIndex + 1) % numSegments;
    return { near: true, adjacentIndex: nextIndex };
  }

  return { near: false, adjacentIndex: -1 };
}

/** Cubic ease-out */
export const easeOut = (t: number): number => 1 - Math.pow(1 - t, 3);

/** Smooth ease-out for a more dramatic feel */
export const easeOutQuint = (t: number): number => 1 - Math.pow(1 - t, 5);
