// Seat state for a course returned by GET /api/courses
export function seatInfo(course) {
  const taken = Number(course.registered) || 0;
  const total = Number(course.seats) || 0;
  const left = Math.max(total - taken, 0);
  const tone = left === 0 ? "full" : taken / total >= 0.8 ? "tight" : "open";
  const text = left === 0 ? "Full" : left === 1 ? "1 seat left" : left + " seats left";
  return { taken, total, left, tone, text };
}
