/**
 * RAW F1 eSports Championship 2026 - GitHub Pages UI
 *
 * Architecture:
 * - You update Excel/Google Sheets (source of truth)
 * - You publish each sheet tab as CSV (read-only)
 * - This site fetches those CSVs and renders the UI
 *
 * IMPORTANT:
 * - Paste your CSV URLs into CONFIG
 * - CSV must be publicly accessible (Published to web)
 */

const CONFIG = {
    // Optional: link to open the master sheet (view-only link)
    masterSheetUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSDjTgVEjSqmQ2kpcAggNlOfCf_ECrq8yO3DzIcyyQjXs0fj1L9mFaM1Td1AwNJIKiaI6FVW7E-oIh0/pubhtml",

    // Published CSV links:
    // Drivers Standings sheet CSV
    driversCsv: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSDjTgVEjSqmQ2kpcAggNlOfCf_ECrq8yO3DzIcyyQjXs0fj1L9mFaM1Td1AwNJIKiaI6FVW7E-oIh0/pub?gid=824844668&single=true&output=csv",

    // Constructors Standings sheet CSV
    constructorsCsv: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSDjTgVEjSqmQ2kpcAggNlOfCf_ECrq8yO3DzIcyyQjXs0fj1L9mFaM1Td1AwNJIKiaI6FVW7E-oIh0/pub?gid=416343744&single=true&output=csv",

    // Race sheet CSV list (one tab per race)
    races: [
        { name: "R1 – Australia", csv: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSDjTgVEjSqmQ2kpcAggNlOfCf_ECrq8yO3DzIcyyQjXs0fj1L9mFaM1Td1AwNJIKiaI6FVW7E-oIh0/pub?gid=798839272&single=true&output=csv" },
        { name: "R2 – China", csv: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSDjTgVEjSqmQ2kpcAggNlOfCf_ECrq8yO3DzIcyyQjXs0fj1L9mFaM1Td1AwNJIKiaI6FVW7E-oIh0/pub?gid=1510901277&single=true&output=csv" },
        { name: "R3 – Japan", csv: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSDjTgVEjSqmQ2kpcAggNlOfCf_ECrq8yO3DzIcyyQjXs0fj1L9mFaM1Td1AwNJIKiaI6FVW7E-oIh0/pub?gid=1358920533&single=true&output=csv" },
        { name: "R4 - Saudi Arabia", csv: "https://docs.google.com/spreadsheets/d/e/2PACX-1vSDjTgVEjSqmQ2kpcAggNlOfCf_ECrq8yO3DzIcyyQjXs0fj1L9mFaM1Td1AwNJIKiaI6FVW7E-oIh0/pub?gid=1615900483&single=true&output=csv" },
    ],

    // Home page "Next Race" card
    nextRace: {
        name: "Round 3 • Japan",
        time: "Saturday • 10:00 PM – 12:00 AM",
        note: "Poll-based confirmation. Rule: No two consecutive weeks without a race."
    }
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function setHref(id, url) {
    const el = document.getElementById(id);
    if (el) el.href = url;
}

// ---------- CSV parsing ----------
function parseCsv(csvText) {
    const rows = [];
    let row = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < csvText.length; i++) {
        const c = csvText[i];
        const next = csvText[i + 1];

        if (c === '"' && inQuotes && next === '"') {
            current += '"';
            i++;
            continue;
        }
        if (c === '"') {
            inQuotes = !inQuotes;
            continue;
        }
        if (c === "," && !inQuotes) {
            row.push(current);
            current = "";
            continue;
        }
        if ((c === "\n" || c === "\r") && !inQuotes) {
            if (current.length || row.length) {
                row.push(current);
                rows.push(row);
                row = [];
                current = "";
            }
            if (c === "\r" && next === "\n") i++;
            continue;
        }
        current += c;
    }

    if (current.length || row.length) {
        row.push(current);
        rows.push(row);
    }

    return rows;
}

function rowsToObjects(rows) {
    const headers = (rows[0] || []).map(h => h.trim());
    return rows.slice(1)
        .filter(r => r.some(cell => String(cell ?? "").trim() !== ""))
        .map(r => {
            const obj = {};
            headers.forEach((h, idx) => obj[h] = (r[idx] ?? "").trim());
            return obj;
        });
}

async function fetchCsvObjects(url) {
    if (!url || url.startsWith("PASTE_")) return [];
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load CSV: ${res.status}`);
    const text = await res.text();
    return rowsToObjects(parseCsv(text));
}

// ---------- Rendering ----------
function escapeHtml(str) {
    return String(str)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function renderTable(tableEl, columns, rows) {
    if (!tableEl) return;

    const thead = `
    <thead>
      <tr>
        ${columns.map(c => `<th>${c.label}</th>`).join("")}
      </tr>
    </thead>
  `;

    const tbody = `
    <tbody>
      ${rows.map(r => `
        <tr>
          ${columns.map(c => `<td>${c.format ? c.format(r[c.key], r) : escapeHtml(r[c.key] ?? "")}</td>`).join("")}
        </tr>
      `).join("")}
    </tbody>
  `;

    tableEl.innerHTML = thead + tbody;
}

function toNumberSafe(v) {
    const n = Number(String(v ?? "").replace(/[^\d.-]/g, ""));
    return Number.isFinite(n) ? n : 0;
}

function sortByTotalDesc(rows, totalKey = "Total") {
    return [...rows].sort((a, b) => toNumberSafe(b[totalKey]) - toNumberSafe(a[totalKey]));
}

// ---------- Navigation ----------
function showView(viewName) {
    document.body.classList.toggle("hide-hero", viewName !== "home");

    $$(".nav__btn").forEach(b => b.classList.toggle("is-active", b.dataset.view === viewName));
    $$(".view").forEach(v => v.classList.remove("is-active"));

    const target = document.querySelector(`#view-${viewName}`);
    if (target) target.classList.add("is-active");

    // Scroll behavior
    const topbar = document.querySelector(".topbar");
    const offset = (topbar?.offsetHeight || 72) + 12; // header + small gap

    if (viewName !== "home") {
        const anchor = document.getElementById("mainContent") || target;
        anchor?.scrollIntoView({ behavior: "smooth", block: "start" });

        // Apply offset so content isn't hidden behind sticky header
        setTimeout(() => window.scrollBy({ top: -offset, left: 0, behavior: "instant" }), 250);
    } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
}


// ---------- App state ----------
let drivers = [];
let constructors = [];
let raceCache = new Map(); // raceName -> rows

function renderPodium(top3) {
    const el = $("#podium");
    if (!el) return;
    if (!top3 || top3.length === 0) {
        el.innerHTML = `<div class="podium__empty">No standings data yet.</div>`;
        return;
    }
    el.innerHTML = top3.map(r => `
    <div class="podiumRow">
      <div class="podiumLeft">
        <div class="podiumRank">${r.__pos}</div>
        <div>
          <div class="podiumName">${escapeHtml(r["Driver Name"] || "")}</div>
          <div class="podiumMeta">${escapeHtml(r["Team (registered)"] || r["Team"] || "")}</div>
        </div>
      </div>
      <div class="podiumPts">${escapeHtml(String(r["Total"] || 0))} pts</div>
    </div>
  `).join("");
}

function populateRaceSelect() {
    const sel = $("#raceSelect");
    if (!sel) return;

    sel.innerHTML = "";

    if (!CONFIG.races.length) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "No races configured yet (edit script.js)";
        sel.appendChild(opt);
        return;
    }

    CONFIG.races.forEach((r, idx) => {
        const opt = document.createElement("option");
        opt.value = r.name;
        opt.textContent = r.name;
        if (idx === CONFIG.races.length - 1) opt.selected = true; // latest
        sel.appendChild(opt);
    });

    loadRace(sel.value);
}

function pickTeamFromRaceRow(r) {
    return (
        r["Team (Race 1)"] ||
        r["Team (Race 2)"] ||
        r["Team (Race 3)"] ||
        r["Team (Race)"] ||
        r["Team"] ||
        ""
    );
}

function pickPointsFromRaceRow(r) {
    return (
        r["Final Points"] ||
        r["Final"] ||
        r["Pts"] ||
        r["Points"] ||
        "0"
    );
}

function renderRaceTable(rows) {
    const tableEl = $("#raceTable");
    if (!tableEl) return;

    const cols = [
        { key: "Pos", label: "Pos" },
        { key: "Driver Name", label: "Driver" },
        { key: "EA / RaceNet ID", label: "RaceNet ID" },
        { key: "__team", label: "Team" },
        { key: "Race Time / Gap", label: "Time / Gap" },
        { key: "Finish Status", label: "Status" },
        { key: "__pts", label: "Pts", format: (v) => `<span class="badge badge--red">${escapeHtml(String(v || 0))}</span>` },
        { key: "Notes", label: "Notes" }
    ];

    const q = ($("#raceFilter")?.value || "").trim().toLowerCase();
    const normalized = rows.map(r => ({
        ...r,
        __team: pickTeamFromRaceRow(r),
        __pts: pickPointsFromRaceRow(r)
    }));

    const filtered = q
        ? normalized.filter(r => {
            const s = [
                r["Driver Name"], r["EA / RaceNet ID"], r.__team, r["Notes"], r["Finish Status"]
            ].join(" ").toLowerCase();
            return s.includes(q);
        })
        : normalized;

    renderTable(tableEl, cols, filtered);
}

async function loadRace(raceName) {
    const race = CONFIG.races.find(r => r.name === raceName);
    if (!race) return;

    let rows = raceCache.get(raceName);
    if (!rows) {
        rows = await fetchCsvObjects(race.csv);
        raceCache.set(raceName, rows);
    }

    renderRaceTable(rows);
    setText("latestRaceSummary", `Currently viewing: ${raceName}`);
    const foot = $("#raceFootnote");
    if (foot) foot.textContent = "Tip: Use Quick Filter to find a driver/team instantly.";
}

async function loadAll() {
    setText("lastUpdated", "Loading…");
    setHref("sheetLink", CONFIG.masterSheetUrl || "#");
    setText("nextRaceName", CONFIG.nextRace.name);
    setText("nextRaceTime", CONFIG.nextRace.time);
    setText("nextRaceNote", CONFIG.nextRace.note);

    drivers = await fetchCsvObjects(CONFIG.driversCsv);
    constructors = await fetchCsvObjects(CONFIG.constructorsCsv);

    const driversSorted = sortByTotalDesc(drivers, "Total");
    const constructorsSorted = sortByTotalDesc(constructors, "Total");

    const dPos = driversSorted.map((r, i) => ({ ...r, __pos: i + 1 }));
    const cPos = constructorsSorted.map((r, i) => ({ ...r, __pos: i + 1 }));

    setText("driverCount", String(dPos.length || "—"));
    setText("constructorCount", String(cPos.length || "—"));
    setText("lastUpdated", new Date().toLocaleString());

    const driverCols = [
        { key: "__pos", label: "Pos" },
        { key: "Driver Name", label: "Driver" },
        { key: "Team (registered)", label: "Team" },
        { key: "Total", label: "Points", format: (v) => `<span class="badge badge--red">${escapeHtml(String(v || 0))}</span>` }
    ];

    const ctorCols = [
        { key: "__pos", label: "Pos" },
        { key: "Team", label: "Constructor" },
        { key: "Total", label: "Points", format: (v) => `<span class="badge badge--red">${escapeHtml(String(v || 0))}</span>` }
    ];

    renderTable($("#driversTable"), driverCols, dPos);
    renderTable($("#driversTableHome"), driverCols, dPos.slice(0, 8));

    renderTable($("#constructorsTable"), ctorCols, cPos);
    renderTable($("#constructorsTableHome"), ctorCols, cPos);

    renderPodium(dPos.slice(0, 3));
    populateRaceSelect();
}

// ---------- Events ----------
document.addEventListener("click", (e) => {
    const btn = e.target.closest(".nav__btn");
    if (!btn) return;
    showView(btn.dataset.view);
});

$("#refreshBtn")?.addEventListener("click", async () => {
    raceCache.clear();
    try {
        await loadAll();
    } catch (err) {
        console.error(err);
        setText("lastUpdated", "Failed to load data (check CSV links in script.js).");
    }
});

$("#raceSelect")?.addEventListener("change", (e) => loadRace(e.target.value));
$("#raceFilter")?.addEventListener("input", () => {
    const sel = $("#raceSelect");
    if (sel?.value) loadRace(sel.value);
});

// ---------- Boot ----------
(async function boot() {
    showView("home");
    try {
        await loadAll();
    } catch (err) {
        console.error(err);
        setText("lastUpdated", "Failed to load data (check CSV links in script.js).");
    }
})();


