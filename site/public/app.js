const STORE_KEY = "appointments-book";
const VIEW_KEY = "appointments-cal-view";
const CLOUD_KEY = "appointments-book";
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
  toolsErr: document.getElementById("tools-err"),
  fieldTitle: document.getElementById("field-title"),
  fieldSubtitle: document.getElementById("field-subtitle"),
  fieldPlace: document.getElementById("field-place"),
  fieldNote: document.getElementById("field-note"),
  bookSave: document.getElementById("book-save-msg"),
  weekLabel: document.getElementById("week-label"),
  weekStrip: document.getElementById("week-strip"),
  monthGrid: document.getElementById("month-grid"),
  monthCells: document.getElementById("month-cells"),
  viewWeek: document.getElementById("view-week"),
  viewMonth: document.getElementById("view-month"),
  jumpToday: document.getElementById("jump-today"),
  calPrev: document.getElementById("week-prev"),
  calNext: document.getElementById("week-next"),
  nextUp: document.getElementById("next-up"),
  dayHeading: document.getElementById("day-heading"),
  dayNote: document.getElementById("day-note"),
  dayNoteField: document.getElementById("day-note-field"),
  dayEmpty: document.getElementById("day-empty"),
  slotsTable: document.getElementById("slots-table"),
  slotRows: document.getElementById("slot-rows"),
  slotErr: document.getElementById("slot-err"),
  slotTime: document.getElementById("slot-time"),
  timePick: document.getElementById("time-pick"),
  timeChips: document.getElementById("time-chips"),
  slotName: document.getElementById("slot-name"),
  nameSuggest: document.getElementById("name-suggest"),
  slotPhone: document.getElementById("slot-phone"),
  slotNote: document.getElementById("slot-note"),
  weekPrint: document.getElementById("week-print"),
  slotFormTitle: document.getElementById("slot-form-title"),
  slotSave: document.getElementById("slot-save"),
  slotClear: document.getElementById("slot-clear"),
  slotCancelEdit: document.getElementById("slot-cancel-edit"),
  fileJson: document.getElementById("file-json"),
  findQ: document.getElementById("find-q"),
  findEmpty: document.getElementById("find-empty"),
  findResults: document.getElementById("find-results"),
  renameErr: document.getElementById("rename-err"),
  renameEmpty: document.getElementById("rename-empty"),
  renameFields: document.getElementById("rename-fields"),
  renameFrom: document.getElementById("rename-from"),
  renameTo: document.getElementById("rename-to"),
  pileEmpty: document.getElementById("pile-empty"),
  pileTable: document.getElementById("pile-table"),
  pileRows: document.getElementById("pile-rows"),
  accountLine: document.getElementById("account-line"),
  accountErr: document.getElementById("account-err"),
  btnSignin: document.getElementById("btn-signin"),
  btnSignout: document.getElementById("btn-signout"),
};

let book = emptyBook();
let viewedMonday = mondayOf(new Date());
let viewedMonth = monthStart(new Date());
let openDay = iso(new Date());
let persistOk = true;
let editingId = null;
let findQuery = "";
let calView = readView();
let demoMode = false;
let cloudName = "";
let cloudTimer = null;

const TIME_CHIPS = (function () {
  const list = [];
  for (let mins = 9 * 60; mins <= 18 * 60; mins += 30) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    list.push(String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0"));
  }
  return list;
}());

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

function monthStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date, n) {
  return new Date(date.getFullYear(), date.getMonth() + n, 1);
}

function readView() {
  try {
    const v = localStorage.getItem(VIEW_KEY);
    if (v === "month" || v === "week") return v;
  } catch (err) {
    /* private mode */
  }
  return "week";
}

