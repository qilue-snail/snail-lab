/* =========================================================
   Time Rift Museum Tool
   Compact relic input + target-based stamp optimizer.
========================================================= */

const TIME_RIFT_TAB_NAME = "Time Rift Museum Relics";
const TIME_RIFT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQt9dkXKEDeiQYyGmYaSZpcq7CY1eM9ALn-kxxmm8qASUHznh0avCAz7hp3ojGNOXxIZncAKcpEMJ5J/pub?gid=1578260911&single=true&output=csv";
const TIME_RIFT_OWNED_KEY = "timeRiftMuseumOwnedRelicsBaseV1";
const TIME_RIFT_ASSIGNMENTS_KEY = "timeRiftMuseumAssignmentsBaseV1";

const AFFCT_TYPES = ["FAME", "ART", "FTH", "CIV", "TECH"];
const LEVEL_BUTTONS = [
  { value: "", label: "None" },
  { value: "3", label: "3★" },
  { value: "4", label: "4★" },
  { value: "5", label: "5★" },
  { value: "6", label: "6★" },
  { value: "Awaken", label: "Awaken" },
];

const TIME_RIFT_PEDESTALS = Array.from({ length: 83 }, (_, index) => {
  const slot = index + 1;
  const type = slot <= 3 ? "ALL" : AFFCT_TYPES[(slot - 4) % AFFCT_TYPES.length];
  return { slot, type };
});

const TIME_RIFT_THRESHOLDS = [
  { points: 80, rating: "C", buff: "In the Rift, Snail ATK +20" },
  { points: 150, rating: "C", buff: "In the Rift, Snail DEF +20" },
  { points: 220, rating: "C", buff: "In the Rift, INTEL gained +5%" },
  { points: 290, rating: "C", buff: "Rift Museum B-tad Output +500" },
  { points: 360, rating: "B", buff: "Rift Museum Medal Output +10" },
  { points: 460, rating: "B", buff: "In the Rift, Snail RUSH +20" },
  { points: 530, rating: "B", buff: "In the Rift, Snail HP +200" },
  { points: 600, rating: "B", buff: "In the Rift, Cells collected +5%" },
  { points: 640, rating: "B", buff: "In the Rift Domain, Troop Casualty -30%" },
  { points: 670, rating: "B", buff: "Rift Museum B-tad Output +1000" },
  { points: 740, rating: "A", buff: "Rift Museum Medal Output +20" },
  { points: 850, rating: "A", buff: "In the Rift, Snail ATK +50" },
  { points: 930, rating: "A", buff: "In the Rift, Snail DEF +50" },
  { points: 1010, rating: "A", buff: "In the Rift Domain, Troop Casualty 30%" },
  { points: 1090, rating: "A", buff: "Rift Museum B-tad Output +3000" },
  { points: 1170, rating: "S", buff: "Rift Museum Medal Output +40" },
  { points: 1300, rating: "S", buff: "In the Rift, Snail RUSH +50" },
  { points: 1400, rating: "S", buff: "In the Rift, Snail HP +500" },
  { points: 1650, rating: "S", buff: "Rift Museum B-tad Output +5000" },
  { points: 1800, rating: "S+", buff: "Rift Museum Medal Output +80" },
];

const GOAL_GROUPS = [
  {
    id: "element",
    label: "Elemental DMG",
    options: [
      { id: "any", label: "Any Elemental DMG" },
      { id: "fire", label: "Fire DMG" },
      { id: "water", label: "Water DMG" },
      { id: "earth", label: "Earth DMG" },
      { id: "wind", label: "Wind DMG" },
    ],
  },
  {
    id: "cells",
    label: "Cells",
    options: [
      { id: "any", label: "Any Cells" },
      { id: "zombie", label: "Zombie Cells" },
      { id: "demon", label: "Demon Cells" },
      { id: "angel", label: "Angel Cells" },
      { id: "mutant", label: "Mutant Cells" },
      { id: "mecha", label: "Mecha Cells" },
      { id: "dragon", label: "Dragon Cells" },
    ],
  },
  {
    id: "stat",
    label: "Stats",
    options: [
      { id: "atk", label: "ATK" },
      { id: "def", label: "DEF" },
      { id: "hp", label: "HP" },
      { id: "rush", label: "RUSH" },
      { id: "crit", label: "CRIT" },
      { id: "crit-dmg", label: "CRIT DMG" },
      { id: "dmg", label: "DMG" },
      { id: "dmg-reduc", label: "DMG Reduc" },
      { id: "hero-dmg", label: "Hero DMG" },
    ],
  },
  {
    id: "resource",
    label: "Resources / Progress",
    options: [
      { id: "dragon-orbs", label: "Dragon Orbs" },
      { id: "incense", label: "Incense" },
      { id: "b-tads", label: "B-tads" },
      { id: "medals", label: "Museum Medals" },
      { id: "intel", label: "Intel" },
      { id: "travel-speed", label: "Travel Speed" },
      { id: "food", label: "Food Reduction" },
    ],
  },
  {
    id: "affct",
    label: "AFFCT",
    options: [
      { id: "any", label: "Any AFFCT" },
      { id: "FAME", label: "FAME" },
      { id: "ART", label: "ART" },
      { id: "FTH", label: "FTH" },
      { id: "CIV", label: "CIV" },
      { id: "TECH", label: "TECH" },
    ],
  },
  {
    id: "score",
    label: "AFFCT",
    options: [{ id: "points", label: "Highest AFFCT" }],
  },
];

