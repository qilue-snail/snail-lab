/* =========================================================
   Time Rift Museum
   Goal-first optimizer + category buckets
========================================================= */

const TIME_RIFT_TAB_NAME = "Time Rift Museum Relics";
const TIME_RIFT_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQt9dkXKEDeiQYyGmYaSZpcq7CY1eM9ALn-kxxmm8qASUHznh0avCAz7hp3ojGNOXxIZncAKcpEMJ5J/pub?gid=1578260911&single=true&output=csv";

const TIME_RIFT_PREFS_KEY = "timeRiftMuseumGoalPrefsV2";
const TIME_RIFT_LEVEL_OVERRIDES_KEY = "timeRiftMuseumLevelOverridesV2";
const TIME_RIFT_PINS_KEY = "timeRiftMuseumPinsV2";

const AFFCT_TYPES = ["FAME", "ART", "FTH", "CIV", "TECH"];
const GROUP_CAPACITY = {
  ALL: 3,
  FAME: 16,
  ART: 16,
  FTH: 16,
  CIV: 16,
  TECH: 16,
};

const TYPE_COLORS = {
  FAME: "var(--yellow)",
  ART: "var(--red)",
  FTH: "var(--purple)",
  CIV: "var(--green)",
  TECH: "var(--blue)",
  ALL: "var(--all)",
};

const LEVEL_OPTIONS = [
  { value: "Awaken", label: "Awakened" },
  { value: "6", label: "6★" },
  { value: "5", label: "5★" },
  { value: "4", label: "4★" },
  { value: "3", label: "3★" },
  { value: "Unowned", label: "Unowned" },
];

const PRIORITY_WEIGHTS = {
  High: 12,
  Medium: 5,
  Low: 2,
};

const TIME_RIFT_PEDESTALS = Array.from({ length: 83 }, (_, index) => {
  const slot = index + 1;
  const type = slot <= 3 ? "ALL" : AFFCT_TYPES[(slot - 4) % AFFCT_TYPES.length];
  return { slot, type };
});

const GROUP_SLOTS = TIME_RIFT_PEDESTALS.reduce((map, pedestal) => {
  if (!map[pedestal.type]) map[pedestal.type] = [];
  map[pedestal.type].push(pedestal.slot);
  return map;
}, {});

const DEFAULT_CELL_TYPES = [
  "Zombie",
  "Demon",
  "Angel",
  "Mutant",
  "Mecha",
  "Dragon",
];

const DEFAULT_REAGENT_TYPES = [
  "Green",
  "Blue",
  "Purple",
  "Orange",
];

const GOAL_DEFS = [
  {
    id: "cells",
    label: "Cells",
    description: "Cells Collected is universal; specific cell types can be selected together.",
    hasOptions: true,
  },
  {
    id: "reagents",
    label: "Reagent Drops",
    description: "Optimize any reagent color or several specific colors together.",
    hasOptions: true,
  },
  {
    id: "dragon-orbs",
    label: "Dragon Orbs",
    description: "2x Dragon Orb drop effects.",
  },
  {
    id: "incense",
    label: "Incense",
    description: "2x Incense drop effects.",
  },
  {
    id: "intel",
    label: "INTEL",
    description: "INTEL gained and 2x INTEL drops.",
  },
  {
    id: "b-tads",
    label: "B-tads",
    description: "B-tads gained and 2x B-tad drops.",
  },
  {
    id: "travel-speed",
    label: "Travel Speed",
    description: "Rift travel speed bonuses.",
  },
  {
    id: "elemental-dmg",
    label: "Elemental DMG",
    description: "Fire, Water, Earth, Wind, and general elemental damage.",
  },
];

const BROWSE_FILTERS = [
  { id: "cells", label: "Cells" },
  { id: "reagents", label: "Reagents" },
  { id: "dragon-orbs", label: "Dragon Orbs" },
  { id: "incense", label: "Incense" },
  { id: "intel", label: "INTEL" },
  { id: "b-tads", label: "B-tads" },
  { id: "travel-speed", label: "Travel Speed" },
  { id: "elemental-dmg", label: "Elemental DMG" },
  { id: "cards", label: "Cards" },
  { id: "combat", label: "Combat / Stats" },
  { id: "all", label: "All Rift Bonuses" },
];


let relicRows = [];
let families = [];
let latestSetup = [];
let currentBucket = "";
let discoveredCellTypes = [...DEFAULT_CELL_TYPES];
let discoveredReagentTypes = [...DEFAULT_REAGENT_TYPES];
let activeMuseumView = "optimize";
let browseFilter = "cells";
let browseSubtype = "any";
let browseSearch = "";
let alternativeSearch = "";

let state = {
  goals: {
    cells: { enabled: true, priority: "High", options: ["any"] },
    reagents: { enabled: false, priority: "Medium", options: ["any"] },
    "dragon-orbs": { enabled: false, priority: "Medium" },
    incense: { enabled: true, priority: "Medium" },
    intel: { enabled: false, priority: "Medium" },
    "b-tads": { enabled: false, priority: "Low" },
    "travel-speed": { enabled: false, priority: "Low" },
    "elemental-dmg": { enabled: false, priority: "Low" },
  },
  targetPoints: 0,
  levelOverrides: {},
  pins: {},
};

/* ---------- Helpers ---------- */

function normalizeId(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
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

function levelKey(level) {
  const raw = String(level || "").trim().toLowerCase();
  if (raw.includes("awaken")) return "Awaken";
  if (raw === "6" || raw.includes("6★")) return "6";
  if (raw === "5" || raw.includes("5★")) return "5";
  if (raw === "4" || raw.includes("4★")) return "4";
  if (raw === "3" || raw.includes("3★")) return "3";
  return "";
}

function levelValue(level) {
  const key = levelKey(level);
  if (key === "Awaken") return 7;
  return Number(key) || 0;
}

function displayRelicBaseName(name) {
  return String(name || "")
    .replace(/\s[-–—]\s*(Awaken|6|5|4|3)$/i, "")
    .trim();
}

function familyIdFor(name) {
  return normalizeId(displayRelicBaseName(name));
}

function formatNumber(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return "0";
  return Number.isInteger(number)
    ? number.toLocaleString()
    : number.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

/* ---------- CSV ---------- */

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

/*
  IMPORTANT:
  Only a stamp that is literally an AFFCT stat modifier counts toward pedestal AFFCT.
  Examples that count:
    FAME +15
    ART +15
    FTH +15
    CIV +15
    TECH +15

  Examples that DO NOT count:
    Snail ART +600
    Earth DMG +600
    Snail CIV +600
    AFFCT Checks -150

  The old parser searched for ART/CIV/etc anywhere in the text, so "Earth"
  accidentally matched ART and caused values such as Great Mogul Diamond = 1562.
*/
function parseAffctStampBonus(text) {
  const raw = String(text || "").trim();
  const match = raw.match(/^(FAME|ART|FTH|CIV|TECH)\s*([+-])\s*([\d.]+)\s*$/i);
  if (!match) return null;

  const value = Number(match[3]) * (match[2] === "-" ? -1 : 1);
  return {
    target: match[1].toUpperCase(),
    value,
    raw,
  };
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
      headers.forEach((header, column) => {
        obj[header] = row[column] || "";
      });

      const name = String(obj["Relic Name"] || "").trim();
      if (!name) return null;

      const level = String(obj.Level || "").trim();
      const stamps = [obj["Stamp 1"], obj["Stamp 2"], obj["Stamp 3"]]
        .map((stamp) => String(stamp || "").trim())
        .filter(Boolean);

      return {
        id: normalizeId(`${name}-${level || index}`),
        familyId: familyIdFor(name),
        baseName: displayRelicBaseName(name),
        name,
        level,
        levelKey: levelKey(level),
        type: String(obj.Type || "").trim().toUpperCase(),
        fame: toNumber(obj.FAME),
        art: toNumber(obj.ART),
        fth: toNumber(obj.FTH),
        civ: toNumber(obj.CIV),
        tech: toNumber(obj.TECH),
        stampTexts: stamps,
        stampBonuses: stamps.map(parseAffctStampBonus).filter(Boolean),
      };
    })
    .filter(Boolean);
}