function persistView() {
  try {
    localStorage.setItem(VIEW_KEY, calView);
  } catch (err) {
    /* private mode */
  }
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

function newId() {
  return "s-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function normalizeSlot(slot, index) {
  if (!slot || typeof slot !== "object") return null;
  const name = String(slot.name || "").trim();
  const time = String(slot.time || slot.when || "").trim();
  if (!name && !time) return null;
  return {
    id: String(slot.id || "s-" + index + "-" + time),
    time: time,
    name: name,
    phone: String(slot.phone || "").trim(),
    note: String(slot.note || slot.for || "").trim(),
    status: slot.status === "canceled" || slot.status === "noshow" || slot.status === "here"
      ? slot.status
      : "booked",
  };
}

function addNormalizedSlot(next, dateIso, slot, index) {
  if (!fromIso(dateIso)) return;
  const n = normalizeSlot(slot, index);
  if (!n) return;
  if (!next.days[dateIso]) next.days[dateIso] = { note: "", slots: [] };
  next.days[dateIso].slots.push(n);
}

function normalizeBook(raw) {
  const next = emptyBook();
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return next;
  if (typeof raw.title === "string") next.title = raw.title;
  if (typeof raw.subtitle === "string") next.subtitle = raw.subtitle;
  if (typeof raw.place === "string") next.place = raw.place;
  if (typeof raw.note === "string") next.note = raw.note;

  const days = raw.days && typeof raw.days === "object" && !Array.isArray(raw.days) ? raw.days : null;
  const hasDays = days && Object.keys(days).length > 0;
  if (hasDays) {
    Object.keys(days).forEach(function (key) {
      if (!fromIso(key)) return;
      const day = days[key] || {};
      const slots = Array.isArray(day.slots) ? day.slots : [];
      next.days[key] = {
        note: typeof day.note === "string" ? day.note : "",
        slots: slots.map(normalizeSlot).filter(Boolean),
      };
    });
  } else if (Array.isArray(raw.slots)) {
    raw.slots.forEach(function (slot, i) {
      addNormalizedSlot(next, String(slot && slot.date || ""), slot, i);
    });
  }
  return next;
}

function dayRecord(dateIso) {
  return book.days[dateIso] || { note: "", slots: [] };
}

function sortSlots(list) {
  return list.slice().sort(function (a, b) {
    return String(a.time).localeCompare(String(b.time)) || a.name.localeCompare(b.name);
  });
}

function occupySlots(dateIso) {
  return sortSlots(dayRecord(dateIso).slots.filter(function (slot) {
    return slot.status === "booked" || slot.status === "here";
  }));
}

function waitingSlots(dateIso) {
  return sortSlots(dayRecord(dateIso).slots.filter(function (slot) {
    return slot.status === "booked";
  }));
}

function dayListSlots(dateIso) {
  return sortSlots(dayRecord(dateIso).slots.filter(function (slot) {
    return slot.status !== "canceled";
  }));
}

function bookedSlots(dateIso) {
  return occupySlots(dateIso);
}

function canceledSlots() {
  const list = [];
  Object.keys(book.days).sort().forEach(function (dateIso) {
    book.days[dateIso].slots.forEach(function (slot) {
      if (slot.status === "canceled") list.push({ slot: slot, date: dateIso });
    });
  });
  list.sort(function (a, b) {
    return a.date.localeCompare(b.date) || a.slot.time.localeCompare(b.slot.time);
  });
  return list;
}

function findSlot(id) {
  const keys = Object.keys(book.days);
  for (let i = 0; i < keys.length; i += 1) {
    const dateIso = keys[i];
    const slots = book.days[dateIso].slots;
    for (let j = 0; j < slots.length; j += 1) {
      if (slots[j].id === id) return { slot: slots[j], date: dateIso, day: book.days[dateIso] };
    }
  }
  return null;
}

function peopleIndex() {
  const map = {};
  Object.keys(book.days).sort().forEach(function (dateIso) {
    book.days[dateIso].slots.forEach(function (slot) {
      const name = slot.name.trim();
      if (!name) return;
      map[name] = { name: name, phone: slot.phone, note: slot.note };
    });
  });
  return map;
}

function namesInBook() {
  return Object.keys(peopleIndex()).sort(function (a, b) {
    return a.localeCompare(b);
  });
}

function normTime(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const parts = raw.split(":");
  if (!parts[0]) return "";
  const h = Number(parts[0]);
  const m = Number(parts[1] || 0);
  if (Number.isNaN(h) || h < 0 || h > 23 || Number.isNaN(m) || m < 0 || m > 59) return "";
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

function timeTaken(dateIso, time, exceptId) {
  const want = normTime(time);
  if (!want) return "";
  const hit = occupySlots(dateIso).find(function (slot) {
    return slot.id !== exceptId && normTime(slot.time) === want;
  });
  return hit ? hit.name : "";
}

function telHref(phone) {
  const raw = String(phone || "").trim();
  if (raw.replace(/\D/g, "").length < 7) return "";
  return "tel:" + raw.replace(/[^\d+]/g, "");
}

function statusLabel(status) {
  if (status === "canceled") return "canceled";
  if (status === "noshow") return "no-show";
  if (status === "here") return "here";
  return "";
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

function formatMonthLabel(first) {
  return MONTHS[first.getMonth()] + " " + first.getFullYear();
}

function formatDayLong(date) {
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return names[date.getDay()] + ", " + MONTHS[date.getMonth()] + " " + date.getDate() + ", " + date.getFullYear();
}

function persist() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(book));
    persistOk = true;
  } catch (err) {
    persistOk = false;
  }
  scheduleCloud();
}

function cloudReady() {
  return Boolean(window.puter && puter.auth && puter.kv);
}

function cloudSignedIn() {
  return cloudReady() && puter.auth.isSignedIn();
}

function showAccountErr(message) {
  els.accountErr.hidden = !message;
  els.accountErr.textContent = message || "";
}

async function cloudUserName() {
  try {
    const user = await puter.auth.getUser();
    if (!user || typeof user !== "object") return "";
    if (typeof user.username === "string" && user.username.trim()) return user.username.trim();
    if (typeof user.email === "string" && user.email.trim()) return user.email.trim();
    return "";
  } catch (err) {
    return "";
  }
}

function renderAccount() {
  const on = cloudSignedIn();
  els.btnSignin.hidden = on;
  els.btnSignout.hidden = !on;
  if (!cloudReady()) {
    els.accountLine.textContent = "Sign-in needs the network. The book still saves in this browser.";
    return;
  }
  if (on) {
    els.accountLine.textContent = cloudName
      ? "Signed in as " + cloudName + ". This book saves to your account."
      : "Signed in. This book saves to your account.";
    return;
  }
  els.accountLine.textContent = "Until you sign in, this book stays in this browser only.";
}

async function waitForPuter() {
  if (cloudReady()) return true;
  for (let i = 0; i < 40; i += 1) {
    await new Promise(function (resolve) {
      setTimeout(resolve, 100);
    });
    if (cloudReady()) return true;
  }
  return false;
}

