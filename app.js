import { getNextOccurrence } from "./time.js";

console.log("app.js loaded");

// ─────────────────────────────────────────────
// HALLS — replace with your real campus halls
// ─────────────────────────────────────────────
const HALLS = [
  { id: "auditorium", name: "Main Auditorium" },
  { id: "hallA",      name: "SW" },
  { id: "hallB",      name: "NLT" },
  { id: "hallC",      name: "CALC" },
  { id: "lawhall",    name: "Law Hall" },
];

// ─────────────────────────────────────────────
// Populate the <select id="hall"> with HALLS
// ─────────────────────────────────────────────
function populateHallSelect() {
  const select = document.getElementById("hall");
  if (!select) return;

  for (const hall of HALLS) {
    const option = document.createElement("option");
    option.value = hall.id;
    option.textContent = hall.name;
    select.appendChild(option);
  }
}

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const STORAGE_KEY = "lectures";
const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday",
  "Thursday", "Friday", "Saturday",
];

// ─────────────────────────────────────────────
// Element references
// ─────────────────────────────────────────────
const form   = document.getElementById("lecture-form");
const listEl = document.getElementById("lecture-list");

// ─────────────────────────────────────────────
// Storage
// ─────────────────────────────────────────────
function loadLectures() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error("Could not read saved lectures:", err);
    return [];
  }
}

function saveLectures(lectures) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lectures));
}

let lectures = loadLectures();

// ─────────────────────────────────────────────
// Render — loops over all lectures
// ─────────────────────────────────────────────
function render() {
  listEl.replaceChildren();

  for (const lecture of lectures) {
    const li = document.createElement("li");

    // Look up the hall's display name by its stored id
    const hall = HALLS.find(h => h.id === lecture.hall);
    const hallName = hall ? hall.name : "Unknown hall";

    li.textContent =
      `${lecture.course} - ${DAY_NAMES[lecture.day]} ${lecture.time}` +
      ` - ${hallName} - Room ${lecture.room}`;

    listEl.appendChild(li);
  }
}

// ─────────────────────────────────────────────
// Submit handler
// ─────────────────────────────────────────────
form.addEventListener("submit", (event) => {
  event.preventDefault();

  const course = document.getElementById("course").value.trim();
  const day    = Number(document.getElementById("day").value);
  const time   = document.getElementById("time").value;
  const room   = document.getElementById("room").value.trim();
  const hall   = document.getElementById("hall").value;

  // Reject if hall not chosen
  if (hall === "") {
    alert("Please select a lecture hall.");
    return;
  }

  // Reject if required fields are empty
  if (course === "" || time === "") {
    return;
  }

  lectures.push({
    id: crypto.randomUUID(),
    course,
    day,
    time,
    hall,
    room,
  });

  saveLectures(lectures);
  render();
  form.reset();
});


// ─────────────────────────────────────────────
// Clear all lectures button (single listener, once)
// ─────────────────────────────────────────────
document.getElementById("clear-all").addEventListener("click", () => {
  if (!confirm("Delete all lectures?")) return;
  lectures = [];
  saveLectures(lectures);
  render();
});

// ─────────────────────────────────────────────
// Startup
// ─────────────────────────────────────────────
populateHallSelect();
render();
// ===== Alerts and notifications =====
const LEAD_MINUTES = 1;            // demo value; raise it later
const CHECK_EVERY_MS = 1000;
const FIRED_KEY = "firedAlerts";

const banner = document.getElementById("alert-banner");
const enableBtn = document.getElementById("enable-notifications");
const notifStatus = document.getElementById("notif-status");
const lecture = document.getElementById("lecture-form");
const list = document.getElementById("lecture-list");


