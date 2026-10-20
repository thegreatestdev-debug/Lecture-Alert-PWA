import { getNextOccurrence } from "./time.js";

console.log("app.js loaded");

// ===== Constants =====
const STORAGE_KEY = "lectures";
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday",
                   "Thursday", "Friday", "Saturday"];

// >>> Replace this list with YOUR real halls. Keep the same ids you used before. <<<
const HALLS = [
  { id: "hallA", name: "SW" },
  { id: "hallB", name: "NLT" },
  { id: "hallC", name: "CALC" }
];

// ===== Page elements =====
const form = document.getElementById("lecture-form");
const listEl = document.getElementById("lecture-list");
const hallSelect = document.getElementById("hall");
const formError = document.getElementById("form-error");
const clearBtn = document.getElementById("clear-all");

// ===== Storage =====
function loadLectures() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Could not read saved lectures:", err);
    return [];
  }
}

function saveLectures(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

let lectures = loadLectures();

// ===== Helpers =====
function hallLabel(lecture) {
  const hall = HALLS.find((h) => h.id === lecture.hall);
  return hall ? hall.name : "Unknown hall";
}

// ===== Schedule view: hall list, lecture list, form, clear =====
function fillHallSelect() {
  for (const hall of HALLS) {
    const option = document.createElement("option");
    option.value = hall.id;
    option.textContent = hall.name;
    hallSelect.appendChild(option);
  }
}

function render() {
  listEl.replaceChildren();
  for (const lecture of lectures) {
    const li = document.createElement("li");
    li.textContent =
      `${lecture.course} - ${DAY_NAMES[lecture.day]} ${lecture.time} - ` +
      `${hallLabel(lecture)} - Room ${lecture.room || "n/a"}`;
    listEl.appendChild(li);
  }
}

function showFormError(message) {
  formError.textContent = message;
  formError.hidden = false;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  formError.hidden = true;

  const course = document.getElementById("course").value.trim();
  const day = Number(document.getElementById("day").value);
  const time = document.getElementById("time").value;
  const hall = document.getElementById("hall").value;
  const room = document.getElementById("room").value.trim();

  if (course === "") return showFormError("Enter a course name.");
  if (time === "") return showFormError("Pick a start time.");
  if (!HALLS.some((h) => h.id === hall)) return showFormError("Select a hall.");

  lectures.push({ id: crypto.randomUUID(), course, day, time, hall, room });
  saveLectures(lectures);
  render();
  form.reset();
});

clearBtn.addEventListener("click", () => {
  if (!confirm("Delete all lectures?")) return;
  lectures = [];
  saveLectures(lectures);
  render();
});

fillHallSelect();
render();

// ===== Settings =====
const SETTINGS_KEY = "settings";

const ACCENTS = {
  violet: { accent: "#8b5cf6", accent2: "#22d3ee" },
  pink:   { accent: "#ec4899", accent2: "#f59e0b" },
  green:  { accent: "#22c55e", accent2: "#06b6d4" },
  orange: { accent: "#f97316", accent2: "#eab308" }
};
const THEMES = ["dark", "light"];
const DEFAULT_SETTINGS = { leadMinutes: 10, theme: "dark", accent: "violet" };

function loadSettings() {
  try {
    const raw = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    const lead = Number(raw && raw.leadMinutes);
    return {
      leadMinutes: Number.isInteger(lead) && lead >= 1 && lead <= 120
        ? lead : DEFAULT_SETTINGS.leadMinutes,
      theme: raw && THEMES.includes(raw.theme) ? raw.theme : DEFAULT_SETTINGS.theme,
      accent: raw && Object.keys(ACCENTS).includes(raw.accent) ? raw.accent : DEFAULT_SETTINGS.accent
    };
  } catch (err) {
    return { ...DEFAULT_SETTINGS };
  }
}

let settings = loadSettings();

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function applySettings() {
  const root = document.documentElement;
  root.dataset.theme = settings.theme;
  root.style.setProperty("--accent", ACCENTS[settings.accent].accent);
  root.style.setProperty("--accent-2", ACCENTS[settings.accent].accent2);
}

const leadInput = document.getElementById("lead-minutes");
const themeSelect = document.getElementById("theme-select");
const accentPicker = document.getElementById("accent-picker");

function buildAccentPicker() {
  accentPicker.replaceChildren();
  for (const [name, colors] of Object.entries(ACCENTS)) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "swatch";
    btn.title = name;
    btn.setAttribute("aria-label", `${name} accent`);
    btn.style.background = `linear-gradient(135deg, ${colors.accent}, ${colors.accent2})`;
    btn.classList.toggle("selected", name === settings.accent);
    btn.addEventListener("click", () => {
      settings.accent = name;
      saveSettings();
      applySettings();
      buildAccentPicker();
    });
    accentPicker.appendChild(btn);
  }
}

leadInput.value = settings.leadMinutes;
themeSelect.value = settings.theme;

leadInput.addEventListener("change", () => {
  const value = Number(leadInput.value);
  if (Number.isInteger(value) && value >= 1 && value <= 120) {
    settings.leadMinutes = value;
    saveSettings();
  } else {
    leadInput.value = settings.leadMinutes;
  }
});

themeSelect.addEventListener("change", () => {
  if (THEMES.includes(themeSelect.value)) {
    settings.theme = themeSelect.value;
    saveSettings();
    applySettings();
  }
});

applySettings();
buildAccentPicker();

// ===== Alerts and notifications =====    
const CHECK_EVERY_MS = 1000;
const FIRED_KEY = "firedAlerts";

const banner = document.getElementById("alert-banner");
const enableBtn = document.getElementById("enable-notifications");
const notifStatus = document.getElementById("notif-status");

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
  const mins = Math.max(1, Math.round((start - new Date()) / 60000));
  const room = lecture.room || "n/a";

  banner.textContent =
    `${lecture.course} starts in ${mins} min - ${hallLabel(lecture)}, Room ${room}`;
  banner.hidden = false;

  sendNotification(
    `${lecture.course} starts in ${mins} min`,
    `${hallLabel(lecture)}, Room ${room}`,
    key
  );
}

function checkAlerts() {
  const now = new Date();
  for (const lecture of lectures) {
    const start = getNextOccurrence(lecture, now);
    if (start === null) continue;

    const alertAt = new Date(start.getTime() - settings.leadMinutes * 60 * 1000);
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

// ===== Upcoming view =====
const upcomingView = document.getElementById("view-upcoming");
const nextCard = document.getElementById("next-card");
const upcomingList = document.getElementById("upcoming-list");
const upcomingEmpty = document.getElementById("upcoming-empty");

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

function dayLabel(start, now) {
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((startDay - today) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return DAY_NAMES[start.getDay()];
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
  for (const view of views) {
    view.hidden = view.id !== `view-${name}`;
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
showView(knownViews.includes(savedView) ? savedView : "upcoming");