async function pullCloud() {
  try {
    const raw = await puter.kv.get(CLOUD_KEY);
    if (raw == null || raw === "") return { ok: true, book: null };
    if (typeof raw === "string") {
      const parsed = JSON.parse(raw);
      return { ok: true, book: normalizeBook(parsed) };
    }
    if (typeof raw === "object") return { ok: true, book: normalizeBook(raw) };
    return { ok: true, book: null };
  } catch (err) {
    const msg = String((err && (err.message || err.code)) || err || "");
    if (/not found|does not exist|no such/i.test(msg)) return { ok: true, book: null };
    return { ok: false, error: "Could not load the book from your account." };
  }
}

async function pushCloud() {
  if (demoMode || !cloudSignedIn()) return;
  try {
    await puter.kv.set(CLOUD_KEY, book, { disableSharing: true });
  } catch (err) {
    showAccountErr("Could not save the book to your account. It is still in this browser.");
  }
}

function scheduleCloud() {
  if (demoMode || !cloudSignedIn()) return;
  clearTimeout(cloudTimer);
  cloudTimer = setTimeout(function () {
    pushCloud();
  }, 350);
}

async function refreshAccount() {
  cloudName = "";
  if (!cloudSignedIn()) {
    renderAccount();
    return;
  }
  cloudName = await cloudUserName();
  renderAccount();
}

async function loadCloudBook() {
  const pulled = await pullCloud();
  if (!pulled.ok) {
    showAccountErr(pulled.error);
    return false;
  }
  if (pulled.book) {
    demoMode = false;
    applyBook(pulled.book, "Loaded the book from your account.");
    return true;
  }
  await pushCloud();
  return false;
}

async function signInCloud() {
  showAccountErr("");
  if (!cloudReady()) {
    showAccountErr("Sign-in is not available on this page.");
    return;
  }
  try {
    await puter.auth.signIn();
  } catch (err) {
    const code = err && (err.error || err.code);
    const msg = String((err && (err.message || err.msg)) || err || "");
    if (code === "not_available_in_app") {
      /* already signed in as the Puter app user */
    } else if (/popup/i.test(msg) || code === "popup_blocked") {
      showAccountErr("The sign-in window was blocked. Allow popups and try again.");
      return;
    } else if (/closed|cancel/i.test(msg) || code === "auth_window_closed") {
      showAccountErr("Sign-in was cancelled.");
      return;
    } else {
      showAccountErr("Could not sign in.");
      return;
    }
  }
  demoMode = false;
  await refreshAccount();
  if (!cloudSignedIn()) {
    showAccountErr("Could not sign in.");
    return;
  }
  const usedCloud = await loadCloudBook();
  if (!usedCloud) {
    els.mode.textContent = "Signed in. This book now saves to your account.";
  }
  renderAccount();
}

function signOutCloud() {
  showAccountErr("");
  clearTimeout(cloudTimer);
  if (cloudReady()) puter.auth.signOut();
  cloudName = "";
  els.mode.textContent = "This browser is only saving on this computer now.";
  renderAccount();
}

async function bootAccount() {
  const ready = await waitForPuter();
  if (!ready) {
    renderAccount();
    return;
  }
  await refreshAccount();
  if (demoMode || !cloudSignedIn()) return;
  await loadCloudBook();
  renderAccount();
}

function showErr(message) {
  els.slotErr.hidden = !message;
  els.slotErr.textContent = message || "";
}

function showToolsErr(message) {
  els.toolsErr.hidden = !message;
  els.toolsErr.textContent = message || "";
}

function showRenameErr(message) {
  els.renameErr.hidden = !message;
  els.renameErr.textContent = message || "";
}

