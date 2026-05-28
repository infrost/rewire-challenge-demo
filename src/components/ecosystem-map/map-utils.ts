export function markerSize(count: number, maxCount: number) {
  if (maxCount <= 0) {
    return 34;
  }

  return Math.round(34 + (count / maxCount) * 44);
}
