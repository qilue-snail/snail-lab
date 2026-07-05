/* =========================================================
   Time Rift Museum Tool
   Clean functional rewrite for the in-game museum layout.
========================================================= */

const TIME_RIFT_TAB_NAME = "Time Rift Museum Relics";
const TIME_RIFT_STORAGE_KEY = "timeRiftMuseumAssignmentsV2";
const TIME_RIFT_SLOT_STORAGE_KEY = "timeRiftMuseumSlotTypesV2";
const TIME_RIFT_AUTO_SYNC_KEY = "timeRiftMuseumAutoSyncV2";
const TIME_RIFT_SNAPSHOT_KEY = "timeRiftMuseumSnapshotsV2";
const TIME_RIFT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQt9dkXKEDeiQYyGmYaSZpcq7CY1eM9ALn-kxxmm8qASUHznh0avCAz7hp3ojGNOXxIZncAKcpEMJ5J/pub?gid=1578260911&single=true&output=csv";

const AFFCT_TYPES = ["FAME", "ART", "FTH", "CIV", "TECH"];
const PEDESTAL_TYPES = ["ALL", ...AFFCT_TYPES];
const GROUP_ORDER = ["ALL", "FAME", "ART", "FTH", "CIV", "TECH"];

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

const OPTIMIZER_GOALS = {
  points: { keywords: [], weight: 0 },
  intel: { keywords: ["intel", "intelligence"], weight: 1000 },
  "dragon-orbs": { keywords: ["dragon orb", "dragon orbs", "orb drops"], weight: 1300 },
  btads: { keywords: ["b-tad", "btad", "b-tads", "btads", "black tad"], weight: 1000 },
  cells: { keywords: ["cell", "cells"], weight: 1000 },
  medals: { keywords: ["medal", "medals"], weight: 1000 },
  speed: { keywords: ["travel speed", "travel spd", "speed"], weight: 1000 },
  damage: { keywords: ["dmg", "damage", "atk", "def", "rush", "hp", "combat"], weight: 1000 }
};

let timeRiftRelics = [];
let timeRiftAssignments = {};
let timeRiftSlotTypes = {};
let activeTab = "setup";
let activeGroup = "ALL";
let viewMode = "group";
let pickerSlot = null;
let pickerFilter = "all";
let pickerTypeFilter = "all";

