import React, { useState, useMemo, useRef, useLayoutEffect, useEffect, useCallback } from "react";
import {
  Plus,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Waves,
  Award,
  BarChart3,
  X,
  Users,
  UploadCloud,
  LogOut,
  Check,
  RefreshCw,
  AlertCircle,
  Send,
  Paperclip,
  Watch,
  Pencil,
} from "lucide-react";

/* ============================================================
   FATHOM — Royal Navy Mine Clearance Diver logbook
   Shares SLATE's visual identity: dive-computer dark UI,
   teal accent, Oswald / IBM Plex Sans / IBM Plex Mono stack.
   ============================================================ */

const FONT_IMPORT_URL =
  "https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap";

const COLORS = {
  bg: "#14181C",
  panel: "#0F1518",
  card: "#1E262B",
  cardHover: "#232C31",
  gaugeFace: "#171E22",
  raised: "#262F35",
  textPrimary: "#D9F2EA",
  textBright: "#F2FBF8",
  textMuted: "#8AA39C",
  textDim: "#3E4B4F",
  greyNoData: "#4A555B",
  teal: "#33C7B3",
  tealDark: "#16302C",
  green: "#4CAF50",
  amber: "#F2A93C",
  red: "#E5533D",
  redDark: "#331F1E",
  divider: "#2C363C",
  cardOutline: "#44535C",
  blue: "#5AA9E6",
};

const CURRENT_USER = {
  rank: "AB",
  surname: "MacRostie",
  nickname: "Frostie",
};
const CURRENT_USER_SHORT = `${CURRENT_USER.rank} ${CURRENT_USER.surname}`;

/* ---------------- squadron roster (dummy profiles, highest rank first) ---------------- */
const SQUADRON = [
  { id: "m1", rank: "Lt Cdr", name: "Lt Cdr J. Whitfield", diveCount: 540, diveTime: "410h 0m" },
  { id: "m2", rank: "Lt", name: "Lt Hargreaves", diveCount: 410, diveTime: "320h 0m" },
  { id: "m3", rank: "Sub Lt", name: "Sub Lt R. Okafor", diveCount: 180, diveTime: "140h 0m" },
  { id: "m4", rank: "WO1", name: "WO1 D. Pennington", diveCount: 620, diveTime: "480h 0m" },
  { id: "m5", rank: "CPO", name: "CPO S. Bardsley", diveCount: 480, diveTime: "370h 0m" },
  { id: "m6", rank: "PO", name: "PO Reeves", diveCount: 310, diveTime: "240h 0m" },
  { id: "m7", rank: "PO", name: "PO T. Linnell", diveCount: 290, diveTime: "225h 0m" },
  { id: "m8", rank: "LH", name: "LH Marsh", diveCount: 165, diveTime: "128h 0m" },
  { id: "m9", rank: "LH", name: "LH K. Fenwick", diveCount: 150, diveTime: "115h 0m" },
  { id: "m10", rank: "AB", name: "AB Coyle", diveCount: 68, diveTime: "52h 0m" },
  { id: "m11", rank: "AB", name: "AB R. Doyle", diveCount: 54, diveTime: "41h 0m" },
  { id: "m12", rank: CURRENT_USER.rank, surname: CURRENT_USER.surname, nickname: CURRENT_USER.nickname, isSelf: true },
];

// Dummy medical + qualification records for everyone else in the squadron.
// Seeded by member id so a person's records don't change between renders; expiry
// dates are relative to today so every status (current / expiring / expired) shows up.
function daysFromToday(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return isoDate(d.getFullYear(), d.getMonth(), d.getDate());
}

