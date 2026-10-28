import { seatInfo } from "../util.js";

// One small square per seat: filled squares are taken seats.
// Courses with more than 40 seats show a proportional bar instead.
export default function SeatStrip({ course }) {
  const { taken, total, tone } = seatInfo(course);
  const label = taken + " of " + total + " seats taken";
  if (total > 40) {
    return (
      <span className={"seats bar " + tone} role="img" aria-label={label}>
        <b style={{ width: Math.min(100, (taken / total) * 100) + "%" }} />
      </span>
    );
  }
  return (
    <span className={"seats " + tone} role="img" aria-label={label}>
      {Array.from({ length: total }, (_, i) => (
        <i key={i} className={i < taken ? "on" : ""} />
      ))}
    </span>
  );
}
