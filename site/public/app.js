const STORE_KEY = "appointments-book";
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const els = {
  place: document.getElementById("book-place"),
  title: document.getElementById("book-title"),
  sub: document.getElementById("book-sub"),
  mode: document.getElementById("mode-line"),
  fieldTitle: document.getElementById("field-title"),
  fieldSubtitle: document.getElementById("field-subtitle"),
  fieldPlace: document.getElementById("field-place"),
  fieldNote: document.getElementById("field-note"),
  bookSave: document.getElementById("book-save-msg"),
  weekLabel: document.getElementById("week-label"),
  weekStrip: document.getElementById("week-strip"),
  dayHeading: document.getElementById("day-heading"),
  dayNote: document.getElementById("day-note"),
  dayEmpty: document.getElementById("day-empty"),
  slotsTable: document.getElementById("slots-table"),
  slotRows: document.getElementById("slot-rows"),
  slotErr: document.getElementById("slot-err"),
  slotTime: document.getElementById("slot-time"),
  slotName: document.getElementById("slot-name"),
  slotPhone: document.getElementById("slot-phone"),
  slotNote: document.getElementById("slot-note"),
  fileJson: document.getElementById("file-json"),
};

let book = emptyBook();
let viewedMonday = mondayOf(new Date());
let openDay = iso(new Date());
let persistOk = true;

function emptyBook() {
  return {
    version: 1,
    title: "Appointment book",
    subtitle: "",
    place: "",
    note: "",
    days: {},
  };
}

function mondayOf(date) {
  const x = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = x.getDay();
  x.setDate(x.getDate() + (day === 0 ? -6 : 1 - day));
  return x;
}

function addDays(date, n) {
  const x = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

function iso(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
}

function fromIso(value) {
  const [y, m, d] = String(value).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function normalizeBook(raw) {
  const next = emptyBook();
  if (!raw || typeof raw !== "object") return next;
  if (typeof raw.title === "string") next.title = raw.title;
  if (typeof raw.subtitle === "string") next.subtitle = raw.subtitle;
  if (typeof raw.place === "string") next.place = raw.place;
  if (typeof raw.note === "string") next.note = raw.note;
  const days = raw.days && typeof raw.days === "object" ? raw.days : {};
  Object.keys(days).forEach(function (key) {
    if (!fromIso(key)) return;
    const day = days[key] || {};
    const slots = Array.isArray(day.slots) ? day.slots : [];
    next.days[key] = {
      note: typeof day.note === "string" ? day.note : "",
      slots: slots.map(normalizeSlot).filter(Boolean),
    };
  });
  return next;
}

function normalizeSlot(slot, index) {
  if (!slot || typeof slot !== "object") return null;
  const name = String(slot.name || "").trim();
  const time = String(slot.time || "").trim();
  if (!name && !time) return null;
  return {
    id: String(slot.id || "s-" + index + "-" + time),
    time: time,
    name: name,
    phone: String(slot.phone || "").trim(),
    note: String(slot.note || "").trim(),
    status: slot.status === "canceled" ? "canceled" : "booked",
  };
}

function dayRecord(dateIso) {
  return book.days[dateIso] || { note: "", slots: [] };
}

function bookedSlots(dateIso) {
  return dayRecord(dateIso).slots.filter(function (slot) {
    return slot.status !== "canceled";
  }).slice().sort(function (a, b) {
    return a.time.localeCompare(b.time);
  });
}

function formatTime(hhmm) {
  const parts = String(hhmm).split(":");
  const h = Number(parts[0]);
  const m = Number(parts[1] || 0);
  if (Number.isNaN(h)) return hhmm || "";
  const am = h < 12;
  let hr = h % 12;
  if (hr === 0) hr = 12;
  return hr + ":" + String(m).padStart(2, "0") + (am ? " AM" : " PM");
}

function formatWeekLabel(monday) {
  const sun = addDays(monday, 6);
  const left = MONTHS[monday.getMonth()] + " " + monday.getDate();
  const right = (sun.getMonth() === monday.getMonth()
    ? String(sun.getDate())
    : MONTHS[sun.getMonth()] + " " + sun.getDate());
  return "Week of " + left + " to " + right + ", " + monday.getFullYear();
}

function formatDayLong(date) {
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return names[date.getDay()] + ", " + MONTHS[date.getMonth()] + " " + date.getDate();
}

function persist() {
  if (!persistOk) return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(book));
  } catch (err) {
    persistOk = false;
  }
}