function loadFired() {
  try {
    const raw = localStorage.getItem(FIRED_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (err) {
    return new Set();
  }
}

function saveFired(set) {
  localStorage.setItem(FIRED_KEY, JSON.stringify([...set]));
}

const fired = loadFired();

async function sendNotification(title, body, tag) {
  if (typeof Notification === "undefined" ||
      !("serviceWorker" in navigator) ||
      Notification.permission !== "granted") return;
  try {
    const reg = await navigator.serviceWorker.ready;
    await reg.showNotification(title, { body, tag });
  } catch (err) {
    console.error("Notification failed:", err);
  }
}

function showAlert(lecture, start, key) {
  const hall = HALLS.find((h) => h.id === lecture.hall);
  const hallName = hall ? hall.name : "Unknown hall";
  const mins = Math.max(1, Math.round((start - new Date()) / 60000));
  const room = lecture.room || "n/a";

  banner.textContent = `${lecture.course} starts in ${mins} min - ${hallName}, Room ${room}`;
  banner.hidden = false;

  sendNotification(`${lecture.course} starts in ${mins} min`, `${hallName}, Room ${room}`, key);
}

function checkAlerts() {
  const now = new Date();
  for (const lecture of lectures) {
    const start = getNextOccurrence(lecture, now);
    if (start === null) continue;

    const alertAt = new Date(start.getTime() - LEAD_MINUTES * 60 * 1000);
    const key = `${lecture.id}|${start.getTime()}`;

    if (now >= alertAt && !fired.has(key)) {
      fired.add(key);
      saveFired(fired);
      console.log("ALERT fired:", lecture.course,
                  "| start", start.toTimeString(), "| now", now.toTimeString());
      showAlert(lecture, start, key);
    }
  }
}

function updateNotifStatus() {
  if (typeof Notification === "undefined") {
    notifStatus.textContent = "Notifications are not supported here.";
    enableBtn.hidden = true;
  } else if (Notification.permission === "granted") {
    notifStatus.textContent = "Notifications are on.";
    enableBtn.hidden = true;
  } else if (Notification.permission === "denied") {
    notifStatus.textContent = "Blocked. Allow notifications for this site in browser settings.";
    enableBtn.hidden = true;
  } else {
    notifStatus.textContent = "Notifications are off.";
    enableBtn.hidden = false;
  }
}

enableBtn.addEventListener("click", async () => {
  await Notification.requestPermission();
  updateNotifStatus();
});

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch((err) => {
    console.error("Service worker registration failed:", err);
  });
}

banner.addEventListener("click", () => { banner.hidden = true; });
setInterval(checkAlerts, CHECK_EVERY_MS);
checkAlerts();
updateNotifStatus();


// TEMP DEBUG - delete before deploying
window.dbg = () => {
  const now = new Date();
  console.log("now:", now.toString(), "| LEAD_MINUTES:", LEAD_MINUTES, "| lectures:", lectures.length);
  for (const l of lectures) {
    const s = getNextOccurrence(l, now);
    console.log(
      l.course,
      "| day:", l.day, typeof l.day,
      "| time:", l.time,
      "| next start:", s && s.toString(),
      "| alert at:", s && new Date(s.getTime() - LEAD_MINUTES * 60000).toTimeString(),
      "| already fired:", s && fired.has(`${l.id}|${s.getTime()}`)
    );
  }
  console.log("fired set:", [...fired]);
};

// ===== Upcoming view =====
const upcomingView = document.getElementById("view-upcoming");
const nextCard = document.getElementById("next-card");
const upcomingList = document.getElementById("upcoming-list");
const upcomingEmpty = document.getElementById("upcoming-empty");
// days and hours when far away and when closer
function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m ${seconds}s`;
}
// comlpares days
function dayLabel(start, now) {
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((startDay - today) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return DAY_NAMES[start.getDay()];
}

function hallLabel(lecture) {
  const hall = HALLS.find((h) => h.id === lecture.hall);
  return hall ? hall.name : "Unknown hall";
}

function getUpcoming(now) {
  return lectures
    .map((lecture) => ({ lecture, start: getNextOccurrence(lecture, now) }))
    .filter((item) => item.start !== null)
    .sort((a, b) => a.start - b.start);
}

function renderUpcoming() {
  if (upcomingView.hidden) return;

  const now = new Date();
  const items = getUpcoming(now);

  nextCard.replaceChildren();
  upcomingList.replaceChildren();
  nextCard.hidden = items.length === 0;
  upcomingEmpty.hidden = items.length > 0;
  if (items.length === 0) return;

  const [first, ...rest] = items;

  const title = document.createElement("div");
  title.className = "next-title";
  title.textContent = first.lecture.course;

  const count = document.createElement("div");
  count.className = "next-count";
  count.textContent = formatCountdown(first.start - now);

  const meta = document.createElement("div");
  meta.className = "next-meta";
  meta.textContent =
    `${dayLabel(first.start, now)} ${first.start.toTimeString().slice(0, 5)} - ` +
    `${hallLabel(first.lecture)}, Room ${first.lecture.room || "n/a"}`;

  nextCard.append(title, count, meta);

  for (const item of rest.slice(0, 6)) {
    const li = document.createElement("li");
    li.textContent =
      `${item.lecture.course} - ${dayLabel(item.start, now)} ` +
      `${item.start.toTimeString().slice(0, 5)} - in ${formatCountdown(item.start - now)}`;
    upcomingList.appendChild(li);
  }
}

setInterval(renderUpcoming, 1000);

// ===== View switching =====
const navButtons = document.querySelectorAll("[data-view]");
const views = document.querySelectorAll(".view");
const knownViews = [...views].map((v) => v.id.replace("view-", ""));

function showView(name) {
  for (const View of views) {
    View.hidden = View.id !== `View-${name}`;
  }
  for (const btn of navButtons) {
    btn.classList.toggle("active", btn.dataset.view === name);
  }
  renderUpcoming();
  localStorage.setItem("lastView", name);
}

for (const btn of navButtons) {
  btn.addEventListener("click", () => showView(btn.dataset.view));
}

const savedView = localStorage.getItem("lastView");
showView(knownViews.includes(savedView) ? savedView : "Upcoming");