// Returns the Date of the lecture's next start, or null if the data is bad.
function getNextOccurrence(lecture, now = new Date()) {
  // --- Validate the stored data (never trust localStorage) ---
  if (typeof lecture.time !== "string") return null;
  const parts = lecture.time.split(":");
  if (parts.length !== 2) return null;

  const hours = Number(parts[0]);
  const minutes = Number(parts[1]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  if (!Number.isInteger(lecture.day) || lecture.day < 0 || lecture.day > 6) return null;

  // --- How many days until that weekday? (0 means today) ---
  const daysAhead = (lecture.day - now.getDay() + 7) % 7;

  // --- Build the candidate start time ---
  const candidate = new Date(now);
  candidate.setDate(candidate.getDate() + daysAhead);
  candidate.setHours(hours, minutes, 0, 0);

  // --- If it isn't strictly in the future, use next week ---
  // Decision: a lecture starting exactly at "now" counts as already started.
  if (candidate <= now) {
    candidate.setDate(candidate.getDate() + 7);
  }

  return candidate;
}