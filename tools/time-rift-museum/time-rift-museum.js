/* =========================================================
   Time Rift Museum Tool — stable Biozilla-style base
   Two tabs: Input Relics -> Optimize.
========================================================= */

const TIME_RIFT_TAB_NAME = "Time Rift Museum Relics";
const TIME_RIFT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQt9dkXKEDeiQYyGmYaSZpcq7CY1eM9ALn-kxxmm8qASUHznh0avCAz7hp3ojGNOXxIZncAKcpEMJ5J/pub?gid=1578260911&single=true&output=csv";
const TIME_RIFT_OWNED_KEY = "timeRiftMuseumOwnedRelicsBaseV1";
const TIME_RIFT_ASSIGNMENTS_KEY = "timeRiftMuseumAssignmentsBaseV1";

const AFFCT_TYPES = ["FAME", "ART", "FTH", "CIV", "TECH"];

/* Baseline slot pattern from the previous working draft: slots 1-3 are ALL, then FAME/ART/FTH/CIV/TECH repeats. */
const TIME_RIFT_PEDESTALS = Array.from({ length: 83 }, (_, index) => {
  const slot = index + 1;
  const type = slot <= 3 ? "ALL" : AFFCT_TYPES[(slot - 4) % AFFCT_TYPES.length];
  return { slot, type };
});

const TIME_RIFT_THRESHOLDS = [
  { points: 120, rating: "C", buff: "In the Rift, Snail ATK +40" },
  { points: 250, rating: "C", buff: "In the Rift, Snail DEF +40" },
  { points: 380, rating: "C", buff: "In the Rift, Travel Speed +2%" },
  { points: 520, rating: "C", buff: "In the Rift, DMG +5%" },
  { points: 660, rating: "C", buff: "In the Rift, INTEL gained +5%" },
  { points: 800, rating: "C", buff: "Rift Museum B-tad Output +500" },
  { points: 950, rating: "B", buff: "Rift Museum Medal Output +10" },
  { points: 1100, rating: "B", buff: "In the Rift, Snail RUSH +40" },
  { points: 1250, rating: "B", buff: "In the Rift, Snail HP +400" },
  { points: 1400, rating: "B", buff: "In the Rift, Travel SPD +2%" },
  { points: 1550, rating: "B", buff: "In the Rift, DMG +5%" },
  { points: 1700, rating: "B", buff: "In the Rift, Cells collected +5%" },
  { points: 1850, rating: "B", buff: "In the Rift, food consumed -5%" },
  { points: 2000, rating: "B", buff: "Rift Museum B-tad Output +2000" },
  { points: 2200, rating: "A", buff: "Rift Museum Medal Output +40" },
  { points: 2400, rating: "A", buff: "In the Rift, Snail ATK +80" },
  { points: 2600, rating: "A", buff: "In the Rift, Snail DEF +80" },
  { points: 2800, rating: "A", buff: "In the Rift, Travel SPD +2%" },
  { points: 3000, rating: "A", buff: "In the Rift, DMG +5%" },
  { points: 3200, rating: "A", buff: "In the Rift, B-tads gained +5%" },
  { points: 3400, rating: "A", buff: "Rift Museum B-tad Output +6000" },
  { points: 3600, rating: "S", buff: "Rift Museum Medal Output +80" },
  { points: 3800, rating: "S", buff: "In the Rift, Snail RUSH +80" },
  { points: 4000, rating: "S", buff: "In the Rift, Snail HP +800" },
  { points: 4300, rating: "S", buff: "In the Rift, Travel SPD +2%" },
  { points: 4600, rating: "S", buff: "In the Rift, DMG +5%" },
  { points: 5000, rating: "S", buff: "Rift Museum B-tad Output +10000" },
  { points: 5400, rating: "S+", buff: "Rift Museum Medal Output +160" },
  { points: 5800, rating: "S+", buff: "In the Rift, Snail ATK +160" },
  { points: 6200, rating: "S+", buff: "In the Rift, Snail DEF +160" },
  { points: 6600, rating: "S+", buff: "In the Rift, DMG +5%" },
  { points: 7000, rating: "S+", buff: "Rift Museum B-tad Output +15000" },
  { points: 7500, rating: "SS", buff: "Rift Museum Medal Output +160" },
  { points: 8000, rating: "SS", buff: "In the Rift, Snail RUSH +160" },
  { points: 8500, rating: "SS", buff: "In the Rift, Snail HP +1600" },
  { points: 9000, rating: "SS", buff: "In the Rift, DMG +5%" },
  { points: 9500, rating: "SS", buff: "Rift Museum B-tad Output +20000" }
];