function seededRandom(seedText) {
  let h = 1779033703 ^ seedText.length;
  for (let i = 0; i < seedText.length; i++) {
    h = Math.imul(h ^ seedText.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SQUAD_QUAL_POOL = [
  "Ships Team Diver (STD)",
  "Mine Clearance Diver Grade 2",
  "Explosive Ordnance Disposal Level 1",
  "Surface Supplied Diving Supervisor",
  "First Aid at Work (Diving Ops)",
];

function makeMemberRecords(memberId) {
  const rand = seededRandom(memberId);
  const pickExpiry = () => {
    const roll = rand();
    if (roll < 0.55) return daysFromToday(90 + Math.floor(rand() * 500)); // current
    if (roll < 0.78) return daysFromToday(5 + Math.floor(rand() * 50)); // expiring soon
    return daysFromToday(-(5 + Math.floor(rand() * 120))); // expired
  };

  const medical = ["Diver Medical", "Dental", "X-Ray"].map((name, i) => ({
    id: `${memberId}-med${i}`,
    name,
    expiryDate: pickExpiry(),
  }));

  const pool = [...SQUAD_QUAL_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const quals = pool.slice(0, 3 + Math.floor(rand() * 3)).map((name, i) => ({
    id: `${memberId}-q${i}`,
    name,
    expiryDate: name === "Mine Clearance Diver Grade 2" ? "" : pickExpiry(), // MCD2 never lapses
  }));

  return { medical, quals };
}

const SQUADRON_RECORDS = Object.fromEntries(
  SQUADRON.filter((m) => !m.isSelf).map((m) => [m.id, makeMemberRecords(m.id)])
);

const DIVE_TYPES = [
  { key: "training", label: "Training", color: COLORS.teal },
  { key: "exercise", label: "Exercise", color: COLORS.green },
  { key: "eod", label: "EOD Tasking", color: COLORS.amber },
  { key: "search", label: "Search", color: COLORS.blue },
  { key: "other", label: "Other", color: COLORS.textMuted },
];

const RIG_TYPES = [
  { key: "SABA", color: COLORS.teal },
  { key: "OSDS", color: COLORS.green },
  { key: "CDLSE", color: COLORS.amber },
  { key: "SOBA", color: COLORS.blue },
  { key: "RABA", color: COLORS.red },
];

function rigInfo(key) {
  return RIG_TYPES.find((r) => r.key === key) || { key: key || "Unknown", color: COLORS.textMuted };
}

/* ---------------- sample seed data (replace with real storage later) ---------------- */
const SEED_DIVES = [
  {
    id: "d1",
    date: "2026-07-29",
    location: "HMNB Devonport, Basin 3",
    diveNumber: "142",
    setNumber: "4",
    type: "training",
    supervisor: "PO Reeves",
    team: "LH Marsh, AB Coyle",
    rig: "SABA",
    waterTemp: "14°C",
    visibility: "3m",
    current: "Slack",
    seaState: "1",
    timeIn: "09:12",
    timeOut: "09:58",
    bottomTime: 46,
    maxDepth: 18,
    decoStops: "None required",
    gas: "Air",
    task: "Search pattern practice — jackstay",
    notes: "Good trim throughout, comms clear.",
  },
  {
    id: "d2",
    date: "2026-07-22",
    location: "Portland Harbour",
    diveNumber: "141",
    setNumber: "2",
    type: "eod",
    supervisor: "Lt Hargreaves",
    team: "LH Marsh",
    rig: "SABA",
    waterTemp: "15°C",
    visibility: "2m",
    current: "Mild",
    seaState: "2",
    timeIn: "13:40",
    timeOut: "14:22",
    bottomTime: 42,
    maxDepth: 22,
    decoStops: "3m / 3min",
    gas: "Air",
    task: "Suspected ordnance ID — circular search",
    notes: "Object identified as scrap metal, disposed via routine recovery.",
  },
  {
    id: "d3",
    date: "2026-07-22",
    location: "Portland Harbour",
    diveNumber: "140",
    setNumber: "2",
    type: "search",
    supervisor: "Lt Hargreaves",
    team: "AB Coyle",
    rig: "OSDS",
    waterTemp: "15°C",
    visibility: "2m",
    current: "Mild",
    seaState: "2",
    timeIn: "10:05",
    timeOut: "10:51",
    bottomTime: 46,
    maxDepth: 19,
    decoStops: "None required",
    gas: "Air",
    task: "Circular search pattern, area clearance",
    notes: "",
  },
  {
    id: "d4",
    date: "2026-06-15",
    location: "Loch Long",
    diveNumber: "139",
    setNumber: "6",
    type: "exercise",
    supervisor: "PO Reeves",
    team: "Full section",
    rig: "CDLSE",
    waterTemp: "11°C",
    visibility: "4m",
    current: "None",
    seaState: "1",
    timeIn: "08:30",
    timeOut: "09:34",
    bottomTime: 64,
    maxDepth: 28,
    decoStops: "5m / 4min",
    gas: "Nitrox 32",
    task: "Joint exercise — simulated mine disposal",
    notes: "Rebreather scrubber swapped mid-ex, no issues.",
  },
  {
    id: "d5",
    date: "2026-06-02",
    location: "HMNB Devonport, Basin 3",
    diveNumber: "138",
    setNumber: "4",
    type: "training",
    supervisor: "PO Reeves",
    team: "LH Marsh",
    rig: "SABA",
    waterTemp: "13°C",
    visibility: "2.5m",
    current: "Slack",
    seaState: "1",
    timeIn: "09:00",
    timeOut: "09:41",
    bottomTime: 41,
    maxDepth: 15,
    decoStops: "None required",
    gas: "Air",
    task: "Buoyancy and trim refresher",
    notes: "",
  },
  {
    id: "d6",
    date: "2026-08-05",
    location: "Horsea Island",
    diveNumber: "143",
    setNumber: "5",
    type: "training",
    supervisor: "PO Reeves",
    team: "AB Coyle, LH Marsh",
    rig: "SABA",
    waterTemp: "16°C",
    visibility: "1.5m",
    current: "None",
    seaState: "0",
    timeIn: "08:50",
    timeOut: "09:38",
    bottomTime: 48,
    maxDepth: 12,
    decoStops: "None required",
    gas: "Air",
    task: "Confined water search drills — tactile search techniques",
    notes: "",
  },
  {
    id: "d7",
    date: "2026-08-14",
    location: "Portland Harbour",
    diveNumber: "144",
    setNumber: "3",
    type: "eod",
    supervisor: "Lt Hargreaves",
    team: "LH Marsh",
    rig: "SOBA",
    waterTemp: "17°C",
    visibility: "3m",
    current: "Mild",
    seaState: "1",
    timeIn: "11:15",
    timeOut: "12:01",
    bottomTime: 46,
    maxDepth: 24,
    decoStops: "3m / 3min",
    gas: "Air",
    task: "Suspected ordnance response — charted datum investigation",
    notes: "Datum investigated and cleared, no ordnance present.",
  },
  {
    id: "d8",
    date: "2026-08-27",
    location: "HMNB Devonport, Basin 3",
    diveNumber: "145",
    setNumber: "5",
    type: "other",
    supervisor: "PO Reeves",
    team: "AB Coyle",
    rig: "SABA",
    waterTemp: "17°C",
    visibility: "2m",
    current: "Slack",
    seaState: "1",
    timeIn: "10:00",
    timeOut: "10:35",
    bottomTime: 35,
    maxDepth: 10,
    decoStops: "None required",
    gas: "Air",
    task: "Hull inspection — routine ship's husbandry dive",
    notes: "",
  },
  {
    id: "d9",
    date: "2026-09-03",
    location: "Faslane, Gare Loch",
    diveNumber: "146",
    setNumber: "2",
    type: "exercise",
    supervisor: "Lt Hargreaves",
    team: "Full section",
    rig: "CDLSE",
    waterTemp: "13°C",
    visibility: "3.5m",
    current: "None",
    seaState: "1",
    timeIn: "09:20",
    timeOut: "10:28",
    bottomTime: 68,
    maxDepth: 26,
    decoStops: "5m / 4min",
    gas: "Nitrox 32",
    task: "Joint exercise — simulated harbour clearance",
    notes: "Full section rotation through search lanes, good comms throughout.",
  },
  {
    id: "d10",
    date: "2026-09-16",
    location: "Portland Harbour",
    diveNumber: "147",
    setNumber: "3",
    type: "search",
    supervisor: "PO Reeves",
    team: "LH Marsh, AB Coyle",
    rig: "RABA",
    waterTemp: "15°C",
    visibility: "2.5m",
    current: "Mild",
    seaState: "2",
    timeIn: "13:05",
    timeOut: "13:52",
    bottomTime: 47,
    maxDepth: 20,
    decoStops: "None required",
    gas: "Air",
    task: "Jackstay search — area clearance ahead of exercise",
    notes: "",
  },
  {
    id: "d11",
    date: "2026-09-25",
    location: "Horsea Island",
    diveNumber: "148",
    setNumber: "5",
    type: "training",
    supervisor: "PO Reeves",
    team: "AB Coyle",
    rig: "SABA",
    waterTemp: "16°C",
    visibility: "1.5m",
    current: "None",
    seaState: "0",
    timeIn: "09:00",
    timeOut: "09:44",
    bottomTime: 44,
    maxDepth: 12,
    decoStops: "None required",
    gas: "Air",
    task: "Circular search refresher",
    notes: "",
  },
];

/* ---------------- qualification seed data ---------------- */
const QUAL_STATUS = {
  current: { label: "Current", color: COLORS.teal },
  expiring: { label: "Expiring Soon", color: COLORS.amber },
  expired: { label: "Expired", color: COLORS.red },
  noExpiry: { label: "No Expiry", color: COLORS.textMuted },
};

const SEED_QUALS = [
  {
    id: "q1",
    name: "Ships Team Diver (STD)",
    authority: "Fleet Diving Squadron",
    dateAwarded: "2023-03-14",
    expiryDate: "2026-03-14",
    certRef: "FDS/STD/0472",
    notes: "",
  },
  {
    id: "q2",
    name: "Mine Clearance Diver Grade 2",
    authority: "Defence Diving School",
    dateAwarded: "2023-11-02",
    expiryDate: "",
    certRef: "DDS/MCD2/1188",
    notes: "No periodic re-certification required; maintained via currency logs.",
  },
  {
    id: "q3",
    name: "Explosive Ordnance Disposal Level 1",
    authority: "Defence EOD, Munitions & Search School",
    dateAwarded: "2024-06-20",
    expiryDate: "2026-09-20",
    certRef: "DEMS/EOD1/0891",
    notes: "",
  },
  {
    id: "q4",
    name: "Surface Supplied Diving Supervisor",
    authority: "Fleet Diving Squadron",
    dateAwarded: "2022-01-10",
    expiryDate: "2026-11-15",
    certRef: "FDS/SSDS/0231",
    notes: "Renewal course booked ahead of expiry.",
  },
  {
    id: "q5",
    name: "First Aid at Work (Diving Ops)",
    authority: "Royal Navy Medical Service",
    dateAwarded: "2025-05-18",
    expiryDate: "2028-05-18",
    certRef: "RNMS/FAW/3390",
    notes: "",
  },
];

function qualStatus(qual) {
  if (!qual.expiryDate) return "noExpiry";
  const today = new Date();
  const expiry = new Date(qual.expiryDate + "T00:00:00");
  const daysLeft = (expiry - today) / (1000 * 60 * 60 * 24);
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 60) return "expiring";
  return "current";
}

/* ---------------- medical records seed data ---------------- */
// Placeholder certificate artwork, drawn as an SVG so no image file is needed.
// In the real app this would be the diver's own uploaded photo/scan.
function makeFitToDiveCertImage({ name, issued, validUntil, officer }) {
  const label = (y, text) =>
    `<text x="50" y="${y}" font-family="Arial, sans-serif" font-size="9" letter-spacing="2" fill="#6B7280">${text}</text>`;
  const value = (y, text) =>
    `<text x="50" y="${y}" font-family="Georgia, 'Times New Roman', serif" font-size="17" fill="#111827">${text}</text>` +
    `<line x1="50" y1="${y + 8}" x2="370" y2="${y + 8}" stroke="#B8B09A" stroke-width="1"/>`;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="594" viewBox="0 0 420 594">` +
    `<rect width="420" height="594" fill="#F7F4EA"/>` +
    `<rect x="14" y="14" width="392" height="566" fill="none" stroke="#1D2F4B" stroke-width="3"/>` +
    `<rect x="22" y="22" width="376" height="550" fill="none" stroke="#1D2F4B" stroke-width="1"/>` +
    `<text x="210" y="84" text-anchor="middle" font-family="Georgia, serif" font-size="13" letter-spacing="4" fill="#1D2F4B">DIVER MEDICAL</text>` +
    `<text x="210" y="132" text-anchor="middle" font-family="Georgia, serif" font-size="36" font-weight="bold" fill="#1D2F4B">FIT TO DIVE</text>` +
    `<text x="210" y="158" text-anchor="middle" font-family="Georgia, serif" font-size="14" font-style="italic" fill="#3A4A63">Certificate of Medical Fitness</text>` +
    `<line x1="70" y1="180" x2="350" y2="180" stroke="#1D2F4B" stroke-width="1"/>` +
    label(226, "NAME") + value(248, name) +
    label(288, "CATEGORY") + value(310, "Diver (Mine Clearance)") +
    label(350, "DATE OF EXAMINATION") + value(372, issued) +
    label(412, "VALID UNTIL") + value(434, validUntil) +
    label(474, "MEDICAL OFFICER") + value(496, officer) +
    `<path d="M60 540 c 12 -24, 24 -24, 30 -4 s 10 18, 22 -2 s 14 -20, 26 0 s 12 14, 28 -6" fill="none" stroke="#1D2F4B" stroke-width="1.8" stroke-linecap="round"/>` +
    `<text x="210" y="340" transform="rotate(-28 210 340)" text-anchor="middle" font-family="Arial, sans-serif" font-size="70" font-weight="bold" fill="#B91C1C" fill-opacity="0.12">SAMPLE</text>` +
    `<text x="210" y="562" text-anchor="middle" font-family="Arial, sans-serif" font-size="8.5" fill="#6B7280">Placeholder image - replace with scanned certificate</text>` +
    `</svg>`;

  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

const SEED_MEDICAL = [
  {
    id: "med1",
    name: "Diver Medical",
    interval: "Every 2 years",
    lastDateLabel: "Date Issued",
    lastDate: "2025-03-12",
    expiryDate: "2027-03-12",
    signedOffBy: "Surg Lt Cdr A. Prentice RN",
    attachment: {
      name: "Fit to Dive Certificate",
      src: makeFitToDiveCertImage({
        name: `${CURRENT_USER.rank} ${CURRENT_USER.surname}`,
        issued: "12 March 2025",
        validUntil: "12 March 2027",
        officer: "Surg Lt Cdr A. Prentice RN",
      }),
    },
  },
  {
    id: "med2",
    name: "Dental",
    interval: "Annually",
    lastDateLabel: "Last Check-Up",
    lastDate: "2025-10-20",
    expiryDate: "2026-10-20",
    location: "HMS Collingwood Dental",
  },
  {
    id: "med3",
    name: "X-Ray",
    interval: "Every 2 years",
    lastDateLabel: "Last Scan Date",
    lastDate: "2024-09-10",
    expiryDate: "2026-09-10",
    location: "Queen Alexandra Hospital, Portsmouth",
  },
];

/* ---------------- upcoming / planned dive seed data ---------------- */
const SEED_UPCOMING_DIVES = [
  {
    id: "u1",
    date: "2026-10-06",
    location: "Portland Harbour",
    type: "exercise",
    note: "Joint exercise with Fleet Diving Unit 2",
  },
  {
    id: "u2",
    date: "2026-10-14",
    location: "HMNB Devonport, Basin 3",
    type: "training",
    note: "Routine proficiency dive",
  },
  {
    id: "u3",
    date: "2026-10-29",
    location: "Horsea Island",
    type: "training",
    note: "Search technique refresher",
  },
];


const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function monthLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  return `${MONTH_NAMES[d.getMonth()].toUpperCase()} ${d.getFullYear()}`;
}

function dayLabel(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  return `${days[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()].slice(0,3)}`;
}

function groupByMonth(dives) {
  const groups = {};
  for (const dive of dives) {
    const key = monthLabel(dive.date);
    if (!groups[key]) groups[key] = [];
    groups[key].push(dive);
  }
  return Object.entries(groups).sort((a, b) => {
    const da = new Date(a[1][0].date);
    const db = new Date(b[1][0].date);
    return db - da;
  });
}

function fmtHoursMins(totalMins) {
  const h = Math.floor(totalMins / 60);
  const m = Math.round(totalMins % 60);
  return `${h}h ${m}m`;
}

function typeInfo(key) {
  return DIVE_TYPES.find((t) => t.key === key) || DIVE_TYPES[DIVE_TYPES.length - 1];
}

/* ============================================================
   ROOT APP
   ============================================================ */
export default function FathomApp() {
  const [view, setView] = useState("home");
  const [tab, setTab] = useState("dives");
  const [dives, setDives] = useState(SEED_DIVES);
  const [quals, setQuals] = useState(SEED_QUALS);
  const [medical] = useState(SEED_MEDICAL);
  const [upcoming, setUpcoming] = useState(SEED_UPCOMING_DIVES);
  const [addingDive, setAddingDive] = useState(false);
  const [prefillPlan, setPrefillPlan] = useState(null); // planned dive being logged via the pencil
  const [submittedNotice, setSubmittedNotice] = useState(null); // { supervisor } after a dive log is submitted
  const [addingQual, setAddingQual] = useState(false);

  // Demo only: always starts "outdated" (red) each time the app loads, so Back Up Data
  // can be demonstrated. Real backend sync status would replace this.
  const [syncStatus, setSyncStatus] = useState("outdated");

  const [showNickname, setShowNickname] = useState(true);
  const [showSyncInfo, setShowSyncInfo] = useState(false);

  const scrollRef = useRef(null);
  const contentRef = useRef(null);
  const [canScrollDown, setCanScrollDown] = useState(false);

  // Shows the bottom fade only while real content is still hidden below the fold
  // (the empty padding at the very end of a page doesn't count).
  const updateScrollHint = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const padBottom = parseFloat(window.getComputedStyle(el).paddingBottom) || 0;
    const hiddenBelow = el.scrollHeight - el.scrollTop - el.clientHeight - padBottom;
    setCanScrollDown(hiddenBelow > 4);
  }, []);

  // Every page change (Home, any tab, or opening/closing an add form) starts at the top.
  useLayoutEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    updateScrollHint();
  }, [view, tab, addingDive, addingQual, updateScrollHint]);

  // After a pull-to-refresh on Android, 100dvh can come out taller than the visible screen,
  // which pushes the nav bar off the bottom. Instead, size the app to the height that is
  // really visible, and re-check it a few times as the page settles after a (re)load.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const vv = window.visualViewport;

    const fit = () => {
      const tag = document.activeElement ? document.activeElement.tagName : "";
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return; // keyboard may be up: leave the layout alone
      if (vv && vv.scale > 1.01) return; // pinch-zoomed: don't resize
      const visible = vv ? vv.height : window.innerHeight;
      if (visible > 0) root.style.setProperty("--app-height", `${Math.floor(visible)}px`);
    };
    const refitSoon = () => setTimeout(fit, 120);

    fit();
    const timers = [60, 200, 500, 1000, 2000].map((ms) => setTimeout(fit, ms));
    window.addEventListener("resize", fit);
    window.addEventListener("orientationchange", refitSoon);
    window.addEventListener("pageshow", fit);
    document.addEventListener("visibilitychange", fit);
    document.addEventListener("focusout", refitSoon);
    if (vv) vv.addEventListener("resize", fit);

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener("resize", fit);
      window.removeEventListener("orientationchange", refitSoon);
      window.removeEventListener("pageshow", fit);
      document.removeEventListener("visibilitychange", fit);
      document.removeEventListener("focusout", refitSoon);
      if (vv) vv.removeEventListener("resize", fit);
    };
  }, []);

  // Re-check whenever the page content or the window changes size (e.g. expanding a card).
  useEffect(() => {
    const scrollEl = scrollRef.current;
    const contentEl = contentRef.current;
    if (!scrollEl || !contentEl || typeof ResizeObserver === "undefined") return undefined;
    const observer = new ResizeObserver(updateScrollHint);
    observer.observe(scrollEl);
    observer.observe(contentEl);
    return () => observer.disconnect();
  }, [updateScrollHint]);

  const handleAddDive = (dive) => {
    setDives((prev) => [{ ...dive, id: `d${Date.now()}`, status: "pending" }, ...prev]);
    // A planned dive that has now been logged leaves the Upcoming list
    if (prefillPlan) setUpcoming((prev) => prev.filter((u) => u.id !== prefillPlan.id));
    setPrefillPlan(null);
    setAddingDive(false);
    // Land on the Dives page, with the confirmation popup over it
    setView("tab");
    setTab("dives");
    setSubmittedNotice({ supervisor: dive.supervisor });
  };

  // Save Draft: keep everything entered so far as an upcoming dive, then leave the form.
  // If the form was opened from a planned dive, that dive is updated rather than duplicated.
  const handleSaveDraft = (draft) => {
    const now = new Date();
    const today = isoDate(now.getFullYear(), now.getMonth(), now.getDate());
    const saved = { ...draft, date: draft.date || today };
    setUpcoming((prev) => {
      const next = prefillPlan
        ? prev.map((u) => (u.id === prefillPlan.id ? { ...u, ...saved } : u))
        : [...prev, { ...saved, id: `u${Date.now()}` }];
      return next.sort((a, b) => a.date.localeCompare(b.date));
    });
    setPrefillPlan(null);
    setAddingDive(false);
  };

  const closeAddDive = () => {
    setPrefillPlan(null);
    setAddingDive(false);
  };

  const startLogPlannedDive = (planned) => {
    setPrefillPlan(planned);
    setAddingDive(true);
  };

  const handleAddQual = (qual) => {
    setQuals((prev) => [{ ...qual, id: `q${Date.now()}` }, ...prev]);
    setAddingQual(false);
  };

  // Amber "syncing" for 5 seconds, then green. Used by the Back Up Data button and
  // automatically after a dive log is submitted (new data -> the app syncs to the cloud).
  const syncTimerRef = useRef(null);
  const handleBackUpData = () => {
    setSyncStatus("syncing");
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => setSyncStatus("upToDate"), 5000);
  };

  const goToTab = (key) => {
    setTab(key);
    setView("tab");
  };

  const onASubScreen = addingDive || addingQual;

  return (
    <div style={styles.app}>
      <style>{`
        @import url('${FONT_IMPORT_URL}');
        html, body { background: ${COLORS.bg}; margin: 0; padding: 0; }
        * { box-sizing: border-box; }
        .fathom-oswald { font-family: 'Oswald', sans-serif; }
        .fathom-mono { font-family: 'IBM Plex Mono', monospace; }
        .fathom-body { font-family: 'IBM Plex Sans', sans-serif; }
        .fathom-scroll::-webkit-scrollbar { width: 6px; }
        .fathom-scroll::-webkit-scrollbar-thumb { background: ${COLORS.divider}; border-radius: 3px; }
        button { cursor: pointer; }
        @keyframes fathom-spin { to { transform: rotate(360deg); } }
      `}</style>

      {!onASubScreen && (
        <div style={styles.masthead}>
          <button style={styles.mastheadHome} onClick={() => setView("home")}>
            <BubblesIcon size={22} color={COLORS.teal} />
            <div>
              <div className="fathom-oswald" style={styles.mastheadTitle}>FATHOM</div>
              <div className="fathom-mono" style={styles.mastheadSubtitle}>
                FLEET ASSET TRACKING &amp; HISTORICAL OPERATIONS MANIFEST
              </div>
            </div>
          </button>
          <button
            style={styles.mastheadSync}
            onClick={() => setShowSyncInfo(true)}
            title={`Cloud backup: ${SYNC_STATUS_CONFIG[syncStatus].label}`}
            aria-label={`Cloud backup: ${SYNC_STATUS_CONFIG[syncStatus].label}. Tap for details`}
          >
            <SyncBadge status={syncStatus} size={30} />
          </button>
        </div>
      )}

      <div style={styles.screenWrap}>
      <div
        ref={scrollRef}
        className="fathom-scroll"
        style={styles.screenArea}
        onScroll={updateScrollHint}
      >
        <div ref={contentRef}>
        {addingDive ? (
          <AddDiveForm
            existingDives={dives}
            prefill={prefillPlan}
            onCancel={closeAddDive}
            onSave={handleAddDive}
            onSaveDraft={handleSaveDraft}
          />
        ) : addingQual ? (
          <AddQualificationForm
            onCancel={() => setAddingQual(false)}
            onSave={handleAddQual}
          />
        ) : view === "home" ? (
          <HomeScreen
            dives={dives}
            quals={quals}
            medical={medical}
            upcoming={upcoming}
            onGoToTab={goToTab}
            onEditPlanned={startLogPlannedDive}
            showNickname={showNickname}
          />
        ) : tab === "dives" ? (
          <DivesTab
            dives={dives}
            upcoming={upcoming}
            onAddDive={() => setAddingDive(true)}
            onEditPlanned={startLogPlannedDive}
            onBackUpData={handleBackUpData}
            showNickname={showNickname}
            onToggleNickname={setShowNickname}
          />
        ) : tab === "stats" ? (
          <StatsTab
            dives={dives}
            onBackUpData={handleBackUpData}
            showNickname={showNickname}
            onToggleNickname={setShowNickname}
          />
        ) : tab === "squadron" ? (
          <SquadronTab
            dives={dives}
            quals={quals}
            medical={medical}
            onBackUpData={handleBackUpData}
            showNickname={showNickname}
            onToggleNickname={setShowNickname}
          />
        ) : (
          <QualificationsTab
            quals={quals}
            medical={medical}
            dives={dives}
            onAddQual={() => setAddingQual(true)}
            onBackUpData={handleBackUpData}
            showNickname={showNickname}
            onToggleNickname={setShowNickname}
          />
        )}
        </div>
      </div>
      <div style={{ ...styles.scrollFade, opacity: canScrollDown ? 1 : 0 }} />
      </div>

      {!onASubScreen && (
        <BottomNav view={view} tab={tab} onNavigate={goToTab} />
      )}

      {showSyncInfo && (
        <SyncStatusModal
          status={syncStatus}
          onBackUp={handleBackUpData}
          onClose={() => setShowSyncInfo(false)}
        />
      )}

      {submittedNotice && (
        <DiveSubmittedModal
          supervisor={submittedNotice.supervisor}
          onClose={() => {
            setSubmittedNotice(null);
            handleBackUpData(); // new data has been added, so the app syncs it to the cloud
          }}
        />
      )}
    </div>
  );
}

/* ============================================================
   HOME SCREEN (landing page)
   ============================================================ */
function ProfileSummaryCard({
  name,
  rank,
  surname,
  nickname,
  diveCount,
  diveTime,
  isSelf,
  expandable = false,
  expanded = false,
  onToggle,
  children,
}) {
  const content = (
    <>
      <div style={styles.profileIconWrap}>
        <span className="fathom-mono" style={styles.rankBadgeText}>{rank}</span>
      </div>
      <div style={{ flex: 1 }}>
        <div className="fathom-oswald" style={styles.homeProfileId}>
          {surname ? (
            <>
              {rank} {surname}
              {nickname && (
                <>
                  {" "}
                  <span style={styles.nicknameText}>'{nickname}'</span>
                </>
              )}
            </>
          ) : (
            name
          )}
          {isSelf && <span className="fathom-mono" style={styles.youTag}> (YOU)</span>}
        </div>
        <div className="fathom-mono" style={styles.homeProfileStats}>
          {diveCount} DIVES · {diveTime} UNDERWATER
        </div>
      </div>
    </>
  );

  const cardStyle = {
    ...styles.homeProfileCard,
    ...(isSelf ? { borderColor: COLORS.teal } : {}),
  };

  if (!expandable) return <div style={cardStyle}>{content}</div>;

  return (
    <div style={{ ...cardStyle, display: "block", padding: 0, overflow: "hidden" }}>
      <button style={styles.profileDropdownHeader} onClick={onToggle}>
        {content}
        <ChevronDown
          size={18}
          color={COLORS.textMuted}
          style={{
            flexShrink: 0,
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease",
          }}
        />
      </button>
      {expanded && <div style={styles.profileDropdownBody}>{children}</div>}
    </div>
  );
}

function HomeScreen({ dives, quals, medical, upcoming, onGoToTab, onEditPlanned, showNickname }) {
  const totalMins = dives.reduce((s, d) => s + d.bottomTime, 0);

  const outOfDateQuals = quals.filter((q) => {
    const s = qualStatus(q);
    return s === "expired" || s === "expiring";
  });

  return (
    <div style={styles.tabContent}>
      {/* Profile summary */}
      <ProfileSummaryCard
        rank={CURRENT_USER.rank}
        surname={CURRENT_USER.surname}
        nickname={showNickname ? CURRENT_USER.nickname : null}
        diveCount={dives.length}
        diveTime={fmtHoursMins(totalMins)}
      />

      {/* Records: medical status boxes, then qualifications status */}
      <div className="fathom-mono" style={styles.categoryLabel}>RECORDS</div>
      <div style={styles.homeMedicalRow}>
        {medical.map((item) => {
          const status = QUAL_STATUS[qualStatus(item)];
          return (
            <button key={item.id} style={{ ...styles.homeMedicalBox, borderColor: status.color }} onClick={() => onGoToTab("quals")}>
              <span className="fathom-mono" style={styles.homeMedicalName}>{item.name.toUpperCase()}</span>
              <span style={styles.homeMedicalStatusRow}>
                <span style={{ ...styles.typeDot, background: status.color }} />
                <span className="fathom-oswald" style={{ ...styles.homeMedicalStatus, color: status.color }}>
                  {status.label}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <button style={{ ...styles.panelCard, width: "100%", display: "block", textAlign: "left" }} onClick={() => onGoToTab("quals")}>
        {outOfDateQuals.length === 0 ? (
          <div style={styles.qualsUpToDateRow}>
            <div style={{ ...styles.typeDot, background: COLORS.teal, width: 10, height: 10 }} />
            <span className="fathom-body" style={styles.qualsUpToDateText}>
              All qualifications up to date
            </span>
          </div>
        ) : (
          <div>
            {outOfDateQuals.map((q) => {
              const status = QUAL_STATUS[qualStatus(q)];
              return (
                <div key={q.id} style={styles.qualsIssueRow}>
                  <div style={{ ...styles.typeDot, background: status.color }} />
                  <span className="fathom-body" style={styles.qualsIssueText}>{q.name}</span>
                  <span className="fathom-mono" style={{ ...styles.qualsIssueStatus, color: status.color }}>
                    {status.label.toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </button>

      {/* Upcoming dives */}
      <div className="fathom-mono" style={{ ...styles.categoryLabel, marginTop: 22 }}>
        UPCOMING DIVES
      </div>
      {upcoming.length === 0 ? (
        <div style={styles.panelCard}>
          <span className="fathom-body" style={{ color: COLORS.textMuted, fontSize: 13 }}>
            No upcoming dives planned.
          </span>
        </div>
      ) : (
        upcoming.map((u) => <UpcomingDiveCard key={u.id} item={u} onEdit={onEditPlanned} />)
      )}
    </div>
  );
}

/* ============================================================
   MY SQUADRON TAB
   ============================================================ */
// One line of a person's record: status dot, name, status and expiry
function RecordRow({ name, expiryDate }) {
  const status = QUAL_STATUS[qualStatus({ expiryDate })];
  return (
    <div style={styles.recordRow}>
      <div style={{ ...styles.typeDot, background: status.color }} />
      <span className="fathom-body" style={styles.recordName}>{name}</span>
      <div style={{ textAlign: "right" }}>
        <div className="fathom-mono" style={{ ...styles.recordStatus, color: status.color }}>
          {status.label.toUpperCase()}
        </div>
        {expiryDate && (
          <div className="fathom-mono" style={styles.recordExpiry}>EXP {expiryDate}</div>
        )}
      </div>
    </div>
  );
}

function MemberRecords({ medical, quals }) {
  return (
    <>
      <div className="fathom-mono" style={styles.categoryLabel}>MEDICAL</div>
      {medical.map((item) => (
        <RecordRow key={item.id} name={item.name} expiryDate={item.expiryDate} />
      ))}
      <div className="fathom-mono" style={{ ...styles.categoryLabel, marginTop: 16 }}>QUALIFICATIONS</div>
      {quals.map((item) => (
        <RecordRow key={item.id} name={item.name} expiryDate={item.expiryDate} />
      ))}
    </>
  );
}

function SquadronTab({ dives, quals, medical, onBackUpData, showNickname, onToggleNickname }) {
  const totalMins = dives.reduce((s, d) => s + d.bottomTime, 0);
  const [managementMode, setManagementMode] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  return (
    <div style={styles.tabContent}>
      <PageHeaderWithProfile
        title="My Squadron"
        subtitle={
          managementMode ? `Management view · ${SQUADRON.length} personnel` : `${SQUADRON.length} personnel`
        }
        dives={dives}
        onBackUpData={onBackUpData}
        showNickname={showNickname}
        onToggleNickname={onToggleNickname}
      />
      {SQUADRON.map((member) => {
        // Management view: same cards, but each one drops down to show that person's records
        const dropdown = managementMode
          ? {
              expandable: true,
              expanded: expandedId === member.id,
              onToggle: () => setExpandedId(expandedId === member.id ? null : member.id),
              children: (
                <MemberRecords
                  {...(member.isSelf ? { medical, quals } : SQUADRON_RECORDS[member.id])}
                />
              ),
            }
          : {};
        return member.isSelf ? (
          <ProfileSummaryCard
            key={member.id}
            rank={member.rank}
            surname={member.surname}
            nickname={showNickname ? member.nickname : null}
            diveCount={dives.length}
            diveTime={fmtHoursMins(totalMins)}
            isSelf
            {...dropdown}
          />
        ) : (
          <ProfileSummaryCard
            key={member.id}
            rank={member.rank}
            name={member.name}
            diveCount={member.diveCount}
            diveTime={member.diveTime}
            {...dropdown}
          />
        );
      })}

      <button
        style={styles.debugBtn}
        onClick={() => {
          setManagementMode((on) => !on);
          setExpandedId(null);
        }}
      >
        <span className="fathom-mono" style={styles.debugBtnText}>
          {managementMode ? "EXIT MANAGEMENT DEBUG" : "MANAGEMENT DEBUG"}
        </span>
      </button>
    </div>
  );
}

/* ============================================================
   BOTTOM NAV
   ============================================================ */
function BottomNav({ view, tab, onNavigate }) {
  const items = [
    { key: "quals", label: "Records", icon: Award },
    { key: "dives", label: "Dives", icon: Waves },
    { key: "stats", label: "Stats", icon: BarChart3 },
    { key: "squadron", label: "Squadron", icon: Users },
  ];
  return (
    <nav style={styles.nav}>
      {items.map(({ key, label, icon: Icon }) => {
        const active = view === "tab" && tab === key;
        return (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            style={{
              ...styles.navBtn,
              color: active ? COLORS.teal : COLORS.textMuted,
            }}
          >
            <div style={{ position: "relative" }}>
              <div
                style={{
                  ...styles.navIconWrap,
                  background: active ? COLORS.tealDark : "transparent",
                  border: active ? `1px solid ${COLORS.teal}` : "1px solid transparent",
                }}
              >
                <Icon size={20} strokeWidth={2} color={active ? COLORS.teal : COLORS.textMuted} />
              </div>
            </div>
            <span className="fathom-mono" style={styles.navLabel}>{label.toUpperCase()}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ============================================================
   DIVES TAB
   ============================================================ */
/* ---------------- calendar helpers ---------------- */
const WEEKDAY_INITIALS = ["M", "T", "W", "T", "F", "S", "S"]; // weeks start on Monday

function isoDate(year, monthIndex, day) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Leading nulls pad the first week so day 1 lands under the right weekday (Monday-first)
function buildMonthCells(year, monthIndex) {
  const leadingBlanks = (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function groupTypesByDate(list) {
  const map = {};
  for (const item of list) {
    if (!map[item.date]) map[item.date] = [];
    map[item.date].push(item.type);
  }
  return map;
}

function DiveCalendar({ dives, upcoming = [] }) {
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const cells = useMemo(() => buildMonthCells(year, month), [year, month]);
  const loggedByDate = useMemo(() => groupTypesByDate(dives), [dives]);
  const plannedByDate = useMemo(() => groupTypesByDate(upcoming), [upcoming]);

  const now = new Date();
  const todayIso = isoDate(now.getFullYear(), now.getMonth(), now.getDate());

  return (
    <div style={{ ...styles.panelCard, marginBottom: 14 }}>
      <div style={styles.calHeader}>
        <button style={styles.iconBtn} onClick={() => setCursor(new Date(year, month - 1, 1))}>
          <ChevronLeft size={18} color={COLORS.textMuted} />
        </button>
        <span className="fathom-oswald" style={styles.calMonthLabel}>
          {MONTH_NAMES[month].toUpperCase()} {year}
        </span>
        <button style={styles.iconBtn} onClick={() => setCursor(new Date(year, month + 1, 1))}>
          <ChevronRight size={18} color={COLORS.textMuted} />
        </button>
      </div>

      <div style={styles.calWeekRow}>
        {WEEKDAY_INITIALS.map((w, i) => (
          <div key={i} className="fathom-mono" style={styles.calWeekDay}>{w}</div>
        ))}
      </div>

      <div style={styles.calGrid}>
        {cells.map((day, i) => {
          if (day === null) return <div key={`b${i}`} />;
          const iso = isoDate(year, month, day);
          const isToday = iso === todayIso;
          const dots = [
            ...(loggedByDate[iso] || []).map((t) => ({ kind: "logged", color: typeInfo(t).color })),
            ...(plannedByDate[iso] || []).map((t) => ({ kind: "planned", color: typeInfo(t).color })),
          ].slice(0, 3);
          return (
            <div key={iso} style={styles.calDayCell}>
              <span style={{ ...styles.calDayNum, ...(isToday ? styles.calDayNumToday : {}) }}>
                {day}
              </span>
              <div style={styles.calDotRow}>
                {dots.map((d, j) => (
                  <span
                    key={j}
                    style={
                      d.kind === "logged"
                        ? { ...styles.calDot, background: d.color }
                        : { ...styles.calDot, border: `1.5px solid ${d.color}` }
                    }
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={styles.calLegend}>
        <span style={styles.calLegendItem}>
          <span style={{ ...styles.calDot, background: COLORS.textMuted }} />
          <span className="fathom-mono" style={styles.calLegendText}>LOGGED</span>
        </span>
        <span style={styles.calLegendItem}>
          <span style={{ ...styles.calDot, border: `1.5px solid ${COLORS.textMuted}` }} />
          <span className="fathom-mono" style={styles.calLegendText}>PLANNED</span>
        </span>
        <span className="fathom-mono" style={styles.calLegendText}>COLOUR = DIVE TYPE</span>
      </div>
    </div>
  );
}

// A planned (not yet logged) dive. Hollow dot = planned, matching the calendar's key.
function UpcomingDiveCard({ item, onEdit }) {
  const info = typeInfo(item.type);
  return (
    <div style={styles.card}>
      <div style={{ ...styles.cardHeader, cursor: "default" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ ...styles.typeDot, background: "transparent", border: `1.5px solid ${info.color}` }} />
          <div style={{ textAlign: "left" }}>
            <div className="fathom-oswald" style={styles.cardTitle}>{item.location || "Location TBC"}</div>
            <div className="fathom-mono" style={styles.cardSubtitle}>
              {dayLabel(item.date)} · {info.label}
            </div>
          </div>
        </div>
        <button
          style={styles.iconBtn}
          aria-label={`Edit planned dive at ${item.location}`}
          onClick={() => onEdit && onEdit(item)}
        >
          <Pencil size={15} color={COLORS.teal} />
        </button>
      </div>
    </div>
  );
}

function DivesTab({ dives, upcoming = [], onAddDive, onEditPlanned, onBackUpData, showNickname, onToggleNickname }) {
  const [expandedId, setExpandedId] = useState(null);
  const grouped = useMemo(() => groupByMonth(dives), [dives]);
  const upcomingSorted = useMemo(
    () => [...upcoming].sort((a, b) => a.date.localeCompare(b.date)),
    [upcoming]
  );

  return (
    <div style={styles.tabContent}>
      <PageHeaderWithProfile
        title="Dives"
        subtitle={`${dives.length} logged`}
        dives={dives}
        onBackUpData={onBackUpData}
        showNickname={showNickname}
        onToggleNickname={onToggleNickname}
      />

      <DiveCalendar dives={dives} upcoming={upcoming} />

      <button style={styles.addDiveTile} onClick={onAddDive}>
        <Plus size={20} color={COLORS.teal} />
        <span className="fathom-oswald" style={styles.addDiveText}>ADD DIVE</span>
      </button>

      <div style={{ marginTop: 22 }}>
        <div className="fathom-mono" style={styles.categoryLabel}>UPCOMING DIVES</div>
        {upcomingSorted.length === 0 ? (
          <div style={styles.panelCard}>
            <span className="fathom-body" style={{ color: COLORS.textMuted, fontSize: 13 }}>
              No upcoming dives planned.
            </span>
          </div>
        ) : (
          upcomingSorted.map((u) => <UpcomingDiveCard key={u.id} item={u} onEdit={onEditPlanned} />)
        )}
      </div>

      {grouped.map(([month, monthDives]) => (
        <div key={month} style={{ marginTop: 22 }}>
          <div className="fathom-mono" style={styles.categoryLabel}>{month}</div>
          {monthDives.map((dive) => (
            <DiveCard
              key={dive.id}
              dive={dive}
              expanded={expandedId === dive.id}
              onToggle={() =>
                setExpandedId(expandedId === dive.id ? null : dive.id)
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function DiveCard({ dive, expanded, onToggle }) {
  const info = typeInfo(dive.type);
  return (
    <div style={styles.card}>
      <button style={styles.cardHeader} onClick={onToggle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ ...styles.typeDot, background: info.color }} />
          <div style={{ textAlign: "left" }}>
            <div className="fathom-oswald" style={styles.cardTitle}>
              {dive.location}
            </div>
            <div className="fathom-mono" style={styles.cardSubtitle}>
              {dayLabel(dive.date)} · Dive #{dive.diveNumber}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "right" }}>
            <div className="fathom-mono" style={styles.cardStat}>
              {dive.bottomTime} mins | {dive.maxDepth}m
            </div>
            <div className="fathom-mono" style={styles.cardStatLabel}>TIME | MAX DEPTH</div>
          </div>
          <ChevronDown
            size={18}
            color={COLORS.textMuted}
            style={{
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          />
        </div>
      </button>

      {expanded && (
        <div style={styles.cardExpanded}>
          <div style={styles.detailGrid}>
            <Detail label="Dive Supervisor" value={dive.supervisor} />
            <Detail label="Dive Team" value={dive.team} />
            <Detail label="Set Number" value={dive.setNumber} />
            <Detail label="Type" value={info.label} dotColor={info.color} />
            <Detail label="Rig" value={dive.rig} dotColor={rigInfo(dive.rig).color} />
            <Detail label="Gas" value={dive.gas} />
            <Detail label="Water Temp" value={dive.waterTemp} />
            <Detail label="Visibility" value={dive.visibility} />
            <Detail label="Current" value={dive.current} />
            <Detail label="Sea State" value={dive.seaState} />
            <Detail label="Time In / Out" value={`${dive.timeIn} — ${dive.timeOut}`} />
            <Detail label="Bottom Time" value={`${dive.bottomTime} min`} />
            <Detail label="Deco Stops" value={dive.decoStops} />
          </div>
          <Detail label="Task" value={dive.task} full />
          {dive.notes && <Detail label="Notes" value={dive.notes} full />}
        </div>
      )}

      {dive.status === "pending" && (
        <div style={styles.pendingRow}>
          <Clock size={13} color={COLORS.amber} style={{ flexShrink: 0 }} />
          <span className="fathom-mono" style={styles.pendingText}>
            Pending Approval from Dive Supervisor...
          </span>
        </div>
      )}
    </div>
  );
}

function Detail({ label, value, full, dotColor }) {
  return (
    <div style={{ gridColumn: full ? "1 / -1" : "auto", marginBottom: 12 }}>
      <div className="fathom-mono" style={styles.detailLabel}>{label.toUpperCase()}</div>
      <div className="fathom-body" style={{ ...styles.detailValue, display: "flex", alignItems: "center", gap: 6 }}>
        {dotColor && <span style={{ ...styles.typeChipDot, background: dotColor }} />}
        {value || "—"}
      </div>
    </div>
  );
}

/* ============================================================
   ADD DIVE FORM
   ============================================================ */
/* ---------------- debug autofill (selecting "Other" as the dive purpose) ---------------- */
// Fills every field of the New Dive Log with plausible random values, for testing.
function generateDebugDive() {
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const between = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const pad = (n) => String(n).padStart(2, "0");

  const startMins = between(8, 14) * 60 + pick([0, 15, 30, 45]);
  const bottomTime = between(30, 65);
  const endMins = startMins + bottomTime;
  const maxDepth = between(8, 30);
  const now = new Date();

  return {
    date: isoDate(now.getFullYear(), now.getMonth(), now.getDate()),
    location: pick([
      "HMNB Devonport, Basin 3",
      "Portland Harbour",
      "Horsea Island",
      "Faslane, Gare Loch",
      "Loch Long",
    ]),
    setNumber: String(between(1, 6)),
    supervisor: pick(["PO Reeves", "Lt Hargreaves", "CPO S. Bardsley", "WO1 D. Pennington"]),
    team: pick(["LH Marsh, AB Coyle", "AB Coyle", "LH K. Fenwick, AB R. Doyle"]),
    rig: pick(RIG_TYPES).key,
    waterTemp: `${between(10, 18)}°C`,
    visibility: `${pick(["1.5", "2", "2.5", "3", "4"])}m`,
    current: pick(["None", "Slack", "Mild", "Moderate"]),
    seaState: String(between(0, 3)),
    timeIn: `${pad(Math.floor(startMins / 60))}:${pad(startMins % 60)}`,
    timeOut: `${pad(Math.floor(endMins / 60))}:${pad(endMins % 60)}`,
    bottomTime: String(bottomTime),
    maxDepth: String(maxDepth),
    decoStops: maxDepth >= 24 ? "3m / 3min" : "None required",
    gas: pick(["Air", "Nitrox 32"]),
    task: pick([
      "Jackstay search - area clearance",
      "Circular search refresher",
      "Hull inspection - routine husbandry dive",
      "Suspected ordnance response - datum investigation",
    ]),
    notes: pick([
      "Nil incidents.",
      "Good comms throughout, no issues.",
      "Reduced visibility, search completed as planned.",
    ]),
  };
}

/* ---------------- spoofed dive computer import (demo only) ---------------- */
// Only what a dive computer would actually record. Site, team, rig, task etc. stay manual.
function diveComputerData(source) {
  const d = new Date();
  d.setDate(d.getDate() - 1); // "last night's" dive
  const date = isoDate(d.getFullYear(), d.getMonth(), d.getDate());
  if (source === "Garmin") {
    return {
      date,
      timeIn: "09:12",
      timeOut: "09:58",
      bottomTime: "46",
      maxDepth: "21.4",
      waterTemp: "14°C",
      gas: "Nitrox 32",
      decoStops: "None required",
    };
  }
  return {
    date,
    timeIn: "13:05",
    timeOut: "13:49",
    bottomTime: "44",
    maxDepth: "18.7",
    waterTemp: "15°C",
    gas: "Air",
    decoStops: "None required",
  };
}

function AddDiveForm({ existingDives, prefill = null, onCancel, onSave, onSaveDraft }) {
  const nextDiveNumber = useMemo(() => {
    const highest = existingDives.reduce(
      (max, d) => Math.max(max, parseInt(d.diveNumber, 10) || 0),
      0
    );
    return String(highest + 1);
  }, [existingDives]);

  // Starts blank, or from everything a planned dive / saved draft already holds
  const [form, setForm] = useState(() => {
    const blank = {
      date: new Date().toISOString().slice(0, 10),
      location: "",
      setNumber: "",
      type: "training",
      supervisor: "",
      team: "",
      rig: "SABA",
      waterTemp: "",
      visibility: "",
      current: "",
      seaState: "",
      timeIn: "",
      timeOut: "",
      bottomTime: "",
      maxDepth: "",
      decoStops: "",
      gas: "Air",
      task: "",
      notes: "",
    };
    if (!prefill) return blank;
    const merged = { ...blank };
    for (const key of Object.keys(blank)) {
      if (prefill[key] !== undefined && prefill[key] !== null) merged[key] = String(prefill[key]);
    }
    return merged;
  });

  // Submit is always tappable; if anything is empty we jump to the top and show a warning
  const formTopRef = useRef(null);
  const [showWarning, setShowWarning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const allFilled = Object.values(form).every((v) => String(v).trim() !== "");

  const handleSubmit = () => {
    if (!allFilled) {
      setShowWarning(true);
      const scroller = formTopRef.current && formTopRef.current.closest(".fathom-scroll");
      if (scroller) scroller.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSubmitting(true);
  };

  // Brief "submitting" popup, then the form closes and the root shows the confirmation
  useEffect(() => {
    if (!submitting) return undefined;
    const timer = setTimeout(() => {
      onSave({
        ...form,
        diveNumber: nextDiveNumber,
        bottomTime: Number(form.bottomTime) || 0,
        maxDepth: Number(form.maxDepth) || 0,
      });
    }, 1800);
    return () => clearTimeout(timer);
  }, [submitting]); // eslint-disable-line react-hooks/exhaustive-deps

  // Dive computer import (spoofed): menu -> loading screen -> back here with data filled in
  const [importStep, setImportStep] = useState(null); // null | "menu" | "loading"
  const [importSource, setImportSource] = useState(null);
  const [loadingPhase, setLoadingPhase] = useState(0);
  const [importedFrom, setImportedFrom] = useState(null);

  useEffect(() => {
    if (importStep !== "loading") return undefined;
    const phaseTimer = setTimeout(() => setLoadingPhase(1), 1300);
    const doneTimer = setTimeout(() => {
      setForm((f) => ({ ...f, ...diveComputerData(importSource) }));
      setImportedFrom(importSource);
      setLoadingPhase(0);
      setImportStep(null);
    }, 2800);
    return () => {
      clearTimeout(phaseTimer);
      clearTimeout(doneTimer);
    };
  }, [importStep, importSource]);

  const startImport = (source) => {
    setImportSource(source);
    setLoadingPhase(0);
    setImportStep("loading");
  };

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  if (importStep === "loading") {
    return (
      <div style={styles.importLoading}>
        <div style={styles.importSpinnerWrap}>
          <div style={styles.importSpinner} />
          <Watch size={24} color={COLORS.teal} />
        </div>
        <div className="fathom-oswald" style={styles.importLoadingTitle}>
          {loadingPhase === 0
            ? `CONNECTING TO ${importSource.toUpperCase()}...`
            : "IMPORTING DIVE DATA..."}
        </div>
        <div className="fathom-mono" style={styles.importLoadingSub}>
          {loadingPhase === 0 ? "Looking for your dive computer" : "Reading your latest dive"}
        </div>
      </div>
    );
  }

  return (
    <div ref={formTopRef} style={styles.tabContent}>
      <div style={{ ...styles.formHeader, display: "grid", gridTemplateColumns: "1fr auto 1fr" }}>
        <button onClick={onCancel} style={{ ...styles.iconBtn, justifySelf: "start" }}>
          <X size={20} color={COLORS.textMuted} />
        </button>
        <span className="fathom-oswald" style={styles.formHeaderTitle}>NEW DIVE LOG</span>
        <button style={styles.importBtn} onClick={() => setImportStep("menu")}>
          <Watch size={14} color={COLORS.teal} />
          <span className="fathom-mono" style={styles.importBtnText}>IMPORT</span>
        </button>
      </div>

      {submitting && (
        <div style={styles.modalOverlay}>
          <div style={styles.importMenuCard}>
            <div style={{ ...styles.importSpinnerWrap, margin: "0 auto 20px" }}>
              <div style={styles.importSpinner} />
              <Send size={22} color={COLORS.teal} />
            </div>
            <div className="fathom-oswald" style={styles.importMenuTitle}>SUBMITTING DIVE LOG...</div>
            <div className="fathom-mono" style={{ ...styles.importMenuSubtitle, marginBottom: 4 }}>
              Sending to {form.supervisor}
            </div>
          </div>
        </div>
      )}

      {showWarning && !allFilled && (
        <div style={styles.formWarning} role="alert">
          <AlertCircle size={16} color={COLORS.red} style={{ flexShrink: 0 }} />
          <span className="fathom-body" style={styles.formWarningText}>
            Please fill in all fields to log a dive
          </span>
        </div>
      )}

      {prefill && (
        <div style={styles.importBanner}>
          <Pencil size={16} color={COLORS.teal} style={{ flexShrink: 0 }} />
          <div>
            <div className="fathom-mono" style={styles.importBannerTitle}>FROM PLANNED DIVE</div>
            <div className="fathom-body" style={styles.importBannerText}>
              Carried over from your plan. Submitting logs this dive and removes it from Upcoming; Save Draft keeps it there.
            </div>
          </div>
        </div>
      )}

      {importedFrom && (
        <div style={styles.importBanner}>
          <Watch size={16} color={COLORS.teal} style={{ flexShrink: 0 }} />
          <div>
            <div className="fathom-mono" style={styles.importBannerTitle}>
              IMPORTED FROM {importedFrom.toUpperCase()}
            </div>
            <div className="fathom-body" style={styles.importBannerText}>
              Dive computer data has been filled in. Add the remaining details below.
            </div>
          </div>
        </div>
      )}

      {importStep === "menu" && (
        <div style={styles.modalOverlay} onClick={() => setImportStep(null)}>
          <div style={styles.importMenuCard} onClick={(e) => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={() => setImportStep(null)}>
              <X size={18} color={COLORS.textMuted} />
            </button>
            <div className="fathom-oswald" style={styles.importMenuTitle}>IMPORT FROM DIVE COMPUTER</div>
            <div className="fathom-mono" style={styles.importMenuSubtitle}>Choose your device</div>
            <button style={styles.importDeviceBtn} onClick={() => startImport("Garmin")}>
              <span className="fathom-oswald" style={styles.importDeviceBtnText}>GARMIN</span>
            </button>
            <button style={styles.importDeviceBtn} onClick={() => startImport("Suunto")}>
              <span className="fathom-oswald" style={styles.importDeviceBtnText}>SUUNTO</span>
            </button>
          </div>
        </div>
      )}

      <Field label="Date" type="date" value={form.date} onChange={set("date")} />
      <Field label="Location" value={form.location} onChange={set("location")} placeholder="Dive site name" />
      <Field label="Set Number" value={form.setNumber} onChange={set("setNumber")} placeholder="e.g. 4" />

      <FieldLabel label="Purpose of Dive" />
      <div style={styles.typeRow}>
        {DIVE_TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => {
              if (t.key === "other") {
                const generated = generateDebugDive();
                setForm((f) => ({ ...f, ...generated, type: "other" }));
              } else {
                setForm((f) => ({ ...f, type: t.key }));
              }
            }}
            style={{
              ...styles.typeChip,
              borderColor: form.type === t.key ? t.color : COLORS.divider,
              background: form.type === t.key ? COLORS.tealDark : COLORS.card,
              color: form.type === t.key ? t.color : COLORS.textMuted,
            }}
          >
            <span style={{ ...styles.typeChipDot, background: t.color }} />
            {t.label}
          </button>
        ))}
      </div>

      <Field label="Dive Supervisor" value={form.supervisor} onChange={set("supervisor")} placeholder="Name / Rate" />
      <Field label="Dive Team" value={form.team} onChange={set("team")} placeholder="Names / rates" />

      <FieldLabel label="Rig" />
      <div style={{ ...styles.typeRow, marginBottom: 16 }}>
        {RIG_TYPES.map((r) => (
          <button
            key={r.key}
            onClick={() => setForm((f) => ({ ...f, rig: r.key }))}
            style={{
              ...styles.typeChip,
              borderColor: form.rig === r.key ? r.color : COLORS.divider,
              background: form.rig === r.key ? COLORS.tealDark : COLORS.card,
              color: form.rig === r.key ? r.color : COLORS.textMuted,
            }}
          >
            {r.key}
          </button>
        ))}
      </div>

      <Field label="Breathing Gas" value={form.gas} onChange={set("gas")} />

      <div style={styles.fieldRow}>
        <Field label="Water Temp" value={form.waterTemp} onChange={set("waterTemp")} placeholder="°C" half />
        <Field label="Visibility" value={form.visibility} onChange={set("visibility")} placeholder="m" half />
      </div>
      <div style={styles.fieldRow}>
        <Field label="Current" value={form.current} onChange={set("current")} half />
        <Field label="Sea State" value={form.seaState} onChange={set("seaState")} half />
      </div>
      <div style={styles.fieldRow}>
        <Field label="Time In" type="time" value={form.timeIn} onChange={set("timeIn")} half />
        <Field label="Time Out" type="time" value={form.timeOut} onChange={set("timeOut")} half />
      </div>
      <div style={styles.fieldRow}>
        <Field label="Bottom Time (min)" type="number" value={form.bottomTime} onChange={set("bottomTime")} half />
        <Field label="Max Depth (m)" type="number" value={form.maxDepth} onChange={set("maxDepth")} half />
      </div>
      <Field label="Decompression Stops" value={form.decoStops} onChange={set("decoStops")} placeholder="e.g. 3m / 3min, or None required" />
      <Field label="Task Performed" value={form.task} onChange={set("task")} textarea />
      <Field label="Notes / Incidents" value={form.notes} onChange={set("notes")} textarea />

      <button onClick={handleSubmit} style={styles.saveBtn}>
        <span className="fathom-oswald" style={styles.saveBtnText}>SUBMIT DIVE LOG</span>
      </button>

      <button onClick={() => onSaveDraft({ ...form })} style={styles.draftBtn}>
        <span className="fathom-oswald" style={styles.draftBtnText}>SAVE DRAFT</span>
      </button>
    </div>
  );
}

function FieldLabel({ label }) {
  return <div className="fathom-mono" style={styles.fieldLabel}>{label.toUpperCase()}</div>;
}

function Field({ label, value, onChange, type = "text", placeholder, half, textarea }) {
  return (
    <div style={{ flex: half ? 1 : "auto", marginBottom: 16 }}>
      <FieldLabel label={label} />
      {textarea ? (
        <textarea
          className="fathom-body"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          rows={3}
          style={styles.input}
        />
      ) : (
        <input
          className="fathom-body"
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={styles.input}
        />
      )}
    </div>
  );
}

/* ============================================================
   STATS TAB
   ============================================================ */
function StatsTab({ dives, onBackUpData, showNickname, onToggleNickname }) {
  // Shared Diver ID login across SLATE/FATHOM still to be wired up — using the real name for now

  const stats = useMemo(() => {
    const now = new Date();
    const totalMins = dives.reduce((s, d) => s + d.bottomTime, 0);
    const thisMonthMins = dives
      .filter((d) => {
        const dt = new Date(d.date + "T00:00:00");
        return dt.getMonth() === now.getMonth() && dt.getFullYear() === now.getFullYear();
      })
      .reduce((s, d) => s + d.bottomTime, 0);
    const deepest = dives.reduce((max, d) => Math.max(max, d.maxDepth), 0);
    const avgMins = dives.length ? totalMins / dives.length : 0;

    const byType = {};
    for (const t of DIVE_TYPES) byType[t.key] = 0;
    for (const d of dives) byType[d.type] = (byType[d.type] || 0) + 1;

    const byRig = {};
    for (const r of RIG_TYPES) byRig[r.key] = 0;
    for (const d of dives) byRig[d.rig] = (byRig[d.rig] || 0) + 1;

    // last 6 months dive counts
    const monthCounts = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const count = dives.filter((dv) => {
        const dt = new Date(dv.date + "T00:00:00");
        return dt.getMonth() === d.getMonth() && dt.getFullYear() === d.getFullYear();
      }).length;
      monthCounts.push({ label: MONTH_NAMES[d.getMonth()].slice(0, 3), count });
    }

    return { totalMins, thisMonthMins, deepest, avgMins, byType, byRig, monthCounts, total: dives.length };
  }, [dives]);

  const maxMonthCount = Math.max(1, ...stats.monthCounts.map((m) => m.count));
  const maxTypeCount = Math.max(1, ...Object.values(stats.byType));

  return (
    <div style={styles.tabContent}>
      <PageHeaderWithProfile
        title="Stats"
        subtitle="Dive record summary"
        dives={dives}
        onBackUpData={onBackUpData}
        showNickname={showNickname}
        onToggleNickname={onToggleNickname}
      />

      <div style={styles.statGrid}>
        <StatTile label="Total Dive Time" value={fmtHoursMins(stats.totalMins)} />
        <StatTile label="This Month" value={fmtHoursMins(stats.thisMonthMins)} />
        <StatTile label="Total Dives" value={String(stats.total)} />
        <StatTile label="Deepest Dive" value={`${stats.deepest}m`} />
        <StatTile label="Avg Duration" value={fmtHoursMins(stats.avgMins)} />
        <StatTile label="Avg Depth" value={`${dives.length ? Math.round(dives.reduce((s,d)=>s+d.maxDepth,0)/dives.length) : 0}m`} />
      </div>

      <div className="fathom-mono" style={styles.categoryLabel}>DIVE TYPE BREAKDOWN</div>
      <div style={styles.panelCard}>
        {DIVE_TYPES.map((t) => {
          const count = stats.byType[t.key] || 0;
          const pct = maxTypeCount ? (count / maxTypeCount) * 100 : 0;
          return (
            <div key={t.key} style={{ marginBottom: 14 }}>
              <div style={styles.barRow}>
                <span className="fathom-body" style={styles.barLabel}>{t.label}</span>
                <span className="fathom-mono" style={styles.barCount}>{count}</span>
              </div>
              <div style={styles.barTrack}>
                <div style={{ ...styles.barFill, width: `${pct}%`, background: t.color }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="fathom-mono" style={styles.categoryLabel}>DIVES PER MONTH</div>
      <div style={styles.panelCard}>
        <div style={styles.histogram}>
          {stats.monthCounts.map((m) => (
            <div key={m.label} style={styles.histoCol}>
              <div style={styles.histoBarTrack}>
                <div
                  style={{
                    ...styles.histoBarFill,
                    height: `${(m.count / maxMonthCount) * 70 + (m.count ? 6 : 0)}px`,
                  }}
                />
              </div>
              <span className="fathom-mono" style={styles.histoLabel}>{m.label}</span>
              <span className="fathom-mono" style={styles.histoCount}>{m.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="fathom-mono" style={styles.categoryLabel}>RIG USAGE</div>
      <div style={{ ...styles.panelCard, display: "flex", alignItems: "center", gap: 18 }}>
        <PieChart
          data={RIG_TYPES.map((r) => ({ key: r.key, color: r.color, value: stats.byRig[r.key] || 0 }))}
        />
        <div style={{ flex: 1 }}>
          {RIG_TYPES.map((r) => {
            const count = stats.byRig[r.key] || 0;
            const pct = stats.total ? Math.round((count / stats.total) * 100) : 0;
            return (
              <div key={r.key} style={styles.pieLegendRow}>
                <span style={{ ...styles.typeChipDot, background: r.color }} />
                <span className="fathom-body" style={styles.pieLegendLabel}>{r.key}</span>
                <span className="fathom-mono" style={styles.pieLegendValue}>
                  {count} · {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PieChart({ data, size = 110 }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const radius = size / 2;
  const cx = radius;
  const cy = radius;

  if (!total) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        <circle cx={cx} cy={cy} r={radius - 2} fill="none" stroke={COLORS.divider} strokeWidth="2" />
      </svg>
    );
  }

  let angle = -90; // start at 12 o'clock
  const slices = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const sweep = (d.value / total) * 360;
      const startAngle = angle;
      const endAngle = angle + sweep;
      angle = endAngle;

      // Full circle edge case: draw two half-arcs
      if (sweep >= 359.999) {
        return (
          <circle key={d.key} cx={cx} cy={cy} r={radius - 2} fill={d.color} />
        );
      }

      const toXY = (deg) => {
        const rad = (deg * Math.PI) / 180;
        return [cx + (radius - 2) * Math.cos(rad), cy + (radius - 2) * Math.sin(rad)];
      };
      const [x1, y1] = toXY(startAngle);
      const [x2, y2] = toXY(endAngle);
      const largeArc = sweep > 180 ? 1 : 0;
      const path = `M ${cx} ${cy} L ${x1} ${y1} A ${radius - 2} ${radius - 2} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      return <path key={d.key} d={path} fill={d.color} />;
    });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      {slices}
      <circle cx={cx} cy={cy} r={radius * 0.42} fill={COLORS.card} />
    </svg>
  );
}