let relicRows = [];
let ownedRelics = {};
let appliedAssignments = {};
let activeTab = "input";
let latestOptimizedSetup = [];
let visibleFamilyIds = [];

/* ---------- General helpers ---------- */

function normalizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
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

/* ---------- CSV and relic parsing ---------- */

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
  return String(name || "")
    .replace(/\s[-–—]\s*(Awaken|6|5|4|3)$/i, "")
    .trim();
}

function familyIdFor(name) {
  return normalizeId(displayRelicBaseName(name));
}

function levelKey(level) {
  const raw = String(level || "").trim().toLowerCase();
  if (raw.includes("awaken")) return "Awaken";
  if (raw.includes("6")) return "6";
  if (raw.includes("5")) return "5";
  if (raw.includes("4")) return "4";
  if (raw.includes("3")) return "3";
  return "";
}

function levelValue(level) {
  const key = levelKey(level);
  if (key === "Awaken") return 7;
  return Number(key) || 0;
}

function parseStampBonus(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const match = raw.match(/([+-])\s*([\d.]+)/);
  if (!match) return null;

  const upper = raw.toUpperCase();
  const target = AFFCT_TYPES.find((type) => upper.includes(type));
  const value = Number(match[2]) * (match[1] === "-" ? -1 : 1);

  if (target) return { target, value, raw };
  if (upper.includes("AFFCT") && (upper.includes("ALL") || upper.includes("TOTAL"))) {
    return { target: "ALL", value, raw };
  }
  return null;
}

function parseRelics(rows) {
  if (!rows || rows.length < 2) return [];
  const headers = rows[0].map((header) =>
    String(header || "")
      .trim()
      .replace(/^\uFEFF/, ""),
  );

  return rows
    .slice(1)
    .map((row, index) => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = row[i] || "";
      });

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
        levelKey: levelKey(level || rank),
        rank,
        type: String(obj.Type || "")
          .trim()
          .toUpperCase(),
        fame: toNumber(obj.FAME),
        art: toNumber(obj.ART),
        fth: toNumber(obj.FTH),
        civ: toNumber(obj.CIV),
        tech: toNumber(obj.TECH),
        stampTexts: stamps,
        stampBonuses: stamps.map(parseStampBonus).filter(Boolean),
        effectText: stamps.join(" | "),
      };
    })
    .filter(Boolean);
}