let relicRows = [];
let ownedRelics = {};
let appliedAssignments = {};
let activeTab = "input";
let latestOptimizedSetup = [];

function normalizeId(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function toNumber(value) {
  const parsed = Number(String(value ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell);
      if (row.some((value) => String(value).trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => String(value).trim() !== "")) rows.push(row);
  return rows;
}

function displayRelicBaseName(name) {
  return String(name || "").replace(/\s[-–—]\s*(Awaken|6|5|4|3)$/i, "").trim();
}

function familyIdFor(name) {
  return normalizeId(displayRelicBaseName(name));
}

function levelValue(level) {
  const raw = String(level || "").toLowerCase();
  if (raw.includes("awaken")) return 7;
  return toNumber(raw) || 0;
}

function parseStampBonus(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const match = raw.match(/\+\s*([\d.]+)/);
  if (!match) return null;

  const upper = raw.toUpperCase();
  const target = AFFCT_TYPES.find((type) => upper.includes(type));
  if (target) return { target, value: Number(match[1]), raw };
  if (upper.includes("ALL") || upper.includes("TOTAL")) return { target: "ALL", value: Number(match[1]), raw };
  return null;
}

function parseRelics(rows) {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0].map((header) => String(header || "").trim().replace(/^\uFEFF/, ""));

  return rows.slice(1).map((row, index) => {
    const obj = {};
    headers.forEach((header, i) => { obj[header] = row[i] || ""; });

    const name = String(obj["Relic Name"] || "").trim();
    if (!name) return null;

    const level = String(obj.Level || "").trim();
    const rank = String(obj.Rank || "").trim();
    const stamps = [obj["Stamp 1"], obj["Stamp 2"], obj["Stamp 3"]]
      .map((stamp) => String(stamp || "").trim())
      .filter(Boolean);

    return {
      id: normalizeId(`${name}-${level || rank || index}`),
      familyId: familyIdFor(name),
      baseName: displayRelicBaseName(name),
      name,
      level,
      rank,
      type: String(obj.Type || "").trim().toUpperCase(),
      fame: toNumber(obj.FAME),
      art: toNumber(obj.ART),
      fth: toNumber(obj.FTH),
      civ: toNumber(obj.CIV),
      tech: toNumber(obj.TECH),
      stampTexts: stamps,
      stampBonuses: stamps.map(parseStampBonus).filter(Boolean),
      effectText: stamps.join(" | ")
    };
  }).filter(Boolean);
}

async function loadRelics() {
  setStatus("Loading Time Rift Museum relics…");
  try {
    const response = await fetch(TIME_RIFT_CSV_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Sheet request failed: ${response.status}`);

    relicRows = parseRelics(parseCsv(await response.text()));
    cleanSavedState();
    setStatus(`Loaded ${relicRows.length.toLocaleString()} rows from “${TIME_RIFT_TAB_NAME}”.`);
    renderAll();
  } catch (error) {
    console.error(error);
    setStatus("Could not load relic data. Make sure the Time Rift Museum Relics tab is published as CSV.", true);
    renderAll();
  }
}

function getFamilies() {
  const map = new Map();
  relicRows.forEach((relic) => {
    if (!map.has(relic.familyId)) map.set(relic.familyId, []);
    map.get(relic.familyId).push(relic);
  });

  return Array.from(map.entries()).map(([familyId, levels]) => {
    const sorted = [...levels].sort((a, b) => levelValue(b.level) - levelValue(a.level));
    return { familyId, name: sorted[0].baseName, type: sorted[0].type, levels: sorted };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

function findRelicById(id) {
  return relicRows.find((relic) => relic.id === id) || null;
}

function getOwnedRelic(familyId) {
  return findRelicById(ownedRelics[familyId]);
}

function getOwnedRelics() {
  return Object.values(ownedRelics).map(findRelicById).filter(Boolean);
}

function getBaseStat(relic, pedestalType) {
  if (!relic) return 0;
  if (pedestalType === "ALL") return relic.fame + relic.art + relic.fth + relic.civ + relic.tech;
  return relic[pedestalType.toLowerCase()] || 0;
}

function getStampBonus(relic, pedestalType) {
  if (!relic) return 0;
  return relic.stampBonuses.reduce((total, bonus) => {
    if (pedestalType === "ALL") return bonus.target === "ALL" ? total + bonus.value : total;
    return bonus.target === pedestalType ? total + bonus.value : total;
  }, 0);
}

function scoreRelic(relic, pedestalType) {
  return getBaseStat(relic, pedestalType) + getStampBonus(relic, pedestalType);
}

function getRating(points) {
  const unlocked = TIME_RIFT_THRESHOLDS.filter((threshold) => points >= threshold.points);
  return unlocked.length ? unlocked[unlocked.length - 1].rating : "—";
}

function getNextThreshold(points) {
  return TIME_RIFT_THRESHOLDS.find((threshold) => points < threshold.points) || null;
}

function assignmentPoints(assignments) {
  return TIME_RIFT_PEDESTALS.reduce((total, pedestal) => {
    const relic = findRelicById(assignments[String(pedestal.slot)]);
    return total + scoreRelic(relic, pedestal.type);
  }, 0);
}

function buildOptimizedSetup() {
  const priority = document.getElementById("optimizer-priority")?.value || "points";
  const usedFamilies = new Set();
  const owned = getOwnedRelics();
  const setup = [];

  TIME_RIFT_PEDESTALS.forEach((pedestal) => {
    const best = owned
      .filter((relic) => !usedFamilies.has(relic.familyId))
      .map((relic) => {
        const points = scoreRelic(relic, pedestal.type);
        const bonus = getStampBonus(relic, pedestal.type);
        const sortScore = priority === "stamps" ? points + bonus * 10 : points;
        return { pedestal, relic, points, bonus, sortScore };
      })
      .sort((a, b) => b.sortScore - a.sortScore || b.points - a.points || a.relic.baseName.localeCompare(b.relic.baseName))[0];

    if (best) {
      usedFamilies.add(best.relic.familyId);
      setup.push(best);
    }
  });

  latestOptimizedSetup = setup;
  return setup;
}

function renderTabs() {
  document.querySelectorAll(".rift-tab").forEach((button) => {
    const active = button.dataset.tab === activeTab;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    const active = panel.id === `panel-${activeTab}`;
    panel.classList.toggle("active", active);
    panel.hidden = !active;
  });
}

function renderSummary() {
  const total = assignmentPoints(appliedAssignments);
  const next = getNextThreshold(total);
  const previous = TIME_RIFT_THRESHOLDS.filter((threshold) => total >= threshold.points).pop()?.points || 0;
  const range = next ? next.points - previous : 1;
  const progress = next ? Math.max(0, Math.min(100, ((total - previous) / range) * 100)) : 100;

  setText("total-points", total.toLocaleString());
  setText("current-rating", getRating(total));
  setText("next-threshold", next ? `${next.points.toLocaleString()} (${next.rating})` : "Maxed");
  setText("points-needed", next ? (next.points - total).toLocaleString() : "0");

  const bar = document.getElementById("rank-progress-bar");
  if (bar) bar.style.width = `${progress}%`;
}

function renderInputRelics() {
  const container = document.getElementById("owned-relic-list");
  if (!container) return;

  if (!relicRows.length) {
    container.innerHTML = `<p class="empty-state">Sync relic data to load the relic input list.</p>`;
    setText("owned-count", "0");
    return;
  }

  const queryParts = normalizeText(document.getElementById("owned-search")?.value || "").split(/\s+/).filter(Boolean);
  const typeFilter = document.getElementById("owned-type-filter")?.value || "all";
  const viewFilter = document.getElementById("owned-view-filter")?.value || "all";

  let items = getFamilies().map((family) => {
    const owned = getOwnedRelic(family.familyId);
    const best = family.levels[0];
    const haystack = normalizeText([family.name, family.type, best.effectText, best.fame, best.art, best.fth, best.civ, best.tech].join(" "));
    return { family, owned, best, haystack };
  });

  if (typeFilter !== "all") items = items.filter((item) => item.family.type === typeFilter);
  if (viewFilter === "owned") items = items.filter((item) => item.owned);
  if (viewFilter === "missing") items = items.filter((item) => !item.owned);
  if (queryParts.length) items = items.filter((item) => queryParts.every((part) => item.haystack.includes(part)));

  setText("owned-count", getOwnedRelics().length.toLocaleString());

  if (!items.length) {
    container.innerHTML = `<p class="empty-state">No relics match that filter.</p>`;
    return;
  }

  container.innerHTML = items.map(({ family, owned, best }) => {
    const levelOptions = [`<option value="">Not Owned</option>`].concat(family.levels.map((relic) => {
      const label = relic.level || relic.rank || "?";
      return `<option value="${escapeHtml(relic.id)}" ${owned?.id === relic.id ? "selected" : ""}>${escapeHtml(label)}</option>`;
    })).join("");

    return `
      <article class="relic-row ${owned ? "owned" : "missing"}">
        <span class="type-token">${escapeHtml(best.type || "—")}</span>
        <div class="relic-info">
          <b>${escapeHtml(family.name)}</b>
          <small>FAME ${best.fame} · ART ${best.art} · FTH ${best.fth} · CIV ${best.civ} · TECH ${best.tech}</small>
          <em>${best.effectText ? escapeHtml(best.effectText) : "No stamp text"}</em>
        </div>
        <label class="level-label">
          <span>Owned Level</span>
          <select data-family-id="${escapeHtml(family.familyId)}">${levelOptions}</select>
        </label>
      </article>`;
  }).join("");

  container.querySelectorAll("[data-family-id]").forEach((select) => {
    select.addEventListener("change", () => {
      if (select.value) ownedRelics[select.dataset.familyId] = select.value;
      else delete ownedRelics[select.dataset.familyId];
      cleanAssignmentsAgainstOwned();
      saveState();
      renderAll();
    });
  });
}

function renderOptimizer() {
  const setup = buildOptimizedSetup();
  const total = setup.reduce((sum, item) => sum + item.points, 0);
  const filled = setup.length;

  setText("optimized-points", total.toLocaleString());
  setText("optimized-rating", getRating(total));
  setText("optimized-filled", `${filled} / ${TIME_RIFT_PEDESTALS.length}`);

  const optimizedList = document.getElementById("optimized-list");
  if (optimizedList) optimizedList.innerHTML = renderSetupList(setup, "No optimized setup yet. Add owned relics on the Input Relics tab first.");

  const currentSetup = TIME_RIFT_PEDESTALS.map((pedestal) => {
    const relic = findRelicById(appliedAssignments[String(pedestal.slot)]);
    return relic ? { pedestal, relic, points: scoreRelic(relic, pedestal.type), bonus: getStampBonus(relic, pedestal.type) } : null;
  }).filter(Boolean);

  const currentList = document.getElementById("current-setup-list");
  if (currentList) currentList.innerHTML = renderSetupList(currentSetup, "Nothing has been applied yet.");
}

function renderSetupList(setup, emptyText) {
  if (!setup.length) return `<p class="empty-state">${escapeHtml(emptyText)}</p>`;

  return setup.map((item) => {
    const base = getBaseStat(item.relic, item.pedestal.type);
    const bonusText = item.bonus ? ` · ${base} + ${item.bonus} stamp` : ` · ${base} base`;
    return `
      <article class="optimized-row">
        <span class="slot-pill">Slot ${item.pedestal.slot}</span>
        <span class="slot-pill">${item.pedestal.type}</span>
        <div>
          <strong>${escapeHtml(item.relic.baseName)}</strong>
          <small>${escapeHtml(item.relic.level || item.relic.rank || "?")}${escapeHtml(bonusText)}</small>
        </div>
        <strong class="points-pill">${item.points.toLocaleString()}</strong>
      </article>`;
  }).join("");
}

function renderBuffs() {
  const container = document.getElementById("buff-list");
  if (!container) return;

  const total = assignmentPoints(appliedAssignments);
  container.innerHTML = `
    <table class="buff-table">
      <thead><tr><th>Points</th><th>Rating</th><th>Buff</th><th>Status</th></tr></thead>
      <tbody>
        ${TIME_RIFT_THRESHOLDS.map((threshold) => {
          const unlocked = total >= threshold.points;
          return `<tr class="${unlocked ? "unlocked" : "locked"}">
            <td>${threshold.points.toLocaleString()}</td>
            <td>${threshold.rating}</td>
            <td>${escapeHtml(threshold.buff)}</td>
            <td>${unlocked ? "Unlocked" : "Locked"}</td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>`;
}

function applyOptimizedSetup() {
  const setup = latestOptimizedSetup.length ? latestOptimizedSetup : buildOptimizedSetup();
  appliedAssignments = {};
  setup.forEach((item) => { appliedAssignments[String(item.pedestal.slot)] = item.relic.id; });
  saveState();
  activeTab = "optimize";
  renderAll();
}

function resetSetup() {
  if (!window.confirm("Reset the applied Time Rift Museum setup? Owned relic inputs will be kept.")) return;
  appliedAssignments = {};
  saveState();
  renderAll();
}

function cleanAssignmentsAgainstOwned() {
  const ownedIds = new Set(Object.values(ownedRelics));
  Object.keys(appliedAssignments).forEach((slot) => {
    if (!ownedIds.has(appliedAssignments[slot])) delete appliedAssignments[slot];
  });
}

function cleanSavedState() {
  const validIds = new Set(relicRows.map((relic) => relic.id));
  Object.keys(ownedRelics).forEach((familyId) => {
    if (!validIds.has(ownedRelics[familyId])) delete ownedRelics[familyId];
  });
  Object.keys(appliedAssignments).forEach((slot) => {
    if (!validIds.has(appliedAssignments[slot])) delete appliedAssignments[slot];
  });
  cleanAssignmentsAgainstOwned();
  saveState();
}

function loadState() {
  try { ownedRelics = JSON.parse(localStorage.getItem(TIME_RIFT_OWNED_KEY)) || {}; } catch { ownedRelics = {}; }
  try { appliedAssignments = JSON.parse(localStorage.getItem(TIME_RIFT_ASSIGNMENTS_KEY)) || {}; } catch { appliedAssignments = {}; }
}

function saveState() {
  localStorage.setItem(TIME_RIFT_OWNED_KEY, JSON.stringify(ownedRelics));
  localStorage.setItem(TIME_RIFT_ASSIGNMENTS_KEY, JSON.stringify(appliedAssignments));
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function setStatus(message, isError = false) {
  const element = document.getElementById("sync-status");
  if (!element) return;
  element.textContent = message;
  element.classList.toggle("error", isError);
}

function renderAll() {
  renderTabs();
  renderSummary();
  renderInputRelics();
  renderOptimizer();
  renderBuffs();
}

function bindEvents() {
  document.getElementById("refresh-relics")?.addEventListener("click", loadRelics);
  document.getElementById("reset-museum")?.addEventListener("click", resetSetup);
  document.getElementById("apply-optimized")?.addEventListener("click", applyOptimizedSetup);
  document.getElementById("owned-search")?.addEventListener("input", renderInputRelics);
  document.getElementById("owned-type-filter")?.addEventListener("change", renderInputRelics);
  document.getElementById("owned-view-filter")?.addEventListener("change", renderInputRelics);
  document.getElementById("optimizer-priority")?.addEventListener("change", renderOptimizer);

  document.querySelectorAll(".rift-tab").forEach((button) => {
    button.addEventListener("click", () => {
      activeTab = button.dataset.tab;
      renderAll();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadState();
  bindEvents();
  renderAll();
  loadRelics();
});