function buildFamilies() {
  const map = new Map();

  relicRows.forEach((relic) => {
    if (!map.has(relic.familyId)) map.set(relic.familyId, []);
    map.get(relic.familyId).push(relic);
  });

  families = Array.from(map.entries())
    .map(([familyId, levels]) => {
      const sorted = [...levels].sort(
        (a, b) => levelValue(b.level) - levelValue(a.level),
      );
      const levelMap = Object.fromEntries(
        sorted.map((relic) => [relic.levelKey, relic]),
      );

      return {
        familyId,
        name: sorted[0]?.baseName || familyId,
        type: sorted[0]?.type || "",
        levels: sorted,
        levelMap,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function discoverSubtypes() {
  const cellTypes = new Set(DEFAULT_CELL_TYPES);
  const reagentTypes = new Set(DEFAULT_REAGENT_TYPES);

  relicRows.forEach((relic) => {
    relic.stampTexts.forEach((stamp) => {
      const cellMatch = stamp.match(/\b([A-Za-z]+)\s+Cells?\s+(?:gained|collected)\b/i);
      if (cellMatch && !/^cells?$/i.test(cellMatch[1])) {
        cellTypes.add(
          cellMatch[1].charAt(0).toUpperCase() + cellMatch[1].slice(1).toLowerCase(),
        );
      }

      const reagentMatch = stamp.match(/\b(?:2x\s+)?([A-Za-z]+)\s+Reagent\s+Drops?\b/i);
      if (reagentMatch) {
        reagentTypes.add(
          reagentMatch[1].charAt(0).toUpperCase() + reagentMatch[1].slice(1).toLowerCase(),
        );
      }
    });
  });

  discoveredCellTypes = Array.from(cellTypes);
  discoveredReagentTypes = Array.from(reagentTypes);
}

/* ---------- State ---------- */

function loadState() {
  try {
    const savedPrefs = JSON.parse(localStorage.getItem(TIME_RIFT_PREFS_KEY));
    if (savedPrefs?.goals) state.goals = { ...state.goals, ...savedPrefs.goals };
    if (Number.isFinite(Number(savedPrefs?.targetPoints))) {
      state.targetPoints = Math.max(0, Number(savedPrefs.targetPoints));
    }
  } catch {
    // Keep defaults.
  }

  try {
    state.levelOverrides =
      JSON.parse(localStorage.getItem(TIME_RIFT_LEVEL_OVERRIDES_KEY)) || {};
  } catch {
    state.levelOverrides = {};
  }

  try {
    state.pins = JSON.parse(localStorage.getItem(TIME_RIFT_PINS_KEY)) || {};
  } catch {
    state.pins = {};
  }
}

function saveState() {
  localStorage.setItem(
    TIME_RIFT_PREFS_KEY,
    JSON.stringify({
      goals: state.goals,
      targetPoints: state.targetPoints,
    }),
  );
  localStorage.setItem(
    TIME_RIFT_LEVEL_OVERRIDES_KEY,
    JSON.stringify(state.levelOverrides),
  );
  localStorage.setItem(TIME_RIFT_PINS_KEY, JSON.stringify(state.pins));
}

function cleanState() {
  const validFamilies = new Set(families.map((family) => family.familyId));

  Object.keys(state.levelOverrides).forEach((familyId) => {
    if (!validFamilies.has(familyId)) delete state.levelOverrides[familyId];
  });

  Object.keys(state.pins).forEach((familyId) => {
    if (!validFamilies.has(familyId)) delete state.pins[familyId];
    if (!GROUP_CAPACITY[state.pins[familyId]]) delete state.pins[familyId];
  });

  saveState();
}

function getFamily(familyId) {
  return families.find((family) => family.familyId === familyId) || null;
}

function getActiveRelic(family) {
  if (!family) return null;

  const override = state.levelOverrides[family.familyId];
  if (override === "Unowned") return null;

  const wanted = override || "Awaken";
  return (
    family.levelMap[wanted] ||
    family.levelMap.Awaken ||
    family.levels[0] ||
    null
  );
}

function selectedLevelForFamily(family) {
  if (!family) return "Unowned";
  if (state.levelOverrides[family.familyId]) {
    return state.levelOverrides[family.familyId];
  }
  return family.levelMap.Awaken ? "Awaken" : family.levels[0]?.levelKey || "Unowned";
}

/* ---------- AFFCT scoring ---------- */

function getBaseStat(relic, pedestalType) {
  if (!relic) return 0;

  if (pedestalType === "ALL") {
    return relic.fame + relic.art + relic.fth + relic.civ + relic.tech;
  }

  return relic[pedestalType.toLowerCase()] || 0;
}

function getAffctStampBonus(relic, pedestalType) {
  if (!relic) return 0;

  return relic.stampBonuses.reduce((total, bonus) => {
    if (pedestalType === "ALL") {
      return total + bonus.value;
    }

    return bonus.target === pedestalType
      ? total + bonus.value
      : total;
  }, 0);
}

function pedestalAffct(relic, pedestalType) {
  return getBaseStat(relic, pedestalType) + getAffctStampBonus(relic, pedestalType);
}

/* ---------- Goal matching ---------- */

function enabledGoalCount() {
  return Object.values(state.goals).filter((goal) => goal.enabled).length;
}

function selectedOptions(goalId) {
  const goal = state.goals[goalId];
  const options = Array.isArray(goal?.options) ? goal.options : [];
  return options.length ? options : ["any"];
}

function stampNumericValue(stamp) {
  const match = String(stamp || "").match(/\+\s*([\d.]+)/);
  return match ? Number(match[1]) || 0 : 0;
}

function stampPercentValue(stamp) {
  if (!/%/.test(String(stamp || ""))) return 0;
  return stampNumericValue(stamp);
}

function isUniversalCellStamp(stamp) {
  return /\bcells?\s+collected\b/i.test(stamp) &&
    !/\b(zombie|demon|angel|mutant|mecha|dragon)\s+cells?\b/i.test(stamp);
}

function cellSubtypeFromStamp(stamp) {
  const match = String(stamp || "").match(
    /\b([A-Za-z]+)\s+Cells?\s+(?:gained|collected)\b/i,
  );
  if (!match) return "";
  const subtype = match[1].toLowerCase();
  return subtype === "cells" ? "" : subtype;
}

function reagentSubtypeFromStamp(stamp) {
  const match = String(stamp || "").match(
    /\b(?:2x\s+)?([A-Za-z]+)\s+Reagent\s+Drops?\b/i,
  );
  return match ? match[1].toLowerCase() : "";
}

function stampMatchesGoal(stamp, goalId) {
  const text = String(stamp || "");
  const lower = text.toLowerCase();

  if (goalId === "cells") {
    if (!/cell/i.test(text)) return false;
    if (isUniversalCellStamp(text)) return true;

    const options = selectedOptions("cells").map((value) => value.toLowerCase());
    if (options.includes("any")) return true;

    const subtype = cellSubtypeFromStamp(text);
    return subtype ? options.includes(subtype) : false;
  }

  if (goalId === "reagents") {
    if (!/reagent/i.test(text)) return false;

    const options = selectedOptions("reagents").map((value) => value.toLowerCase());
    if (options.includes("any")) return true;

    const subtype = reagentSubtypeFromStamp(text);
    return subtype ? options.includes(subtype) : false;
  }

  if (goalId === "dragon-orbs") {
    return /dragon\s*orbs?/i.test(text);
  }

  if (goalId === "incense") {
    return /incense/i.test(text);
  }

  if (goalId === "intel") {
    return /\bintel\b/i.test(text);
  }

  if (goalId === "b-tads") {
    return /\bb-?tads?\b|\bbtads?\b|black\s*tads?/i.test(text);
  }

  if (goalId === "travel-speed") {
    return /travel\s*(spd|speed)/i.test(text);
  }

  if (goalId === "elemental-dmg") {
    return /(fire|water|earth|wind|element|elmt).*(dmg|damage)|(dmg|damage).*(fire|water|earth|wind|element|elmt)/i.test(
      text,
    );
  }

  return false;
}

function normalizedGoalValue(stamp, goalId) {
  if (!stampMatchesGoal(stamp, goalId)) return 0;

  const percent = stampPercentValue(stamp);
  if (percent) return percent;

  const value = stampNumericValue(stamp);
  if (!value) {
    // A matching effect with no parsed number is still useful for ranking,
    // but does not invent a percentage for the results display.
    return 0.5;
  }

  if (goalId === "elemental-dmg") {
    return value / 50;
  }

  return value;
}

function relicGoalScore(relic) {
  if (!relic) return 0;

  return Object.entries(state.goals).reduce((grandTotal, [goalId, goal]) => {
    if (!goal.enabled) return grandTotal;

    const priority = PRIORITY_WEIGHTS[goal.priority] || PRIORITY_WEIGHTS.Medium;
    const stampTotal = relic.stampTexts.reduce(
      (total, stamp) => total + normalizedGoalValue(stamp, goalId),
      0,
    );

    return grandTotal + stampTotal * priority;
  }, 0);
}

function matchedGoalStamps(relic) {
  if (!relic) return [];

  return relic.stampTexts.filter((stamp) =>
    Object.entries(state.goals).some(
      ([goalId, goal]) => goal.enabled && stampMatchesGoal(stamp, goalId),
    ),
  );
}

/* ---------- Optimizer ---------- */

function candidateFor(family, groupType, pointWeight) {
  const relic = getActiveRelic(family);
  if (!relic) return null;

  const points = pedestalAffct(relic, groupType);
  const goalScore = relicGoalScore(relic);
  const weightedScore = goalScore * 100 + points * pointWeight;

  return {
    family,
    relic,
    groupType,
    points,
    goalScore,
    weightedScore,
  };
}

function buildSetup(pointWeight) {
  const groupEntries = {};
  const usedFamilies = new Set();

  Object.keys(GROUP_CAPACITY).forEach((groupType) => {
    groupEntries[groupType] = [];
  });

  // Manual placement always wins, including off-type placements.
  Object.entries(state.pins).forEach(([familyId, groupType]) => {
    if (!GROUP_CAPACITY[groupType]) return;
    if (groupEntries[groupType].length >= GROUP_CAPACITY[groupType]) return;

    const family = getFamily(familyId);
    if (!family || usedFamilies.has(familyId)) return;

    const candidate = candidateFor(family, groupType, pointWeight);
    if (!candidate) return;

    groupEntries[groupType].push({
      ...candidate,
      pinned: true,
      offType: groupType !== "ALL" && family.type !== groupType,
    });
    usedFamilies.add(familyId);
  });

  // ALL slots can use any relic.
  const allCandidates = families
    .filter(
      (family) =>
        !usedFamilies.has(family.familyId) && Boolean(getActiveRelic(family)),
    )
    .map((family) => candidateFor(family, "ALL", pointWeight))
    .filter(Boolean)
    .sort(
      (a, b) =>
        b.weightedScore - a.weightedScore ||
        b.goalScore - a.goalScore ||
        b.points - a.points ||
        a.family.name.localeCompare(b.family.name),
    );

  allCandidates.forEach((candidate) => {
    if (groupEntries.ALL.length >= GROUP_CAPACITY.ALL) return;
    if (usedFamilies.has(candidate.family.familyId)) return;

    groupEntries.ALL.push(candidate);
    usedFamilies.add(candidate.family.familyId);
  });

  // Typed pedestal groups prefer the matching relic type.
  AFFCT_TYPES.forEach((groupType) => {
    const matching = families
      .filter(
        (family) =>
          family.type === groupType &&
          !usedFamilies.has(family.familyId) &&
          Boolean(getActiveRelic(family)),
      )
      .map((family) => candidateFor(family, groupType, pointWeight))
      .filter(Boolean)
      .sort(
        (a, b) =>
          b.weightedScore - a.weightedScore ||
          b.goalScore - a.goalScore ||
          b.points - a.points ||
          a.family.name.localeCompare(b.family.name),
      );

    matching.forEach((candidate) => {
      if (groupEntries[groupType].length >= GROUP_CAPACITY[groupType]) return;
      if (usedFamilies.has(candidate.family.familyId)) return;

      groupEntries[groupType].push(candidate);
      usedFamilies.add(candidate.family.familyId);
    });
  });

  // If ownership changes leave a typed bucket short, use off-type relics only
  // as a last-resort fill rather than as the normal optimizer behavior.
  AFFCT_TYPES.forEach((groupType) => {
    if (groupEntries[groupType].length >= GROUP_CAPACITY[groupType]) return;

    const offType = families
      .filter(
        (family) =>
          family.type !== groupType &&
          !usedFamilies.has(family.familyId) &&
          Boolean(getActiveRelic(family)),
      )
      .map((family) => candidateFor(family, groupType, pointWeight))
      .filter(Boolean)
      .sort(
        (a, b) =>
          b.weightedScore - a.weightedScore ||
          b.goalScore - a.goalScore ||
          b.points - a.points ||
          a.family.name.localeCompare(b.family.name),
      );

    offType.forEach((candidate) => {
      if (groupEntries[groupType].length >= GROUP_CAPACITY[groupType]) return;
      if (usedFamilies.has(candidate.family.familyId)) return;

      groupEntries[groupType].push({ ...candidate, offType: true });
      usedFamilies.add(candidate.family.familyId);
    });
  });

  const setup = [];

  Object.entries(groupEntries).forEach(([groupType, entries]) => {
    const slots = GROUP_SLOTS[groupType] || [];

    entries
      .sort(
        (a, b) =>
          Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
          b.weightedScore - a.weightedScore ||
          b.points - a.points ||
          a.family.name.localeCompare(b.family.name),
      )
      .forEach((entry, index) => {
        setup.push({
          ...entry,
          slot: slots[index],
        });
      });
  });

  return setup.sort((a, b) => a.slot - b.slot);
}

function setupPoints(setup) {
  return setup.reduce((total, item) => total + item.points, 0);
}

function setupGoalScore(setup) {
  return setup.reduce((total, item) => total + item.goalScore, 0);
}

function compareSetups(a, b, targetPoints) {
  const aPoints = setupPoints(a);
  const bPoints = setupPoints(b);
  const aGoals = setupGoalScore(a);
  const bGoals = setupGoalScore(b);
  const aMeets = aPoints >= targetPoints;
  const bMeets = bPoints >= targetPoints;

  if (targetPoints > 0 && aMeets !== bMeets) {
    return aMeets ? -1 : 1;
  }

  if (targetPoints > 0 && !aMeets && !bMeets) {
    if (aPoints !== bPoints) return bPoints - aPoints;
    return bGoals - aGoals;
  }

  if (aGoals !== bGoals) return bGoals - aGoals;
  if (aPoints !== bPoints) return bPoints - aPoints;
  return b.length - a.length;
}

function optimizeMuseum() {
  if (!families.length) {
    latestSetup = [];
    renderResults();
    return;
  }

  const targetPoints = Math.max(
    0,
    Number(document.getElementById("target-points")?.value || state.targetPoints || 0),
  );
  state.targetPoints = targetPoints;

  const pointWeights = [0.15, 0.35, 0.75, 1.5, 3, 6, 12, 24, 48];
  const setups = pointWeights.map(buildSetup);

  setups.sort((a, b) => compareSetups(a, b, targetPoints));
  latestSetup = setups[0] || [];

  saveState();
  renderResults();
}

/* ---------- Accurate result summaries ---------- */

function effectSummaryKey(stamp) {
  const raw = String(stamp || "").trim();
  if (!raw || parseAffctStampBonus(raw)) return null;

  const match = raw.match(/^(.*?)([+-])\s*([\d.]+)(\s*%)?\s*$/);
  if (!match) {
    return {
      key: `${raw.toLowerCase()}|text`,
      label: raw,
      value: null,
      unit: "",
      raw,
    };
  }

  const label = match[1].trim().replace(/\s+/g, " ");
  const sign = match[2] === "-" ? -1 : 1;
  const value = Number(match[3]) * sign;
  const unit = match[4] ? "%" : "";

  return {
    key: `${label.toLowerCase()}|${unit || "flat"}`,
    label,
    value,
    unit,
    raw,
  };
}

function getAllEffectTotals() {
  const totals = new Map();

  latestSetup.forEach((item) => {
    item.relic.stampTexts.forEach((stamp) => {
      const parsed = effectSummaryKey(stamp);
      if (!parsed) return;

      const selected = Object.entries(state.goals).some(
        ([goalId, goal]) => goal.enabled && stampMatchesGoal(stamp, goalId),
      );

      if (!totals.has(parsed.key)) {
        totals.set(parsed.key, {
          label: parsed.label,
          value: parsed.value === null ? null : 0,
          unit: parsed.unit,
          selected,
          rawExamples: [],
        });
      }

      const aggregate = totals.get(parsed.key);
      aggregate.selected = aggregate.selected || selected;

      if (parsed.value === null) {
        aggregate.rawExamples.push(parsed.raw);
      } else {
        aggregate.value += parsed.value;
      }
    });
  });

  return Array.from(totals.values());
}

function getGroupedEffectSummary() {
  const raw = getAllEffectTotals();

  let universalCells = 0;
  const cellSpecific = [];
  const reagents = [];
  const resources = [];
  const combat = [];
  const other = [];

  raw.forEach((effect) => {
    const label = effect.label.trim();

    if (/^cells?\s+collected$/i.test(label) && effect.value !== null) {
      universalCells += effect.value;
      return;
    }

    const cellMatch = label.match(/^([A-Za-z]+)\s+Cells?\s+(?:gained|collected)$/i);
    if (cellMatch && effect.value !== null) {
      cellSpecific.push({
        subtype:
          cellMatch[1].charAt(0).toUpperCase() +
          cellMatch[1].slice(1).toLowerCase(),
        value: effect.value,
        selected: effect.selected,
      });
      return;
    }

    const reagentMatch = label.match(
      /^(?:2x\s+)?([A-Za-z]+)\s+Reagent\s+Drops?$/i,
    );
    if (reagentMatch && effect.value !== null) {
      reagents.push({
        subtype:
          reagentMatch[1].charAt(0).toUpperCase() +
          reagentMatch[1].slice(1).toLowerCase(),
        value: effect.value,
        selected: effect.selected,
      });
      return;
    }

    if (
      /dragon\s*orbs?|incense|intel|b-?tads?|btads?|time\s*chest|food|card\s*drops?|medal\s*output|travel\s*(spd|speed)/i.test(
        label,
      )
    ) {
      resources.push(effect);
      return;
    }

    if (
      /\batk\b|\bdef\b|\bhp\b|\brush\b|crit|dmg|damage|snail\s+(fame|art|fth|civ|tech)/i.test(
        label,
      )
    ) {
      combat.push(effect);
      return;
    }

    other.push(effect);
  });

  const effectSort = (a, b) =>
    Number(Boolean(b.selected)) - Number(Boolean(a.selected)) ||
    Math.abs(Number(b.value || 0)) - Math.abs(Number(a.value || 0)) ||
    a.label.localeCompare(b.label);

  cellSpecific.sort((a, b) => b.value - a.value || a.subtype.localeCompare(b.subtype));
  reagents.sort((a, b) => b.value - a.value || a.subtype.localeCompare(b.subtype));
  resources.sort(effectSort);
  combat.sort(effectSort);
  other.sort(effectSort);

  return {
    universalCells,
    cellSpecific,
    reagents,
    resources,
    combat,
    other,
  };
}

function formatEffectTotal(effect) {
  if (effect.value === null) return escapeHtml(effect.label);

  const prefix = effect.value > 0 ? "+" : "";
  return `${prefix}${formatNumber(effect.value)}${effect.unit}`;
}

function effectSummaryRow(effect) {
  return `
    <div class="result-row ${effect.selected ? "selected-result" : ""}">
      <span>${escapeHtml(effect.label)}</span>
      <strong>${formatEffectTotal(effect)}</strong>
      ${effect.selected ? `<small>Selected goal</small>` : ""}
    </div>
  `;
}

/* ---------- Render ---------- */

function renderGoalSelector() {
  const container = document.getElementById("goal-selector");
  if (!container) return;

  container.innerHTML = GOAL_DEFS.map((definition) => {
    const goal = state.goals[definition.id] || {
      enabled: false,
      priority: "Medium",
    };

    return `
      <article class="goal-card ${goal.enabled ? "enabled" : ""}">
        <input
          class="goal-enable"
          type="checkbox"
          data-goal-enable="${escapeHtml(definition.id)}"
          ${goal.enabled ? "checked" : ""}
          aria-label="Enable ${escapeHtml(definition.label)}"
        />
        <div class="goal-label">
          <strong>${escapeHtml(definition.label)}</strong>
          <small>${escapeHtml(definition.description)}</small>
        </div>
        <select
          class="priority-select"
          data-goal-priority="${escapeHtml(definition.id)}"
          ${goal.enabled ? "" : "disabled"}
          aria-label="${escapeHtml(definition.label)} priority"
        >
          ${["High", "Medium", "Low"]
            .map(
              (priority) =>
                `<option ${goal.priority === priority ? "selected" : ""}>${priority}</option>`,
            )
            .join("")}
        </select>
      </article>
    `;
  }).join("");

  renderGoalSuboptions();
}

function renderGoalSuboptions() {
  const container = document.getElementById("goal-suboptions");
  if (!container) return;

  const sections = [];

  const cellsGoal = state.goals.cells;
  if (cellsGoal?.enabled) {
    const chosen = selectedOptions("cells").map((value) => value.toLowerCase());
    const options = [
      { value: "any", label: "Any cell type" },
      ...discoveredCellTypes.map((type) => ({
        value: type.toLowerCase(),
        label: `${type} Cells`,
      })),
    ];

    sections.push(`
      <div class="suboption-row">
        <strong>Cells:</strong>
        <div class="suboption-list">
          ${options
            .map(
              (option) => `
                <label class="suboption-check">
                  <input
                    type="checkbox"
                    data-goal-option="cells"
                    value="${escapeHtml(option.value)}"
                    ${chosen.includes(option.value.toLowerCase()) ? "checked" : ""}
                  />
                  <span>${escapeHtml(option.label)}</span>
                </label>
              `,
            )
            .join("")}
        </div>
      </div>
    `);
  }

  const reagentGoal = state.goals.reagents;
  if (reagentGoal?.enabled) {
    const chosen = selectedOptions("reagents").map((value) => value.toLowerCase());
    const options = [
      { value: "any", label: "Any reagent" },
      ...discoveredReagentTypes.map((type) => ({
        value: type.toLowerCase(),
        label: `${type} Reagent`,
      })),
    ];

    sections.push(`
      <div class="suboption-row">
        <strong>Reagents:</strong>
        <div class="suboption-list">
          ${options
            .map(
              (option) => `
                <label class="suboption-check">
                  <input
                    type="checkbox"
                    data-goal-option="reagents"
                    value="${escapeHtml(option.value)}"
                    ${chosen.includes(option.value.toLowerCase()) ? "checked" : ""}
                  />
                  <span>${escapeHtml(option.label)}</span>
                </label>
              `,
            )
            .join("")}
        </div>
      </div>
    `);
  }

  container.innerHTML = sections.join("");
  container.hidden = !sections.length;
}

function typePill(type) {
  const background = TYPE_COLORS[type] || "#eee";
  return `<span class="type-pill" style="background:${background}">${escapeHtml(type || "—")}</span>`;
}

function effectPills(relic, max = 3) {
  if (!relic) {
    return `<span class="effect-text muted">No Rift stamp bonuses</span>`;
  }

  const allStamps = Array.isArray(relic.stampTexts) ? relic.stampTexts.filter(Boolean) : [];
  if (!allStamps.length) {
    return `<span class="effect-text muted">No Rift stamp bonuses</span>`;
  }

  const matched = new Set(matchedGoalStamps(relic));
  const ordered = [
    ...allStamps.filter((stamp) => matched.has(stamp)),
    ...allStamps.filter((stamp) => !matched.has(stamp)),
  ].slice(0, max);

  return `
    <span class="effect-text">
      ${ordered
        .map(
          (stamp) => `
            <span class="effect-stamp ${matched.has(stamp) ? "goal-match" : "extra-bonus"}">
              ${escapeHtml(stamp)}
            </span>
          `,
        )
        .join('<span class="effect-divider"> · </span>')}
    </span>
  `;
}

function levelSelect(family, extraAttribute = "") {
  const current = selectedLevelForFamily(family);

  return `
    <select
      class="level-select"
      data-family-level="${escapeHtml(family.familyId)}"
      ${extraAttribute}
      aria-label="Owned level for ${escapeHtml(family.name)}"
    >
      ${LEVEL_OPTIONS.map((option) => {
        const hasLevel =
          option.value === "Unowned" || Boolean(family.levelMap[option.value]);

        return `
          <option
            value="${escapeHtml(option.value)}"
            ${current === option.value ? "selected" : ""}
            ${hasLevel ? "" : "disabled"}
          >
            ${escapeHtml(option.label)}
          </option>
        `;
      }).join("")}
    </select>
  `;
}

function getAllSlotChoices(currentFamilyId) {
  return families
    .filter((family) => Boolean(getActiveRelic(family)))
    .map((family) => {
      const relic = getActiveRelic(family);
      return {
        family,
        relic,
        points: pedestalAffct(relic, "ALL"),
        goalScore: relicGoalScore(relic),
      };
    })
    .sort(
      (a, b) =>
        b.goalScore - a.goalScore ||
        b.points - a.points ||
        a.family.name.localeCompare(b.family.name),
    );
}

function allRelicSelect(item) {
  const choices = getAllSlotChoices(item.family.familyId);

  return `
    <label class="all-change-label">
      Change relic
      <select
        class="all-relic-select"
        data-all-current-family="${escapeHtml(item.family.familyId)}"
        aria-label="Change relic in ALL slot ${item.slot}"
      >
        <option value="">Auto optimize</option>
        ${choices
          .map(
            (choice) => `
              <option
                value="${escapeHtml(choice.family.familyId)}"
                ${choice.family.familyId === item.family.familyId ? "selected" : ""}
              >
                ${escapeHtml(choice.family.name)} — ${formatNumber(choice.points)} ALL
              </option>
            `,
          )
          .join("")}
      </select>
    </label>
  `;
}

function renderAllSlots() {
  const container = document.getElementById("all-slots");
  if (!container) return;

  const items = latestSetup.filter((item) => item.groupType === "ALL");

  container.innerHTML = items.length
    ? items
        .map(
          (item) => `
            <article class="all-slot-card">
              <div class="all-slot-topline">
                <span class="slot-label">Slot ${item.slot} · ALL</span>
                <strong>${formatNumber(item.points)} ALL</strong>
              </div>
              <h3>${escapeHtml(item.family.name)}</h3>
              <div class="effect-pills">${effectPills(item.relic, 3)}</div>
              <div class="all-slot-controls">
                ${allRelicSelect(item)}
                ${levelSelect(item.family)}
              </div>
            </article>
          `,
        )
        .join("")
    : `<div class="empty-state">No setup yet.</div>`;
}

function renderCategoryBuckets() {
  const container = document.getElementById("category-buckets");
  if (!container) return;

  container.innerHTML = AFFCT_TYPES.map((type) => {
    const items = latestSetup.filter((item) => item.groupType === type);
    const preview = items.slice(0, 4);

    return `
      <article class="bucket-card">
        <div class="bucket-head">
          <div class="bucket-name">
            <span class="type-dot" style="background:${TYPE_COLORS[type]}"></span>
            ${type}
          </div>
          <span class="bucket-count">${items.length} / ${GROUP_CAPACITY[type]}</span>
        </div>
        <div class="bucket-body">
          ${preview
            .map(
              (item) => `
                <div class="relic-preview">
                  <div class="relic-meta">
                    Slot ${item.slot} · ${formatNumber(item.points)} ${type}
                  </div>
                  <h3>${escapeHtml(item.family.name)}</h3>
                  <div class="effect-pills">${effectPills(item.relic, 3)}</div>
                </div>
              `,
            )
            .join("")}
          <button class="open-bucket-btn" type="button" data-open-bucket="${type}">
            View all ${GROUP_CAPACITY[type]} ${type} slots
          </button>
        </div>
      </article>
    `;
  }).join("");
}

function renderSummary() {
  setText("optimized-points", formatNumber(setupPoints(latestSetup)));
  setText("optimized-filled", `${latestSetup.length} / 83`);
  setText("adjusted-count", Object.keys(state.levelOverrides).length);
  setText("selected-goal-count", enabledGoalCount());

  const grouped = getGroupedEffectSummary();
  const container = document.getElementById("effect-summary");
  if (!container) return;

  const sections = [];

  if (grouped.universalCells || grouped.cellSpecific.length) {
    const cellRows = [];

    if (grouped.universalCells) {
      cellRows.push(`
        <div class="result-row result-row-universal ${
          state.goals.cells?.enabled ? "selected-result" : ""
        }">
          <span>Cells Collected</span>
          <strong>+${formatNumber(grouped.universalCells)}%</strong>
          <small>Universal bonus for every cell type</small>
        </div>
      `);
    }

    grouped.cellSpecific.forEach((item) => {
      const effective = grouped.universalCells + item.value;
      cellRows.push(`
        <div class="result-row ${item.selected ? "selected-result" : ""}">
          <span>${escapeHtml(item.subtype)} Cells</span>
          <strong>+${formatNumber(effective)}%</strong>
          <small>
            ${formatNumber(item.value)}% specific${
              grouped.universalCells
                ? ` + ${formatNumber(grouped.universalCells)}% universal`
                : ""
            }
          </small>
        </div>
      `);
    });

    sections.push(`
      <section class="result-group result-group-cells">
        <div class="result-group-head">
          <h3>Cells</h3>
          <span>Effective totals</span>
        </div>
        <div class="result-rows">${cellRows.join("")}</div>
      </section>
    `);
  }

  if (grouped.reagents.length) {
    sections.push(`
      <section class="result-group">
        <div class="result-group-head">
          <h3>Reagents</h3>
          <span>Each color stays separate</span>
        </div>
        <div class="result-rows">
          ${grouped.reagents
            .map(
              (item) => `
                <div class="result-row ${item.selected ? "selected-result" : ""}">
                  <span>${escapeHtml(item.subtype)} Reagent</span>
                  <strong>+${formatNumber(item.value)}%</strong>
                  ${item.selected ? `<small>Selected goal</small>` : ""}
                </div>
              `,
            )
            .join("")}
        </div>
      </section>
    `);
  }

  if (grouped.resources.length) {
    sections.push(`
      <section class="result-group">
        <div class="result-group-head">
          <h3>Resources / Progress</h3>
          <span>All useful resource bonuses</span>
        </div>
        <div class="result-rows">
          ${grouped.resources.map(effectSummaryRow).join("")}
        </div>
      </section>
    `);
  }

  if (grouped.combat.length) {
    sections.push(`
      <section class="result-group">
        <div class="result-group-head">
          <h3>Combat / Stats</h3>
          <span>Extra bonuses from the setup</span>
        </div>
        <div class="result-rows">
          ${grouped.combat.map(effectSummaryRow).join("")}
        </div>
      </section>
    `);
  }

  if (grouped.other.length) {
    sections.push(`
      <section class="result-group">
        <div class="result-group-head">
          <h3>Other Rift bonuses</h3>
          <span>Additional stamp effects</span>
        </div>
        <div class="result-rows">
          ${grouped.other.map(effectSummaryRow).join("")}
        </div>
      </section>
    `);
  }

  container.innerHTML = sections.length
    ? sections.join("")
    : `
      <div class="empty-state">
        No Rift stamp bonuses are active in this setup.
      </div>
    `;
}

function getBucketAlternatives(groupType, includeOffType = false) {
  const selectedFamilies = new Set(latestSetup.map((item) => item.family.familyId));
  const query = normalizeText(alternativeSearch);

  return families
    .filter((family) => {
      if (selectedFamilies.has(family.familyId)) return false;
      if (!getActiveRelic(family)) return false;

      const isOffType = groupType !== "ALL" && family.type !== groupType;
      if (includeOffType !== isOffType) return false;

      if (!query) return true;

      const relic = getActiveRelic(family);
      return (
        normalizeText(family.name).includes(query) ||
        relic.stampTexts.some((stamp) => normalizeText(stamp).includes(query))
      );
    })
    .map((family) => {
      const relic = getActiveRelic(family);
      return {
        family,
        relic,
        groupType,
        points: pedestalAffct(relic, groupType),
        goalScore: relicGoalScore(relic),
      };
    })
    .sort(
      (a, b) =>
        b.goalScore - a.goalScore ||
        b.points - a.points ||
        a.family.name.localeCompare(b.family.name),
    );
}

function alternativeCard(item, groupType) {
  return `
    <article class="alternative-card">
      <div class="alternative-card-head">
        <strong>${escapeHtml(item.family.name)}</strong>
        ${typePill(item.relic.type)}
      </div>
      <small>${formatNumber(item.points)} ${groupType}</small>
      <div class="effect-pills">${effectPills(item.relic, 3)}</div>
      <button
        class="use-alternative-btn"
        type="button"
        data-use-family="${escapeHtml(item.family.familyId)}"
        data-use-group="${escapeHtml(groupType)}"
      >
        Use in ${groupType}
      </button>
    </article>
  `;
}

function renderBucketDetail() {
  const panel = document.getElementById("bucket-detail");
  if (!panel) return;

  if (!currentBucket || !GROUP_CAPACITY[currentBucket]) {
    panel.hidden = true;
    return;
  }

  panel.hidden = false;

  setText("bucket-detail-eyebrow", `${GROUP_CAPACITY[currentBucket]} pedestal slots`);
  setText("bucket-detail-title", `${currentBucket} bucket`);
  setText(
    "bucket-detail-note",
    `The optimizer prefers ${currentBucket} relics here. You can still manually place an off-type relic if its Rift stamps are worth the lower ${currentBucket} AFFCT.`,
  );

  const rows = latestSetup.filter((item) => item.groupType === currentBucket);
  const list = document.getElementById("bucket-detail-list");

  list.innerHTML = rows
    .map((item, index) => {
      const isPinned = state.pins[item.family.familyId] === currentBucket;
      const offType = item.relic.type !== currentBucket;

      return `
        <tr class="${offType ? "offtype-row" : ""}">
          <td>${index + 1}</td>
          <td>
            <span class="table-relic-name">${escapeHtml(item.family.name)}</span>
            ${offType ? `<small class="offtype-note">Off-type ${item.relic.type} relic</small>` : ""}
          </td>
          <td>${typePill(item.relic.type)}</td>
          <td>${levelSelect(item.family)}</td>
          <td>${formatNumber(item.points)} ${currentBucket}</td>
          <td>
            <div class="effect-pills">${effectPills(item.relic, 3)}</div>
          </td>
          <td>
            <button
              class="keep-btn ${isPinned ? "active" : ""}"
              type="button"
              data-pin-family="${escapeHtml(item.family.familyId)}"
              data-pin-group="${escapeHtml(currentBucket)}"
            >
              ${isPinned ? "Kept" : "Keep"}
            </button>
          </td>
        </tr>
      `;
    })
    .join("");

  const sameType = getBucketAlternatives(currentBucket, false);
  const offType = getBucketAlternatives(currentBucket, true);

  const altContainer = document.getElementById("bucket-alternatives");
  const offTypeContainer = document.getElementById("bucket-offtype-alternatives");

  if (altContainer) {
    altContainer.innerHTML = sameType.length
      ? sameType.map((item) => alternativeCard(item, currentBucket)).join("")
      : `<div class="empty-state">No matching-type alternatives.</div>`;
  }

  if (offTypeContainer) {
    offTypeContainer.innerHTML = offType.length
      ? offType.map((item) => alternativeCard(item, currentBucket)).join("")
      : `<div class="empty-state">No off-type alternatives.</div>`;
  }

  const search = document.getElementById("alternative-search");
  if (search && document.activeElement !== search) {
    search.value = alternativeSearch;
  }
}

function browseStampMatches(stamp, filterId) {
  const text = String(stamp || "");

  if (parseAffctStampBonus(text)) return false;
  if (filterId === "all") return true;
  if (filterId === "cells") {
    if (!/cell/i.test(text)) return false;
    if (browseSubtype === "any") return true;
    if (isUniversalCellStamp(text)) return true;
    return cellSubtypeFromStamp(text) === browseSubtype;
  }
  if (filterId === "reagents") {
    if (!/reagent/i.test(text)) return false;
    if (browseSubtype === "any") return true;
    return reagentSubtypeFromStamp(text) === browseSubtype;
  }
  if (filterId === "dragon-orbs") return /dragon\s*orbs?/i.test(text);
  if (filterId === "incense") return /incense/i.test(text);
  if (filterId === "intel") return /\bintel\b/i.test(text);
  if (filterId === "b-tads") return /\bb-?tads?\b|\bbtads?\b|black\s*tads?/i.test(text);
  if (filterId === "travel-speed") return /travel\s*(spd|speed)/i.test(text);
  if (filterId === "elemental-dmg") {
    return /(fire|water|earth|wind|element|elmt).*(dmg|damage)|(dmg|damage).*(fire|water|earth|wind|element|elmt)/i.test(
      text,
    );
  }
  if (filterId === "cards") return /card\s*drops?/i.test(text);
  if (filterId === "combat") {
    return /\batk\b|\bdef\b|\bhp\b|\brush\b|crit|dmg|damage|snail\s+(fame|art|fth|civ|tech)/i.test(
      text,
    );
  }

  return false;
}

function getBrowseFamilies() {
  const query = normalizeText(browseSearch);

  return families
    .map((family) => ({
      family,
      relic: getActiveRelic(family),
    }))
    .filter(({ family, relic }) => {
      if (!relic) return false;

      const matchesFilter =
        browseFilter === "all" ||
        relic.stampTexts.some((stamp) => browseStampMatches(stamp, browseFilter));

      if (!matchesFilter) return false;
      if (!query) return true;

      return (
        normalizeText(family.name).includes(query) ||
        normalizeText(relic.type).includes(query) ||
        relic.stampTexts.some((stamp) => normalizeText(stamp).includes(query))
      );
    })
    .sort((a, b) => {
      const aRelevant = a.relic.stampTexts.reduce(
        (total, stamp) =>
          total + (browseStampMatches(stamp, browseFilter) ? stampNumericValue(stamp) : 0),
        0,
      );
      const bRelevant = b.relic.stampTexts.reduce(
        (total, stamp) =>
          total + (browseStampMatches(stamp, browseFilter) ? stampNumericValue(stamp) : 0),
        0,
      );

      return (
        bRelevant - aRelevant ||
        pedestalAffct(b.relic, b.relic.type) - pedestalAffct(a.relic, a.relic.type) ||
        a.family.name.localeCompare(b.family.name)
      );
    });
}

function browsePlacementOptions(family) {
  const groups = [family.type, "ALL", ...AFFCT_TYPES.filter((type) => type !== family.type)];
  return groups
    .map(
      (groupType) => `
        <option value="${groupType}">
          ${groupType}${groupType === family.type ? " (matching)" : ""}
        </option>
      `,
    )
    .join("");
}

function currentPlacementForFamily(familyId) {
  const item = latestSetup.find((entry) => entry.family.familyId === familyId);
  return item ? `${item.groupType} · Slot ${item.slot}` : "";
}

function renderBrowseSubfilters() {
  const container = document.getElementById("browse-subfilters");
  if (!container) return;

  let options = [];

  if (browseFilter === "cells") {
    options = [
      { value: "any", label: "Any cell effect" },
      ...discoveredCellTypes.map((type) => ({
        value: type.toLowerCase(),
        label: `${type} Cells`,
      })),
    ];
  } else if (browseFilter === "reagents") {
    options = [
      { value: "any", label: "Any reagent" },
      ...discoveredReagentTypes.map((type) => ({
        value: type.toLowerCase(),
        label: `${type} Reagent`,
      })),
    ];
  }

  container.innerHTML = options.length
    ? `
      <span>Show:</span>
      ${options
        .map(
          (option) => `
            <button
              type="button"
              class="browse-subfilter ${browseSubtype === option.value ? "active" : ""}"
              data-browse-subtype="${escapeHtml(option.value)}"
            >
              ${escapeHtml(option.label)}
            </button>
          `,
        )
        .join("")}
    `
    : "";
  container.hidden = !options.length;
}

function renderBrowseView() {
  const bar = document.getElementById("browse-filter-bar");
  const grid = document.getElementById("browse-relic-grid");
  if (!bar || !grid) return;

  bar.innerHTML = BROWSE_FILTERS.map(
    (filter) => `
      <button
        type="button"
        class="browse-filter ${browseFilter === filter.id ? "active" : ""}"
        data-browse-filter="${filter.id}"
      >
        ${escapeHtml(filter.label)}
      </button>
    `,
  ).join("");

  renderBrowseSubfilters();

  const items = getBrowseFamilies();
  setText("browse-count", items.length);

  const search = document.getElementById("browse-search");
  if (search && document.activeElement !== search) {
    search.value = browseSearch;
  }

  grid.innerHTML = items.length
    ? items
        .map(({ family, relic }) => {
          const relevant = relic.stampTexts.filter((stamp) =>
            browseStampMatches(stamp, browseFilter),
          );
          const other = relic.stampTexts.filter(
            (stamp) =>
              !parseAffctStampBonus(stamp) &&
              !relevant.includes(stamp),
          );
          const placement = currentPlacementForFamily(family.familyId);
          const pinnedGroup = state.pins[family.familyId] || "";

          return `
            <article class="browse-relic-card">
              <div class="browse-relic-head">
                <div>
                  <h3>${escapeHtml(family.name)}</h3>
                  <div class="browse-meta">
                    ${typePill(relic.type)}
                    <span>${escapeHtml(selectedLevelForFamily(family) === "Awaken" ? "Awakened" : selectedLevelForFamily(family))}</span>
                  </div>
                </div>
                ${
                  placement
                    ? `<span class="placed-badge">${escapeHtml(placement)}</span>`
                    : ""
                }
              </div>

              <div class="browse-stamps">
                ${relevant
                  .map(
                    (stamp) => `<div class="browse-stamp relevant">${escapeHtml(stamp)}</div>`,
                  )
                  .join("")}
                ${other
                  .map(
                    (stamp) => `<div class="browse-stamp">${escapeHtml(stamp)}</div>`,
                  )
                  .join("")}
              </div>

              <div class="browse-card-controls">
                <select
                  class="browse-place-select"
                  data-browse-place-select="${escapeHtml(family.familyId)}"
                  aria-label="Museum pedestal group for ${escapeHtml(family.name)}"
                >
                  ${browsePlacementOptions(family)}
                </select>
                <button
                  class="primary-btn browse-place-btn"
                  type="button"
                  data-browse-place="${escapeHtml(family.familyId)}"
                >
                  ${pinnedGroup ? "Move / Keep" : "Add to Museum"}
                </button>
                ${
                  pinnedGroup
                    ? `
                      <button
                        class="light-btn browse-unpin-btn"
                        type="button"
                        data-browse-unpin="${escapeHtml(family.familyId)}"
                      >
                        Auto
                      </button>
                    `
                    : ""
                }
              </div>
            </article>
          `;
        })
        .join("")
    : `<div class="empty-state">No relics match this effect filter.</div>`;
}

function setMuseumView(view) {
  activeMuseumView = view === "browse" ? "browse" : "optimize";

  document.querySelectorAll(".museum-tab").forEach((button) => {
    const active = button.dataset.museumView === activeMuseumView;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", String(active));
  });

  const optimizeView = document.getElementById("view-optimize");
  const browseView = document.getElementById("view-browse");

  if (optimizeView) optimizeView.hidden = activeMuseumView !== "optimize";
  if (browseView) browseView.hidden = activeMuseumView !== "browse";

  if (activeMuseumView === "browse") renderBrowseView();
}

function renderResults() {
  renderGoalSelector();
  renderSummary();
  renderAllSlots();
  renderCategoryBuckets();
  renderBucketDetail();
  if (activeMuseumView === "browse") renderBrowseView();

  const targetInput = document.getElementById("target-points");
  if (targetInput && document.activeElement !== targetInput) {
    targetInput.value = String(state.targetPoints || 0);
  }
}

function renderEverything() {
  renderGoalSelector();
  optimizeMuseum();
}

/* ---------- Events ---------- */

function updateGoalOption(goalId, value, checked) {
  const goal = state.goals[goalId];
  if (!goal) return;

  const current = new Set(selectedOptions(goalId));
  const normalized = String(value || "").toLowerCase();

  if (checked) {
    if (normalized === "any") {
      current.clear();
      current.add("any");
    } else {
      current.delete("any");
      current.add(normalized);
    }
  } else {
    current.delete(normalized);
  }

  if (!current.size) current.add("any");
  goal.options = Array.from(current);
}

document.addEventListener("input", (event) => {
  const target = event.target;

  if (target.id === "alternative-search") {
    alternativeSearch = target.value;
    renderBucketDetail();
    target.focus();
    return;
  }

  if (target.id === "browse-search") {
    browseSearch = target.value;
    renderBrowseView();
    target.focus();
  }
});

document.addEventListener("change", (event) => {
  const target = event.target;

  if (target.matches("[data-goal-enable]")) {
    const goalId = target.dataset.goalEnable;
    if (!state.goals[goalId]) return;

    state.goals[goalId].enabled = target.checked;
    saveState();
    renderEverything();
    return;
  }

  if (target.matches("[data-goal-priority]")) {
    const goalId = target.dataset.goalPriority;
    if (!state.goals[goalId]) return;

    state.goals[goalId].priority = target.value;
    saveState();
    optimizeMuseum();
    return;
  }

  if (target.matches("[data-goal-option]")) {
    updateGoalOption(target.dataset.goalOption, target.value, target.checked);
    saveState();
    renderEverything();
    return;
  }

  if (target.matches(".all-relic-select")) {
    const currentFamilyId = target.dataset.allCurrentFamily;
    const newFamilyId = target.value;

    if (state.pins[currentFamilyId] === "ALL") {
      delete state.pins[currentFamilyId];
    }

    if (newFamilyId) {
      // A family can only be manually assigned to one pedestal group.
      state.pins[newFamilyId] = "ALL";
    }

    saveState();
    optimizeMuseum();
    return;
  }

  if (target.matches("[data-family-level]")) {
    const familyId = target.dataset.familyLevel;
    const value = target.value;

    if (value === "Awaken") {
      delete state.levelOverrides[familyId];
    } else {
      state.levelOverrides[familyId] = value;
    }

    if (value === "Unowned") {
      delete state.pins[familyId];
    }

    saveState();
    optimizeMuseum();
    return;
  }

  if (target.id === "target-points") {
    state.targetPoints = Math.max(0, Number(target.value || 0));
    saveState();
    optimizeMuseum();
  }
});

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-museum-view]");
  if (viewButton) {
    setMuseumView(viewButton.dataset.museumView);
    return;
  }

  const browseFilterButton = event.target.closest("[data-browse-filter]");
  if (browseFilterButton) {
    browseFilter = browseFilterButton.dataset.browseFilter;
    browseSubtype = "any";
    renderBrowseView();
    return;
  }

  const browseSubtypeButton = event.target.closest("[data-browse-subtype]");
  if (browseSubtypeButton) {
    browseSubtype = browseSubtypeButton.dataset.browseSubtype;
    renderBrowseView();
    return;
  }

  const browsePlaceButton = event.target.closest("[data-browse-place]");
  if (browsePlaceButton) {
    const familyId = browsePlaceButton.dataset.browsePlace;
    const select = document.querySelector(
      `[data-browse-place-select="${CSS.escape(familyId)}"]`,
    );
    const groupType = select?.value || getFamily(familyId)?.type || "ALL";

    state.pins[familyId] = groupType;
    saveState();
    optimizeMuseum();
    renderBrowseView();
    return;
  }

  const browseUnpinButton = event.target.closest("[data-browse-unpin]");
  if (browseUnpinButton) {
    delete state.pins[browseUnpinButton.dataset.browseUnpin];
    saveState();
    optimizeMuseum();
    renderBrowseView();
    return;
  }

  const openBucket = event.target.closest("[data-open-bucket]");
  if (openBucket) {
    currentBucket = openBucket.dataset.openBucket;
    renderBucketDetail();
    document.getElementById("bucket-detail")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    return;
  }

  const pinButton = event.target.closest("[data-pin-family]");
  if (pinButton) {
    const familyId = pinButton.dataset.pinFamily;
    const groupType = pinButton.dataset.pinGroup;

    if (state.pins[familyId] === groupType) {
      delete state.pins[familyId];
    } else {
      state.pins[familyId] = groupType;
    }

    saveState();
    optimizeMuseum();
    return;
  }

  const alternativeButton = event.target.closest("[data-use-family]");
  if (alternativeButton) {
    const familyId = alternativeButton.dataset.useFamily;
    const groupType = alternativeButton.dataset.useGroup;

    state.pins[familyId] = groupType;
    saveState();
    optimizeMuseum();
    return;
  }

  if (event.target.id === "close-bucket") {
    currentBucket = "";
    renderBucketDetail();
    return;
  }

  if (event.target.id === "optimize-museum") {
    optimizeMuseum();
    return;
  }

  if (event.target.id === "refresh-relics") {
    loadRelics();
    return;
  }

  if (event.target.id === "assume-awakened") {
    state.levelOverrides = {};
    state.pins = {};
    saveState();
    optimizeMuseum();
    return;
  }

  if (event.target.id === "reset-museum") {
    const confirmed = window.confirm(
      "Reset goals, ownership adjustments, and manual keeps for the Time Rift Museum?",
    );
    if (!confirmed) return;

    localStorage.removeItem(TIME_RIFT_PREFS_KEY);
    localStorage.removeItem(TIME_RIFT_LEVEL_OVERRIDES_KEY);
    localStorage.removeItem(TIME_RIFT_PINS_KEY);

    state = {
      goals: {
        cells: { enabled: true, priority: "High", options: ["any"] },
        reagents: { enabled: false, priority: "Medium", options: ["any"] },
        "dragon-orbs": { enabled: false, priority: "Medium" },
        incense: { enabled: true, priority: "Medium" },
        intel: { enabled: false, priority: "Medium" },
        "b-tads": { enabled: false, priority: "Low" },
        "travel-speed": { enabled: false, priority: "Low" },
        "elemental-dmg": { enabled: false, priority: "Low" },
      },
      targetPoints: 0,
      levelOverrides: {},
      pins: {},
    };

    currentBucket = "";
    alternativeSearch = "";
    browseSearch = "";
    browseFilter = "cells";
    browseSubtype = "any";
    setMuseumView("optimize");
    renderEverything();
  }
});

/* ---------- Load ---------- */

async function loadRelics() {
  setStatus("Loading Time Rift Museum relics…");

  try {
    const response = await fetch(TIME_RIFT_CSV_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Sheet request failed: ${response.status}`);
    }

    relicRows = parseRelics(parseCsv(await response.text()));
    buildFamilies();
    discoverSubtypes();
    cleanState();

    setStatus(
      `Loaded ${families.length.toLocaleString()} relics from “${TIME_RIFT_TAB_NAME}”. Fast-start assumption: Awakened unless you change a recommendation.`,
    );

    renderEverything();
  } catch (error) {
    console.error(error);
    setStatus(
      "Could not load relic data. Make sure the Time Rift Museum Relics tab is still published as CSV.",
      true,
    );

    latestSetup = [];
    renderResults();
  }
}

loadState();
document.getElementById("target-points").value = String(state.targetPoints || 0);
setMuseumView("optimize");
loadRelics();