function nameHit(slot) {
  if (!findQuery) return false;
  const blob = (slot.name + " " + slot.phone + " " + slot.note).toLowerCase();
  return blob.indexOf(findQuery) !== -1;
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

function fillDayTab(btn, date, dateIso, todayIso) {
  const rec = dayRecord(dateIso);
  const count = occupySlots(dateIso).length;
  if (dateIso === openDay) btn.classList.add("is-open");
  if (dateIso === todayIso) btn.classList.add("is-today");
  if (count > 0) btn.classList.add("is-busy");
  btn.dataset.day = dateIso;
  if (rec.note) btn.title = rec.note;
  const strong = document.createElement("strong");
  strong.textContent = calView === "month"
    ? String(date.getDate())
    : WEEKDAYS[date.getDay()] + " " + date.getDate();
  const span = document.createElement("span");
  if (count === 0) {
    span.textContent = rec.note ? rec.note : "Open";
  } else {
    span.textContent = count === 1 ? "1 booked" : count + " booked";
  }
  btn.append(strong, span);
}

function renderCal() {
  const today = new Date();
  const todayIso = iso(today);
  const onToday = openDay === todayIso;
  els.jumpToday.disabled = onToday;
  els.viewWeek.classList.toggle("is-on", calView === "week");
  els.viewMonth.classList.toggle("is-on", calView === "month");
  els.viewWeek.setAttribute("aria-pressed", calView === "week" ? "true" : "false");
  els.viewMonth.setAttribute("aria-pressed", calView === "month" ? "true" : "false");

  if (calView === "month") {
    els.weekLabel.textContent = formatMonthLabel(viewedMonth);
    els.calPrev.textContent = "Previous month";
    els.calNext.textContent = "Next month";
    els.weekStrip.hidden = true;
    els.monthGrid.hidden = false;
    els.monthCells.replaceChildren();
    const start = mondayOf(viewedMonth);
    for (let i = 0; i < 42; i += 1) {
      const date = addDays(start, i);
      const dateIso = iso(date);
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "day-tab";
      if (date.getMonth() !== viewedMonth.getMonth()) btn.classList.add("is-other");
      fillDayTab(btn, date, dateIso, todayIso);
      els.monthCells.append(btn);
    }
    return;
  }

  els.weekLabel.textContent = formatWeekLabel(viewedMonday);
  els.calPrev.textContent = "Previous week";
  els.calNext.textContent = "Next week";
  els.weekStrip.hidden = false;
  els.monthGrid.hidden = true;
  els.weekStrip.replaceChildren();
  for (let i = 0; i < 7; i += 1) {
    const date = addDays(viewedMonday, i);
    const dateIso = iso(date);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "day-tab";
    fillDayTab(btn, date, dateIso, todayIso);
    els.weekStrip.append(btn);
  }
}

function renderNextUp() {
  const todayIso = iso(new Date());
  const waiting = waitingSlots(todayIso);
  if (waiting.length === 0) {
    const held = occupySlots(todayIso).length;
    const listed = dayListSlots(todayIso).length;
    if (listed === 0 && !dayRecord(todayIso).note) {
      els.nextUp.hidden = true;
      els.nextUp.textContent = "";
      return;
    }
    els.nextUp.hidden = false;
    els.nextUp.textContent = held
      ? "Nobody waiting today. " + held + (held === 1 ? " already here." : " already here.")
      : "Nobody waiting today.";
    return;
  }
  const next = waiting[0];
  const left = waiting.length;
  els.nextUp.hidden = false;
  els.nextUp.textContent = "Next today: " + next.name + " at " + formatTime(next.time) + ". "
    + left + (left === 1 ? " left." : " left.");
}

function closeTimePick() {
  if (els.timePick) els.timePick.open = false;
}

function renderTimeChips() {
  const taken = {};
  occupySlots(openDay).forEach(function (slot) {
    if (slot.id === editingId) return;
    taken[normTime(slot.time)] = true;
  });
  const current = normTime(els.slotTime.value);
  const summary = els.timePick && els.timePick.querySelector("summary");
  if (summary) {
    summary.textContent = current ? formatTime(current) + " · change" : "Pick a time";
  }
  els.timeChips.replaceChildren();
  TIME_CHIPS.forEach(function (hhmm) {
    if (taken[hhmm] && hhmm !== current) return;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = formatTime(hhmm);
    btn.dataset.chip = hhmm;
    if (hhmm === current) btn.classList.add("is-on");
    els.timeChips.append(btn);
  });
  if (!els.timeChips.childElementCount) {
    const empty = document.createElement("p");
    empty.className = "empty";
    empty.textContent = "No open times from 9 to 6.";
    els.timeChips.append(empty);
  }
}

function hideNameSuggest() {
  els.nameSuggest.hidden = true;
  els.nameSuggest.replaceChildren();
}

function renderNameSuggest() {
  const q = els.slotName.value.trim().toLowerCase();
  if (q.length < 3) {
    hideNameSuggest();
    return;
  }
  const people = peopleIndex();
  const hits = Object.keys(people).filter(function (name) {
    return name.toLowerCase().indexOf(q) !== -1;
  }).sort(function (a, b) {
    return a.localeCompare(b);
  }).slice(0, 8);
  if (hits.length === 0) {
    hideNameSuggest();
    return;
  }
  els.nameSuggest.replaceChildren();
  hits.forEach(function (name) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.dataset.pickName = name;
    const person = people[name];
    btn.textContent = person.phone ? name + " · " + person.phone : name;
    li.append(btn);
    els.nameSuggest.append(li);
  });
  els.nameSuggest.hidden = false;
}

function pickKnownName(name) {
  const person = peopleIndex()[name];
  if (!person) return;
  els.slotName.value = person.name;
  els.slotPhone.value = person.phone;
  if (!els.slotNote.value && person.note) els.slotNote.value = person.note;
  hideNameSuggest();
  els.slotPhone.focus();
}

function dayText(dateIso) {
  const date = fromIso(dateIso);
  if (!date) return "";
  const rec = dayRecord(dateIso);
  const lines = [formatDayLong(date)];
  if (rec.note) lines.push(rec.note);
  const slots = dayListSlots(dateIso);
  if (slots.length === 0) {
    lines.push("Nothing booked.");
  } else {
    slots.forEach(function (slot) {
      const mark = statusLabel(slot.status);
      lines.push(
        formatTime(slot.time)
        + "  " + slot.name
        + (slot.phone ? "  " + slot.phone : "")
        + (slot.note ? "  " + slot.note : "")
        + (mark ? "  (" + mark + ")" : "")
      );
    });
  }
  return lines.join("\n");
}

function showDay(dateIso) {
  const date = fromIso(dateIso);
  if (!date) return;
  openDay = dateIso;
  viewedMonday = mondayOf(date);
  viewedMonth = monthStart(date);
}

function quietButton(label, attr, id) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "quiet";
  btn.textContent = label;
  btn.setAttribute(attr, id);
  return btn;
}