function normalizeHeader(value) {
  return String(value || "").trim().replace(/^\uFEFF/, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

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

function parseStampBonus(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const match = raw.match(/\+\s*([\d.]+)/);
  if (!match) return null;

  const value = Number(match[1]);
  const upper = raw.toUpperCase();
  const target = AFFCT_TYPES.find((type) => upper.includes(type));

  if (target) return { target, value, raw };
  if (upper.includes("ALL") || upper.includes("TOTAL")) return { target: "ALL", value, raw };
  return null;
}

function relicFamilyId(name) {
  return normalizeId(String(name || "").replace(/\s[-–—]\s*(Awaken|6|5|4|3)$/i, ""));
}

function parseTimeRiftRelics(rows) {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0].map((header) => String(header || "").trim().replace(/^\uFEFF/, ""));

  return rows.slice(1).map((row, index) => {
    const obj = {};
    headers.forEach((header, i) => { obj[header] = row[i] || ""; });

    const name = String(obj["Relic Name"] || "").trim();
    if (!name) return null;

    const level = String(obj.Level || "").trim();
    const rank = String(obj.Rank || "").trim();
    const stamps = [obj["Stamp 1"], obj["Stamp 2"], obj["Stamp 3"]].map((stamp) => String(stamp || "").trim()).filter(Boolean);
    const family = relicFamilyId(name);
    const id = normalizeId(`${name}-${level || rank || index}`);

    return {
      id,
      familyId: family,
      name,
      level,
      rank,
      type: String(obj.Type || "").trim(),
      mainAfft: toNumber(obj["Main AFFT"]),
      fame: toNumber(obj.FAME),
      art: toNumber(obj.ART),
      fth: toNumber(obj.FTH),
      civ: toNumber(obj.CIV),
      tech: toNumber(obj.TECH),
      stamps,
      stampTexts: stamps,
      stampBonuses: stamps.map(parseStampBonus).filter(Boolean),
      effectText: stamps.join(" | ")
    };
  }).filter(Boolean);
}

async function loadTimeRiftRelics() {
  setStatus("Loading Time Rift Museum relics…");
  try {
    const response = await fetch(TIME_RIFT_CSV_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Sheet request failed: ${response.status}`);

    const rows = parseCsv(await response.text());
    timeRiftRelics = parseTimeRiftRelics(rows);
    cleanInvalidAssignments();
    setStatus(`Loaded ${timeRiftRelics.length} relic rows from “${TIME_RIFT_TAB_NAME}”.`);
    renderAll();
  } catch (error) {
    console.error("CSV load failed:", error);
    setStatus("Could not load relics. Check that the Google Sheet tab is published to CSV.", true);
  }
}

function getPedestalType(slot) {
  return timeRiftSlotTypes[String(slot)] || TIME_RIFT_PEDESTALS.find((pedestal) => pedestal.slot === Number(slot))?.type || "FAME";
}

function getBaseStat(relic, pedestalType) {
  if (!relic) return 0;
  if (pedestalType === "ALL") return relic.fame + relic.art + relic.fth + relic.civ + relic.tech;
  return relic[pedestalType.toLowerCase()] || 0;
}

function getValidStampBonus(relic, pedestalType) {
  if (!relic) return 0;
  return relic.stampBonuses.reduce((total, bonus) => {
    if (pedestalType === "ALL") return bonus.target === "ALL" ? total + bonus.value : total;
    return bonus.target === pedestalType ? total + bonus.value : total;
  }, 0);
}

function calculateRelicScoreForPedestal(relic, pedestalType) {
  return relic ? getBaseStat(relic, pedestalType) + getValidStampBonus(relic, pedestalType) : 0;
}

function getAssignedRelic(slot) {
  const relicId = timeRiftAssignments[String(slot)];
  return timeRiftRelics.find((relic) => relic.id === relicId) || null;
}

function getAssignedFamilies(exceptSlot = null) {
  return new Set(Object.entries(timeRiftAssignments)
    .filter(([slot, relicId]) => relicId && String(slot) !== String(exceptSlot))
    .map(([, relicId]) => timeRiftRelics.find((relic) => relic.id === relicId)?.familyId)
    .filter(Boolean));
}

function calculateTotalMuseumPoints(assignments = timeRiftAssignments) {
  return TIME_RIFT_PEDESTALS.reduce((total, pedestal) => {
    const relic = timeRiftRelics.find((item) => item.id === assignments[String(pedestal.slot)]);
    return total + calculateRelicScoreForPedestal(relic, getPedestalType(pedestal.slot));
  }, 0);
}

function getCurrentRating(totalPoints) {
  const unlocked = TIME_RIFT_THRESHOLDS.filter((threshold) => totalPoints >= threshold.points);
  return unlocked.length ? unlocked[unlocked.length - 1].rating : "—";
}

function getNextThreshold(totalPoints) {
  return TIME_RIFT_THRESHOLDS.find((threshold) => totalPoints < threshold.points) || null;
}

function getGroupPedestals(group = activeGroup) {
  if (viewMode === "slot") return TIME_RIFT_PEDESTALS;
  return TIME_RIFT_PEDESTALS.filter((pedestal) => getPedestalType(pedestal.slot) === group);
}

function groupLabel(group) {
  return group === "ALL" ? "ALL Slots" : `${group} Slots`;
}

function groupIconClass(group) {
  return group.toLowerCase();
}

function assignedCountForGroup(group) {
  return TIME_RIFT_PEDESTALS.filter((pedestal) => getPedestalType(pedestal.slot) === group && timeRiftAssignments[String(pedestal.slot)]).length;
}

function totalCountForGroup(group) {
  return TIME_RIFT_PEDESTALS.filter((pedestal) => getPedestalType(pedestal.slot) === group).length;
}

function renderGroupNav() {
  const nav = document.getElementById("group-nav");
  if (!nav) return;

  nav.innerHTML = GROUP_ORDER.map((group) => {
    const assigned = assignedCountForGroup(group);
    const total = totalCountForGroup(group);
    const active = viewMode === "group" && activeGroup === group ? "active" : "";
    return `
      <button class="group-button ${active}" type="button" data-group="${group}">
        <span class="group-icon ${groupIconClass(group)}"></span>
        <b>${groupLabel(group)}</b>
        <span>${assigned} / ${total}</span>
      </button>`;
  }).join("");

  nav.querySelectorAll("[data-group]").forEach((button) => {
    button.addEventListener("click", () => {
      activeGroup = button.dataset.group;
      viewMode = "group";
      renderAll();
    });
  });
}

function renderMuseumSummary() {
  const total = calculateTotalMuseumPoints();
  const next = getNextThreshold(total);
  const previous = TIME_RIFT_THRESHOLDS.filter((threshold) => total >= threshold.points).pop()?.points || 0;
  const range = next ? next.points - previous : 1;
  const progress = next ? Math.max(0, Math.min(100, ((total - previous) / range) * 100)) : 100;

  setText("total-points", total.toLocaleString());
  setText("current-rating", getCurrentRating(total));
  setText("next-threshold", next ? `${next.points.toLocaleString()} (${next.rating})` : "Maxed");
  setText("points-needed", next ? (next.points - total).toLocaleString() : "0");

  const bar = document.getElementById("rank-progress-bar");
  if (bar) bar.style.width = `${progress}%`;
}

function renderViewButtons() {
  document.querySelectorAll("[data-view-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.viewMode === viewMode);
    button.addEventListener("click", () => {
      viewMode = button.dataset.viewMode;
      renderAll();
    }, { once: true });
  });
}

function renderMuseumStage() {
  const stage = document.getElementById("museum-stage");
  if (!stage) return;

  const pedestals = getGroupPedestals();
  const assigned = pedestals.filter((pedestal) => timeRiftAssignments[String(pedestal.slot)]).length;
  const title = viewMode === "slot" ? "All Slots" : groupLabel(activeGroup);

  stage.innerHTML = `
    <header class="museum-stage-header">
      <div class="stage-title">
        <span class="group-icon ${viewMode === "slot" ? "all" : groupIconClass(activeGroup)}"></span>
        <h2>${title}</h2>
        <span>${assigned} / ${pedestals.length}</span>
      </div>
      <button class="stage-collapse" type="button">Collapse⌃</button>
    </header>
    <div class="museum-hall">
      ${pedestals.map(renderPedestalCard).join("")}
    </div>`;

  stage.querySelectorAll("[data-open-picker]").forEach((button) => {
    button.addEventListener("click", () => openRelicPicker(Number(button.dataset.openPicker)));
  });
}

function renderPedestalCard(pedestal) {
  const type = getPedestalType(pedestal.slot);
  const relic = getAssignedRelic(pedestal.slot);
  const score = calculateRelicScoreForPedestal(relic, type);
  const name = relic ? relic.name : type;
  const level = relic ? (relic.level || relic.rank || "Selected") : "ALL";
  const glyph = relic ? type : type;

  return `
    <article class="pedestal-cell type-${type.toLowerCase()}">
      <div class="slot-medallion">${pedestal.slot}</div>
      <div class="relic-plaque ${relic ? "has-relic" : "empty"}">
        <span class="relic-glyph ${glyph.toLowerCase()}"></span>
      </div>
      <div class="relic-nameplate" title="${escapeHtml(name)}">
        <b>${escapeHtml(name)}</b>
        <span>${escapeHtml(level)}</span>
      </div>
      <div class="score-pill">${score.toLocaleString()}</div>
      <button class="change-relic" type="button" data-open-picker="${pedestal.slot}">Change Relic</button>
    </article>`;
}

function openRelicPicker(slot) {
  pickerSlot = slot;
  pickerFilter = "available";
  pickerTypeFilter = "all";
  setText("picker-slot-label", `Slot ${slot} · ${getPedestalType(slot)} pedestal`);
  document.getElementById("relic-search").value = "";
  const sort = document.getElementById("relic-sort");
  if (sort) sort.value = "score";
  document.querySelectorAll(".picker-filter").forEach((button) => {
    button.classList.toggle("active", button.dataset.pickerFilter === pickerFilter);
  });
  document.querySelectorAll(".picker-type").forEach((button) => {
    button.classList.toggle("active", button.dataset.pickerType === pickerTypeFilter);
  });
  document.getElementById("relic-picker").hidden = false;
  renderRelicResults();
  setTimeout(() => document.getElementById("relic-search")?.focus(), 0);
}

function closeRelicPicker() {
  pickerSlot = null;
  document.getElementById("relic-picker").hidden = true;
}

function displayRelicBaseName(name) {
  return String(name || "").replace(/\s[-–—]\s*(Awaken|6|5|4|3)$/i, "").trim();
}

function levelSortValue(level) {
  const raw = String(level || "").trim().toLowerCase();
  if (raw.includes("awaken")) return 7;
  const num = toNumber(raw);
  return num || 0;
}

function summarizeRelicStamp(item, pedestalType) {
  if (!item.relic) return "";
  const base = getBaseStat(item.relic, pedestalType);
  if (!item.bonus) return `${pedestalType === "ALL" ? "Total AFFCT" : pedestalType} ${base}`;
  return `${pedestalType === "ALL" ? "Total AFFCT" : pedestalType} ${base} + ${item.bonus} stamp`;
}

function renderRelicResults() {
  const results = document.getElementById("relic-results");
  if (!results || !pickerSlot) return;

  const type = getPedestalType(pickerSlot);
  const query = normalizeText(document.getElementById("relic-search")?.value || "");
  const sortMode = document.getElementById("relic-sort")?.value || "score";
  const unavailableFamilies = getAssignedFamilies(pickerSlot);
  const queryParts = query.split(/\s+/).filter(Boolean);

  let items = timeRiftRelics.map((relic) => {
    const score = calculateRelicScoreForPedestal(relic, type);
    const bonus = getValidStampBonus(relic, type);
    const unavailable = unavailableFamilies.has(relic.familyId);
    const baseName = displayRelicBaseName(relic.name);
    const haystack = normalizeText([
      baseName,
      relic.name,
      relic.level,
      relic.rank,
      relic.type,
      relic.effectText,
      relic.fame,
      relic.art,
      relic.fth,
      relic.civ,
      relic.tech
    ].join(" "));
    return { relic, score, bonus, unavailable, baseName, haystack };
  });

  if (queryParts.length) items = items.filter((item) => queryParts.every((part) => item.haystack.includes(part)));
  if (pickerTypeFilter !== "all") items = items.filter((item) => normalizeText(item.relic.type) === normalizeText(pickerTypeFilter));
  if (pickerFilter === "available") items = items.filter((item) => !item.unavailable);
  if (pickerFilter === "stamp") items = items.filter((item) => item.bonus > 0);
  if (pickerFilter === "best") items = items.filter((item) => item.score > 0);

  const groups = new Map();
  items.forEach((item) => {
    if (!groups.has(item.relic.familyId)) groups.set(item.relic.familyId, []);
    groups.get(item.relic.familyId).push(item);
  });

  let groupItems = [...groups.values()].map((levels) => {
    const sortedLevels = levels.sort((a, b) => levelSortValue(b.relic.level) - levelSortValue(a.relic.level) || b.score - a.score);
    const best = [...sortedLevels].sort((a, b) => b.score - a.score || b.bonus - a.bonus || levelSortValue(b.relic.level) - levelSortValue(a.relic.level))[0];
    return { best, levels: sortedLevels };
  });

  groupItems = groupItems.sort((a, b) => {
    if (sortMode === "name") return a.best.baseName.localeCompare(b.best.baseName);
    if (sortMode === "level") return levelSortValue(b.best.relic.level) - levelSortValue(a.best.relic.level) || b.best.score - a.best.score;
    if (sortMode === "stamp") return b.best.bonus - a.best.bonus || b.best.score - a.best.score || a.best.baseName.localeCompare(b.best.baseName);
    return b.best.score - a.best.score || b.best.bonus - a.best.bonus || a.best.baseName.localeCompare(b.best.baseName);
  });

  const totalMatches = items.length;
  const visibleGroups = groupItems.slice(0, pickerFilter === "best" ? 40 : 80);
  setText(
    "picker-result-count",
    `${groupItems.length.toLocaleString()} relic name${groupItems.length === 1 ? "" : "s"} · ${totalMatches.toLocaleString()} level row${totalMatches === 1 ? "" : "s"}${visibleGroups.length < groupItems.length ? ` · showing top ${visibleGroups.length}` : ""}`
  );

  if (!visibleGroups.length) {
    results.innerHTML = `<p class="empty-results">No relics match that search.</p>`;
    return;
  }

  results.innerHTML = visibleGroups.map((group, index) => {
    const best = group.best;
    const statText = `FAME ${best.relic.fame} · ART ${best.relic.art} · FTH ${best.relic.fth} · CIV ${best.relic.civ} · TECH ${best.relic.tech}`;
    const stampSummary = summarizeRelicStamp(best, type);
    const levelButtons = group.levels.map((item) => {
      const levelLabel = item.relic.level || item.relic.rank || "?";
      const chipTitle = summarizeRelicStamp(item, type);
      return `
        <button class="level-choice ${item.bonus ? "has-stamp" : ""} ${item.unavailable ? "unavailable" : ""}" type="button" data-relic-id="${escapeHtml(item.relic.id)}" ${item.unavailable ? "disabled" : ""} title="${escapeHtml(chipTitle)}">
          <span>${escapeHtml(levelLabel)}</span>
          <strong>${item.score.toLocaleString()}</strong>
          ${item.bonus ? `<small>+${item.bonus}</small>` : ""}
        </button>`;
    }).join("");

    return `
      <article class="relic-family-option">
        <div class="relic-family-head">
          <span class="relic-mini-icon"><span class="relic-glyph ${type.toLowerCase()}"></span></span>
          <div>
            <b>${index + 1}. ${escapeHtml(best.baseName)}</b>
            <small>${escapeHtml(stampSummary)}</small>
            <em>${escapeHtml(statText)}</em>
          </div>
          <span class="relic-score">${best.score.toLocaleString()}</span>
        </div>
        <div class="level-choice-row" aria-label="Choose ${escapeHtml(best.baseName)} level">
          ${levelButtons}
        </div>
      </article>`;
  }).join("");

  results.querySelectorAll("[data-relic-id]").forEach((button) => {
    button.addEventListener("click", () => assignRelicToSlot(pickerSlot, button.dataset.relicId));
  });
}

function assignRelicToSlot(slot, relicId) {
  if (relicId) timeRiftAssignments[String(slot)] = relicId;
  else delete timeRiftAssignments[String(slot)];
  saveAssignments();
  closeRelicPicker();
  renderAll();
}

function getRecommendationsForPedestal(pedestal, limit = 5) {
  const type = getPedestalType(pedestal.slot);
  const assignedFamilies = getAssignedFamilies();
  return timeRiftRelics
    .filter((relic) => !assignedFamilies.has(relic.familyId))
    .map((relic) => ({ relic, score: calculateRelicScoreForPedestal(relic, type), bonus: getValidStampBonus(relic, type) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.relic.name.localeCompare(b.relic.name))
    .slice(0, limit);
}

function renderRecommendations() {
  const container = document.getElementById("recommendations");
  if (!container) return;

  const emptyPedestals = getGroupPedestals().filter((pedestal) => !timeRiftAssignments[String(pedestal.slot)]).slice(0, 14);
  if (!emptyPedestals.length) {
    container.innerHTML = `<p>All visible slots are assigned.</p>`;
    return;
  }

  container.innerHTML = emptyPedestals.map((pedestal) => {
    const type = getPedestalType(pedestal.slot);
    const items = getRecommendationsForPedestal(pedestal).map((item) => {
      const stamp = item.bonus ? ` <small>(+${item.bonus} stamp)</small>` : "";
      return `<li>${escapeHtml(item.relic.name)}${item.relic.level ? ` · ${escapeHtml(item.relic.level)}` : ""} — <strong>${item.score.toLocaleString()}</strong>${stamp}</li>`;
    }).join("") || `<li>No available relics found.</li>`;

    return `<article class="recommendation-card"><h3>Slot ${pedestal.slot} · ${type}</h3><ol>${items}</ol></article>`;
  }).join("");
}

function renderBuffs() {
  const list = document.getElementById("buff-list");
  if (!list) return;

  const total = calculateTotalMuseumPoints();
  list.innerHTML = `
    <table class="buff-table">
      <thead><tr><th>Points</th><th>Rating</th><th>Buff</th><th>Status</th></tr></thead>
      <tbody>
        ${TIME_RIFT_THRESHOLDS.map((threshold) => {
          const unlocked = total >= threshold.points;
          return `<tr class="${unlocked ? "unlocked" : "locked"}"><td>${threshold.points.toLocaleString()}</td><td>${threshold.rating}</td><td>${escapeHtml(threshold.buff)}</td><td>${unlocked ? "Unlocked" : "Locked"}</td></tr>`;
        }).join("")}
      </tbody>
    </table>`;
}

function getSelectedOptimizerGoals() {
  const selected = [...document.querySelectorAll('input[name="optimizer-goal"]:checked')].map((input) => input.value);
  return selected.length ? selected : ["points"];
}

function getOptimizerPointTarget() {
  const value = toNumber(document.getElementById("optimizer-point-target")?.value || "");
  return value > 0 ? value : 0;
}

function matchesGoal(relic, goalKey) {
  if (!relic || goalKey === "points") return false;
  const goal = OPTIMIZER_GOALS[goalKey];
  if (!goal) return false;
  const text = normalizeText([relic.effectText, ...relic.stampTexts].join(" | "));
  return goal.keywords.some((keyword) => text.includes(keyword));
}

function getGoalMatches(relic, goals) {
  return goals.filter((goalKey) => matchesGoal(relic, goalKey));
}

function optimizerScore(relic, pedestalType, goals, priority, currentTotal, pointTarget) {
  const points = calculateRelicScoreForPedestal(relic, pedestalType);
  const rewardGoals = goals.filter((goal) => goal !== "points");
  const pointGoalSelected = goals.includes("points") || pointTarget > 0;
  const stillNeedsPoints = pointTarget > 0 && currentTotal < pointTarget;
  const pointWeight = stillNeedsPoints ? 4 : pointGoalSelected ? 1 : 0.25;
  const rewardMultiplier = priority === "hard" ? 2.5 : 1;
  const rewardBonus = rewardGoals.reduce((sum, goalKey) => {
    if (!matchesGoal(relic, goalKey)) return sum;
    return sum + (OPTIMIZER_GOALS[goalKey]?.weight || 0);
  }, 0);
  return points * pointWeight + rewardBonus * rewardMultiplier;
}

function buildOptimizedSetup(goals, priority, pointTarget = 0) {
  const usedFamilies = new Set();
  const setup = [];
  let runningTotal = 0;

  TIME_RIFT_PEDESTALS.forEach((pedestal) => {
    const type = getPedestalType(pedestal.slot);
    const best = timeRiftRelics
      .filter((relic) => !usedFamilies.has(relic.familyId))
      .map((relic) => {
        const points = calculateRelicScoreForPedestal(relic, type);
        const matchedGoals = getGoalMatches(relic, goals);
        return {
          relic,
          pedestal,
          pedestalType: type,
          points,
          matchedGoals,
          goalMatch: matchedGoals.length > 0,
          optimizerScore: optimizerScore(relic, type, goals, priority, runningTotal, pointTarget)
        };
      })
      .sort((a, b) => b.optimizerScore - a.optimizerScore || b.points - a.points || a.relic.name.localeCompare(b.relic.name))[0];

    if (best) {
      usedFamilies.add(best.relic.familyId);
      setup.push(best);
      runningTotal += best.points;
    }
  });

  return setup;
}

function formatGoalName(goalKey) {
  const names = {
    points: "Museum Points",
    intel: "INTEL",
    "dragon-orbs": "Dragon Orbs",
    btads: "B-tads",
    cells: "Cells",
    speed: "Travel Speed",
    medals: "Museum Medals",
    damage: "Rift Combat"
  };
  return names[goalKey] || goalKey;
}


function renderOptimizerInsights(setup, goals, pointTarget, total) {
  const container = document.getElementById("optimizer-insights");
  if (!container) return;

  if (!setup.length) {
    container.innerHTML = `<p class="optimizer-empty-note">Load relics to preview optimizer details.</p>`;
    return;
  }

  const rewardGoals = goals.filter((goal) => goal !== "points");
  const targetLine = pointTarget
    ? `<span class="insight-pill ${total >= pointTarget ? "met" : "missed"}">${total >= pointTarget ? "Target met" : "Target short"}: ${total.toLocaleString()} / ${pointTarget.toLocaleString()}</span>`
    : `<span class="insight-pill met">Maximizing Museum Points</span>`;

  const stampHighlights = setup
    .map((item) => ({ ...item, stampBonus: getValidStampBonus(item.relic, item.pedestalType), base: getBaseStat(item.relic, item.pedestalType) }))
    .filter((item) => item.stampBonus > 0)
    .sort((a, b) => b.stampBonus - a.stampBonus || b.points - a.points)
    .slice(0, 5);

  const goalCounts = rewardGoals.map((goalKey) => {
    const count = setup.filter((item) => item.matchedGoals.includes(goalKey)).length;
    return `<span class="insight-pill">${escapeHtml(formatGoalName(goalKey))}: ${count}</span>`;
  }).join("");

  const stampList = stampHighlights.length
    ? stampHighlights.map((item) => `
        <li>
          <strong>Slot ${item.pedestal.slot}</strong>
          <span>${escapeHtml(displayRelicBaseName(item.relic.name))} · ${escapeHtml(item.relic.level || item.relic.rank || "?")}</span>
          <em>${item.base.toLocaleString()} + ${item.stampBonus.toLocaleString()} stamp = ${item.points.toLocaleString()}</em>
        </li>`).join("")
    : `<li><span>No matching stamp bonuses in this preview.</span></li>`;

  container.innerHTML = `
    <div class="optimizer-preview-pills">
      ${targetLine}
      ${goalCounts || `<span class="insight-pill">Reward goals: none selected</span>`}
    </div>
    <div class="optimizer-stamp-preview">
      <h3>Stamp bonus preview</h3>
      <ul>${stampList}</ul>
    </div>`;
}

function renderOptimizer() {
  const goals = getSelectedOptimizerGoals();
  const priority = document.getElementById("optimizer-priority")?.value || "balanced";
  const pointTarget = getOptimizerPointTarget();
  const setup = buildOptimizedSetup(goals, priority, pointTarget);
  const total = setup.reduce((sum, item) => sum + item.points, 0);
  const matches = setup.reduce((sum, item) => sum + item.matchedGoals.length, 0);
  const max = Math.max(...setup.map((item) => item.points), 1);

  setText("optimized-points", total.toLocaleString());
  setText("optimized-rating", getCurrentRating(total));
  setText("optimized-matches", goals.filter((goal) => goal !== "points").length ? matches.toLocaleString() : "—");
  renderOptimizerInsights(setup, goals, pointTarget, total);

  const list = document.getElementById("optimized-list");
  if (!list) return;
  if (!setup.length) {
    list.innerHTML = `<p>Load relics first.</p>`;
    return;
  }

  const targetMessage = pointTarget
    ? `<p class="optimizer-result-note ${total >= pointTarget ? "met" : "missed"}">${total >= pointTarget ? "Target met" : "Target not met"}: ${total.toLocaleString()} / ${pointTarget.toLocaleString()} Museum Points</p>`
    : "";

  list.innerHTML = targetMessage + setup.map((item) => {
    const width = Math.max(5, Math.round((item.points / max) * 100));
    const label = item.matchedGoals.length ? item.matchedGoals.map(formatGoalName).join(", ") : "Points pick";
    return `
      <article class="optimized-row">
        <strong>Slot ${item.pedestal.slot}</strong>
        <span class="type-pill">${item.pedestalType}</span>
        <div>
          <strong>${escapeHtml(item.relic.name)}</strong>${item.relic.level ? ` <small>· ${escapeHtml(item.relic.level)}</small>` : ""}<br />
          <small>${item.pedestalType === "ALL" ? "Total AFFCT" : item.pedestalType} score</small>
          <div class="score-bar"><span style="width:${width}%"></span></div>
        </div>
        <strong>${item.points.toLocaleString()}</strong>
        <span class="goal-pill">${escapeHtml(label)}</span>
      </article>`;
  }).join("");
}

function applyOptimizedSetup() {
  const goals = getSelectedOptimizerGoals();
  const priority = document.getElementById("optimizer-priority")?.value || "balanced";
  const pointTarget = getOptimizerPointTarget();
  const setup = buildOptimizedSetup(goals, priority, pointTarget);

  timeRiftAssignments = {};
  setup.forEach((item) => { timeRiftAssignments[String(item.pedestal.slot)] = item.relic.id; });
  saveAssignments();
  activeTab = "setup";
  renderAll();
}

function renderTabs() {
  document.querySelectorAll(".rift-tab").forEach((button) => {
    const isActive = button.dataset.tab === activeTab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  document.querySelectorAll(".tab-panel").forEach((panel) => {
    const isActive = panel.id === `panel-${activeTab}`;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });
}

function renderAll() {
  renderTabs();
  renderMuseumSummary();
  renderGroupNav();
  renderViewButtons();
  renderMuseumStage();
  renderRecommendations();
  renderBuffs();
  renderOptimizer();
}

function saveAssignments() {
  localStorage.setItem(TIME_RIFT_STORAGE_KEY, JSON.stringify(timeRiftAssignments));
}

function loadSavedState() {
  try { timeRiftAssignments = JSON.parse(localStorage.getItem(TIME_RIFT_STORAGE_KEY)) || {}; } catch { timeRiftAssignments = {}; }
  try { timeRiftSlotTypes = JSON.parse(localStorage.getItem(TIME_RIFT_SLOT_STORAGE_KEY)) || {}; } catch { timeRiftSlotTypes = {}; }

  const autoSync = localStorage.getItem(TIME_RIFT_AUTO_SYNC_KEY);
  const autoSyncInput = document.getElementById("auto-sync-relics");
  if (autoSyncInput && autoSync !== null) autoSyncInput.checked = autoSync === "true";
}

function cleanInvalidAssignments() {
  const validIds = new Set(timeRiftRelics.map((relic) => relic.id));
  Object.keys(timeRiftAssignments).forEach((slot) => {
    if (!validIds.has(timeRiftAssignments[slot])) delete timeRiftAssignments[slot];
  });
  saveAssignments();
}

function resetAssignments() {
  if (!window.confirm("Reset all Time Rift Museum assignments?")) return;
  timeRiftAssignments = {};
  localStorage.removeItem(TIME_RIFT_STORAGE_KEY);
  renderAll();
}

function saveSnapshot() {
  const input = document.getElementById("snapshot-name");
  const name = input?.value.trim() || new Date().toLocaleDateString();
  let snapshots = [];
  try { snapshots = JSON.parse(localStorage.getItem(TIME_RIFT_SNAPSHOT_KEY)) || []; } catch { snapshots = []; }
  snapshots.unshift({ name, date: new Date().toISOString(), assignments: timeRiftAssignments, points: calculateTotalMuseumPoints() });
  localStorage.setItem(TIME_RIFT_SNAPSHOT_KEY, JSON.stringify(snapshots.slice(0, 20)));
  if (input) input.value = "";
  setStatus(`Saved snapshot: ${name}.`);
}

function setStatus(message, isError = false) {
  const status = document.getElementById("sync-status");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function bindStaticEvents() {
  document.getElementById("reset-museum")?.addEventListener("click", resetAssignments);
  document.getElementById("refresh-relics")?.addEventListener("click", loadTimeRiftRelics);
  document.getElementById("save-snapshot")?.addEventListener("click", saveSnapshot);
  document.querySelectorAll('input[name="optimizer-goal"]').forEach((input) => input.addEventListener("change", renderOptimizer));
  document.getElementById("optimizer-point-target")?.addEventListener("input", renderOptimizer);
  document.getElementById("optimizer-priority")?.addEventListener("change", renderOptimizer);
  document.getElementById("apply-optimized")?.addEventListener("click", applyOptimizedSetup);
  document.getElementById("close-picker")?.addEventListener("click", closeRelicPicker);
  document.getElementById("clear-relic")?.addEventListener("click", () => assignRelicToSlot(pickerSlot, ""));
  document.getElementById("relic-search")?.addEventListener("input", renderRelicResults);
  document.getElementById("relic-sort")?.addEventListener("change", renderRelicResults);
  document.getElementById("relic-picker")?.addEventListener("click", (event) => {
    if (event.target.id === "relic-picker") closeRelicPicker();
  });
  document.getElementById("auto-sync-relics")?.addEventListener("change", (event) => {
    localStorage.setItem(TIME_RIFT_AUTO_SYNC_KEY, String(event.target.checked));
  });

  document.querySelectorAll(".rift-tab").forEach((button) => {
    button.addEventListener("click", () => {
      activeTab = button.dataset.tab;
      renderAll();
    });
  });

  document.querySelectorAll(".picker-filter").forEach((button) => {
    button.addEventListener("click", () => {
      pickerFilter = button.dataset.pickerFilter;
      document.querySelectorAll(".picker-filter").forEach((item) => item.classList.toggle("active", item === button));
      renderRelicResults();
    });
  });

  document.querySelectorAll(".picker-type").forEach((button) => {
    button.addEventListener("click", () => {
      pickerTypeFilter = button.dataset.pickerType;
      document.querySelectorAll(".picker-type").forEach((item) => item.classList.toggle("active", item === button));
      renderRelicResults();
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !document.getElementById("relic-picker")?.hidden) closeRelicPicker();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadSavedState();
  bindStaticEvents();
  renderAll();

  if (document.getElementById("auto-sync-relics")?.checked !== false) {
    loadTimeRiftRelics();
  } else {
    setStatus("Auto-sync is off. Click Sync Relic Data to refresh relics.");
  }
});
