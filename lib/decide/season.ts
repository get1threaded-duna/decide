// Northern-hemisphere meteorological seasons (3-month buckets).
// `month` is 0-indexed (matches Date.prototype.getMonth()).
export function getSeason(month: number): "Spring" | "Summer" | "Autumn" | "Winter" {
  if (month >= 2 && month <= 4) return "Spring";
  if (month >= 5 && month <= 7) return "Summer";
  if (month >= 8 && month <= 10) return "Autumn";
  return "Winter";
}
