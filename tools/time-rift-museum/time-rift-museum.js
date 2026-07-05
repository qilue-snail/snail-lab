/* =========================================================
   Time Rift Museum Tool — Version 7
   Clean Input + Museum workflow. Owned relics drive picker and optimizer.
========================================================= */

const TIME_RIFT_TAB_NAME = "Time Rift Museum Relics";
const TIME_RIFT_STORAGE_KEY = "timeRiftMuseumAssignmentsV2";
const TIME_RIFT_OWNED_KEY = "timeRiftMuseumOwnedRelicsV7";
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
  speed: { keywords: ["travel speed", "travel spd", "speed"], weight: 1000 }
};

let timeRiftRelics = [];
let timeRiftAssignments = {};
let timeRiftOwned = {};
let timeRiftSlotTypes = {};
let activeTab = "input";
let activeGroup = "ALL";
let viewMode = "group";
let pickerSlot = null;
let pickerFilter = "all";
let pickerTypeFilter = "all";

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

function displayRelicBaseName(name) {
  return String(name || "").replace(/\s[-–—]\s*(Awaken|6|5|4|3)$/i, "").trim();
}

function relicFamilyId(name) {
  return normalizeId(displayRelicBaseName(name));
}

function levelSortValue(level) {
  const raw = String(level || "").trim().toLowerCase();
  if (raw.includes("awaken")) return 7;
  return toNumber(raw) || 0;
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
    const stamps = [obj["Stamp 1"], obj["Stamp 2"], obj["Stamp 3"]]
      .map((stamp) => String(stamp || "").trim())
      .filter(Boolean);

    return {
      id: normalizeId(`${name}-${level || rank || index}`),
      familyId: relicFamilyId(name),
      baseName: displayRelicBaseName(name),
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

    timeRiftRelics = parseTimeRiftRelics(parseCsv(await response.text()));
    cleanInvalidState();
    setStatus(`Loaded ${timeRiftRelics.length} relic rows from “${TIME_RIFT_TAB_NAME}”.`);
    renderAll();
  } catch (error) {
    console.error("CSV load failed:", error);
    setStatus("Could not load relics. Check that the Google Sheet tab is published to CSV.", true);
    renderAll();
  }
}