function showErr(message) {
  els.slotErr.hidden = !message;
  els.slotErr.textContent = message || "";
}

function renderCover() {
  const title = book.title.trim() || "Appointment book";
  document.title = title;
  els.title.textContent = title;
  els.place.textContent = book.place.trim() || "Appointment book";
  els.sub.textContent = book.subtitle.trim();
  els.sub.hidden = !book.subtitle.trim();
  els.fieldTitle.value = book.title;
  els.fieldSubtitle.value = book.subtitle;
  els.fieldPlace.value = book.place;
  els.fieldNote.value = book.note;
}

function renderWeek() {
  els.weekLabel.textContent = formatWeekLabel(viewedMonday);
  const todayIso = iso(new Date());
  els.weekStrip.replaceChildren();
  for (let i = 0; i < 7; i += 1) {
    const date = addDays(viewedMonday, i);
    const dateIso = iso(date);
    const count = bookedSlots(dateIso).length;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "day-tab";
    if (dateIso === openDay) btn.classList.add("is-open");
    if (dateIso === todayIso) btn.classList.add("is-today");
    btn.dataset.day = dateIso;
    const strong = document.createElement("strong");
    strong.textContent = WEEKDAYS[date.getDay()] + " " + date.getDate();
    const span = document.createElement("span");
    span.textContent = count === 0 ? "Open" : (count === 1 ? "1 booked" : count + " booked");
    btn.append(strong, span);
    els.weekStrip.append(btn);
  }
}

function renderDay() {
  const date = fromIso(openDay);
  if (!date) {
    els.dayHeading.textContent = "Pick a day";
    els.dayNote.hidden = true;
    els.dayEmpty.hidden = false;
    els.dayEmpty.textContent = "Pick a day on the week strip.";
    els.slotsTable.hidden = true;
    els.slotRows.replaceChildren();
    return;
  }
  els.dayHeading.textContent = formatDayLong(date);
  const rec = dayRecord(openDay);
  if (rec.note) {
    els.dayNote.hidden = false;
    els.dayNote.textContent = rec.note;
  } else {
    els.dayNote.hidden = true;
  }
  const slots = bookedSlots(openDay);
  els.slotRows.replaceChildren();
  if (slots.length === 0) {
    els.slotsTable.hidden = true;
    els.dayEmpty.hidden = false;
    els.dayEmpty.textContent = "Nothing booked this day. Add a name and a time.";
    return;
  }
  els.dayEmpty.hidden = true;
  els.slotsTable.hidden = false;
  slots.forEach(function (slot) {
    const tr = document.createElement("tr");
    const time = document.createElement("td");
    time.className = "time";
    time.textContent = formatTime(slot.time);
    const name = document.createElement("td");
    name.textContent = slot.name;
    const phone = document.createElement("td");
    phone.textContent = slot.phone;
    const note = document.createElement("td");
    note.textContent = slot.note;
    const act = document.createElement("td");
    const rm = document.createElement("button");
    rm.type = "button";
    rm.className = "quiet";
    rm.textContent = "Remove";
    rm.dataset.remove = slot.id;
    act.append(rm);
    tr.append(time, name, phone, note, act);
    els.slotRows.append(tr);
  });
}

function render() {
  renderCover();
  renderWeek();
  renderDay();
}

function saveBookFields() {
  book.title = els.fieldTitle.value;
  book.subtitle = els.fieldSubtitle.value;
  book.place = els.fieldPlace.value;
  book.note = els.fieldNote.value;
  persist();
  renderCover();
  els.bookSave.hidden = false;
}

function clearSlotForm() {
  els.slotTime.value = "";
  els.slotName.value = "";
  els.slotPhone.value = "";
  els.slotNote.value = "";
  showErr("");
}

function ensureDay(dateIso) {
  if (!book.days[dateIso]) {
    book.days[dateIso] = { note: "", slots: [] };
  }
  return book.days[dateIso];
}

