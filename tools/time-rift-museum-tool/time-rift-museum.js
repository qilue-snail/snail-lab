/* =========================================================
   Time Rift Museum Tool
   Separate from Biozilla logic. Uses the same Google Sheet,
   but reads only the "Time Rift Museum Relics" tab.
========================================================= */

const TIME_RIFT_TAB_NAME = "Time Rift Museum Relics";
const TIME_RIFT_STORAGE_KEY = "timeRiftMuseumAssignments";
const TIME_RIFT_SLOT_STORAGE_KEY = "timeRiftMuseumSlotTypes";

/*
  Published CSV link for the Time Rift Museum Relics tab.
  This is separate from Biozilla logic and reads only the published CSV feed below.
*/
const TIME_RIFT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQt9dkXKEDeiQYyGmYaSZpcq7CY1eM9ALn-kxxmm8qASUHznh0avCAz7hp3ojGNOXxIZncAKcpEMJ5J/pub?gid=538475015&single=true&output=csv";

/*
  The tool supports all 83 slots.

  IMPORTANT:
  I do not have the exact Rift Museum slot order yet, so this default layout
  creates 83 slots with the first 3 as ALL and the rest cycling typed pedestals.
  Once you have the real layout, replace ONLY the type values below.
*/
const TIME_RIFT_PEDESTALS = [
  { slot: 1, type: "ALL" },
  { slot: 2, type: "ALL" },
  { slot: 3, type: "ALL" },
  { slot: 4, type: "FAME" },
  { slot: 5, type: "ART" },
  { slot: 6, type: "FTH" },
  { slot: 7, type: "CIV" },
  { slot: 8, type: "TECH" },
  { slot: 9, type: "FAME" },
  { slot: 10, type: "ART" },
  { slot: 11, type: "FTH" },
  { slot: 12, type: "CIV" },
  { slot: 13, type: "TECH" },
  { slot: 14, type: "FAME" },
  { slot: 15, type: "ART" },
  { slot: 16, type: "FTH" },
  { slot: 17, type: "CIV" },
  { slot: 18, type: "TECH" },
  { slot: 19, type: "FAME" },
  { slot: 20, type: "ART" },
  { slot: 21, type: "FTH" },
  { slot: 22, type: "CIV" },
  { slot: 23, type: "TECH" },
  { slot: 24, type: "FAME" },
  { slot: 25, type: "ART" },
  { slot: 26, type: "FTH" },
  { slot: 27, type: "CIV" },
  { slot: 28, type: "TECH" },
  { slot: 29, type: "FAME" },
  { slot: 30, type: "ART" },
  { slot: 31, type: "FTH" },
  { slot: 32, type: "CIV" },
  { slot: 33, type: "TECH" },
  { slot: 34, type: "FAME" },
  { slot: 35, type: "ART" },
  { slot: 36, type: "FTH" },
  { slot: 37, type: "CIV" },
  { slot: 38, type: "TECH" },
  { slot: 39, type: "FAME" },
  { slot: 40, type: "ART" },
  { slot: 41, type: "FTH" },
  { slot: 42, type: "CIV" },
  { slot: 43, type: "TECH" },
  { slot: 44, type: "FAME" },
  { slot: 45, type: "ART" },
  { slot: 46, type: "FTH" },
  { slot: 47, type: "CIV" },
  { slot: 48, type: "TECH" },
  { slot: 49, type: "FAME" },
  { slot: 50, type: "ART" },
  { slot: 51, type: "FTH" },
  { slot: 52, type: "CIV" },
  { slot: 53, type: "TECH" },
  { slot: 54, type: "FAME" },
  { slot: 55, type: "ART" },
  { slot: 56, type: "FTH" },
  { slot: 57, type: "CIV" },
  { slot: 58, type: "TECH" },
  { slot: 59, type: "FAME" },
  { slot: 60, type: "ART" },
  { slot: 61, type: "FTH" },
  { slot: 62, type: "CIV" },
  { slot: 63, type: "TECH" },
  { slot: 64, type: "FAME" },
  { slot: 65, type: "ART" },
  { slot: 66, type: "FTH" },
  { slot: 67, type: "CIV" },
  { slot: 68, type: "TECH" },
  { slot: 69, type: "FAME" },
  { slot: 70, type: "ART" },
  { slot: 71, type: "FTH" },
  { slot: 72, type: "CIV" },
  { slot: 73, type: "TECH" },
  { slot: 74, type: "FAME" },
  { slot: 75, type: "ART" },
  { slot: 76, type: "FTH" },
  { slot: 77, type: "CIV" },
  { slot: 78, type: "TECH" },
  { slot: 79, type: "FAME" },
  { slot: 80, type: "ART" },
  { slot: 81, type: "FTH" },
  { slot: 82, type: "CIV" },
  { slot: 83, type: "TECH" }
];

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