function renderDay() {
  const date = fromIso(openDay);
  if (!date) {
    els.dayHeading.textContent = "Pick a day";
    els.dayNote.hidden = true;
    els.dayNoteField.value = "";
    els.dayNoteField.disabled = true;
    els.dayEmpty.hidden = false;
    els.dayEmpty.textContent = "Pick a day on the week strip.";
    els.slotsTable.hidden = true;
    els.slotRows.replaceChildren();
    return;
  }
  els.dayHeading.textContent = formatDayLong(date);
  const rec = dayRecord(openDay);
  if (document.activeElement !== els.dayNoteField) {
    els.dayNoteField.value = rec.note;
  }
  els.dayNoteField.disabled = false;
  if (rec.note) {
    els.dayNote.hidden = false;
    els.dayNote.textContent = rec.note;
  } else {
    els.dayNote.hidden = true;
  }
  const slots = dayListSlots(openDay);
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
    const classes = [];
    if (nameHit(slot)) classes.push("is-hit");
    if (slot.status === "here") classes.push("is-here");
    if (slot.status === "noshow") classes.push("is-noshow");
    tr.className = classes.join(" ");
    const time = document.createElement("td");
    time.className = "time";
    time.textContent = formatTime(slot.time);
    const name = document.createElement("td");
    name.append(document.createTextNode(slot.name));
    const mark = statusLabel(slot.status);
    if (mark) {
      const tag = document.createElement("span");
      tag.className = "slot-mark";
      tag.textContent = mark;
      name.append(tag);
    }
    const phone = document.createElement("td");
    const call = telHref(slot.phone);
    if (call) {
      const a = document.createElement("a");
      a.className = "tel";
      a.href = call;
      a.textContent = slot.phone;
      phone.append(a);
    } else {
      phone.textContent = slot.phone;
    }
    const note = document.createElement("td");
    note.textContent = slot.note;
    const act = document.createElement("td");
    act.className = "row-actions no-print";
    act.append(quietButton("Edit", "data-edit", slot.id));
    if (slot.status !== "here") act.append(quietButton("Here", "data-here", slot.id));
    if (slot.status !== "noshow") act.append(quietButton("No-show", "data-noshow", slot.id));
    act.append(quietButton("Cancel", "data-cancel", slot.id));
    tr.append(time, name, phone, note, act);
    els.slotRows.append(tr);
  });
}

function renderFind() {
  els.findResults.replaceChildren();
  const q = findQuery;
  if (!q) {
    els.findEmpty.hidden = true;
    return;
  }
  const hits = [];
  Object.keys(book.days).sort().forEach(function (dateIso) {
    book.days[dateIso].slots.forEach(function (slot) {
      if (nameHit(slot)) hits.push({ slot: slot, date: dateIso });
    });
  });
  if (hits.length === 0) {
    els.findEmpty.hidden = false;
    els.findEmpty.textContent = "No names match. Try another word, or clear the box.";
    return;
  }
  els.findEmpty.hidden = true;
  hits.forEach(function (hit) {
    const li = document.createElement("li");
    const day = fromIso(hit.date);
    const canceled = statusLabel(hit.slot.status);
    li.append(document.createTextNode(
      hit.slot.name + " - " + formatDayLong(day) + " " + formatTime(hit.slot.time)
      + (canceled ? " (" + canceled + ")" : "")
    ));
    const open = document.createElement("button");
    open.type = "button";
    open.className = "quiet";
    open.textContent = "Open day";
    open.dataset.openDay = hit.date;
    li.append(open);
    els.findResults.append(li);
  });
}

function renderRename() {
  const names = namesInBook();
  const prev = els.renameFrom.value;
  els.renameFrom.replaceChildren();
  if (names.length === 0) {
    els.renameEmpty.hidden = false;
    els.renameFields.hidden = true;
    return;
  }
  els.renameEmpty.hidden = true;
  els.renameFields.hidden = false;
  names.forEach(function (name) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    els.renameFrom.append(opt);
  });
  if (prev && names.indexOf(prev) !== -1) els.renameFrom.value = prev;
}

function renderPile() {
  const list = canceledSlots();
  els.pileRows.replaceChildren();
  if (list.length === 0) {
    els.pileTable.hidden = true;
    els.pileEmpty.hidden = false;
    els.pileEmpty.textContent = "No canceled slots. Cancel a name on a day to send it here. Search still finds it.";
    return;
  }
  els.pileEmpty.hidden = true;
  els.pileTable.hidden = false;
  list.forEach(function (hit) {
    const tr = document.createElement("tr");
    if (nameHit(hit.slot)) tr.className = "is-hit";
    const day = document.createElement("td");
    day.textContent = formatDayLong(fromIso(hit.date));
    const time = document.createElement("td");
    time.className = "time";
    time.textContent = formatTime(hit.slot.time);
    const name = document.createElement("td");
    name.textContent = hit.slot.name;
    const note = document.createElement("td");
    note.textContent = hit.slot.note;
    const act = document.createElement("td");
    act.className = "row-actions";
    act.append(
      quietButton("Put back", "data-restore", hit.slot.id),
      quietButton("Remove", "data-remove", hit.slot.id)
    );
    tr.append(day, time, name, note, act);
    els.pileRows.append(tr);
  });
}

function renderFormMode() {
  if (editingId) {
    els.slotFormTitle.textContent = "Edit slot";
    els.slotSave.textContent = "Save slot";
    els.slotClear.hidden = true;
    els.slotCancelEdit.hidden = false;
  } else {
    els.slotFormTitle.textContent = "Add a slot";
    els.slotSave.textContent = "Add slot";
    els.slotClear.hidden = false;
    els.slotCancelEdit.hidden = true;
  }
}