function addSlot(event) {
  event.preventDefault();
  const time = els.slotTime.value.trim();
  const name = els.slotName.value.trim();
  if (!time) {
    showErr("Put a time on the slot.");
    els.slotTime.focus();
    return;
  }
  if (!name) {
    showErr("Put a name on the slot.");
    els.slotName.focus();
    return;
  }
  const day = ensureDay(openDay);
  day.slots.push({
    id: "s-" + Date.now().toString(36),
    time: time,
    name: name,
    phone: els.slotPhone.value.trim(),
    note: els.slotNote.value.trim(),
    status: "booked",
  });
  persist();
  clearSlotForm();
  render();
  els.slotName.focus();
}

function removeSlot(id) {
  const day = book.days[openDay];
  if (!day) return;
  day.slots = day.slots.filter(function (slot) {
    return slot.id !== id;
  });
  if (day.slots.length === 0 && !day.note) {
    delete book.days[openDay];
  }
  persist();
  render();
}

function downloadJson() {
  const blob = new Blob([JSON.stringify(book, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "book.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function applyBook(next, modeText) {
  book = normalizeBook(next);
  persist();
  els.mode.textContent = modeText || "";
  render();
}

async function fetchJson(url) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("missing");
  return res.json();
}

async function loadSample() {
  const raw = await fetchJson("sample.json");
  applyBook(raw, "Sample: Elm Street Cuts, week of September 14, 2026. Fake names.");
  viewedMonday = mondayOf(fromIso("2026-09-16"));
  openDay = "2026-09-16";
  render();
}

function startBlank() {
  applyBook(emptyBook(), "Blank book. Pick a day and add a slot.");
  viewedMonday = mondayOf(new Date());
  openDay = iso(new Date());
  render();
}

function loadJsonFile(file) {
  const reader = new FileReader();
  reader.onload = function () {
    try {
      const raw = JSON.parse(String(reader.result || ""));
      if (!raw || typeof raw !== "object") throw new Error("bad");
      applyBook(raw, "Loaded from " + file.name + ".");
    } catch (err) {
      showErr("That file is not an appointment book. Try another JSON file.");
    }
  };
  reader.readAsText(file);
}

document.getElementById("week-prev").addEventListener("click", function () {
  viewedMonday = addDays(viewedMonday, -7);
  openDay = iso(viewedMonday);
  render();
});

document.getElementById("week-next").addEventListener("click", function () {
  viewedMonday = addDays(viewedMonday, 7);
  openDay = iso(viewedMonday);
  render();
});

els.weekStrip.addEventListener("click", function (event) {
  const btn = event.target.closest("[data-day]");
  if (!btn) return;
  openDay = btn.dataset.day;
  render();
});

els.slotRows.addEventListener("click", function (event) {
  const btn = event.target.closest("[data-remove]");
  if (!btn) return;
  removeSlot(btn.dataset.remove);
});

document.getElementById("slot-form").addEventListener("submit", addSlot);
document.getElementById("slot-clear").addEventListener("click", clearSlotForm);

document.getElementById("book-form").addEventListener("input", saveBookFields);
document.getElementById("btn-sample").addEventListener("click", function () {
  loadSample().catch(function () {
    showErr("Could not load the sample file.");
  });
});
document.getElementById("btn-blank").addEventListener("click", startBlank);
document.getElementById("btn-download").addEventListener("click", downloadJson);
document.getElementById("btn-load").addEventListener("click", function () {
  els.fileJson.click();
});
els.fileJson.addEventListener("change", function () {
  const file = els.fileJson.files && els.fileJson.files[0];
  els.fileJson.value = "";
  if (file) loadJsonFile(file);
});

document.addEventListener("keydown", function (event) {
  if (event.key !== "Escape") return;
  clearSlotForm();
});

async function boot() {
  const params = new URLSearchParams(location.search);
  const wantSample = params.get("sample") === "1";
  try {
    if (wantSample) {
      await loadSample();
      return;
    }
    const saved = localStorage.getItem(STORE_KEY);
    if (saved) {
      book = normalizeBook(JSON.parse(saved));
      els.mode.textContent = "Saved in this browser. Load sample or start blank if you want a clean page.";
      render();
      return;
    }
    const raw = await fetchJson("book.json");
    book = normalizeBook(raw);
    const hasDays = Object.keys(book.days).length > 0;
    els.mode.textContent = hasDays
      ? "Loaded book.json."
      : "Blank book from book.json. Load sample to see Elm Street Cuts.";
    render();
  } catch (err) {
    book = emptyBook();
    els.mode.textContent = "Blank book. Load sample if you want to see a filled week.";
    render();
  }
}

boot();