function StatTile({ label, value }) {
  return (
    <div style={styles.statTile}>
      <div className="fathom-mono" style={styles.statValue}>{value}</div>
      <div className="fathom-mono" style={styles.statLabel}>{label.toUpperCase()}</div>
    </div>
  );
}

function PageHeaderWithProfile({ title, subtitle, dives, onBackUpData, showNickname, onToggleNickname }) {
  const [showProfile, setShowProfile] = useState(false);
  const totalMins = dives.reduce((s, d) => s + d.bottomTime, 0);

  return (
    <>
      <div style={styles.statsHeaderRow}>
        <div>
          <div className="fathom-oswald" style={styles.pageTitle}>{title.toUpperCase()}</div>
          <div className="fathom-mono" style={styles.pageSubtitle}>{subtitle}</div>
        </div>
        <button style={styles.profileBtn} onClick={() => setShowProfile(true)}>
          <div style={styles.profileIconWrap}>
            <span className="fathom-mono" style={styles.rankBadgeText}>{CURRENT_USER.rank}</span>
          </div>
          <span className="fathom-mono" style={styles.profileIdLabel}>{CURRENT_USER_SHORT.toUpperCase()}</span>
        </button>
      </div>

      {showProfile && (
        <ProfileModal
          rank={CURRENT_USER.rank}
          surname={CURRENT_USER.surname}
          nickname={CURRENT_USER.nickname}
          totalDives={dives.length}
          totalTime={fmtHoursMins(totalMins)}
          onClose={() => setShowProfile(false)}
          onBackUpData={onBackUpData}
          showNickname={showNickname}
          onToggleNickname={onToggleNickname}
        />
      )}
    </>
  );
}