function render() {
  renderCover();
  renderCal();
  renderNextUp();
  renderDay();
  renderTimeChips();
  renderFind();
  renderRename();
  renderPile();
  renderFormMode();
}

function saveDayNote() {
  if (!fromIso(openDay)) return;
  const note = els.dayNoteField.value;
  const day = ensureDay(openDay);
  day.note = note;
  pruneDay(openDay);
  persist();
  if (note) {
    els.dayNote.hidden = false;
    els.dayNote.textContent = note;
  } else {
    els.dayNote.hidden = true;
  }
  renderCal();
  renderNextUp();
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
  editingId = null;
  els.slotTime.value = "";
  els.slotName.value = "";
  els.slotPhone.value = "";
  els.slotNote.value = "";
  hideNameSuggest();
  closeTimePick();
  showErr("");
  renderFormMode();
}

function ensureDay(dateIso) {
  if (!book.days[dateIso]) {
    book.days[dateIso] = { note: "", slots: [] };
  }
  return book.days[dateIso];
}

function pruneDay(dateIso) {
  const day = book.days[dateIso];
  if (!day) return;
  if (day.slots.length === 0 && !day.note) delete book.days[dateIso];
}

function saveSlot(event) {
  event.preventDefault();
  if (!fromIso(openDay)) {
    showErr("Pick a day first.");
    return;
  }
  const time = normTime(els.slotTime.value);
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
  const taken = timeTaken(openDay, time, editingId);
  if (taken) {
    showErr(formatTime(time) + " already has " + taken + ".");
    els.slotTime.focus();
    return;
  }
  if (editingId) {
    const found = findSlot(editingId);
    if (!found) {
      showErr("That slot is gone. Add it again.");
      clearSlotForm();
      return;
    }
    found.slot.time = time;
    found.slot.name = name;
    found.slot.phone = els.slotPhone.value.trim();
    found.slot.note = els.slotNote.value.trim();
  } else {
    const day = ensureDay(openDay);
    day.slots.push({
      id: newId(),
      time: time,
      name: name,
      phone: els.slotPhone.value.trim(),
      note: els.slotNote.value.trim(),
      status: "booked",
    });
  }
  persist();
  clearSlotForm();
  render();
  els.slotName.focus();
}

function startEdit(id) {
  const found = findSlot(id);
  if (!found || found.slot.status === "canceled") return;
  editingId = id;
  showDay(found.date);
  els.slotTime.value = found.slot.time;
  els.slotName.value = found.slot.name;
  els.slotPhone.value = found.slot.phone;
  els.slotNote.value = found.slot.note;
  showErr("");
  showToolsErr("");
  render();
  els.slotName.focus();
}

function setSlotStatus(id, status) {
  const found = findSlot(id);
  if (!found || found.slot.status === "canceled") return;
  if (status === "booked" || status === "here") {
    const taken = timeTaken(found.date, found.slot.time, found.slot.id);
    if (taken) {
      showToolsErr(formatTime(found.slot.time) + " already has " + taken + ".");
      return;
    }
  }
  found.slot.status = status;
  persist();
  if (editingId === id) clearSlotForm();
  showToolsErr("");
  render();
}

function cancelSlot(id) {
  setSlotStatus(id, "canceled");
}

function restoreSlot(id) {
  const found = findSlot(id);
  if (!found) return;
  const taken = timeTaken(found.date, found.slot.time, found.slot.id);
  if (taken) {
    showToolsErr("Cannot put that back. " + formatTime(found.slot.time) + " already has " + taken + ".");
    return;
  }
  found.slot.status = "booked";
  persist();
  showDay(found.date);
  showToolsErr("");
  render();
}

function removeSlot(id) {
  const found = findSlot(id);
  if (!found) return;
  found.day.slots = found.day.slots.filter(function (slot) {
    return slot.id !== id;
  });
  pruneDay(found.date);
  persist();
  if (editingId === id) clearSlotForm();
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
  showToolsErr("");
  showRenameErr("");
  clearSlotForm();
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
  showDay("2026-09-16");
  render();
}

function startBlank() {
  demoMode = false;
  applyBook(emptyBook(), "Blank book. Pick a day and add a slot.");
  showDay(iso(new Date()));
  findQuery = "";
  findQuery = "";
  els.findQ.value = "";
  render();
}

function loadJsonFile(file) {
  const reader = new FileReader();
  reader.onload = function () {
    try {
      const raw = JSON.parse(String(reader.result || ""));
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error("bad");
      demoMode = false;
      applyBook(raw, "Loaded from " + file.name + ".");
    } catch (err) {
      showToolsErr("That file is not an appointment book. Try another JSON file.");
    }
  };
  reader.readAsText(file);
}