async function loadRelics() {
  setStatus("Loading Time Rift Museum relics…");

  try {
    const response = await fetch(TIME_RIFT_CSV_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Sheet request failed: ${response.status}`);

    relicRows = parseRelics(parseCsv(await response.text()));
    cleanSavedState();
    setStatus(
      `Loaded ${relicRows.length.toLocaleString()} rows from “${TIME_RIFT_TAB_NAME}”.`,
    );
    renderAll();
  } catch (error) {
    console.error(error);
    setStatus(
      "Could not load relic data. Make sure the Time Rift Museum Relics tab is published as CSV.",
      true,
    );
    renderAll();
  }
}

/* ---------- Relic state ---------- */

function getFamilies() {
  const map = new Map();
  relicRows.forEach((relic) => {
    if (!map.has(relic.familyId)) map.set(relic.familyId, []);
    map.get(relic.familyId).push(relic);
  });

  return Array.from(map.entries())
    .map(([familyId, levels]) => {
      const sorted = [...levels].sort(
        (a, b) => levelValue(b.level) - levelValue(a.level),
      );
      return {
        familyId,
        name: sorted[0].baseName,
        type: sorted[0].type,
        levels: sorted,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
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

function getRelicAtLevel(family, wantedLevel) {
  return family.levels.find((relic) => relic.levelKey === wantedLevel) || null;
}

function loadState() {
  try {
    ownedRelics = JSON.parse(localStorage.getItem(TIME_RIFT_OWNED_KEY)) || {};
  } catch {
    ownedRelics = {};
  }

  try {
    appliedAssignments =
      JSON.parse(localStorage.getItem(TIME_RIFT_ASSIGNMENTS_KEY)) || {};
  } catch {
    appliedAssignments = {};
  }
}

function saveState() {
  localStorage.setItem(TIME_RIFT_OWNED_KEY, JSON.stringify(ownedRelics));
  localStorage.setItem(
    TIME_RIFT_ASSIGNMENTS_KEY,
    JSON.stringify(appliedAssignments),
  );
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

/* ---------- Scoring ---------- */

function getBaseStat(relic, pedestalType) {
  if (!relic) return 0;
  if (pedestalType === "ALL") {
    return relic.fame + relic.art + relic.fth + relic.civ + relic.tech;
  }
  return relic[pedestalType.toLowerCase()] || 0;
}

function getStampBonus(relic, pedestalType) {
  if (!relic) return 0;

  return relic.stampBonuses.reduce((total, bonus) => {
    if (pedestalType === "ALL") {
      return bonus.target === "ALL" || AFFCT_TYPES.includes(bonus.target)
        ? total + bonus.value
        : total;
    }
    return bonus.target === pedestalType || bonus.target === "ALL"
      ? total + bonus.value
      : total;
  }, 0);
}

function scoreRelic(relic, pedestalType) {
  return getBaseStat(relic, pedestalType) + getStampBonus(relic, pedestalType);
}

function assignmentPoints(assignments) {
  return TIME_RIFT_PEDESTALS.reduce((total, pedestal) => {
    const relic = findRelicById(assignments[String(pedestal.slot)]);
    return total + scoreRelic(relic, pedestal.type);
  }, 0);
}

function getRating(points) {
  const unlocked = TIME_RIFT_THRESHOLDS.filter(
    (threshold) => points >= threshold.points,
  );
  return unlocked.length ? unlocked[unlocked.length - 1].rating : "—";
}

function getNextThreshold(points) {
  return TIME_RIFT_THRESHOLDS.find((threshold) => points < threshold.points) || null;
}

/* ---------- Goal matching ---------- */

function goalKey(goal) {
  return `${goal.category}:${goal.subcategory}`;
}

function getSelectedGoals() {
  const checked = Array.from(document.querySelectorAll(".goal-check:checked"));
  const goals = checked.map((input) => {
    const [category, subcategory] = input.value.split(":");
    return { category, subcategory };
  });

  return goals.length ? goals : [{ category: "score", subcategory: "points" }];
}

function getSelectedGoalLabels() {
  const goals = getSelectedGoals();
  return goals
    .filter((goal) => goal.category !== "score")
    .map((goal) => {
      const group = GOAL_GROUPS.find((item) => item.id === goal.category);
      const option = group?.options.find((item) => item.id === goal.subcategory);
      return option?.label || group?.label || "Goal";
    });
}

function extractGoalNumber(text) {
  const match = String(text || "").match(/([+-])\s*([\d.]+)/);
  if (!match) return 0;
  return Number(match[2]) * (match[1] === "-" ? -1 : 1);
}

function stampMatchesGoal(stamp, goal) {
  const text = String(stamp || "");
  const lower = text.toLowerCase();

  if (goal.category === "score") return true;

  if (goal.category === "element") {
    if (!/dmg|damage|elmt|element/i.test(text)) return false;
    if (goal.subcategory === "any") {
      return /fire|water|earth|wind|all\s*elmt|all\s*element|elemental|elmt/i.test(text);
    }
    return (
      lower.includes(goal.subcategory) ||
      /all\s*elmt|all\s*element|elemental/i.test(lower)
    );
  }

  if (goal.category === "cells") {
    if (!/cell/i.test(text)) return false;
    return goal.subcategory === "any" || lower.includes(goal.subcategory);
  }

  if (goal.category === "stat") {
    const statPatterns = {
      atk: /\batk\b/i,
      def: /\bdef\b/i,
      hp: /\bhp\b/i,
      rush: /\brush\b/i,
      crit: /\bcrit\b(?!\s*dmg|\s*damage)/i,
      "crit-dmg": /crit\s*(dmg|damage)/i,
      dmg: /\bdmg\b|\bdamage\b/i,
      "dmg-reduc": /dmg\s*reduc|damage\s*reduc|reduction/i,
      "hero-dmg": /hero\s*(dmg|damage)/i,
    };
    return statPatterns[goal.subcategory]?.test(text) || false;
  }

  if (goal.category === "resource") {
    const resourcePatterns = {
      "dragon-orbs": /dragon\s*orbs?/i,
      incense: /incense/i,
      "b-tads": /b-?tads?|black\s*tads?/i,
      medals: /medals?/i,
      intel: /intel/i,
      "travel-speed": /travel\s*(spd|speed)/i,
      food: /food/i,
    };
    return resourcePatterns[goal.subcategory]?.test(text) || false;
  }

  if (goal.category === "affct") {
    if (goal.subcategory === "any") {
      return /\b(FAME|ART|FTH|CIV|TECH)\b/i.test(text);
    }
    return text.toUpperCase().includes(goal.subcategory);
  }

  return false;
}

function goalValueForRelic(relic, goals) {
  if (!relic) return 0;
  const activeGoals = Array.isArray(goals) ? goals : [goals];

  return activeGoals.reduce((goalTotal, goal) => {
    if (goal.category === "score") return goalTotal;

    const stampTotal = relic.stampTexts.reduce((total, stamp) => {
      if (!stampMatchesGoal(stamp, goal)) return total;

      const value = extractGoalNumber(stamp);
      if (goal.category === "resource" && goal.subcategory === "food") {
        return total + Math.abs(value);
      }
      return total + Math.max(0, value);
    }, 0);

    return goalTotal + stampTotal;
  }, 0);
}

function relicHasStampFilter(relic, filterValue) {
  if (!filterValue || filterValue === "all") return true;
  const [category, subcategory] = filterValue.split(":");
  return relic.stampTexts.some((stamp) =>
    stampMatchesGoal(stamp, { category, subcategory }),
  );
}

function getMatchedStampText(relic, goals) {
  if (!relic) return "—";
  const activeGoals = Array.isArray(goals) ? goals : getSelectedGoals();
  const goalStamps = relic.stampTexts.filter((stamp) =>
    activeGoals.some((goal) => goal.category !== "score" && stampMatchesGoal(stamp, goal)),
  );

  return (goalStamps.length ? goalStamps : relic.stampTexts).join(" | ") || "—";
}

/* ---------- Optimizer ---------- */

function getTargetPoints() {
  const value = Number(document.getElementById("target-points")?.value || 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

function totalGoalValue(setup) {
  return setup.reduce((total, item) => total + item.goalValue, 0);
}

function totalSetupPoints(setup) {
  return setup.reduce((total, item) => total + item.points, 0);
}

function buildWeightedSetup(goals, pointWeight, goalWeight) {
  const owned = getOwnedRelics();
  const candidates = [];

  TIME_RIFT_PEDESTALS.forEach((pedestal) => {
    owned.forEach((relic) => {
      const points = scoreRelic(relic, pedestal.type);
      const goalValue = goalValueForRelic(relic, goals);
      const weightedScore = points * pointWeight + goalValue * goalWeight;

      if (points > 0 || goalValue > 0) {
        candidates.push({ pedestal, relic, points, goalValue, weightedScore });
      }
    });
  });

  candidates.sort(
    (a, b) =>
      b.weightedScore - a.weightedScore ||
      b.goalValue - a.goalValue ||
      b.points - a.points ||
      a.relic.baseName.localeCompare(b.relic.baseName),
  );

  const usedSlots = new Set();
  const usedFamilies = new Set();
  const setup = [];

  candidates.forEach((candidate) => {
    if (usedSlots.has(candidate.pedestal.slot)) return;
    if (usedFamilies.has(candidate.relic.familyId)) return;

    usedSlots.add(candidate.pedestal.slot);
    usedFamilies.add(candidate.relic.familyId);
    setup.push(candidate);
  });

  return setup.sort((a, b) => a.pedestal.slot - b.pedestal.slot);
}

function compareSetups(a, b, targetPoints, goals) {
  const aPoints = totalSetupPoints(a);
  const bPoints = totalSetupPoints(b);
  const aGoal = totalGoalValue(a);
  const bGoal = totalGoalValue(b);
  const aMeets = aPoints >= targetPoints;
  const bMeets = bPoints >= targetPoints;
  const hasStampGoal = goals.some((goal) => goal.category !== "score");

  if (aMeets !== bMeets) return aMeets ? -1 : 1;

  if (aMeets && bMeets) {
    if (hasStampGoal && aGoal !== bGoal) return bGoal - aGoal;
    if (!hasStampGoal && aPoints !== bPoints) return bPoints - aPoints;
    return aPoints - bPoints;
  }

  if (aPoints !== bPoints) return bPoints - aPoints;
  if (aGoal !== bGoal) return bGoal - aGoal;
  return b.length - a.length;
}

function buildOptimizedSetup() {
  const goals = getSelectedGoals();
  const targetPoints = getTargetPoints();
  const hasStampGoal = goals.some((goal) => goal.category !== "score");
  const pointWeights = [0.1, 0.25, 0.5, 1, 2, 4, 8, 16, 32];
  const goalWeights = hasStampGoal
    ? [0.5, 1, 2, 4, 8, 16, 32, 64, 128]
    : [0];

  const setups = [];
  pointWeights.forEach((pointWeight) => {
    goalWeights.forEach((goalWeight) => {
      setups.push(buildWeightedSetup(goals, pointWeight, goalWeight));
    });
  });

  setups.sort((a, b) => compareSetups(a, b, targetPoints, goals));
  latestOptimizedSetup = setups[0] || [];
  return latestOptimizedSetup;
}

function applyOptimizedSetup() {
  const setup = latestOptimizedSetup.length
    ? latestOptimizedSetup
    : buildOptimizedSetup();

  appliedAssignments = {};
  setup.forEach((item) => {
    appliedAssignments[String(item.pedestal.slot)] = item.relic.id;
  });

  saveState();
  activeTab = "optimize";
  renderAll();
}

function resetSetup() {
  if (
    !window.confirm(
      "Reset the applied Time Rift Museum setup? Owned relic inputs will be kept.",
    )
  ) {
    return;
  }

  appliedAssignments = {};
  saveState();
  renderAll();
}

/* ---------- Rendering ---------- */

function renderAll() {
  renderTabs();
  renderGoalControls();
  renderQuickTargets();
  renderSummary();
  renderInputRelics();
  renderOptimizer();
  renderBuffTotals();
  renderBuffProgress();
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
  const previous =
    TIME_RIFT_THRESHOLDS.filter((threshold) => total >= threshold.points).pop()
      ?.points || 0;
  const range = next ? next.points - previous : 1;
  const progress = next
    ? Math.max(0, Math.min(100, ((total - previous) / range) * 100))
    : 100;
  const ownedCount = getOwnedRelics().length.toLocaleString();

  setText("total-points", total.toLocaleString());
  setText("current-rating", getRating(total));
  setText("owned-count-summary", ownedCount);
  setText(
    "next-threshold",
    next ? `${next.points.toLocaleString()} (${next.rating})` : "Maxed",
  );
  setText("points-needed", next ? (next.points - total).toLocaleString() : "0");

  const bar = document.getElementById("rank-progress-bar");
  if (bar) bar.style.width = `${progress}%`;
}

function renderGoalControls() {
  const container = document.getElementById("goal-selector");
  if (!container) return;

  const selected = new Set(
    Array.from(document.querySelectorAll(".goal-check:checked")).map(
      (input) => input.value,
    ),
  );

  container.innerHTML = GOAL_GROUPS.filter((group) => group.id !== "score")
    .map((group) => {
      const options = group.options
        .map((option) => {
          const key = `${group.id}:${option.id}`;
          const checked = selected.has(key) ? "checked" : "";
          return `
            <label class="goal-check-row">
              <input class="goal-check" type="checkbox" value="${escapeHtml(key)}" ${checked} />
              <span>${escapeHtml(option.label)}</span>
            </label>`;
        })
        .join("");

      return `
        <section class="goal-group">
          <span class="goal-group-title">${escapeHtml(group.label)}</span>
          <div class="goal-options">${options}</div>
        </section>`;
    })
    .join("");
}


function renderQuickTargets() {
  const container = document.getElementById("quick-targets");
  if (!container) return;

  const currentTarget = getTargetPoints();
  const byRating = TIME_RIFT_THRESHOLDS.reduce((map, threshold) => {
    if (!map.has(threshold.rating)) map.set(threshold.rating, []);
    map.get(threshold.rating).push(threshold);
    return map;
  }, new Map());

  container.innerHTML = Array.from(byRating.entries())
    .map(([rating, thresholds]) => {
      const buttons = thresholds
        .map((threshold) => {
          const active = currentTarget === threshold.points;
          return `<button class="quick-target-btn ${active ? "active" : ""}" type="button" data-target="${threshold.points}">${threshold.points.toLocaleString()}</button>`;
        })
        .join("");

      return `
        <div class="target-group">
          <span class="target-group-label">${escapeHtml(rating)}</span>
          <div class="target-group-buttons">${buttons}</div>
        </div>`;
    })
    .join("");

  container.querySelectorAll("[data-target]").forEach((button) => {
    button.addEventListener("click", () => {
      const targetInput = document.getElementById("target-points");
      if (targetInput) targetInput.value = button.dataset.target;
      renderAll();
    });
  });
}


function renderInputRelics() {
  const body = document.getElementById("owned-relic-list");
  if (!body) return;

  if (!relicRows.length) {
    visibleFamilyIds = [];
    body.innerHTML = `<tr class="empty-row"><td colspan="3">Sync relic data to load the relic input list.</td></tr>`;
    setText("visible-count", "0");
    return;
  }

  const queryParts = normalizeText(document.getElementById("owned-search")?.value || "")
    .split(/\s+/)
    .filter(Boolean);
  const typeFilter = document.getElementById("owned-type-filter")?.value || "all";
  const viewFilter = document.getElementById("owned-view-filter")?.value || "all";
  const levelFilter = document.getElementById("owned-level-filter")?.value || "all";
  const stampFilter = document.getElementById("stamp-filter")?.value || "all";

  let items = getFamilies().map((family) => {
    const owned = getOwnedRelic(family.familyId);
    const best = family.levels[0];
    const haystack = normalizeText([family.name, family.type].join(" "));
    const stampRelic = owned || best;
    return { family, owned, best, haystack, stampRelic };
  });

  if (typeFilter !== "all") items = items.filter((item) => item.family.type === typeFilter);
  if (viewFilter === "owned") items = items.filter((item) => item.owned);
  if (viewFilter === "missing") items = items.filter((item) => !item.owned);
  if (levelFilter === "none") items = items.filter((item) => !item.owned);
  if (!["all", "none"].includes(levelFilter)) {
    items = items.filter((item) => item.owned?.levelKey === levelFilter);
  }
  if (stampFilter !== "all") {
    items = items.filter((item) => relicHasStampFilter(item.stampRelic, stampFilter));
  }
  if (queryParts.length) {
    items = items.filter((item) =>
      queryParts.every((part) => item.haystack.includes(part)),
    );
  }

  visibleFamilyIds = items.map((item) => item.family.familyId);
  setText("visible-count", items.length.toLocaleString());

  if (!items.length) {
    body.innerHTML = `<tr class="empty-row"><td colspan="3">No relics match those filters.</td></tr>`;
    return;
  }

  body.innerHTML = items
    .map(({ family, owned }) => {
      const buttons = LEVEL_BUTTONS.map((level) => {
        const relic = level.value ? getRelicAtLevel(family, level.value) : null;
        const active = level.value ? owned?.id === relic?.id : !owned;
        const disabled = Boolean(level.value && !relic);
        return `<button class="level-btn ${level.value ? "" : "none"} ${active ? "active" : ""}" type="button" data-family-id="${escapeHtml(family.familyId)}" data-relic-id="${escapeHtml(relic?.id || "")}" ${disabled ? "disabled" : ""}>${escapeHtml(level.label)}</button>`;
      }).join("");

      return `
        <tr class="${owned ? "relic-row-owned" : ""}">
          <td><strong>${escapeHtml(family.name)}</strong></td>
          <td><span class="pill slot-${escapeHtml(family.type)}">${escapeHtml(family.type || "—")}</span></td>
          <td><div class="level-buttons">${buttons}</div></td>
        </tr>`;
    })
    .join("");

  body.querySelectorAll(".level-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const familyId = button.dataset.familyId;
      const relicId = button.dataset.relicId;

      if (relicId) ownedRelics[familyId] = relicId;
      else delete ownedRelics[familyId];

      cleanAssignmentsAgainstOwned();
      saveState();
      renderAll();
    });
  });
}


function renderOptimizer() {
  const setup = buildOptimizedSetup();
  const total = totalSetupPoints(setup);
  const target = getTargetPoints();
  const optimizedList = document.getElementById("optimized-list");
  const currentList = document.getElementById("current-setup-list");

  setText("optimized-points", total.toLocaleString());
  setText("optimized-rating", getRating(total));
  setText("optimized-filled", `${setup.length} / ${TIME_RIFT_PEDESTALS.length}`);

  const optimizerNote = document.getElementById("optimizer-note");
  if (optimizerNote) {
    const targetReached = total >= target;
    const goalLabels = getSelectedGoalLabels();
    const goalText = goalLabels.length
      ? ` Goals: ${goalLabels.join(", ")}.`
      : " No stamp goals selected; using score as the tiebreaker.";

    optimizerNote.textContent = targetReached
      ? `Target met: ${total.toLocaleString()} / ${target.toLocaleString()} AFFCT.${goalText}`
      : `Target not reachable yet: ${total.toLocaleString()} / ${target.toLocaleString()} AFFCT.${goalText}`;
    optimizerNote.classList.toggle("warning", !targetReached);
  }

  if (optimizedList) {
    optimizedList.innerHTML = renderSetupRows(
      setup,
      total < target
        ? `Target not reachable with currently owned relics. Best result is ${total.toLocaleString()} AFFCT.`
        : "No optimized setup yet. Add owned relics on the Input Relics tab first.",
    );
  }

  if (currentList) {
    currentList.innerHTML = renderAppliedSetupRows();
  }
}


function stampCells(relic) {
  const stamps = relic?.stampTexts || [];
  return [0, 1, 2]
    .map((index) => `<td class="effect-cell">${escapeHtml(stamps[index] || "—")}</td>`)
    .join("");
}

function renderSetupRows(setup, emptyText) {
  if (!setup.length) {
    return `<tr class="empty-row"><td colspan="9">${escapeHtml(emptyText)}</td></tr>`;
  }

  return setup
    .map((item) => `
      <tr>
        <td>Slot ${item.pedestal.slot}</td>
        <td><span class="pill slot-${escapeHtml(item.pedestal.type)}">${escapeHtml(item.pedestal.type)}</span></td>
        <td><strong>${escapeHtml(item.relic.baseName)}</strong></td>
        <td>${escapeHtml(item.relic.level || item.relic.rank || "?")}</td>
        <td><span class="pill slot-${escapeHtml(item.relic.type)}">${escapeHtml(item.relic.type || "—")}</span></td>
        <td class="points-cell">${item.points.toLocaleString()}</td>
        ${stampCells(item.relic)}
      </tr>`)
    .join("");
}


function renderAppliedSetupRows() {
  const owned = getOwnedRelics();

  if (!owned.length) {
    return `<tr class="empty-row"><td colspan="9">Add owned relics before manually changing setup slots.</td></tr>`;
  }

  return TIME_RIFT_PEDESTALS.map((pedestal) => {
    const currentRelic = findRelicById(appliedAssignments[String(pedestal.slot)]);
    const options = [`<option value="">Empty</option>`]
      .concat(
        owned
          .map((relic) => ({ relic, points: scoreRelic(relic, pedestal.type) }))
          .sort(
            (a, b) =>
              b.points - a.points || a.relic.baseName.localeCompare(b.relic.baseName),
          )
          .map(({ relic, points }) => {
            const selected = relic.id === currentRelic?.id ? "selected" : "";
            const level = relic.level || relic.rank || "?";
            return `<option value="${escapeHtml(relic.id)}" ${selected}>${escapeHtml(relic.baseName)} · ${escapeHtml(level)}</option>`;
          }),
      )
      .join("");
    const points = currentRelic ? scoreRelic(currentRelic, pedestal.type) : 0;
    const level = currentRelic?.level || currentRelic?.rank || "—";

    return `
      <tr>
        <td>Slot ${pedestal.slot}</td>
        <td><span class="pill slot-${escapeHtml(pedestal.type)}">${escapeHtml(pedestal.type)}</span></td>
        <td>
          <select class="setup-select" data-slot="${pedestal.slot}">
            ${options}
          </select>
        </td>
        <td>${escapeHtml(level)}</td>
        <td>${currentRelic ? `<span class="pill slot-${escapeHtml(currentRelic.type)}">${escapeHtml(currentRelic.type || "—")}</span>` : "—"}</td>
        <td class="points-cell">${points ? points.toLocaleString() : "—"}</td>
        ${stampCells(currentRelic)}
      </tr>`;
  }).join("");
}


function bindAppliedSetupSelects() {
  document.querySelectorAll(".setup-select").forEach((select) => {
    select.addEventListener("change", () => {
      const slot = String(select.dataset.slot);

      if (select.value) {
        Object.keys(appliedAssignments).forEach((assignedSlot) => {
          if (assignedSlot !== slot && appliedAssignments[assignedSlot] === select.value) {
            delete appliedAssignments[assignedSlot];
          }
        });
        appliedAssignments[slot] = select.value;
      } else {
        delete appliedAssignments[slot];
      }

      saveState();
      renderAll();
    });
  });
}

function renderBuffProgress() {
  const body = document.getElementById("buff-list");
  if (!body) return;

  const total = assignmentPoints(appliedAssignments);
  const groups = TIME_RIFT_THRESHOLDS.reduce((map, threshold) => {
    if (!map.has(threshold.rating)) map.set(threshold.rating, []);
    map.get(threshold.rating).push(threshold);
    return map;
  }, new Map());

  body.innerHTML = Array.from(groups.entries())
    .map(([rating, thresholds]) =>
      thresholds
        .map((threshold, index) => {
          const unlocked = total >= threshold.points;
          const ratingCell = index === 0
            ? `<td class="rating-cell" rowspan="${thresholds.length}">${escapeHtml(rating)}</td>`
            : "";

          return `
            <tr class="${unlocked ? "unlocked" : "locked"} ${index === 0 ? "group-start" : ""}">
              ${ratingCell}
              <td class="req-cell">${threshold.points.toLocaleString()} points</td>
              <td>${escapeHtml(threshold.buff)}</td>
            </tr>`;
        })
        .join(""),
    )
    .join("");
}

function renderBuffTotals() {
  const body = document.getElementById("buff-total-list");
  if (!body) return;

  const total = assignmentPoints(appliedAssignments);
  const totals = getUnlockedBuffTotals(total);
  const rows = [
    ["Dragon Orbs", formatSigned(totals.dragonOrbPct, "%")],
    ["Museum Medal Output", formatSigned(totals.medalOutput, "")],
    ["Museum B-tad Output", formatSigned(totals.bTadOutput, "")],
    ["B-tads Gained", formatSigned(totals.bTadsGainedPct, "%")],
    ["Cells Collected", formatSigned(totals.cellsPct, "%")],
    ["Intel Gained", formatSigned(totals.intelPct, "%")],
    ["Travel Speed", formatSigned(totals.travelSpeedPct, "%")],
    ["Food Consumed", totals.foodReductionPct ? `-${totals.foodReductionPct}%` : "0%"],
    ["Snail ATK", formatSigned(totals.atk, "")],
    ["Snail DEF", formatSigned(totals.def, "")],
    ["Snail RUSH", formatSigned(totals.rush, "")],
    ["Snail HP", formatSigned(totals.hp, "")],
    ["Rift DMG", formatSigned(totals.dmgPct, "%")],
    ["Troop Casualty", totals.troopCasualtyPct ? `${totals.troopCasualtyPct > 0 ? "+" : ""}${totals.troopCasualtyPct}%` : "0%"],
  ];

  body.innerHTML = rows
    .map(
      ([label, value]) => {
        const hasValue = !/^0/.test(String(value));
        return `
        <tr class="${hasValue ? "has-value" : ""}">
          <td>${escapeHtml(label)}</td>
          <td><strong>${escapeHtml(value)}</strong></td>
        </tr>`;
      },
    )
    .join("");
}

function getUnlockedBuffTotals(points) {
  const totals = {
    dragonOrbPct: 0,
    medalOutput: 0,
    bTadOutput: 0,
    bTadsGainedPct: 0,
    cellsPct: 0,
    intelPct: 0,
    travelSpeedPct: 0,
    foodReductionPct: 0,
    atk: 0,
    def: 0,
    rush: 0,
    hp: 0,
    dmgPct: 0,
    troopCasualtyPct: 0,
  };

  TIME_RIFT_THRESHOLDS.filter((threshold) => points >= threshold.points).forEach(
    (threshold) => addBuffToTotals(totals, threshold.buff),
  );

  return totals;
}

function addBuffToTotals(totals, buffText) {
  const text = String(buffText || "");
  const lower = text.toLowerCase();
  const signedValue = extractGoalNumber(text);
  const value = Math.abs(signedValue);

  if (/troop\s*casualty/.test(lower)) totals.troopCasualtyPct += signedValue;
  else if (/dragon\s*orbs?/.test(lower)) totals.dragonOrbPct += value;
  else if (/medal/.test(lower)) totals.medalOutput += value;
  else if (/b-?tad\s*output/.test(lower)) totals.bTadOutput += value;
  else if (/b-?tads?\s*gained/.test(lower)) totals.bTadsGainedPct += value;
  else if (/cells?\s*collected/.test(lower)) totals.cellsPct += value;
  else if (/intel/.test(lower)) totals.intelPct += value;
  else if (/travel\s*(spd|speed)/.test(lower)) totals.travelSpeedPct += value;
  else if (/food\s*consumed/.test(lower)) totals.foodReductionPct += value;
  else if (/snail\s*atk/.test(lower)) totals.atk += value;
  else if (/snail\s*def/.test(lower)) totals.def += value;
  else if (/snail\s*rush/.test(lower)) totals.rush += value;
  else if (/snail\s*hp/.test(lower)) totals.hp += value;
  else if (/\bdmg\b/.test(lower)) totals.dmgPct += value;
}

function formatSigned(value, suffix) {
  return value ? `+${value.toLocaleString()}${suffix}` : `0${suffix}`;
}


function applyBulkOwnedLevel(levelValue) {
  if (!visibleFamilyIds.length) return;

  const familyMap = new Map(getFamilies().map((family) => [family.familyId, family]));
  let changed = 0;

  visibleFamilyIds.forEach((familyId) => {
    const family = familyMap.get(familyId);
    if (!family) return;

    if (!levelValue) {
      if (ownedRelics[familyId]) changed++;
      delete ownedRelics[familyId];
      return;
    }

    const relic = getRelicAtLevel(family, levelValue);
    if (relic) {
      if (ownedRelics[familyId] !== relic.id) changed++;
      ownedRelics[familyId] = relic.id;
    }
  });

  if (!changed) return;
  cleanAssignmentsAgainstOwned();
  saveState();
  renderAll();
}

/* ---------- Events ---------- */

function bindEvents() {
  document.getElementById("refresh-relics")?.addEventListener("click", loadRelics);
  document.getElementById("reset-museum")?.addEventListener("click", resetSetup);
  document.getElementById("apply-optimized")?.addEventListener("click", applyOptimizedSetup);

  [
    "owned-search",
    "owned-type-filter",
    "owned-view-filter",
    "owned-level-filter",
    "stamp-filter",
  ].forEach((id) => {
    const element = document.getElementById(id);
    const eventName = element?.tagName === "INPUT" ? "input" : "change";
    element?.addEventListener(eventName, renderAll);
  });

  document.getElementById("target-points")?.addEventListener("input", renderAll);
  document.getElementById("goal-selector")?.addEventListener("change", renderAll);

  document.querySelectorAll(".bulk-level-btn").forEach((button) => {
    button.addEventListener("click", () => applyBulkOwnedLevel(button.dataset.level || ""));
  });

  document.querySelectorAll(".rift-tab").forEach((button) => {
    button.addEventListener("click", () => {
      activeTab = button.dataset.tab;
      renderAll();
    });
  });
}

function bindPostRenderEvents() {
  bindAppliedSetupSelects();
}

const originalRenderAll = renderAll;
renderAll = function renderAllWithEvents() {
  originalRenderAll();
  bindPostRenderEvents();
};

document.addEventListener("DOMContentLoaded", () => {
  loadState();
  bindEvents();
  renderAll();
  loadRelics();
});