function ProfileModal({
  rank,
  surname,
  nickname,
  totalDives,
  totalTime,
  onClose,
  onBackUpData,
  showNickname,
  onToggleNickname,
}) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        <button style={styles.modalClose} onClick={onClose}>
          <X size={18} color={COLORS.textMuted} />
        </button>
        <div style={styles.modalIconWrap}>
          <span className="fathom-mono" style={styles.rankBadgeTextLarge}>{rank}</span>
        </div>
        <div className="fathom-oswald" style={styles.modalDiverId}>
          {rank} {surname}
          {showNickname && <span style={styles.nicknameText}> '{nickname}'</span>}
        </div>

        <label style={styles.nicknameCheckboxRow}>
          <input
            type="checkbox"
            checked={showNickname}
            onChange={(e) => onToggleNickname(e.target.checked)}
            style={styles.nicknameCheckbox}
          />
          <span className="fathom-mono" style={styles.nicknameCheckboxLabel}>DISPLAY NICKNAME</span>
        </label>

        <div style={styles.modalStatsRow}>
          <div style={styles.modalStat}>
            <div className="fathom-mono" style={styles.modalStatValue}>{totalDives}</div>
            <div className="fathom-mono" style={styles.modalStatLabel}>DIVES LOGGED</div>
          </div>
          <div style={styles.modalStat}>
            <div className="fathom-mono" style={styles.modalStatValue}>{totalTime}</div>
            <div className="fathom-mono" style={styles.modalStatLabel}>TIME UNDERWATER</div>
          </div>
        </div>

        <div style={styles.modalDivider} />

        <button
          style={styles.backupBtn}
          onClick={() => {
            onBackUpData();
            onClose();
          }}
        >
          <UploadCloud size={16} color={COLORS.teal} strokeWidth={2} />
          <span className="fathom-mono" style={styles.backupBtnText}>BACK UP DATA</span>
        </button>

        <button style={styles.logoutBtn}>
          <LogOut size={16} color={COLORS.red} strokeWidth={2} />
          <span className="fathom-mono" style={styles.logoutBtnText}>LOG OUT</span>
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   QUALIFICATIONS TAB
   ============================================================ */