function duplicateWeek() {
  showToolsErr("");
  let sourceCount = 0;
  for (let i = 0; i < 7; i += 1) {
    sourceCount += bookedSlots(iso(addDays(viewedMonday, i))).length;
  }
  if (sourceCount === 0) {
    showToolsErr("This week has no booked slots to copy.");
    return;
  }
  const destMonday = addDays(viewedMonday, 7);
  let destCount = 0;
  for (let i = 0; i < 7; i += 1) {
    destCount += bookedSlots(iso(addDays(destMonday, i))).length;
  }
  if (destCount > 0) {
    showToolsErr("Next week already has names. Clear those days, or go there and start from a blank week.");
    return;
  }
  for (let i = 0; i < 7; i += 1) {
    const srcIso = iso(addDays(viewedMonday, i));
    const destIso = iso(addDays(destMonday, i));
    const src = dayRecord(srcIso);
    const copies = bookedSlots(srcIso).map(function (slot) {
      return {
        id: newId(),
        time: slot.time,
        name: slot.name,
        phone: slot.phone,
        note: slot.note,
        status: "booked",
      };
    });
    if (copies.length === 0 && !src.note) continue;
    const dest = ensureDay(destIso);
    dest.note = src.note;
    dest.slots = dest.slots.concat(copies);
  }
  persist();
  showDay(iso(destMonday));
  els.mode.textContent = "Copied this week onto the next week.";
  render();
}

function fillWeekPrint() {
  els.weekPrint.replaceChildren();
  const heading = document.createElement("h2");
  heading.textContent = formatWeekLabel(viewedMonday);
  els.weekPrint.append(heading);
  for (let i = 0; i < 7; i += 1) {
    const date = addDays(viewedMonday, i);
    const dateIso = iso(date);
    const rec = dayRecord(dateIso);
    const block = document.createElement("div");
    block.className = "day-block";
    const h = document.createElement("h3");
    h.textContent = formatDayLong(date);
    block.append(h);
    if (rec.note) {
      const note = document.createElement("p");
      note.className = "day-note";
      note.textContent = rec.note;
      block.append(note);
    }
    const slots = dayListSlots(dateIso);
    if (slots.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty";
      empty.textContent = "Nothing booked.";
      block.append(empty);
    } else {
      slots.forEach(function (slot) {
        const p = document.createElement("p");
        const mark = statusLabel(slot.status);
        p.textContent = formatTime(slot.time)
          + "  " + slot.name
          + (slot.phone ? "  " + slot.phone : "")
          + (slot.note ? "  " + slot.note : "")
          + (mark ? "  (" + mark + ")" : "");
        block.append(p);
      });
    }
    els.weekPrint.append(block);
  }
}

function printWeek() {
  showToolsErr("");
  fillWeekPrint();
  els.weekPrint.hidden = false;
  els.weekPrint.removeAttribute("aria-hidden");
  document.body.classList.add("print-week");
  window.print();
}

function fallbackCopy(text, done) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  document.body.append(area);
  area.select();
  try {
    document.execCommand("copy");
    done();
  } catch (err) {
    showToolsErr("Could not copy. Select the day and copy it yourself.");
  }
  area.remove();
}

function copyText(text, okMsg) {
  const done = function () {
    els.mode.textContent = okMsg;
    showToolsErr("");
  };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(function () {
      fallbackCopy(text, done);
    });
  } else {
    fallbackCopy(text, done);
  }
}

function copyOpenDay() {
  if (!fromIso(openDay)) {
    showToolsErr("Pick a day first.");
    return;
  }
  copyText(dayText(openDay), "Copied " + formatDayLong(fromIso(openDay)) + ".");
}

function renamePerson(event) {
  event.preventDefault();
  showRenameErr("");
  const from = els.renameFrom.value;
  const to = els.renameTo.value.trim();
  if (!from) {
    showRenameErr("Pick a name to change.");
    return;
  }
  if (!to) {
    showRenameErr("Put the new name in.");
    els.renameTo.focus();
    return;
  }
  if (to === from) {
    showRenameErr("That is the same name. Type a different one.");
    els.renameTo.focus();
    return;
  }
  let count = 0;
  Object.keys(book.days).forEach(function (dateIso) {
    book.days[dateIso].slots.forEach(function (slot) {
      if (slot.name === from) {
        slot.name = to;
        count += 1;
      }
    });
  });
  persist();
  els.renameTo.value = "";
  els.mode.textContent = "Renamed " + from + " to " + to + " on " + count + (count === 1 ? " slot." : " slots.");
  render();
}

document.getElementById("week-prev").addEventListener("click", function () {
  if (calView === "month") {
    viewedMonth = addMonths(viewedMonth, -1);
    showDay(iso(viewedMonth));
  } else {
    showDay(iso(addDays(viewedMonday, -7)));
  }
  if (editingId) clearSlotForm();
  showToolsErr("");
  showErr("");
  render();
});

document.getElementById("week-next").addEventListener("click", function () {
  if (calView === "month") {
    viewedMonth = addMonths(viewedMonth, 1);
    showDay(iso(viewedMonth));
  } else {
    showDay(iso(addDays(viewedMonday, 7)));
  }
  if (editingId) clearSlotForm();
  showToolsErr("");
  showErr("");
  render();
});

document.getElementById("jump-today").addEventListener("click", function () {
  showDay(iso(new Date()));
  if (editingId) clearSlotForm();
  showToolsErr("");
  showErr("");
  els.mode.textContent = "This week.";
  render();
});

document.getElementById("view-week").addEventListener("click", function () {
  calView = "week";
  persistView();
  viewedMonday = mondayOf(fromIso(openDay) || new Date());
  if (editingId) clearSlotForm();
  render();
});

document.getElementById("view-month").addEventListener("click", function () {
  calView = "month";
  persistView();
  viewedMonth = monthStart(fromIso(openDay) || new Date());
  if (editingId) clearSlotForm();
  render();
});

function onPickDay(event) {
  const btn = event.target.closest("[data-day]");
  if (!btn) return;
  showDay(btn.dataset.day);
  if (editingId) clearSlotForm();
  showToolsErr("");
  showErr("");
  render();
}

