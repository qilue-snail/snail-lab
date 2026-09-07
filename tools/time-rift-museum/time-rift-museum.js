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

let relicRows = [];
let families = [];
let latestSetup = [];
let currentBucket = "";
let discoveredCellTypes = [...DEFAULT_CELL_TYPES];
let discoveredReagentTypes = [...DEFAULT_REAGENT_TYPES];

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

  // Respect manual "Keep" pins before filling the remaining capacities.
  Object.entries(state.pins).forEach(([familyId, groupType]) => {
    if (!GROUP_CAPACITY[groupType]) return;
    if (groupEntries[groupType].length >= GROUP_CAPACITY[groupType]) return;

    const family = getFamily(familyId);
    if (!family || usedFamilies.has(familyId)) return;

    const candidate = candidateFor(family, groupType, pointWeight);
    if (!candidate) return;

    groupEntries[groupType].push({ ...candidate, pinned: true });
    usedFamilies.add(familyId);
  });

  const candidates = [];

  families.forEach((family) => {
    if (!getActiveRelic(family)) return;

    Object.keys(GROUP_CAPACITY).forEach((groupType) => {
      const candidate = candidateFor(family, groupType, pointWeight);
      if (candidate) candidates.push(candidate);
    });
  });

  candidates.sort(
    (a, b) =>
      b.weightedScore - a.weightedScore ||
      b.goalScore - a.goalScore ||
      b.points - a.points ||
      a.family.name.localeCompare(b.family.name),
  );

  candidates.forEach((candidate) => {
    const { family, groupType } = candidate;
    if (usedFamilies.has(family.familyId)) return;
    if (groupEntries[groupType].length >= GROUP_CAPACITY[groupType]) return;

    groupEntries[groupType].push(candidate);
    usedFamilies.add(family.familyId);
  });

  // Safety fill. If greedy cross-group assignment left a bucket short,
  // fill it with the best remaining available relics for that pedestal type.
  Object.keys(GROUP_CAPACITY).forEach((groupType) => {
    if (groupEntries[groupType].length >= GROUP_CAPACITY[groupType]) return;

    const remaining = families
      .filter(
        (family) =>
          !usedFamilies.has(family.familyId) && Boolean(getActiveRelic(family)),
      )
      .map((family) => candidateFor(family, groupType, pointWeight))
      .filter(Boolean)
      .sort(
        (a, b) =>
          b.weightedScore - a.weightedScore ||
          b.points - a.points ||
          a.family.name.localeCompare(b.family.name),
      );

    remaining.forEach((candidate) => {
      if (groupEntries[groupType].length >= GROUP_CAPACITY[groupType]) return;
      groupEntries[groupType].push(candidate);
      usedFamilies.add(candidate.family.familyId);
    });
  });

  const setup = [];

  Object.entries(groupEntries).forEach(([groupType, entries]) => {
    const slots = GROUP_SLOTS[groupType] || [];

    entries
      .sort(
        (a, b) =>
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
  const plusMatch = raw.match(/^(.*?)(?:\s*[+-]\s*[\d.]+)(\s*%)?\s*$/);
  if (!plusMatch) return null;

  const label = plusMatch[1].trim().replace(/\s+/g, " ");
  const isPercent = Boolean(plusMatch[2]);
  const value = stampNumericValue(raw);

  if (!label || !value) return null;

  return {
    key: `${label.toLowerCase()}|${isPercent ? "%" : "flat"}`,
    label,
    value,
    unit: isPercent ? "%" : "",
  };
}

function getEffectTotals() {
  const totals = new Map();

  latestSetup.forEach((item) => {
    matchedGoalStamps(item.relic).forEach((stamp) => {
      const parsed = effectSummaryKey(stamp);
      if (!parsed) return;

      if (!totals.has(parsed.key)) {
        totals.set(parsed.key, {
          label: parsed.label,
          value: 0,
          unit: parsed.unit,
        });
      }

      totals.get(parsed.key).value += parsed.value;
    });
  });

  return Array.from(totals.values()).sort(
    (a, b) => b.value - a.value || a.label.localeCompare(b.label),
  );
}

function getGroupedEffectSummary() {
  const raw = getEffectTotals();

  let universalCells = 0;
  const cellSpecific = [];
  const reagents = [];
  const other = [];

  raw.forEach((effect) => {
    const label = effect.label.trim();

    if (/^cells?\s+collected$/i.test(label)) {
      universalCells += effect.value;
      return;
    }

    const cellMatch = label.match(/^([A-Za-z]+)\s+Cells?\s+(?:gained|collected)$/i);
    if (cellMatch) {
      cellSpecific.push({
        subtype:
          cellMatch[1].charAt(0).toUpperCase() +
          cellMatch[1].slice(1).toLowerCase(),
        value: effect.value,
      });
      return;
    }

    const reagentMatch = label.match(
      /^(?:2x\s+)?([A-Za-z]+)\s+Reagent\s+Drops?$/i,
    );
    if (reagentMatch) {
      reagents.push({
        subtype:
          reagentMatch[1].charAt(0).toUpperCase() +
          reagentMatch[1].slice(1).toLowerCase(),
        value: effect.value,
      });
      return;
    }

    other.push(effect);
  });

  cellSpecific.sort((a, b) => b.value - a.value || a.subtype.localeCompare(b.subtype));
  reagents.sort((a, b) => b.value - a.value || a.subtype.localeCompare(b.subtype));

  return {
    universalCells,
    cellSpecific,
    reagents,
    other,
  };
}

function selectedCellSubtypesForDisplay(grouped) {
  const options = selectedOptions("cells").map((value) => value.toLowerCase());

  if (options.includes("any")) {
    return grouped.cellSpecific;
  }

  return grouped.cellSpecific.filter((item) =>
    options.includes(item.subtype.toLowerCase()),
  );
}

function selectedReagentSubtypesForDisplay(grouped) {
  const options = selectedOptions("reagents").map((value) => value.toLowerCase());

  if (options.includes("any")) {
    return grouped.reagents;
  }

  return grouped.reagents.filter((item) =>
    options.includes(item.subtype.toLowerCase()),
  );
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

  if (state.goals.cells?.enabled) {
    const shownCells = selectedCellSubtypesForDisplay(grouped);
    const cellRows = [];

    cellRows.push(`
      <div class="result-row result-row-universal">
        <span>All cell types</span>
        <strong>+${formatNumber(grouped.universalCells)}%</strong>
        <small>Cells Collected</small>
      </div>
    `);

    shownCells.forEach((item) => {
      const effective = grouped.universalCells + item.value;

      cellRows.push(`
        <div class="result-row">
          <span>${escapeHtml(item.subtype)} Cells</span>
          <strong>+${formatNumber(effective)}%</strong>
          <small>${formatNumber(item.value)}% specific + ${formatNumber(grouped.universalCells)}% universal</small>
        </div>
      `);
    });

    sections.push(`
      <section class="result-group result-group-cells">
        <div class="result-group-head">
          <h3>Cells</h3>
          <span>Effective collection bonuses</span>
        </div>
        <div class="result-rows">
          ${cellRows.join("")}
        </div>
      </section>
    `);
  }

  if (state.goals.reagents?.enabled) {
    const shownReagents = selectedReagentSubtypesForDisplay(grouped);

    sections.push(`
      <section class="result-group">
        <div class="result-group-head">
          <h3>Reagents</h3>
          <span>Each color stays separate</span>
        </div>
        <div class="result-rows">
          ${
            shownReagents.length
              ? shownReagents
                  .map(
                    (item) => `
                      <div class="result-row">
                        <span>${escapeHtml(item.subtype)} Reagent</span>
                        <strong>+${formatNumber(item.value)}%</strong>
                        <small>2x drop chance</small>
                      </div>
                    `,
                  )
                  .join("")
              : `<div class="result-empty">No matching reagent bonus in this setup.</div>`
          }
        </div>
      </section>
    `);
  }

  const otherEffects = grouped.other.filter((effect) => {
    const label = effect.label.toLowerCase();

    if (state.goals["dragon-orbs"]?.enabled && /dragon\s*orbs?/.test(label)) return true;
    if (state.goals.incense?.enabled && /incense/.test(label)) return true;
    if (state.goals.intel?.enabled && /intel/.test(label)) return true;
    if (state.goals["b-tads"]?.enabled && /b-?tads?|btads?|black\s*tads?/.test(label)) return true;
    if (state.goals["travel-speed"]?.enabled && /travel\s*(spd|speed)/.test(label)) return true;
    if (
      state.goals["elemental-dmg"]?.enabled &&
      /(fire|water|earth|wind|element|elmt).*(dmg|damage)|(dmg|damage).*(fire|water|earth|wind|element|elmt)/.test(label)
    ) {
      return true;
    }

    return false;
  });

  if (otherEffects.length) {
    sections.push(`
      <section class="result-group">
        <div class="result-group-head">
          <h3>Other selected goals</h3>
          <span>Only effects you asked the optimizer to value</span>
        </div>
        <div class="result-rows">
          ${otherEffects
            .map(
              (effect) => `
                <div class="result-row">
                  <span>${escapeHtml(effect.label)}</span>
                  <strong>+${formatNumber(effect.value)}${effect.unit}</strong>
                </div>
              `,
            )
            .join("")}
        </div>
      </section>
    `);
  }

  container.innerHTML = sections.length
    ? sections.join("")
    : `
      <div class="empty-state">
        Select one or more goals to see the useful effects in the recommended setup.
      </div>
    `;
}

function getBucketAlternatives(groupType, limit = 6) {
  const selectedFamilies = new Set(latestSetup.map((item) => item.family.familyId));

  return families
    .filter(
      (family) =>
        !selectedFamilies.has(family.familyId) && Boolean(getActiveRelic(family)),
    )
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
    )
    .slice(0, limit);
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
    `Any relic can occupy a ${currentBucket} pedestal. The AFFCT shown here uses that relic's ${currentBucket} stat plus only a genuine ${currentBucket} +X stamp.`,
  );

  const rows = latestSetup.filter((item) => item.groupType === currentBucket);
  const list = document.getElementById("bucket-detail-list");

  list.innerHTML = rows
    .map((item, index) => {
      const isPinned = state.pins[item.family.familyId] === currentBucket;

      return `
        <tr>
          <td>${index + 1}</td>
          <td>
            <span class="table-relic-name">${escapeHtml(item.family.name)}</span>
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

  const alternatives = getBucketAlternatives(currentBucket);
  const altContainer = document.getElementById("bucket-alternatives");

  altContainer.innerHTML = alternatives.length
    ? alternatives
        .map(
          (item) => `
            <article class="alternative-card">
              <strong>${escapeHtml(item.family.name)}</strong>
              <small>
                ${formatNumber(item.points)} ${currentBucket} ·
                ${escapeHtml(item.relic.type || "—")}
              </small>
              <div class="effect-pills">${effectPills(item.relic, 3)}</div>
              <button
                class="use-alternative-btn"
                type="button"
                data-use-family="${escapeHtml(item.family.familyId)}"
                data-use-group="${escapeHtml(currentBucket)}"
              >
                Use in ${currentBucket}
              </button>
            </article>
          `,
        )
        .join("")
    : `<div class="empty-state">No additional owned alternatives.</div>`;
}

function renderResults() {
  renderGoalSelector();
  renderSummary();
  renderAllSlots();
  renderCategoryBuckets();
  renderBucketDetail();

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
loadRelics();