function SectionTitle({ children, first }) {
  return (
    <div style={{ ...styles.sectionTitleRow, marginTop: first ? 4 : 30 }}>
      <div style={styles.sectionTitleBar} />
      <span className="fathom-oswald" style={styles.sectionTitleText}>{children}</span>
    </div>
  );
}

function QualificationsTab({ quals, medical, dives, onAddQual, onBackUpData, showNickname, onToggleNickname }) {
  const [expandedId, setExpandedId] = useState(null);

  const { expired, expiringSoon, upToDate } = useMemo(() => {
    const expired = quals.filter((q) => qualStatus(q) === "expired");
    const expiringSoon = quals.filter((q) => qualStatus(q) === "expiring");
    const subOrder = { current: 0, noExpiry: 1 };
    const upToDate = quals
      .filter((q) => qualStatus(q) === "current" || qualStatus(q) === "noExpiry")
      .sort((a, b) => subOrder[qualStatus(a)] - subOrder[qualStatus(b)]);
    return { expired, expiringSoon, upToDate };
  }, [quals]);

  return (
    <div style={styles.tabContent}>
      <PageHeaderWithProfile
        title="Records"
        subtitle={`${medical.length + quals.length} on record`}
        dives={dives}
        onBackUpData={onBackUpData}
        showNickname={showNickname}
        onToggleNickname={onToggleNickname}
      />

      <SectionTitle first>MEDICAL</SectionTitle>
      {medical.map((item) => (
        <MedicalCard
          key={item.id}
          item={item}
          expanded={expandedId === item.id}
          onToggle={() => setExpandedId(expandedId === item.id ? null : item.id)}
        />
      ))}

      <SectionTitle>QUALIFICATIONS</SectionTitle>
      <button style={styles.addDiveTile} onClick={onAddQual}>
        <Plus size={20} color={COLORS.teal} />
        <span className="fathom-oswald" style={styles.addDiveText}>ADD QUALIFICATION</span>
      </button>

      {expired.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div className="fathom-mono" style={{ ...styles.categoryLabel, color: COLORS.red }}>
            EXPIRED
          </div>
          {expired.map((qual) => (
            <QualCard
              key={qual.id}
              qual={qual}
              expanded={expandedId === qual.id}
              onToggle={() => setExpandedId(expandedId === qual.id ? null : qual.id)}
            />
          ))}
        </div>
      )}

      {expiringSoon.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div className="fathom-mono" style={{ ...styles.categoryLabel, color: COLORS.amber }}>
            EXPIRING SOON
          </div>
          {expiringSoon.map((qual) => (
            <QualCard
              key={qual.id}
              qual={qual}
              expanded={expandedId === qual.id}
              onToggle={() => setExpandedId(expandedId === qual.id ? null : qual.id)}
            />
          ))}
        </div>
      )}

      <div style={{ marginTop: 22 }}>
        <div className="fathom-mono" style={{ ...styles.categoryLabel, color: COLORS.teal }}>
          UP TO DATE
        </div>
        {upToDate.map((qual) => (
          <QualCard
            key={qual.id}
            qual={qual}
            expanded={expandedId === qual.id}
            onToggle={() => setExpandedId(expandedId === qual.id ? null : qual.id)}
          />
        ))}
      </div>
    </div>
  );
}

