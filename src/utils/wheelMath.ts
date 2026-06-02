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
 * Returns true if the pointer is within `thresholdFraction` of a segment boundary.
 */
export function isNearBoundary(
  rotation: number,
  numSegments: number,
  thresholdFraction = 0.04
): { near: boolean; adjacentIndex: number } {
  if (numSegments <= 1) return { near: false, adjacentIndex: -1 };
  const segmentAngle = (2 * Math.PI) / numSegments;
  const threshold = segmentAngle * thresholdFraction;
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