function getRelicFamilies() {
  const groups = new Map();
  timeRiftRelics.forEach((relic) => {
    if (!groups.has(relic.familyId)) groups.set(relic.familyId, []);
    groups.get(relic.familyId).push(relic);
  });

  return [...groups.entries()]
    .map(([familyId, levels]) => {
      const sortedLevels = levels.sort((a, b) => levelSortValue(b.level) - levelSortValue(a.level));
      return { familyId, name: sortedLevels[0].baseName, type: sortedLevels[0].type, levels: sortedLevels };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function findOwnedRelic(familyId) {
  const relicId = timeRiftOwned[familyId];
  return relicId ? timeRiftRelics.find((relic) => relic.id === relicId) || null : null;
}

function getOwnedRelics() {
  return Object.values(timeRiftOwned)
    .map((id) => timeRiftRelics.find((relic) => relic.id === id))
    .filter(Boolean);
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

function renderOwnedInput() {
  const container = document.getElementById("owned-relic-list");
  if (!container) return;

  if (!timeRiftRelics.length) {
    container.innerHTML = `<p class="empty-state">Sync relic data to load the owned relic input list.</p>`;
    setText("owned-count", "0");
    return;
  }

  const queryParts = normalizeText(document.getElementById("owned-search")?.value || "").split(/\s+/).filter(Boolean);
  const typeFilter = document.getElementById("owned-type-filter")?.value || "all";
  const viewFilter = document.getElementById("owned-view-filter")?.value || "all";

  let visible = getRelicFamilies().map((family) => {
    const owned = findOwnedRelic(family.familyId);
    const best = family.levels[0];
    const haystack = normalizeText([family.name, family.type, best.effectText, best.fame, best.art, best.fth, best.civ, best.tech].join(" "));
    return { family, owned, best, haystack };
  });

  if (typeFilter !== "all") visible = visible.filter((item) => normalizeText(item.family.type) === normalizeText(typeFilter));
  if (viewFilter === "owned") visible = visible.filter((item) => item.owned);
  if (viewFilter === "missing") visible = visible.filter((item) => !item.owned);
  if (queryParts.length) visible = visible.filter((item) => queryParts.every((part) => item.haystack.includes(part)));

  setText("owned-count", getOwnedRelics().length.toLocaleString());

  if (!visible.length) {
    container.innerHTML = `<p class="empty-state">No relics match that filter.</p>`;
    return;
  }

  container.innerHTML = visible.slice(0, 240).map(({ family, owned, best }) => {
    const levelOptions = [`<option value="">Not Owned</option>`, ...family.levels.map((relic) => {
      const label = relic.level || relic.rank || "?";
      return `<option value="${escapeHtml(relic.id)}" ${owned?.id === relic.id ? "selected" : ""}>${escapeHtml(label)}</option>`;
    })].join("");

    return `
      <article class="owned-row ${owned ? "owned" : "missing"}">
        <span class="owned-art">${relicArtworkMarkup(owned || best, best.type || "ALL", "small")}</span>
        <div class="owned-info">
          <b>${escapeHtml(family.name)}</b>
          <small>${escapeHtml(best.type || "—")} · FAME ${best.fame} · ART ${best.art} · FTH ${best.fth} · CIV ${best.civ} · TECH ${best.tech}</small>
          <em>${best.effectText ? escapeHtml(best.effectText) : "No stamp text"}</em>
        </div>
        <label class="owned-level-label">
          <span>Owned Level</span>
          <select data-owned-family="${escapeHtml(family.familyId)}">${levelOptions}</select>
        </label>
      </article>`;
  }).join("");

  attachRelicArtworkFallbacks();

  container.querySelectorAll("[data-owned-family]").forEach((select) => {
    select.addEventListener("change", () => {
      if (select.value) timeRiftOwned[select.dataset.ownedFamily] = select.value;
      else delete timeRiftOwned[select.dataset.ownedFamily];

      cleanAssignmentsAgainstOwned();
      saveOwnedRelics();
      saveAssignments();
      renderAll();
    });
  });
}

function getGroupPedestals(group = activeGroup) {
  if (viewMode === "slot") return TIME_RIFT_PEDESTALS;
  return TIME_RIFT_PEDESTALS.filter((pedestal) => getPedestalType(pedestal.slot) === group);
}

function groupLabel(group) {
  return group === "ALL" ? "ALL Slots" : `${group} Slots`;
}

function groupIconMarkup(group) {
  const type = String(group || "ALL").toLowerCase();
  return `
    <span class="group-icon group-icon-art">
      <img src="assets/placeholders/${type}.png" alt="" loading="lazy" />
      <span class="group-icon-fallback ${type}" aria-hidden="true"></span>
    </span>`;
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

  nav.innerHTML = GROUP_ORDER.map((group) => `
    <button class="group-button ${viewMode === "group" && activeGroup === group ? "active" : ""}" type="button" data-group="${group}">
      ${groupIconMarkup(group)}
      <b>${groupLabel(group)}</b>
      <span>${assignedCountForGroup(group)} / ${totalCountForGroup(group)}</span>
    </button>`).join("");

  attachGroupIconFallbacks();

  nav.querySelectorAll("[data-group]").forEach((button) => {
    button.addEventListener("click", () => {
      activeGroup = button.dataset.group;
      viewMode = "group";
      renderAll();
    });
  });
}

function renderViewButtons() {
  document.querySelectorAll("[data-view-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.viewMode === viewMode);
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
        ${groupIconMarkup(viewMode === "slot" ? "ALL" : activeGroup)}
        <h2>${title}</h2>
        <span>${assigned} / ${pedestals.length}</span>
      </div>
    </header>
    <div class="museum-scroll">
      <div class="museum-hall">
        ${pedestals.map(renderPedestalCard).join("")}
      </div>
    </div>`;

  attachRelicArtworkFallbacks();
  attachGroupIconFallbacks();

  stage.querySelectorAll("[data-open-picker]").forEach((button) => {
    button.addEventListener("click", () => openRelicPicker(Number(button.dataset.openPicker)));
  });
}

function renderPedestalCard(pedestal) {
  const type = getPedestalType(pedestal.slot);
  const relic = getAssignedRelic(pedestal.slot);
  const score = calculateRelicScoreForPedestal(relic, type);
  const name = relic ? relic.baseName : type;
  const level = relic ? (relic.level || relic.rank || "Selected") : "Empty";

  return `
    <article class="pedestal-cell type-${type.toLowerCase()}">
      <div class="slot-medallion">${pedestal.slot}</div>
      <div class="relic-plaque ${relic ? "has-relic" : "empty"}">${relicArtworkMarkup(relic, type, "large")}</div>
      <div class="relic-nameplate" title="${escapeHtml(name)}"><b>${escapeHtml(name)}</b><span>${escapeHtml(level)}</span></div>
      <div class="score-pill">${score.toLocaleString()}</div>
      <button class="change-relic" type="button" data-open-picker="${pedestal.slot}">Change Relic</button>
    </article>`;
}

function openRelicPicker(slot) {
  pickerSlot = slot;
  pickerFilter = "all";
  pickerTypeFilter = "all";
  setText("picker-slot-label", `Slot ${slot} · ${getPedestalType(slot)} pedestal`);

  const search = document.getElementById("relic-search");
  if (search) search.value = "";

  const sort = document.getElementById("relic-sort");
  if (sort) sort.value = "score";

  document.querySelectorAll(".picker-filter").forEach((button) => button.classList.toggle("active", button.dataset.pickerFilter === pickerFilter));
  document.querySelectorAll(".picker-type").forEach((button) => button.classList.toggle("active", button.dataset.pickerType === pickerTypeFilter));

  document.getElementById("relic-picker").hidden = false;
  renderRelicResults();
  setTimeout(() => search?.focus(), 0);
}

function closeRelicPicker() {
  pickerSlot = null;
  document.getElementById("relic-picker").hidden = true;
}

function summarizeRelicStamp(item, pedestalType) {
  const base = getBaseStat(item.relic, pedestalType);
  if (!item.bonus) return `${pedestalType === "ALL" ? "Total AFFCT" : pedestalType} ${base}`;
  return `${pedestalType === "ALL" ? "Total AFFCT" : pedestalType} ${base} + ${item.bonus} stamp`;
}

function renderRelicResults() {
  const results = document.getElementById("relic-results");
  if (!results || !pickerSlot) return;

  const type = getPedestalType(pickerSlot);
  const queryParts = normalizeText(document.getElementById("relic-search")?.value || "").split(/\s+/).filter(Boolean);
  const sortMode = document.getElementById("relic-sort")?.value || "score";
  const unavailableFamilies = getAssignedFamilies(pickerSlot);

  let items = getOwnedRelics().map((relic) => {
    const score = calculateRelicScoreForPedestal(relic, type);
    const bonus = getValidStampBonus(relic, type);
    const unavailable = unavailableFamilies.has(relic.familyId);
    const haystack = normalizeText([relic.baseName, relic.name, relic.level, relic.rank, relic.type, relic.effectText, relic.fame, relic.art, relic.fth, relic.civ, relic.tech].join(" "));
    return { relic, score, bonus, unavailable, haystack };
  });

  if (queryParts.length) items = items.filter((item) => queryParts.every((part) => item.haystack.includes(part)));
  if (pickerTypeFilter !== "all") items = items.filter((item) => normalizeText(item.relic.type) === normalizeText(pickerTypeFilter));
  if (pickerFilter === "stamp") items = items.filter((item) => item.bonus > 0);
  if (pickerFilter === "best") items = items.filter((item) => item.score > 0);

  items.sort((a, b) => {
    if (sortMode === "name") return a.relic.baseName.localeCompare(b.relic.baseName);
    if (sortMode === "level") return levelSortValue(b.relic.level) - levelSortValue(a.relic.level) || b.score - a.score;
    if (sortMode === "stamp") return b.bonus - a.bonus || b.score - a.score || a.relic.baseName.localeCompare(b.relic.baseName);
    return b.score - a.score || b.bonus - a.bonus || a.relic.baseName.localeCompare(b.relic.baseName);
  });

  setText("picker-result-count", `${items.length.toLocaleString()} owned relic${items.length === 1 ? "" : "s"}`);

  if (!items.length) {
    results.innerHTML = `<p class="empty-state">No owned relics match that search. Add relics on the Input tab first.</p>`;
    return;
  }

  results.innerHTML = items.slice(0, 120).map((item, index) => `
    <button class="relic-owned-option ${item.unavailable ? "unavailable" : ""}" type="button" data-relic-id="${escapeHtml(item.relic.id)}" ${item.unavailable ? "disabled" : ""}>
      <span class="relic-mini-icon">${relicArtworkMarkup(item.relic, type, "small")}</span>
      <span class="relic-picker-text">
        <b>${index + 1}. ${escapeHtml(item.relic.baseName)}</b>
        <small>${escapeHtml(item.relic.level || item.relic.rank || "?")} · ${escapeHtml(summarizeRelicStamp(item, type))}</small>
        <em>FAME ${item.relic.fame} · ART ${item.relic.art} · FTH ${item.relic.fth} · CIV ${item.relic.civ} · TECH ${item.relic.tech}</em>
      </span>
      <strong class="relic-score">${item.score.toLocaleString()}</strong>
    </button>`).join("");

  attachRelicArtworkFallbacks();

  results.querySelectorAll("[data-relic-id]").forEach((button) => {
    button.addEventListener("click", () => assignRelicToSlot(pickerSlot, button.dataset.relicId));
  });
}

function assignRelicToSlot(slot, relicId) {
  if (relicId) timeRiftAssignments[String(slot)] = relicId;
  else delete timeRiftAssignments[String(slot)];

  saveAssignments();
  closeRelicPicker();
  activeTab = "museum";
  renderAll();
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
  const stillNeedsPoints = pointTarget > 0 && currentTotal < pointTarget;
  const pointWeight = stillNeedsPoints ? 4 : goals.includes("points") || pointTarget > 0 ? 1 : 0.25;
  const rewardMultiplier = priority === "hard" ? 2.5 : 1;
  const rewardBonus = rewardGoals.reduce((sum, goalKey) => matchesGoal(relic, goalKey) ? sum + (OPTIMIZER_GOALS[goalKey]?.weight || 0) : sum, 0);
  return points * pointWeight + rewardBonus * rewardMultiplier;
}

function buildOptimizedSetup(goals, priority, pointTarget = 0) {
  const usedFamilies = new Set();
  const setup = [];
  let runningTotal = 0;
  const owned = getOwnedRelics();

  TIME_RIFT_PEDESTALS.forEach((pedestal) => {
    const type = getPedestalType(pedestal.slot);
    const best = owned
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
          optimizerScore: optimizerScore(relic, type, goals, priority, runningTotal, pointTarget)
        };
      })
      .sort((a, b) => b.optimizerScore - a.optimizerScore || b.points - a.points || a.relic.baseName.localeCompare(b.relic.baseName))[0];

    if (best) {
      usedFamilies.add(best.relic.familyId);
      setup.push(best);
      runningTotal += best.points;
    }
  });

  return setup;
}

function formatGoalName(goalKey) {
  const names = { points: "Museum Points", intel: "INTEL", "dragon-orbs": "Dragon Orbs", btads: "B-tads", cells: "Cells", speed: "Travel Speed" };
  return names[goalKey] || goalKey;
}

function renderOptimizerInsights(setup, goals, pointTarget, total) {
  const container = document.getElementById("optimizer-insights");
  if (!container) return;

  if (!getOwnedRelics().length) {
    container.innerHTML = `<p class="optimizer-empty-note">Add owned relics on the Input tab before optimizing.</p>`;
    return;
  }

  const rewardGoals = goals.filter((goal) => goal !== "points");
  const targetLine = pointTarget
    ? `<span class="insight-pill ${total >= pointTarget ? "met" : "missed"}">${total >= pointTarget ? "Target met" : "Target short"}: ${total.toLocaleString()} / ${pointTarget.toLocaleString()}</span>`
    : `<span class="insight-pill met">Maximizing Museum Points</span>`;
  const goalCounts = rewardGoals.map((goalKey) => `<span class="insight-pill">${escapeHtml(formatGoalName(goalKey))}: ${setup.filter((item) => item.matchedGoals.includes(goalKey)).length}</span>`).join("");

  const stampHighlights = setup
    .map((item) => ({ ...item, stampBonus: getValidStampBonus(item.relic, item.pedestalType), base: getBaseStat(item.relic, item.pedestalType) }))
    .filter((item) => item.stampBonus > 0)
    .sort((a, b) => b.stampBonus - a.stampBonus || b.points - a.points)
    .slice(0, 5);

  const stampList = stampHighlights.length
    ? stampHighlights.map((item) => `<li><span class="optimizer-art">${relicArtworkMarkup(item.relic, item.pedestalType, "tiny")}</span><strong>Slot ${item.pedestal.slot}</strong><span>${escapeHtml(item.relic.baseName)} · ${escapeHtml(item.relic.level || "?")}</span><em>${item.base.toLocaleString()} + ${item.stampBonus.toLocaleString()} = ${item.points.toLocaleString()}</em></li>`).join("")
    : `<li class="optimizer-empty-stamp"><span>No matching stamp bonuses in this preview.</span></li>`;

  container.innerHTML = `
    <div class="optimizer-preview-pills">${targetLine}${goalCounts || `<span class="insight-pill">Reward goals: none selected</span>`}</div>
    <div class="optimizer-stamp-preview"><h3>Stamp bonus preview</h3><ul>${stampList}</ul></div>`;

  attachRelicArtworkFallbacks();
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

  if (!getOwnedRelics().length) {
    list.innerHTML = `<p class="empty-state">Add owned relics on the Input tab first.</p>`;
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
        <span class="optimized-art">${relicArtworkMarkup(item.relic, item.pedestalType, "small")}</span>
        <div><strong>${escapeHtml(item.relic.baseName)}</strong> <small>· ${escapeHtml(item.relic.level || "?")}</small><br /><small>${item.pedestalType === "ALL" ? "Total AFFCT" : item.pedestalType} score</small><div class="score-bar"><span style="width:${width}%"></span></div></div>
        <strong>${item.points.toLocaleString()}</strong>
        <span class="goal-pill">${escapeHtml(label)}</span>
      </article>`;
  }).join("");

  attachRelicArtworkFallbacks();
}

function applyOptimizedSetup() {
  const goals = getSelectedOptimizerGoals();
  const priority = document.getElementById("optimizer-priority")?.value || "balanced";
  const pointTarget = getOptimizerPointTarget();
  const setup = buildOptimizedSetup(goals, priority, pointTarget);

  timeRiftAssignments = {};
  setup.forEach((item) => { timeRiftAssignments[String(item.pedestal.slot)] = item.relic.id; });
  saveAssignments();
  activeTab = "museum";
  renderAll();
}

function relicAssetFileName(relicName, keepApostrophesAsSeparator = false) {
  const apostropheReplacement = keepApostrophesAsSeparator ? "_" : "";
  return String(relicName || "").toLowerCase().replace(/[’']/g, apostropheReplacement).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function relicImageCandidates(relic) {
  if (!relic) return [];
  const candidates = [relicAssetFileName(relic.baseName, false), relicAssetFileName(relic.baseName, true)].filter(Boolean);
  return [...new Set(candidates)].map((fileName) => `assets/relics/${fileName}.png`);
}

function placeholderPath(pedestalType) {
  return `assets/placeholders/${String(pedestalType || "ALL").toLowerCase()}.png`;
}

function relicArtworkMarkup(relic, pedestalType, size = "large") {
  const typeClass = String(pedestalType || "ALL").toLowerCase();
  const images = relic ? relicImageCandidates(relic) : [];
  const firstImage = images[0] || placeholderPath(pedestalType);

  return `
    <span class="relic-art-wrap ${size}">
      <img class="relic-art" src="${escapeHtml(firstImage)}" data-art-candidates="${escapeHtml(images.join("|"))}" data-placeholder="${escapeHtml(placeholderPath(pedestalType))}" data-art-index="0" alt="${relic ? escapeHtml(relic.baseName) : ""}" loading="lazy" />
      <span class="relic-art-fallback ${size}" hidden aria-hidden="true"><span class="relic-glyph ${typeClass}"></span></span>
    </span>`;
}

function attachRelicArtworkFallbacks() {
  document.querySelectorAll(".relic-art").forEach((img) => {
    img.onerror = function () {
      const candidates = String(this.dataset.artCandidates || "").split("|").filter(Boolean);
      const nextIndex = Number(this.dataset.artIndex || 0) + 1;

      if (candidates[nextIndex]) {
        this.dataset.artIndex = String(nextIndex);
        this.src = candidates[nextIndex];
        return;
      }

      if (this.src.endsWith(this.dataset.placeholder || "")) {
        this.hidden = true;
        const fallback = this.parentElement?.querySelector(".relic-art-fallback");
        if (fallback) fallback.hidden = false;
        return;
      }

      this.src = this.dataset.placeholder;
    };
  });
}

function attachGroupIconFallbacks() {
  document.querySelectorAll(".group-icon-art img").forEach((img) => {
    img.onerror = function () {
      this.hidden = true;
      const fallback = this.parentElement?.querySelector(".group-icon-fallback");
      if (fallback) fallback.hidden = false;
    };
  });
}

function saveAssignments() {
  localStorage.setItem(TIME_RIFT_STORAGE_KEY, JSON.stringify(timeRiftAssignments));
}

function saveOwnedRelics() {
  localStorage.setItem(TIME_RIFT_OWNED_KEY, JSON.stringify(timeRiftOwned));
}

function loadSavedState() {
  try { timeRiftAssignments = JSON.parse(localStorage.getItem(TIME_RIFT_STORAGE_KEY)) || {}; } catch { timeRiftAssignments = {}; }
  try { timeRiftOwned = JSON.parse(localStorage.getItem(TIME_RIFT_OWNED_KEY)) || {}; } catch { timeRiftOwned = {}; }
  try { timeRiftSlotTypes = JSON.parse(localStorage.getItem(TIME_RIFT_SLOT_STORAGE_KEY)) || {}; } catch { timeRiftSlotTypes = {}; }

  const autoSync = localStorage.getItem(TIME_RIFT_AUTO_SYNC_KEY);
  const autoSyncInput = document.getElementById("auto-sync-relics");
  if (autoSyncInput && autoSync !== null) autoSyncInput.checked = autoSync === "true";
}

function cleanAssignmentsAgainstOwned() {
  const ownedIds = new Set(Object.values(timeRiftOwned));
  Object.keys(timeRiftAssignments).forEach((slot) => {
    if (!ownedIds.has(timeRiftAssignments[slot])) delete timeRiftAssignments[slot];
  });
}

function cleanInvalidState() {
  const validIds = new Set(timeRiftRelics.map((relic) => relic.id));
  Object.keys(timeRiftOwned).forEach((familyId) => {
    if (!validIds.has(timeRiftOwned[familyId])) delete timeRiftOwned[familyId];
  });
  Object.keys(timeRiftAssignments).forEach((slot) => {
    if (!validIds.has(timeRiftAssignments[slot])) delete timeRiftAssignments[slot];
  });
  cleanAssignmentsAgainstOwned();
  saveOwnedRelics();
  saveAssignments();
}

function resetAssignments() {
  if (!window.confirm("Reset all Time Rift Museum assignments? Owned relic inputs will be kept.")) return;
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

function renderAll() {
  renderTabs();
  renderMuseumSummary();
  renderOwnedInput();
  renderGroupNav();
  renderViewButtons();
  renderMuseumStage();
  renderBuffs();
  renderOptimizer();
  attachRelicArtworkFallbacks();
  attachGroupIconFallbacks();
}

function bindStaticEvents() {
  document.getElementById("reset-museum")?.addEventListener("click", resetAssignments);
  document.getElementById("refresh-relics")?.addEventListener("click", loadTimeRiftRelics);
  document.getElementById("save-snapshot")?.addEventListener("click", saveSnapshot);
  document.getElementById("owned-search")?.addEventListener("input", renderOwnedInput);
  document.getElementById("owned-type-filter")?.addEventListener("change", renderOwnedInput);
  document.getElementById("owned-view-filter")?.addEventListener("change", renderOwnedInput);
  document.getElementById("optimizer-point-target")?.addEventListener("input", renderOptimizer);
  document.getElementById("optimizer-priority")?.addEventListener("change", renderOptimizer);
  document.getElementById("apply-optimized")?.addEventListener("click", applyOptimizedSetup);
  document.getElementById("close-picker")?.addEventListener("click", closeRelicPicker);
  document.getElementById("clear-relic")?.addEventListener("click", () => assignRelicToSlot(pickerSlot, ""));
  document.getElementById("relic-search")?.addEventListener("input", renderRelicResults);
  document.getElementById("relic-sort")?.addEventListener("change", renderRelicResults);
  document.getElementById("relic-picker")?.addEventListener("click", (event) => { if (event.target.id === "relic-picker") closeRelicPicker(); });
  document.getElementById("auto-sync-relics")?.addEventListener("change", (event) => localStorage.setItem(TIME_RIFT_AUTO_SYNC_KEY, String(event.target.checked)));

  document.querySelectorAll('input[name="optimizer-goal"]').forEach((input) => input.addEventListener("change", renderOptimizer));

  document.querySelectorAll(".rift-tab").forEach((button) => {
    button.addEventListener("click", () => {
      activeTab = button.dataset.tab;
      renderAll();
    });
  });

  document.querySelectorAll("[data-view-mode]").forEach((button) => {
    button.addEventListener("click", () => {
      viewMode = button.dataset.viewMode;
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

  if (document.getElementById("auto-sync-relics")?.checked !== false) loadTimeRiftRelics();
  else setStatus("Auto-sync is off. Click Sync Relic Data to refresh relics.");
});