function SubmitUpdateModal({ kind, record, onClose }) {
  const isMedical = kind === "medical";

  // Pre-filled with the record's current details so only what has changed needs editing
  const [form, setForm] = useState(() =>
    isMedical
      ? {
          lastDate: record.lastDate || "",
          expiryDate: record.expiryDate || "",
          location: record.location || "",
          signedOffBy: record.signedOffBy || "",
        }
      : {
          authority: record.authority || "",
          dateAwarded: record.dateAwarded || "",
          expiryDate: record.expiryDate || "",
          certRef: record.certRef || "",
          notes: record.notes || "",
        }
  );
  const [attachedImage, setAttachedImage] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setAttachedImage({ name: file.name, src: reader.result });
    reader.readAsDataURL(file);
  };

  const canSubmit = isMedical
    ? form.lastDate && form.expiryDate
    : form.authority && form.dateAwarded;

  return (
    <div style={styles.modalOverlay} onClick={submitted ? onClose : undefined}>
      <div style={styles.updateModalCard} onClick={(e) => e.stopPropagation()}>
        {submitted ? (
          <div style={styles.submittedWrap}>
            <div style={styles.submittedIcon}>
              <Check size={26} color={COLORS.green} strokeWidth={2.5} />
            </div>
            <div className="fathom-oswald" style={styles.submittedTitle}>UPDATE SUBMITTED</div>
            <div className="fathom-body" style={styles.submittedText}>
              Your {record.name} update has been sent to your supervising officer for review.
            </div>
            <button style={styles.submittedCloseBtn} onClick={onClose}>
              <span className="fathom-oswald" style={styles.submittedCloseText}>CLOSE</span>
            </button>
          </div>
        ) : (
          <>
            <div style={styles.formHeader}>
              <button onClick={onClose} style={styles.iconBtn}>
                <X size={20} color={COLORS.textMuted} />
              </button>
              <div style={{ textAlign: "center" }}>
                <div className="fathom-oswald" style={styles.formHeaderTitle}>SUBMIT UPDATE</div>
                <div className="fathom-mono" style={styles.updateModalSubtitle}>{record.name}</div>
              </div>
              <div style={{ width: 32 }} />
            </div>

            {isMedical ? (
              <>
                <div style={styles.fieldRow}>
                  <Field label={record.lastDateLabel} type="date" value={form.lastDate} onChange={set("lastDate")} half />
                  <Field label="Expiry Date" type="date" value={form.expiryDate} onChange={set("expiryDate")} half />
                </div>
                {"location" in record && (
                  <Field label="Location" value={form.location} onChange={set("location")} placeholder="e.g. HMS Collingwood Dental" />
                )}
                {"signedOffBy" in record && (
                  <Field label="Signed Off By" value={form.signedOffBy} onChange={set("signedOffBy")} placeholder="Name / Rate" />
                )}
                {"attachment" in record && (
                  <div style={{ marginBottom: 16 }}>
                    <FieldLabel label="Attached Certificate" />
                    <label style={styles.attachBtn}>
                      <Paperclip size={14} color={COLORS.teal} />
                      <span className="fathom-mono" style={styles.attachBtnText}>
                        {attachedImage ? "REPLACE IMAGE" : "ATTACH IMAGE"}
                      </span>
                      <input type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
                    </label>
                    {attachedImage && (
                      <>
                        <img src={attachedImage.src} alt="Attached certificate preview" style={styles.attachPreview} />
                        <div className="fathom-mono" style={styles.attachFileName}>{attachedImage.name}</div>
                      </>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <Field label="Awarding Authority" value={form.authority} onChange={set("authority")} />
                <div style={styles.fieldRow}>
                  <Field label="Date Awarded" type="date" value={form.dateAwarded} onChange={set("dateAwarded")} half />
                  <Field label="Expiry Date" type="date" value={form.expiryDate} onChange={set("expiryDate")} half />
                </div>
                <Field label="Certificate / Reference No." value={form.certRef} onChange={set("certRef")} />
                <Field label="Notes" value={form.notes} onChange={set("notes")} textarea />
              </>
            )}

            <button
              disabled={!canSubmit}
              onClick={() => setSubmitted(true)}
              style={{
                ...styles.saveBtn,
                width: "100%",
                opacity: canSubmit ? 1 : 0.4,
                cursor: canSubmit ? "pointer" : "not-allowed",
              }}
            >
              <span className="fathom-oswald" style={styles.saveBtnText}>SUBMIT UPDATE</span>
            </button>
            <div className="fathom-body" style={styles.submitNote}>
              Upon submission, this will be submitted to your supervising officer for review.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DiveSubmittedModal({ supervisor, onClose }) {
  return (
    <div style={styles.modalOverlay}>
      <div style={styles.importMenuCard}>
        <div style={{ ...styles.submittedIcon, margin: "0 auto 16px" }}>
          <Check size={26} color={COLORS.green} strokeWidth={2.5} />
        </div>
        <div className="fathom-body" style={styles.submittedMessage}>
          Your Dive Log has been submitted to{" "}
          <span style={styles.submittedMessageName}>{supervisor}</span> for sign off.
        </div>
        <button style={{ ...styles.saveBtn, width: "100%", marginTop: 0 }} onClick={onClose}>
          <span className="fathom-oswald" style={styles.saveBtnText}>OK</span>
        </button>
      </div>
    </div>
  );
}

function ImageViewer({ src, title, onClose }) {
  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.imageViewerCard} onClick={(e) => e.stopPropagation()}>
        <button style={styles.modalClose} onClick={onClose}>
          <X size={18} color={COLORS.textMuted} />
        </button>
        <div className="fathom-mono" style={styles.imageViewerTitle}>{title.toUpperCase()}</div>
        <img src={src} alt={title} style={styles.imageViewerImg} />
      </div>
    </div>
  );
}

function MedicalCard({ item, expanded, onToggle }) {
  const [viewingImage, setViewingImage] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const status = QUAL_STATUS[qualStatus(item)];

  return (
    <>
      <div style={styles.card}>
        <button style={styles.cardHeader} onClick={onToggle}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ ...styles.typeDot, background: status.color }} />
            <div style={{ textAlign: "left" }}>
              <div className="fathom-oswald" style={styles.cardTitle}>{item.name}</div>
              <div className="fathom-mono" style={styles.cardSubtitle}>{item.interval}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ textAlign: "right" }}>
              <div className="fathom-mono" style={{ ...styles.cardStat, color: status.color }}>
                {status.label}
              </div>
              <div className="fathom-mono" style={styles.cardStatLabel}>EXP {item.expiryDate}</div>
            </div>
            <ChevronDown
              size={18}
              color={COLORS.textMuted}
              style={{
                transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.2s ease",
              }}
            />
          </div>
        </button>

        {expanded && (
          <div style={styles.cardExpanded}>
            <div style={styles.detailGrid}>
              <Detail label="Status" value={status.label} dotColor={status.color} />
              <Detail label="Renewal" value={item.interval} />
              <Detail label={item.lastDateLabel} value={item.lastDate} />
              <Detail label="Expiry Date" value={item.expiryDate} />
            </div>
            {item.location && <Detail label="Location" value={item.location} full />}
            {item.signedOffBy && <Detail label="Signed Off By" value={item.signedOffBy} full />}
            {item.attachment && (
              <div style={{ marginBottom: 4 }}>
                <div className="fathom-mono" style={styles.detailLabel}>ATTACHED CERTIFICATE</div>
                <button style={styles.attachmentThumbBtn} onClick={() => setViewingImage(true)}>
                  <img
                    src={item.attachment.src}
                    alt={item.attachment.name}
                    style={styles.attachmentThumb}
                  />
                </button>
                <div className="fathom-mono" style={styles.attachmentCaption}>
                  {item.attachment.name} · TAP TO ENLARGE
                </div>
              </div>
            )}

            <button style={styles.submitUpdateBtn} onClick={() => setSubmitting(true)}>
              <Send size={14} color={COLORS.teal} />
              <span className="fathom-mono" style={styles.submitUpdateBtnText}>SUBMIT UPDATE</span>
            </button>
          </div>
        )}
      </div>

      {viewingImage && item.attachment && (
        <ImageViewer
          src={item.attachment.src}
          title={item.attachment.name}
          onClose={() => setViewingImage(false)}
        />
      )}

      {submitting && (
        <SubmitUpdateModal kind="medical" record={item} onClose={() => setSubmitting(false)} />
      )}
    </>
  );
}

function QualCard({ qual, expanded, onToggle }) {
  const [submitting, setSubmitting] = useState(false);
  const statusKey = qualStatus(qual);
  const status = QUAL_STATUS[statusKey];

  return (
    <>
    <div style={styles.card}>
      <button style={styles.cardHeader} onClick={onToggle}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ ...styles.typeDot, background: status.color }} />
          <div style={{ textAlign: "left" }}>
            <div className="fathom-oswald" style={styles.cardTitle}>{qual.name}</div>
            <div className="fathom-mono" style={styles.cardSubtitle}>{qual.authority}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ textAlign: "right" }}>
            <div className="fathom-mono" style={{ ...styles.cardStat, color: status.color }}>
              {status.label}
            </div>
            <div className="fathom-mono" style={styles.cardStatLabel}>
              {qual.expiryDate ? `EXP ${qual.expiryDate}` : "STATUS"}
            </div>
          </div>
          <ChevronDown
            size={18}
            color={COLORS.textMuted}
            style={{
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          />
        </div>
      </button>

      {expanded && (
        <div style={styles.cardExpanded}>
          <div style={styles.detailGrid}>
            <Detail label="Status" value={status.label} dotColor={status.color} />
            <Detail label="Awarding Authority" value={qual.authority} />
            <Detail label="Date Awarded" value={qual.dateAwarded} />
            <Detail label="Expiry Date" value={qual.expiryDate || "No expiry"} />
            <Detail label="Certificate Ref" value={qual.certRef} />
          </div>
          {qual.notes && <Detail label="Notes" value={qual.notes} full />}

          <button style={styles.submitUpdateBtn} onClick={() => setSubmitting(true)}>
            <Send size={14} color={COLORS.teal} />
            <span className="fathom-mono" style={styles.submitUpdateBtnText}>SUBMIT UPDATE</span>
          </button>
        </div>
      )}
    </div>

    {submitting && (
      <SubmitUpdateModal kind="qualification" record={qual} onClose={() => setSubmitting(false)} />
    )}
    </>
  );
}

