import { getNextOccurrence } from "./time.js";

function check(name, lecture, now, expected) {
  const got = getNextOccurrence(lecture, now);
  const pass = got !== null && got.getTime() === expected.getTime();
  console.log(pass ? "PASS" : "FAIL", "-", name, "->", got && got.toString());
}

// Months are 0-based: 9 = October, 10 = November. Oct 11 2026 is a Sunday.
check("1 later today",    { day: 3, time: "10:00" }, new Date(2026, 9, 14, 8, 0),   new Date(2026, 9, 14, 10, 0));
check("2 earlier today",  { day: 3, time: "10:00" }, new Date(2026, 9, 14, 11, 0),  new Date(2026, 9, 21, 10, 0));
check("3 tomorrow",       { day: 4, time: "08:00" }, new Date(2026, 9, 14, 20, 0),  new Date(2026, 9, 15, 8, 0));
check("4 next week",      { day: 2, time: "09:00" }, new Date(2026, 9, 16, 12, 0),  new Date(2026, 9, 20, 9, 0));
check("5 Sunday to Monday", { day: 1, time: "06:30" }, new Date(2026, 9, 11, 22, 39), new Date(2026, 9, 12, 6, 30));
check("6 month rollover", { day: 1, time: "08:00" }, new Date(2026, 9, 31, 20, 0),  new Date(2026, 10, 2, 8, 0));
check("7 starts exactly now", { day: 3, time: "10:00" }, new Date(2026, 9, 14, 10, 0), new Date(2026, 9, 21, 10, 0));

// Bad data must give null, not a crash
console.log(getNextOccurrence({ day: 1, time: "99:99" }, new Date()) === null ? "PASS" : "FAIL", "- bad time");
console.log(getNextOccurrence({ day: 9, time: "10:00" }, new Date()) === null ? "PASS" : "FAIL", "- bad day");