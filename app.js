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

  //delete button
  document.getElementById("clear-all").addEventListener("click", () => {
  if (!confirm("Delete all lectures?")) return;
  lectures = [];
  saveLectures(lectures);
  render();
});

  saveLectures(lectures);
  render();
  form.reset();
});

// ─────────────────────────────────────────────
// Startup
// ─────────────────────────────────────────────
populateHallSelect();
render();

const LEAD_MINUTES = 1;            // demo value; raise it later
const CHECK_EVERY_MS = 1000;
const FIRED_KEY = "firedAlerts";

const banner = document.getElementById("alert-banner");

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
      showAlert(lecture, start);
    }
  }
}

banner.addEventListener("click", () => { banner.hidden = true; });
setInterval(checkAlerts, CHECK_EVERY_MS);
checkAlerts();

const enableBtn = document.getElementById("enable-notifications");
const notifStatus = document.getElementById("notif-status");

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").catch((err) => {
    console.error("Service worker registration failed:", err);
  });
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

updateNotifStatus();