/* ============================================================
   ADD QUALIFICATION FORM
   ============================================================ */
function AddQualificationForm({ onCancel, onSave }) {
  const [form, setForm] = useState({
    name: "",
    authority: "",
    dateAwarded: new Date().toISOString().slice(0, 10),
    expiryDate: "",
    certRef: "",
    notes: "",
  });

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const canSave = form.name && form.authority && form.dateAwarded;

  return (
    <div style={styles.tabContent}>
      <div style={styles.formHeader}>
        <button onClick={onCancel} style={styles.iconBtn}>
          <X size={20} color={COLORS.textMuted} />
        </button>
        <span className="fathom-oswald" style={styles.formHeaderTitle}>NEW QUALIFICATION</span>
        <div style={{ width: 32 }} />
      </div>

      <Field label="Qualification Name" value={form.name} onChange={set("name")} placeholder="e.g. Mine Clearance Diver Grade 2" />
      <Field label="Awarding Authority" value={form.authority} onChange={set("authority")} placeholder="e.g. Defence Diving School" />
      <div style={styles.fieldRow}>
        <Field label="Date Awarded" type="date" value={form.dateAwarded} onChange={set("dateAwarded")} half />
        <Field label="Expiry Date" type="date" value={form.expiryDate} onChange={set("expiryDate")} half />
      </div>
      <Field label="Certificate / Reference No." value={form.certRef} onChange={set("certRef")} placeholder="e.g. FDS/STD/0472" />
      <Field label="Notes" value={form.notes} onChange={set("notes")} textarea />

      <div className="fathom-body" style={{ color: COLORS.textDim, fontSize: 11.5, marginBottom: 16, lineHeight: 1.5 }}>
        Leave Expiry Date blank for qualifications that don't lapse.
      </div>

      <button
        disabled={!canSave}
        onClick={() => onSave(form)}
        style={{
          ...styles.saveBtn,
          opacity: canSave ? 1 : 0.4,
          cursor: canSave ? "pointer" : "not-allowed",
        }}
      >
        <span className="fathom-oswald" style={styles.saveBtnText}>SAVE QUALIFICATION</span>
      </button>
    </div>
  );
}

/* ============================================================
   SHARED
   ============================================================ */
function Header({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div className="fathom-oswald" style={styles.pageTitle}>{title.toUpperCase()}</div>
      <div className="fathom-mono" style={styles.pageSubtitle}>{subtitle}</div>
    </div>
  );
}

function BubblesIcon({ size = 22, color = COLORS.teal }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="15.5" r="6" />
      <circle cx="18" cy="8" r="3.5" />
      <circle cx="12.5" cy="3" r="1.8" />
    </svg>
  );
}

const SYNC_STATUS_CONFIG = {
  upToDate: {
    color: COLORS.green,
    Icon: Check,
    label: "up to date",
    title: "UP TO DATE",
    description: "All of your data has been backed up to the cloud.",
  },
  syncing: {
    color: COLORS.amber,
    Icon: RefreshCw,
    label: "syncing",
    title: "SYNCING",
    description: "Your latest data is being backed up to the cloud. This will only take a moment.",
  },
  outdated: {
    color: COLORS.red,
    Icon: AlertCircle,
    label: "out of date",
    title: "OUT OF DATE",
    description:
      "Some of your data hasn't been backed up to the cloud yet. Tap Back Up Data to upload it.",
  },
};

// `size` is the badge's height; the cloud is 1.5x as wide as it is tall.
function SyncBadge({ status, size = 15 }) {
  const { color, Icon } = SYNC_STATUS_CONFIG[status];
  return (
    <div style={{ position: "relative", width: size * 1.5, height: size, flexShrink: 0 }}>
      <svg
        width={size * 1.5}
        height={size}
        viewBox="0 0 48 32"
        style={{ display: "block" }}
        aria-hidden="true"
      >
        <g fill={color}>
          <circle cx="13" cy="21" r="7.5" />
          <circle cx="22" cy="14" r="10" />
          <circle cx="33.5" cy="17.5" r="9" />
          <rect x="5.5" y="19" width="37" height="10" rx="5" />
        </g>
      </svg>
      <span
        style={{
          position: "absolute",
          top: "61%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          lineHeight: 0,
        }}
      >
        <Icon
          size={size * 0.42}
          color={COLORS.bg}
          strokeWidth={3.2}
          style={status === "syncing" ? { animation: "fathom-spin 1.2s linear infinite" } : undefined}
        />
      </span>
    </div>
  );
}