const AFFCT_TYPES = ["FAME", "ART", "FTH", "CIV", "TECH"];
const PEDESTAL_TYPES = ["ALL", ...AFFCT_TYPES];

const OPTIMIZER_GOALS = {
  points: { label: "Highest Museum Points", keywords: [], weight: 0 },
  intel: { label: "More INTEL", keywords: ["intel", "intelligence"], weight: 900 },
  "dragon-orbs": { label: "Dragon Orbs", keywords: ["dragon orb", "dragon orbs", "dragon", "orb"], weight: 1200 },
  btads: { label: "B-tads", keywords: ["b-tad", "btad", "btads", "black tad", "black tads"], weight: 900 },
  cells: { label: "Cells", keywords: ["cell", "cells"], weight: 900 },
  medals: { label: "Museum Medals", keywords: ["medal", "medals", "museum medal"], weight: 900 },
  speed: { label: "Travel Speed", keywords: ["travel speed", "travel spd", "speed"], weight: 900 },
  damage: { label: "Rift Damage / Combat", keywords: ["dmg", "damage", "atk", "def", "rush", "hp", "combat"], weight: 900 }
};

let timeRiftRelics = [];
let timeRiftAssignments = {};
let timeRiftSlotTypes = {};
let activeTab = "setup";

function normalizeHeader(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function toNumber(value) {
  const cleaned = String(value ?? "").replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getCell(row, headerMap, names) {
  for (const name of names) {
    const index = headerMap[normalizeHeader(name)];
    if (index !== undefined) return row[index] ?? "";
  }
  return "";
}

function getTimeRiftCsvUrl() {
  return TIME_RIFT_CSV_URL;
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

function collectSearchText(row, headers) {
  return headers.map((header, index) => `${header}: ${row[index] || ""}`).join(" | ");
}

function parseStampBonuses(row, headerMap) {
  const bonuses = [];

  Object.keys(headerMap).forEach((normalizedName) => {
    const rawValue = row[headerMap[normalizedName]];
    const value = toNumber(rawValue);
    if (!value) return;

    const upperName = normalizedName.toUpperCase();
    const target = AFFCT_TYPES.find((type) => upperName.includes(type));
    const appliesToAll = upperName.includes("ALL") || upperName.includes("TOTAL");
    const looksLikeStamp = upperName.includes("STAMP") || upperName.includes("BONUS") || upperName.includes("PEDESTAL");

    if (!looksLikeStamp) return;

    if (target) bonuses.push({ target, value });
    else if (appliesToAll) bonuses.push({ target: "ALL", value });
  });

  return bonuses;
}

function parseTimeRiftRelics(rows) {
  if (rows.length < 2) return [];

  const headers = rows[0];
  const headerMap = {};
  headers.forEach((header, index) => {
    headerMap[normalizeHeader(header)] = index;
  });

  return rows.slice(1).map((row, index) => {
    const name = getCell(row, headerMap, ["Name", "Relic", "Relic Name"]);
    if (!name) return null;

    const rawText = collectSearchText(row, headers);
    const relic = {
      id: String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      name: String(name).trim(),
      rank: getCell(row, headerMap, ["Rank", "Rarity"]),
      mainStat: String(getCell(row, headerMap, ["Main Stat", "Type", "AFFCT"])).toUpperCase(),
      fame: toNumber(getCell(row, headerMap, ["FAME", "Fame"])),
      art: toNumber(getCell(row, headerMap, ["ART", "Art"])),
      fth: toNumber(getCell(row, headerMap, ["FTH", "Faith"])),
      civ: toNumber(getCell(row, headerMap, ["CIV", "Civilization"])),
      tech: toNumber(getCell(row, headerMap, ["TECH", "Tech"])),
      stampBonuses: parseStampBonuses(row, headerMap),
      effectText: rawText,
      rowIndex: index + 2
    };

    return relic;
  }).filter(Boolean);
}

async function loadTimeRiftRelics() {
  setStatus("Loading Time Rift Museum relics…");

  try {
    const response = await fetch(getTimeRiftCsvUrl(), { cache: "no-store" });
    if (!response.ok) throw new Error(`Sheet request failed: ${response.status}`);

    const text = await response.text();
    const rows = parseCsv(text);
    timeRiftRelics = parseTimeRiftRelics(rows);

    setStatus(`Loaded ${timeRiftRelics.length} Time Rift Museum relics from “${TIME_RIFT_TAB_NAME}”.`);
    cleanInvalidAssignments();
    renderAll();
  } catch (error) {
    console.error(error);
    setStatus("Could not load Time Rift Museum relics. Check the published CSV link and sharing settings.", true);
  }
}

function getPedestalType(slot) {
  return timeRiftSlotTypes[String(slot)] || TIME_RIFT_PEDESTALS.find((pedestal) => pedestal.slot === slot)?.type || "FAME";
}

function setPedestalType(slot, type) {
  if (!PEDESTAL_TYPES.includes(type)) return;
  timeRiftSlotTypes[String(slot)] = type;
  localStorage.setItem(TIME_RIFT_SLOT_STORAGE_KEY, JSON.stringify(timeRiftSlotTypes));
}

function getBaseStat(relic, pedestalType) {
  if (!relic) return 0;

  if (pedestalType === "ALL") {
    return relic.fame + relic.art + relic.fth + relic.civ + relic.tech;
  }

  return relic[pedestalType.toLowerCase()] || 0;
}

function getValidStampBonus(relic, pedestalType) {
  if (!relic || !Array.isArray(relic.stampBonuses)) return 0;

  return relic.stampBonuses.reduce((total, bonus) => {
    if (pedestalType === "ALL") {
      return bonus.target === "ALL" ? total + bonus.value : total;
    }

    return bonus.target === pedestalType ? total + bonus.value : total;
  }, 0);
}

function calculateRelicScoreForPedestal(relic, pedestalType) {
  if (!relic) return 0;
  return getBaseStat(relic, pedestalType) + getValidStampBonus(relic, pedestalType);
}

function getAssignedRelic(slot) {
  const relicId = timeRiftAssignments[String(slot)];
  return timeRiftRelics.find((relic) => relic.id === relicId) || null;
}

function calculateTotalMuseumPoints(assignments = timeRiftAssignments) {
  return TIME_RIFT_PEDESTALS.reduce((total, pedestal) => {
    const relicId = assignments[String(pedestal.slot)];
    const relic = timeRiftRelics.find((item) => item.id === relicId);
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

function getAssignedRelicIds(exceptSlot = null) {
  return new Set(Object.entries(timeRiftAssignments)
    .filter(([slot, relicId]) => relicId && String(slot) !== String(exceptSlot))
    .map(([, relicId]) => relicId));
}

function matchesGoal(relic, goalKey) {
  if (!relic || goalKey === "points") return false;
  const goal = OPTIMIZER_GOALS[goalKey];
  const text = normalizeText(relic.effectText);
  return goal.keywords.some((keyword) => text.includes(keyword));
}

function optimizerScore(relic, pedestalType, goalKey, priority) {
  const points = calculateRelicScoreForPedestal(relic, pedestalType);
  if (goalKey === "points") return points;

  const goal = OPTIMIZER_GOALS[goalKey];
  const goalBonus = matchesGoal(relic, goalKey) ? goal.weight : 0;
  const multiplier = priority === "hard" ? 2.5 : 1;
  return points + (goalBonus * multiplier);
}

function buildOptimizedSetup(goalKey, priority) {
  const used = new Set();
  const setup = [];

  TIME_RIFT_PEDESTALS.forEach((pedestal) => {
    const pedestalType = getPedestalType(pedestal.slot);
    const best = timeRiftRelics
      .filter((relic) => !used.has(relic.id))
      .map((relic) => ({
        relic,
        pedestal,
        pedestalType,
        points: calculateRelicScoreForPedestal(relic, pedestalType),
        goalMatch: matchesGoal(relic, goalKey),
        optimizerScore: optimizerScore(relic, pedestalType, goalKey, priority)
      }))
      .sort((a, b) => b.optimizerScore - a.optimizerScore || b.points - a.points || a.relic.name.localeCompare(b.relic.name))[0];

    if (best) {
      used.add(best.relic.id);
      setup.push(best);
    }
  });

  return setup;
}

function renderMuseumSummary() {
  const total = calculateTotalMuseumPoints();
  const next = getNextThreshold(total);

  document.getElementById("total-points").textContent = total.toLocaleString();
  document.getElementById("current-rating").textContent = getCurrentRating(total);
  document.getElementById("next-threshold").textContent = next ? `${next.points.toLocaleString()} (${next.rating})` : "Maxed";
  document.getElementById("points-needed").textContent = next ? (next.points - total).toLocaleString() : "0";
}

function getVisiblePedestals() {
  const filter = document.getElementById("slot-filter")?.value || "all";

  return TIME_RIFT_PEDESTALS.filter((pedestal) => {
    const assigned = Boolean(timeRiftAssignments[String(pedestal.slot)]);
    const type = getPedestalType(pedestal.slot);

    if (filter === "empty") return !assigned;
    if (filter === "assigned") return assigned;
    if (PEDESTAL_TYPES.includes(filter)) return type === filter;
    return true;
  });
}

function renderPedestalTable() {
  const body = document.getElementById("pedestal-body");
  const visiblePedestals = getVisiblePedestals();

  if (!visiblePedestals.length) {
    body.innerHTML = `<tr><td colspan="5">No slots match this view.</td></tr>`;
    return;
  }

  body.innerHTML = visiblePedestals.map((pedestal) => {
    const pedestalType = getPedestalType(pedestal.slot);
    const selectedRelicId = timeRiftAssignments[String(pedestal.slot)] || "";
    const selectedRelic = getAssignedRelic(pedestal.slot);
    const unavailable = getAssignedRelicIds(pedestal.slot);
    const score = calculateRelicScoreForPedestal(selectedRelic, pedestalType);
    const base = getBaseStat(selectedRelic, pedestalType);
    const bonus = getValidStampBonus(selectedRelic, pedestalType);

    const typeOptions = PEDESTAL_TYPES.map((type) => (
      `<option value="${type}" ${type === pedestalType ? "selected" : ""}>${type}</option>`
    )).join("");

    const relicOptions = [
      `<option value="">Select relic…</option>`,
      ...timeRiftRelics.map((relic) => {
        const disabled = unavailable.has(relic.id) ? "disabled" : "";
        const selected = relic.id === selectedRelicId ? "selected" : "";
        return `<option value="${escapeHtml(relic.id)}" ${selected} ${disabled}>${escapeHtml(relic.name)}</option>`;
      })
    ].join("");

    const reason = selectedRelic
      ? `${pedestalType === "ALL" ? "Total AFFCT" : pedestalType} ${base}${bonus ? ` + ${bonus} stamp` : ""}`
      : "No relic assigned";

    return `
      <tr>
        <td>${pedestal.slot}</td>
        <td>
          <select data-type-slot="${pedestal.slot}" aria-label="Pedestal type for slot ${pedestal.slot}">
            ${typeOptions}
          </select>
        </td>
        <td>
          <select data-relic-slot="${pedestal.slot}" class="relic-select" aria-label="Relic for slot ${pedestal.slot}">
            ${relicOptions}
          </select>
        </td>
        <td><strong>${score}</strong></td>
        <td><small>${escapeHtml(reason)}</small></td>
      </tr>
    `;
  }).join("");

  document.querySelectorAll("[data-relic-slot]").forEach((select) => {
    select.addEventListener("change", (event) => {
      const slot = event.target.dataset.relicSlot;
      const relicId = event.target.value;

      if (relicId) timeRiftAssignments[String(slot)] = relicId;
      else delete timeRiftAssignments[String(slot)];

      saveAssignments();
      renderAll();
    });
  });

  document.querySelectorAll("[data-type-slot]").forEach((select) => {
    select.addEventListener("change", (event) => {
      setPedestalType(event.target.dataset.typeSlot, event.target.value);
      renderAll();
    });
  });
}

function getRecommendationsForPedestal(pedestal, limit = 5) {
  const assignedIds = getAssignedRelicIds();
  const pedestalType = getPedestalType(pedestal.slot);

  return timeRiftRelics
    .filter((relic) => !assignedIds.has(relic.id))
    .map((relic) => ({
      relic,
      score: calculateRelicScoreForPedestal(relic, pedestalType),
      bonus: getValidStampBonus(relic, pedestalType)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.relic.name.localeCompare(b.relic.name))
    .slice(0, limit);
}

function renderRecommendations() {
  const container = document.getElementById("recommendations");
  const emptyPedestals = getVisiblePedestals().filter((pedestal) => !timeRiftAssignments[String(pedestal.slot)]);

  if (!emptyPedestals.length) {
    container.innerHTML = `<p>All visible slots are assigned.</p>`;
    return;
  }

  container.innerHTML = emptyPedestals.slice(0, 18).map((pedestal) => {
    const pedestalType = getPedestalType(pedestal.slot);
    const recommendations = getRecommendationsForPedestal(pedestal);
    const items = recommendations.length
      ? recommendations.map((item) => {
          const stampNote = item.bonus ? ` <small>(+${item.bonus} stamp)</small>` : "";
          return `<li>${escapeHtml(item.relic.name)} — <strong>${item.score}</strong>${stampNote}</li>`;
        }).join("")
      : `<li>No available relics found.</li>`;

    return `
      <article class="recommendation-card">
        <h4>Slot ${pedestal.slot} · ${pedestalType}</h4>
        <ol>${items}</ol>
      </article>
    `;
  }).join("");
}

function renderOptimizer() {
  const goalKey = document.getElementById("optimizer-goal")?.value || "points";
  const priority = document.getElementById("optimizer-priority")?.value || "balanced";
  const setup = buildOptimizedSetup(goalKey, priority);
  const total = setup.reduce((sum, item) => sum + item.points, 0);
  const matches = setup.filter((item) => item.goalMatch).length;
  const max = Math.max(...setup.map((item) => item.points), 1);

  document.getElementById("optimized-points").textContent = total.toLocaleString();
  document.getElementById("optimized-rating").textContent = getCurrentRating(total);
  document.getElementById("optimized-matches").textContent = goalKey === "points" ? "—" : matches.toLocaleString();

  const list = document.getElementById("optimized-list");
  if (!setup.length) {
    list.innerHTML = `<p>Load relics first.</p>`;
    return;
  }

  list.innerHTML = setup.map((item) => {
    const width = Math.max(5, Math.round((item.points / max) * 100));
    const matchPill = item.goalMatch ? `<span class="goal-pill">Goal match</span>` : `<span class="goal-pill">Points pick</span>`;

    return `
      <article class="optimized-row">
        <strong>Slot ${item.pedestal.slot}</strong>
        <span class="type-pill">${item.pedestalType}</span>
        <div>
          <strong>${escapeHtml(item.relic.name)}</strong><br />
          <small>${item.pedestalType === "ALL" ? "Total AFFCT" : item.pedestalType} score</small>
          <div class="score-bar" aria-hidden="true"><span style="width:${width}%"></span></div>
        </div>
        <strong>${item.points}</strong>
        ${matchPill}
      </article>
    `;
  }).join("");
}

function renderBuffs() {
  const total = calculateTotalMuseumPoints();
  const list = document.getElementById("buff-list");

  list.innerHTML = TIME_RIFT_THRESHOLDS.map((threshold) => {
    const unlocked = total >= threshold.points;
    return `
      <div class="buff-row ${unlocked ? "unlocked" : "locked"}">
        <span class="buff-pill">${threshold.points.toLocaleString()} pts</span>
        <strong>${threshold.rating}</strong>
        <span>${escapeHtml(threshold.buff)}</span>
        <span class="buff-pill">${unlocked ? "Unlocked" : "Locked"}</span>
      </div>
    `;
  }).join("");
}

function renderTabs() {
  document.querySelectorAll(".tool-tab").forEach((button) => {
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
  renderPedestalTable();
  renderRecommendations();
  renderOptimizer();
  renderBuffs();
}

function saveAssignments() {
  localStorage.setItem(TIME_RIFT_STORAGE_KEY, JSON.stringify(timeRiftAssignments));
}

function loadAssignments() {
  try {
    timeRiftAssignments = JSON.parse(localStorage.getItem(TIME_RIFT_STORAGE_KEY)) || {};
  } catch {
    timeRiftAssignments = {};
  }

  try {
    timeRiftSlotTypes = JSON.parse(localStorage.getItem(TIME_RIFT_SLOT_STORAGE_KEY)) || {};
  } catch {
    timeRiftSlotTypes = {};
  }
}

function cleanInvalidAssignments() {
  const validIds = new Set(timeRiftRelics.map((relic) => relic.id));
  Object.keys(timeRiftAssignments).forEach((slot) => {
    if (!validIds.has(timeRiftAssignments[slot])) delete timeRiftAssignments[slot];
  });
  saveAssignments();
}

function resetAssignments() {
  const confirmed = window.confirm("Reset all Time Rift Museum assignments?");
  if (!confirmed) return;

  timeRiftAssignments = {};
  localStorage.removeItem(TIME_RIFT_STORAGE_KEY);
  renderAll();
}

function applyOptimizedSetup() {
  const goalKey = document.getElementById("optimizer-goal")?.value || "points";
  const priority = document.getElementById("optimizer-priority")?.value || "balanced";
  const setup = buildOptimizedSetup(goalKey, priority);

  timeRiftAssignments = {};
  setup.forEach((item) => {
    timeRiftAssignments[String(item.pedestal.slot)] = item.relic.id;
  });

  saveAssignments();
  activeTab = "setup";
  renderAll();
}

function setStatus(message, isError = false) {
  const status = document.getElementById("sync-status");
  if (!status) return;
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

document.addEventListener("DOMContentLoaded", () => {
  loadAssignments();
  renderAll();

  document.getElementById("reset-museum")?.addEventListener("click", resetAssignments);
  document.getElementById("refresh-relics")?.addEventListener("click", loadTimeRiftRelics);
  document.getElementById("slot-filter")?.addEventListener("change", renderAll);
  document.getElementById("optimizer-goal")?.addEventListener("change", renderOptimizer);
  document.getElementById("optimizer-priority")?.addEventListener("change", renderOptimizer);
  document.getElementById("apply-optimized")?.addEventListener("click", applyOptimizedSetup);

  document.querySelectorAll(".tool-tab").forEach((button) => {
    button.addEventListener("click", () => {
      activeTab = button.dataset.tab;
      renderAll();
    });
  });

  loadTimeRiftRelics();
});