els.weekStrip.addEventListener("click", onPickDay);
els.monthCells.addEventListener("click", onPickDay);

els.slotRows.addEventListener("click", function (event) {
  const edit = event.target.closest("[data-edit]");
  if (edit) {
    startEdit(edit.getAttribute("data-edit"));
    return;
  }
  const here = event.target.closest("[data-here]");
  if (here) {
    setSlotStatus(here.getAttribute("data-here"), "here");
    return;
  }
  const noshow = event.target.closest("[data-noshow]");
  if (noshow) {
    setSlotStatus(noshow.getAttribute("data-noshow"), "noshow");
    return;
  }
  const cancel = event.target.closest("[data-cancel]");
  if (cancel) cancelSlot(cancel.getAttribute("data-cancel"));
});

els.pileRows.addEventListener("click", function (event) {
  const restore = event.target.closest("[data-restore]");
  if (restore) {
    restoreSlot(restore.getAttribute("data-restore"));
    return;
  }
  const remove = event.target.closest("[data-remove]");
  if (remove) removeSlot(remove.getAttribute("data-remove"));
});

els.findResults.addEventListener("click", function (event) {
  const btn = event.target.closest("[data-open-day]");
  if (!btn) return;
  showDay(btn.getAttribute("data-open-day"));
  render();
});

els.findQ.addEventListener("input", function () {
  findQuery = els.findQ.value.trim().toLowerCase();
  renderFind();
  renderDay();
  renderPile();
});

document.getElementById("find-form").addEventListener("submit", function (event) {
  event.preventDefault();
  findQuery = els.findQ.value.trim().toLowerCase();
  renderFind();
  renderDay();
  renderPile();
});

document.getElementById("slot-form").addEventListener("submit", saveSlot);
document.getElementById("slot-clear").addEventListener("click", function () {
  clearSlotForm();
  renderTimeChips();
  els.slotTime.focus();
});
document.getElementById("slot-cancel-edit").addEventListener("click", function () {
  clearSlotForm();
  renderTimeChips();
  els.slotTime.focus();
});
els.slotTime.addEventListener("input", renderTimeChips);
els.timeChips.addEventListener("click", function (event) {
  const btn = event.target.closest("[data-chip]");
  if (!btn || btn.disabled) return;
  els.slotTime.value = btn.getAttribute("data-chip");
  showErr("");
  renderTimeChips();
  closeTimePick();
  els.slotName.focus();
});
els.slotName.addEventListener("input", function () {
  renderNameSuggest();
  const exact = peopleIndex()[els.slotName.value.trim()];
  if (exact && !els.slotPhone.value) els.slotPhone.value = exact.phone;
});
els.slotName.addEventListener("blur", function () {
  window.setTimeout(hideNameSuggest, 180);
});
els.nameSuggest.addEventListener("mousedown", function (event) {
  event.preventDefault();
});
els.nameSuggest.addEventListener("click", function (event) {
  const btn = event.target.closest("[data-pick-name]");
  if (!btn) return;
  pickKnownName(btn.getAttribute("data-pick-name"));
});
els.dayNoteField.addEventListener("input", saveDayNote);

document.getElementById("book-form").addEventListener("input", saveBookFields);
document.getElementById("rename-form").addEventListener("submit", renamePerson);
document.getElementById("btn-sample").addEventListener("click", function () {
  demoMode = false;
  loadSample().catch(function () {
    showToolsErr("Could not load the sample file.");
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
document.getElementById("btn-print").addEventListener("click", function () {
  document.body.classList.remove("print-week");
  window.print();
});
document.getElementById("btn-print-week").addEventListener("click", printWeek);
document.getElementById("btn-copy-day").addEventListener("click", copyOpenDay);
document.getElementById("btn-dup").addEventListener("click", duplicateWeek);
els.btnSignin.addEventListener("click", function () {
  signInCloud().catch(function () {
    showAccountErr("Could not sign in.");
  });
});
els.btnSignout.addEventListener("click", signOutCloud);

window.addEventListener("afterprint", function () {
  document.body.classList.remove("print-week");
  els.weekPrint.hidden = true;
  els.weekPrint.setAttribute("aria-hidden", "true");
  els.weekPrint.replaceChildren();
});

document.addEventListener("keydown", function (event) {
  if (event.key !== "Escape") return;
  clearSlotForm();
  hideNameSuggest();
  renderTimeChips();
});

async function boot() {
  const params = new URLSearchParams(location.search);
  const wantSample = params.get("sample") === "1";
  try {
    if (wantSample) {
      demoMode = true;
      await loadSample();
    } else {
      const saved = localStorage.getItem(STORE_KEY);
      if (saved) {
        book = normalizeBook(JSON.parse(saved));
        els.mode.textContent = "Saved in this browser. Load sample or start blank if you want a clean page.";
        render();
      } else {
        const raw = await fetchJson("book.json");
        book = normalizeBook(raw);
        const hasDays = Object.keys(book.days).length > 0;
        els.mode.textContent = hasDays
          ? "Loaded book.json."
          : "Blank book from book.json. Load sample to see Elm Street Cuts.";
        render();
      }
    }
  } catch (err) {
    book = emptyBook();
    els.mode.textContent = "Blank book. Load sample if you want to see a filled week.";
    render();
  }
  await bootAccount();
}

boot();