// Opens from the cloud in the header: current state, what it means, and a Back Up Data button
// that is greyed out when there is nothing to back up (or a backup is already running).
function SyncStatusModal({ status, onBackUp, onClose }) {
  const { color, title, description } = SYNC_STATUS_CONFIG[status];
  const canBackUp = status === "outdated";

  return (
    <div style={styles.modalOverlay} onClick={onClose}>
      <div style={styles.importMenuCard} onClick={(e) => e.stopPropagation()}>
        <button style={styles.modalClose} onClick={onClose}>
          <X size={18} color={COLORS.textMuted} />
        </button>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <SyncBadge status={status} size={72} />
        </div>
        <div className="fathom-oswald" style={{ ...styles.syncModalTitle, color }}>{title}</div>
        <div className="fathom-body" style={styles.syncModalText}>{description}</div>
        <button
          disabled={!canBackUp}
          onClick={() => {
            onBackUp();
            onClose();
          }}
          style={
            canBackUp
              ? { ...styles.backupBtn, marginBottom: 0 }
              : {
                  ...styles.backupBtn,
                  marginBottom: 0,
                  background: "transparent",
                  border: `1px solid ${COLORS.divider}`,
                  cursor: "not-allowed",
                }
          }
        >
          <UploadCloud size={16} color={canBackUp ? COLORS.teal : COLORS.greyNoData} strokeWidth={2} />
          <span
            className="fathom-mono"
            style={{ ...styles.backupBtnText, color: canBackUp ? COLORS.teal : COLORS.greyNoData }}
          >
            BACK UP DATA
          </span>
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   STYLES
   ============================================================ */
const styles = {
  app: {
    display: "flex",
    flexDirection: "column",
    height: "var(--app-height, 100dvh)",
    maxWidth: 480,
    margin: "0 auto",
    background: COLORS.bg,
    color: COLORS.textPrimary,
    position: "relative",
    overflow: "hidden",
  },
  screenWrap: {
    position: "relative",
    flex: 1,
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
  },
  screenArea: {
    flex: 1,
    minHeight: 0,
    overflowY: "auto",
    padding: "24px 18px 100px",
  },
  scrollFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 56,
    pointerEvents: "none",
    background: "linear-gradient(to top, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0))",
    transition: "opacity 0.25s ease",
    zIndex: 5,
  },
  tabContent: { display: "flex", flexDirection: "column" },
  masthead: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    padding: "18px 18px 14px",
    flexShrink: 0,
    borderBottom: `1px solid ${COLORS.divider}`,
  },
  mastheadHome: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 0,
    background: "transparent",
    border: "none",
    textAlign: "left",
  },
  mastheadSync: {
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    padding: 0,
    background: "transparent",
    border: "none",
  },
  syncModalTitle: { fontSize: 18, letterSpacing: 1.5, marginBottom: 8 },
  syncModalText: { fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5, marginBottom: 20 },
  mastheadTitle: { fontSize: 18, fontWeight: 600, letterSpacing: 1.5, color: COLORS.textBright, lineHeight: 1.1 },
  mastheadSubtitle: { fontSize: 8.5, color: COLORS.textMuted, letterSpacing: 0.6, marginTop: 3, lineHeight: 1.3 },
  pageTitle: { fontSize: 26, fontWeight: 600, letterSpacing: 1, color: COLORS.textBright },
  pageSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 4, letterSpacing: 0.5 },

  statsHeaderRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  profileBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 5,
    background: "transparent",
    border: "none",
    padding: 0,
  },
  profileIconWrap: {
    width: 38,
    height: 38,
    borderRadius: "50%",
    background: COLORS.tealDark,
    border: `1px solid ${COLORS.teal}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  profileIdLabel: { fontSize: 9.5, color: COLORS.textMuted, letterSpacing: 0.5 },
  rankBadgeText: {
    display: "block",
    maxWidth: 32,
    fontSize: 11.5,
    fontWeight: 600,
    color: COLORS.teal,
    letterSpacing: 0.2,
    textAlign: "center",
    lineHeight: 1.1,
  },
  rankBadgeTextLarge: {
    fontSize: 19,
    fontWeight: 600,
    color: COLORS.teal,
    letterSpacing: 0.3,
    textAlign: "center",
    lineHeight: 1,
  },

  homeProfileCard: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: COLORS.card,
    border: `1px solid ${COLORS.cardOutline}`,
    borderRadius: 12,
    padding: "14px 16px",
    marginBottom: 22,
  },
  profileDropdownHeader: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "14px 16px",
    background: "transparent",
    border: "none",
    textAlign: "left",
    color: "inherit",
  },
  profileDropdownBody: {
    padding: "14px 16px 8px",
    borderTop: `1px solid ${COLORS.divider}`,
  },
  recordRow: { display: "flex", alignItems: "center", gap: 10, padding: "8px 0" },
  recordName: { flex: 1, fontSize: 13, color: COLORS.textPrimary },
  recordStatus: { fontSize: 10, letterSpacing: 0.6 },
  recordExpiry: { fontSize: 9, letterSpacing: 0.4, color: COLORS.textDim, marginTop: 2 },
  debugBtn: {
    width: "100%",
    padding: "12px",
    marginTop: 4,
    borderRadius: 10,
    background: "transparent",
    border: `1px dashed ${COLORS.cardOutline}`,
    textAlign: "center",
  },
  debugBtnText: { fontSize: 11.5, letterSpacing: 1, color: COLORS.textMuted },
  homeProfileId: { fontSize: 16, letterSpacing: 1, color: COLORS.textBright },
  homeProfileStats: { fontSize: 10.5, color: COLORS.textMuted, marginTop: 3, letterSpacing: 0.3 },
  youTag: { fontSize: 10, color: COLORS.teal, letterSpacing: 0.5 },
  nicknameText: { color: COLORS.textMuted },
  importBtn: {
    justifySelf: "end",
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 10px",
    borderRadius: 8,
    background: COLORS.tealDark,
    border: `1px solid ${COLORS.teal}`,
  },
  importBtnText: { fontSize: 10.5, letterSpacing: 1, color: COLORS.teal },
  importBanner: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "10px 12px",
    marginBottom: 18,
    background: COLORS.tealDark,
    border: `1px solid ${COLORS.teal}`,
    borderRadius: 10,
  },
  importBannerTitle: { fontSize: 10, letterSpacing: 1, color: COLORS.teal, marginBottom: 3 },
  importBannerText: { fontSize: 12, color: COLORS.textPrimary, lineHeight: 1.4 },
  importMenuCard: {
    position: "relative",
    width: "100%",
    maxWidth: 320,
    background: COLORS.card,
    border: `1px solid ${COLORS.cardOutline}`,
    borderRadius: 16,
    padding: "28px 20px 20px",
    textAlign: "center",
  },
  importMenuTitle: { fontSize: 16, letterSpacing: 1, color: COLORS.textBright, marginBottom: 6 },
  importMenuSubtitle: { fontSize: 10.5, letterSpacing: 0.8, color: COLORS.textMuted, marginBottom: 20 },
  importDeviceBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "14px",
    marginBottom: 10,
    borderRadius: 10,
    background: COLORS.tealDark,
    border: `1px solid ${COLORS.teal}`,
  },
  importDeviceBtnText: { fontSize: 15, letterSpacing: 1.5, color: COLORS.teal },
  importLoading: {
    minHeight: "78vh",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
  },
  importSpinnerWrap: {
    position: "relative",
    width: 76,
    height: 76,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  importSpinner: {
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    border: `3px solid ${COLORS.divider}`,
    borderTopColor: COLORS.teal,
    animation: "fathom-spin 0.9s linear infinite",
  },
  importLoadingTitle: { fontSize: 17, letterSpacing: 1.5, color: COLORS.textBright, marginBottom: 8 },
  importLoadingSub: { fontSize: 10.5, letterSpacing: 0.8, color: COLORS.textMuted },
  calHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  calMonthLabel: { fontSize: 15, letterSpacing: 1, color: COLORS.textBright },
  calWeekRow: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 6 },
  calWeekDay: { textAlign: "center", fontSize: 10, color: COLORS.textDim },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: 4 },
  calDayCell: { display: "flex", flexDirection: "column", alignItems: "center", height: 40 },
  calDayNum: {
    width: 24,
    height: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    border: "1px solid transparent",
    fontSize: 12.5,
    color: COLORS.textPrimary,
  },
  calDayNumToday: { border: `1px solid ${COLORS.teal}`, color: COLORS.teal },
  calDotRow: { display: "flex", gap: 3, marginTop: 3, height: 6 },
  calDot: { width: 6, height: 6, borderRadius: "50%", flexShrink: 0 },
  calLegend: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 12,
    paddingTop: 12,
    borderTop: `1px solid ${COLORS.divider}`,
  },
  calLegendItem: { display: "flex", alignItems: "center", gap: 6 },
  calLegendText: { fontSize: 9, letterSpacing: 0.6, color: COLORS.textMuted },
  homeMedicalRow: { display: "flex", gap: 10, marginBottom: 10 },
  homeMedicalBox: {
    flex: 1,
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 8,
    padding: "12px 12px",
    background: COLORS.card,
    border: `1px solid ${COLORS.cardOutline}`,
    borderRadius: 12,
    textAlign: "left",
  },
  homeMedicalName: { fontSize: 9.5, letterSpacing: 0.8, color: COLORS.textMuted },
  homeMedicalStatusRow: { display: "flex", alignItems: "center", gap: 7 },
  homeMedicalStatus: { fontSize: 14, letterSpacing: 0.4, whiteSpace: "nowrap" },
  qualsUpToDateRow: { display: "flex", alignItems: "center", gap: 10 },
  qualsUpToDateText: { fontSize: 13.5, color: COLORS.textPrimary },
  qualsIssueRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  qualsIssueText: { fontSize: 13, color: COLORS.textPrimary, flex: 1 },
  qualsIssueStatus: { fontSize: 10, letterSpacing: 0.5, flexShrink: 0 },

  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(10, 13, 15, 0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
    padding: 24,
  },
  modalCard: {
    position: "relative",
    width: "100%",
    maxWidth: 320,
    background: COLORS.card,
    border: `1px solid ${COLORS.cardOutline}`,
    borderRadius: 16,
    padding: "32px 24px 24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  modalClose: {
    position: "absolute",
    top: 14,
    right: 14,
    background: "transparent",
    border: "none",
    padding: 4,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    background: COLORS.tealDark,
    border: `1px solid ${COLORS.teal}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  modalDiverId: { fontSize: 18, letterSpacing: 1, color: COLORS.textBright, marginBottom: 10 },
  nicknameCheckboxRow: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    marginBottom: 18,
    cursor: "pointer",
  },
  nicknameCheckbox: {
    width: 15,
    height: 15,
    accentColor: COLORS.teal,
    cursor: "pointer",
  },
  nicknameCheckboxLabel: { fontSize: 10, color: COLORS.textMuted, letterSpacing: 0.5 },

  sectionTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  sectionTitleBar: { width: 3, height: 18, borderRadius: 2, background: COLORS.teal },
  sectionTitleText: { fontSize: 16, fontWeight: 600, letterSpacing: 1.5, color: COLORS.textBright },

  attachmentThumbBtn: {
    display: "block",
    padding: 0,
    marginTop: 2,
    background: "transparent",
    border: `1px solid ${COLORS.cardOutline}`,
    borderRadius: 8,
    overflow: "hidden",
    lineHeight: 0,
  },
  attachmentThumb: { display: "block", width: 120, height: "auto" },
  attachmentCaption: { fontSize: 9.5, color: COLORS.textMuted, letterSpacing: 0.4, marginTop: 6 },

  submitUpdateBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "11px",
    marginTop: 14,
    borderRadius: 10,
    background: "transparent",
    border: `1px solid ${COLORS.teal}`,
  },
  submitUpdateBtnText: { fontSize: 12, letterSpacing: 1, color: COLORS.teal },

  updateModalCard: {
    position: "relative",
    width: "100%",
    maxWidth: 400,
    maxHeight: "90vh",
    overflowY: "auto",
    background: COLORS.card,
    border: `1px solid ${COLORS.cardOutline}`,
    borderRadius: 16,
    padding: "22px 20px 20px",
  },
  updateModalSubtitle: { fontSize: 10.5, color: COLORS.textMuted, letterSpacing: 0.8, marginTop: 3 },
  submitNote: {
    fontSize: 10.5,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 1.5,
    marginTop: 10,
  },

  attachBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "9px 14px",
    borderRadius: 8,
    border: `1px dashed ${COLORS.teal}`,
    background: COLORS.tealDark,
    cursor: "pointer",
  },
  attachBtnText: { fontSize: 11, letterSpacing: 1, color: COLORS.teal },
  attachPreview: {
    display: "block",
    width: 110,
    height: "auto",
    marginTop: 10,
    borderRadius: 6,
    border: `1px solid ${COLORS.cardOutline}`,
  },
  attachFileName: { fontSize: 10, color: COLORS.textMuted, marginTop: 6, letterSpacing: 0.3, wordBreak: "break-all" },

  submittedWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "10px 6px 4px",
  },
  submittedIcon: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: COLORS.tealDark,
    border: `1px solid ${COLORS.green}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  pendingRow: {
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "10px 16px 12px",
    borderTop: `1px solid ${COLORS.divider}`,
  },
  pendingText: { fontSize: 10.5, letterSpacing: 0.4, color: COLORS.amber },
  submittedMessage: { fontSize: 15, color: COLORS.textPrimary, lineHeight: 1.55, marginBottom: 22 },
  submittedMessageName: { color: COLORS.teal, fontWeight: 600 },
  submittedTitle: { fontSize: 17, letterSpacing: 1, color: COLORS.textBright, marginBottom: 8 },
  submittedText: { fontSize: 13, color: COLORS.textMuted, lineHeight: 1.5, marginBottom: 20 },
  submittedCloseBtn: {
    width: "100%",
    padding: "12px",
    borderRadius: 10,
    background: "transparent",
    border: `1px solid ${COLORS.cardOutline}`,
  },
  submittedCloseText: { fontSize: 13, letterSpacing: 1, color: COLORS.textPrimary },

  imageViewerCard: {
    position: "relative",
    width: "100%",
    maxWidth: 380,
    maxHeight: "88vh",
    overflowY: "auto",
    background: COLORS.card,
    border: `1px solid ${COLORS.cardOutline}`,
    borderRadius: 16,
    padding: "40px 16px 16px",
  },
  imageViewerTitle: {
    fontSize: 10.5,
    letterSpacing: 1,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 12,
  },
  imageViewerImg: { display: "block", width: "100%", height: "auto", borderRadius: 6 },
  modalStatsRow: { display: "flex", gap: 24, width: "100%", justifyContent: "center" },
  modalStat: { textAlign: "center" },
  modalStatValue: { fontSize: 17, color: COLORS.teal },
  modalStatLabel: { fontSize: 9, color: COLORS.textMuted, marginTop: 4, letterSpacing: 0.5 },
  modalDivider: {
    width: "100%",
    height: 1,
    background: COLORS.divider,
    margin: "22px 0 18px",
  },
  backupBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "12px",
    borderRadius: 10,
    background: COLORS.tealDark,
    border: `1px solid ${COLORS.teal}`,
    marginBottom: 10,
  },
  backupBtnText: { fontSize: 12.5, letterSpacing: 1, color: COLORS.teal },
  logoutBtn: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: "12px",
    borderRadius: 10,
    background: "transparent",
    border: `1px solid ${COLORS.divider}`,
  },
  logoutBtnText: { fontSize: 12.5, letterSpacing: 1, color: COLORS.red },

  addDiveTile: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: "100%",
    padding: "16px",
    borderRadius: 12,
    border: `1.5px dashed ${COLORS.teal}`,
    background: COLORS.tealDark,
    color: COLORS.teal,
  },
  addDiveText: { fontSize: 14, letterSpacing: 1 },

  categoryLabel: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: COLORS.textMuted,
    marginBottom: 10,
    marginTop: 4,
  },

  card: {
    background: COLORS.card,
    borderRadius: 12,
    border: `1px solid ${COLORS.cardOutline}`,
    marginBottom: 10,
    overflow: "hidden",
  },
  cardHeader: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "14px 16px",
    background: "transparent",
    border: "none",
    color: "inherit",
  },
  typeDot: { width: 9, height: 9, borderRadius: "50%", flexShrink: 0 },
  cardTitle: { fontSize: 15, fontWeight: 500, color: COLORS.textBright },
  cardSubtitle: { fontSize: 11, color: COLORS.textMuted, marginTop: 3 },
  cardStat: { fontSize: 13, color: COLORS.teal, whiteSpace: "nowrap" },
  cardStatLabel: { fontSize: 9, color: COLORS.textDim, marginTop: 2, letterSpacing: 0.5 },

  cardExpanded: {
    padding: "4px 16px 16px",
    borderTop: `1px solid ${COLORS.divider}`,
    marginTop: 2,
  },
  detailGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    columnGap: 14,
    marginTop: 12,
  },
  detailLabel: { fontSize: 9.5, color: COLORS.textDim, letterSpacing: 0.5, marginBottom: 3 },
  detailValue: { fontSize: 13.5, color: COLORS.textPrimary, lineHeight: 1.4 },

  formHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  formHeaderTitle: { fontSize: 16, letterSpacing: 1, color: COLORS.textBright },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: COLORS.card,
    border: `1px solid ${COLORS.divider}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  fieldLabel: { fontSize: 10, letterSpacing: 1, color: COLORS.textMuted, marginBottom: 6 },
  fieldRow: { display: "flex", gap: 12 },
  input: {
    width: "100%",
    background: COLORS.panel,
    border: `1px solid ${COLORS.divider}`,
    borderRadius: 8,
    padding: "10px 12px",
    color: COLORS.textBright,
    fontSize: 14,
    outline: "none",
    resize: "vertical",
  },
  typeRow: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  typeChip: {
    padding: "7px 12px",
    borderRadius: 20,
    border: "1.5px solid",
    fontSize: 12.5,
    background: COLORS.card,
    fontFamily: "'IBM Plex Sans', sans-serif",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  typeChipDot: { width: 7, height: 7, borderRadius: "50%", flexShrink: 0 },
  saveBtn: {
    marginTop: 8,
    padding: "15px",
    borderRadius: 10,
    background: COLORS.teal,
    border: "none",
    textAlign: "center",
  },
  draftBtn: {
    width: "100%",
    marginTop: 12,
    padding: "8px 13px",
    borderRadius: 10,
    background: "transparent",
    border: `1px solid ${COLORS.teal}`,
    textAlign: "center",
  },
  draftBtnText: { fontSize: 14, letterSpacing: 1, color: COLORS.teal },
  formWarning: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "11px 12px",
    marginBottom: 18,
    background: COLORS.redDark,
    border: `1px solid ${COLORS.red}`,
    borderRadius: 10,
  },
  formWarningText: { fontSize: 13, color: COLORS.textBright, lineHeight: 1.4 },
  saveBtnText: { color: COLORS.panel, fontSize: 15, letterSpacing: 1 },

  statGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 10,
    marginBottom: 22,
  },
  statTile: {
    background: COLORS.card,
    border: `1px solid ${COLORS.cardOutline}`,
    borderRadius: 12,
    padding: "14px 14px",
  },
  statValue: { fontSize: 20, color: COLORS.teal },
  statLabel: { fontSize: 9.5, color: COLORS.textMuted, marginTop: 4, letterSpacing: 0.5 },

  panelCard: {
    background: COLORS.card,
    border: `1px solid ${COLORS.cardOutline}`,
    borderRadius: 12,
    padding: "16px",
    marginBottom: 8,
  },
  barRow: { display: "flex", justifyContent: "space-between", marginBottom: 5 },
  barLabel: { fontSize: 12.5, color: COLORS.textPrimary },
  barCount: { fontSize: 12, color: COLORS.textMuted },
  barTrack: { height: 6, borderRadius: 3, background: COLORS.panel, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },

  histogram: { display: "flex", justifyContent: "space-between", alignItems: "flex-end", height: 110 },
  histoCol: { display: "flex", flexDirection: "column", alignItems: "center", flex: 1 },
  histoBarTrack: { display: "flex", alignItems: "flex-end", height: 76 },
  histoBarFill: { width: 18, background: COLORS.teal, borderRadius: "3px 3px 0 0" },
  histoLabel: { fontSize: 9.5, color: COLORS.textMuted, marginTop: 6 },
  histoCount: { fontSize: 10, color: COLORS.textDim },

  pieLegendRow: { display: "flex", alignItems: "center", gap: 8, marginBottom: 9 },
  pieLegendLabel: { fontSize: 12.5, color: COLORS.textPrimary, flex: 1 },
  pieLegendValue: { fontSize: 10.5, color: COLORS.textMuted },

  nav: {
    display: "flex",
    borderTop: `1px solid ${COLORS.divider}`,
    background: COLORS.panel,
    padding: "8px 0 calc(8px + env(safe-area-inset-bottom))",
  },
  navBtn: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    background: "transparent",
    border: "none",
    padding: "4px 0",
  },
  navIconWrap: {
    width: 40,
    height: 30,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: { fontSize: 9.5, letterSpacing: 1 },
};
