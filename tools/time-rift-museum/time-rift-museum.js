/* =========================================================
   Time Rift Museum Tool
========================================================= */

const TIME_RIFT_TAB_NAME = "Time Rift Museum Relics";
const TIME_RIFT_STORAGE_KEY = "timeRiftMuseumAssignmentsV2";
const TIME_RIFT_SLOT_STORAGE_KEY = "timeRiftMuseumSlotTypesV2";
const TIME_RIFT_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQt9dkXKEDeiQYyGmYaSZpcq7CY1eM9ALn-kxxmm8qASUHznh0avCAz7hp3ojGNOXxIZncAKcpEMJ5J/pub?gid=1578260911&single=true&output=csv";

const AFFCT_TYPES = ["FAME", "ART", "FTH", "CIV", "TECH"];
const PEDESTAL_TYPES = ["ALL", ...AFFCT_TYPES];

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

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function normalizeId(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function toNumber(value) {
  const cleaned = String(value ?? "").replace(/[^0-9.-]/g, "");
  const parsed = Number(cleaned);
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

function rowsToObjects(rows) {
  if (rows.length < 2) return [];
  const headers = rows[0];
  const headerMap = {};
  headers.forEach((header, index) => {
    headerMap[normalizeHeader(header)] = index;
  });

  return rows.slice(1).map((row) => ({ row, headers, headerMap }));
}

function getCell(row, headerMap, names) {
  for (const name of names) {
    const index = headerMap[normalizeHeader(name)];
    if (index !== undefined) return row[index] ?? "";
  }
  return "";
}

function parseStampEffect(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const upper = raw.toUpperCase();
  const amountMatch = raw.match(/([+-]?\d+(?:\.\d+)?)\s*%?/);
  const value = amountMatch ? Number(amountMatch[1]) : 0;
  const isPercent = /%/.test(raw);

  const affctTarget = AFFCT_TYPES.find((type) => upper.includes(type));
  if (affctTarget && value) {
    return { kind: "affct", target: affctTarget, value, isPercent: false, raw };
  }

  if ((upper.includes("ALL") || upper.includes("TOTAL")) && value) {
    return { kind: "affct", target: "ALL", value, isPercent: false, raw };
  }

  return { kind: "goal", target: null, value, isPercent, raw };
}

function parseTimeRiftRelics(rows) {
  if (!rows || rows.length < 2) return [];

  const headers = rows[0].map(h =>
    String(h || "").trim().replace(/^\uFEFF/, "")
  );

  return rows.slice(1)
    .map((row, index) => {
      const obj = {};
      headers.forEach((header, i) => {
        obj[header] = row[i] || "";
      });

      const name = obj["Relic Name"];
      if (!name) return null;

      const stamps = [
        obj["Stamp 1"] || "",
        obj["Stamp 2"] || "",
        obj["Stamp 3"] || ""
      ].filter(Boolean);

      return {
        id: `${name}-${obj["Level"] || index}`.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: name.trim(),
        level: obj["Level"] || "",
        type: obj["Type"] || "",
        mainAfft: toNumber(obj["Main AFFT"]),
        rank: obj["Rank"] || "",

        fame: toNumber(obj["FAME"]),
        art: toNumber(obj["ART"]),
        fth: toNumber(obj["FTH"]),
        civ: toNumber(obj["CIV"]),
        tech: toNumber(obj["TECH"]),

        stamps,
        stampBonuses: stamps.map(parseStampBonus).filter(Boolean),
        effectText: stamps.join(" | ")
      };
    })
    .filter(Boolean);
}
function parseStampBonus(text) {
  const value = String(text || "").trim();
  if (!value) return null;

  const match = value.match(/\+([\d.]+)/);
  if (!match) return null;

  const amount = Number(match[1]);
  const upper = value.toUpperCase();

  if (upper.includes("FAME")) return { target: "FAME", value: amount };
  if (upper.includes("ART")) return { target: "ART", value: amount };
  if (upper.includes("FTH")) return { target: "FTH", value: amount };
  if (upper.includes("CIV")) return { target: "CIV", value: amount };
  if (upper.includes("TECH")) return { target: "TECH", value: amount };
  if (upper.includes("ALL") || upper.includes("TOTAL")) return { target: "ALL", value: amount };

  return null;
}
async function loadTimeRiftRelics() {
  setStatus("Loading Time Rift Museum relics…");
  try {
    const response = await fetch(TIME_RIFT_CSV_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`Sheet request failed: ${response.status}`);
    const text = await response.text();
    const rows = parseCsv(text);
    timeRiftRelics = parseTimeRiftRelics(rows);
    cleanInvalidAssignments();
    setStatus(`Loaded ${timeRiftRelics.length} relic rows from “${TIME_RIFT_TAB_NAME}”.`);
    renderAll();
  } catch (error) {
    console.error(error);
    setStatus("Could not load relics. Check that the Google Sheet tab is published to CSV.", true);
  }
}

function getPedestalType(slot) {
  return timeRiftSlotTypes[String(slot)] || TIME_RIFT_PEDESTALS.find((p) => p.slot === Number(slot))?.type || "FAME";
}

function setPedestalType(slot, type) {
  if (!PEDESTAL_TYPES.includes(type)) return;
  timeRiftSlotTypes[String(slot)] = type;
  localStorage.setItem(TIME_RIFT_SLOT_STORAGE_KEY, JSON.stringify(timeRiftSlotTypes));
}

function getBaseStat(relic, pedestalType) {
  if (!relic) return 0;
  if (pedestalType === "ALL") return relic.fame + relic.art + relic.fth + relic.civ + relic.tech;
  return relic[pedestalType.toLowerCase()] || 0;
}

function getValidStampBonus(relic, pedestalType) {
  if (!relic) return 0;

  const bonuses = Array.isArray(relic.stampBonuses)
    ? relic.stampBonuses
    : [];

  return bonuses.reduce((total, bonus) => {
    if (!bonus) return total;

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

function getAssignedFamilies(exceptSlot = null) {
  return new Set(Object.entries(timeRiftAssignments)
    .filter(([slot, relicId]) => relicId && String(slot) !== String(exceptSlot))
    .map(([, relicId]) => timeRiftRelics.find((relic) => relic.id === relicId)?.familyId)
    .filter(Boolean));
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

function matchesGoal(relic, goalKey) {
  if (!relic || goalKey === "points") return false;
  const goal = OPTIMIZER_GOALS[goalKey];
  const text = normalizeText([relic.effectText, ...relic.stampTexts].join(" | "));
  return goal.keywords.some((keyword) => text.includes(keyword));
}

function optimizerScore(relic, pedestalType, goalKey, priority) {
  const points = calculateRelicScoreForPedestal(relic, pedestalType);
  if (goalKey === "points") return points;
  const goal = OPTIMIZER_GOALS[goalKey];
  const goalBonus = matchesGoal(relic, goalKey) ? goal.weight : 0;
  const multiplier = priority === "hard" ? 2.5 : 1;
  return points + goalBonus * multiplier;
}

function buildOptimizedSetup(goalKey, priority) {
  const usedFamilies = new Set();
  const setup = [];

  TIME_RIFT_PEDESTALS.forEach((pedestal) => {
    const pedestalType = getPedestalType(pedestal.slot);
    const best = timeRiftRelics
      .filter((relic) => !usedFamilies.has(relic.familyId))
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
      usedFamilies.add(best.relic.familyId);
      setup.push(best);
    }
  });

  return setup;
}

function renderVisualMuseum() {
  const grid = document.getElementById("visual-museum-grid");
  if (!grid) return;

  const total = calculateTotalMuseumPoints();
  const rating = getCurrentRating(total);
  const next = getNextThreshold(total);
  const filled = Object.keys(timeRiftAssignments).filter((slot) => timeRiftAssignments[slot]).length;
  const previousThreshold = TIME_RIFT_THRESHOLDS.filter((threshold) => total >= threshold.points).pop()?.points || 0;
  const progressRange = next ? next.points - previousThreshold : 1;
  const progressValue = next ? Math.max(0, Math.min(100, ((total - previousThreshold) / progressRange) * 100)) : 100;

  setText("visual-filled-count", `${filled}/83`);
  setText("visual-rating-points", total.toLocaleString());
  setText("visual-rating-label", rating);
  setText("visual-next-points", next ? (next.points - total).toLocaleString() : "0");
  const progress = document.getElementById("visual-progress-bar");
  if (progress) progress.style.width = `${progressValue}%`;

  const columns = Array.from({ length: 9 }, () => []);
  TIME_RIFT_PEDESTALS.forEach((pedestal, index) => columns[index % columns.length].push(pedestal));

  grid.innerHTML = columns.map((column) => `
    <div class="rift-column">
      ${column.map((pedestal) => {
        const type = getPedestalType(pedestal.slot);
        const relic = getAssignedRelic(pedestal.slot);
        const score = calculateRelicScoreForPedestal(relic, type);
        const label = relic ? relic.name : `Slot ${pedestal.slot}`;
        return `
          <button class="rift-pedestal type-${type} ${relic ? "selected" : ""}" type="button" data-visual-slot="${pedestal.slot}" title="Slot ${pedestal.slot} · ${type}">
            <span class="rift-stars">★★★★★★</span>
            <span class="rift-slot-score">${relic ? score : pedestal.slot}</span>
            <span class="rift-relic-name">${escapeHtml(label)}</span>
            <span class="rift-type-badge">${type}</span>
          </button>`;
      }).join("")}
    </div>`).join("");

  document.querySelectorAll("[data-visual-slot]").forEach((button) => {
    button.addEventListener("click", () => {
      activeTab = "setup";
      renderAll();
      setTimeout(() => {
        const select = document.querySelector(`[data-relic-slot="${button.dataset.visualSlot}"]`);
        select?.focus();
        select?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0);
    });
  });
}

function renderMuseumSummary() {
  const total = calculateTotalMuseumPoints();
  const next = getNextThreshold(total);
  setText("total-points", total.toLocaleString());
  setText("current-rating", getCurrentRating(total));
  setText("next-threshold", next ? `${next.points.toLocaleString()} (${next.rating})` : "Maxed");
  setText("points-needed", next ? (next.points - total).toLocaleString() : "0");
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
  if (!body) return;
  const visible = getVisiblePedestals();
  if (!visible.length) {
    body.innerHTML = `<tr><td colspan="5">No slots match this view.</td></tr>`;
    return;
  }

  body.innerHTML = visible.map((pedestal) => {
    const type = getPedestalType(pedestal.slot);
    const selectedId = timeRiftAssignments[String(pedestal.slot)] || "";
    const selectedRelic = getAssignedRelic(pedestal.slot);
    const unavailableFamilies = getAssignedFamilies(pedestal.slot);
    const score = calculateRelicScoreForPedestal(selectedRelic, type);
    const base = getBaseStat(selectedRelic, type);
    const bonus = getValidStampBonus(selectedRelic, type);
    const typeOptions = PEDESTAL_TYPES.map((item) => `<option value="${item}" ${item === type ? "selected" : ""}>${item}</option>`).join("");
    const relicOptions = [`<option value="">Select relic…</option>`, ...timeRiftRelics.map((relic) => {
      const disabled = unavailableFamilies.has(relic.familyId) ? "disabled" : "";
      const selected = relic.id === selectedId ? "selected" : "";
      const label = `${relic.name}${relic.level ? ` · ${relic.level}` : ""}${relic.rank ? ` · ${relic.rank}` : ""}`;
      return `<option value="${escapeHtml(relic.id)}" ${selected} ${disabled}>${escapeHtml(label)}</option>`;
    })].join("");
    const reason = selectedRelic ? `${type === "ALL" ? "Total AFFCT" : type} ${base}${bonus ? ` + ${bonus} stamp` : ""}` : "No relic assigned";

    return `
      <tr>
        <td>${pedestal.slot}</td>
        <td><select data-type-slot="${pedestal.slot}" aria-label="Pedestal type for slot ${pedestal.slot}">${typeOptions}</select></td>
        <td><select data-relic-slot="${pedestal.slot}" class="relic-select" aria-label="Relic for slot ${pedestal.slot}">${relicOptions}</select></td>
        <td><strong>${score}</strong></td>
        <td><small>${escapeHtml(reason)}</small></td>
      </tr>`;
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
  const assignedFamilies = getAssignedFamilies();
  const type = getPedestalType(pedestal.slot);
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
  const emptyPedestals = getVisiblePedestals().filter((pedestal) => !timeRiftAssignments[String(pedestal.slot)]);
  if (!emptyPedestals.length) {
    container.innerHTML = `<p>All visible slots are assigned.</p>`;
    return;
  }
  container.innerHTML = emptyPedestals.slice(0, 18).map((pedestal) => {
    const type = getPedestalType(pedestal.slot);
    const items = getRecommendationsForPedestal(pedestal).map((item) => {
      const stampNote = item.bonus ? ` <small>(+${item.bonus} stamp)</small>` : "";
      return `<li>${escapeHtml(item.relic.name)}${item.relic.level ? ` · ${escapeHtml(item.relic.level)}` : ""} — <strong>${item.score}</strong>${stampNote}</li>`;
    }).join("") || `<li>No available relics found.</li>`;
    return `<article class="recommendation-card"><h3>Slot ${pedestal.slot} · ${type}</h3><ol>${items}</ol></article>`;
  }).join("");
}

function renderOptimizer() {
  const goalKey = document.getElementById("optimizer-goal")?.value || "points";
  const priority = document.getElementById("optimizer-priority")?.value || "balanced";
  const setup = buildOptimizedSetup(goalKey, priority);
  const total = setup.reduce((sum, item) => sum + item.points, 0);
  const matches = setup.filter((item) => item.goalMatch).length;
  const max = Math.max(...setup.map((item) => item.points), 1);
  setText("optimized-points", total.toLocaleString());
  setText("optimized-rating", getCurrentRating(total));
  setText("optimized-matches", goalKey === "points" ? "—" : matches.toLocaleString());

  const list = document.getElementById("optimized-list");
  if (!list) return;
  if (!setup.length) {
    list.innerHTML = `<p>Load relics first.</p>`;
    return;
  }

  list.innerHTML = setup.map((item) => {
    const width = Math.max(5, Math.round((item.points / max) * 100));
    const label = item.goalMatch ? "Goal match" : "Points pick";
    return `
      <article class="optimized-row">
        <strong>Slot ${item.pedestal.slot}</strong>
        <span class="type-pill">${item.pedestalType}</span>
        <div>
          <strong>${escapeHtml(item.relic.name)}</strong>${item.relic.level ? ` <small>· ${escapeHtml(item.relic.level)}</small>` : ""}<br />
          <small>${item.pedestalType === "ALL" ? "Total AFFCT" : item.pedestalType} score</small>
          <div class="score-bar"><span style="width:${width}%"></span></div>
        </div>
        <strong>${item.points}</strong>
        <span class="goal-pill">${label}</span>
      </article>`;
  }).join("");
}
function renderBuffs() {
  const total = calculateTotalMuseumPoints();
  const list = document.getElementById("buff-list");

  list.innerHTML = `
    <table class="buff-table">
      <thead>
        <tr>
          <th>Points</th>
          <th>Rating</th>
          <th>Buff</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${TIME_RIFT_THRESHOLDS.map((threshold) => {
          const unlocked = total >= threshold.points;
          return `
            <tr class="${unlocked ? "unlocked" : "locked"}">
              <td>${threshold.points.toLocaleString()}</td>
              <td>${threshold.rating}</td>
              <td>${escapeHtml(threshold.buff)}</td>
              <td>${unlocked ? "Unlocked" : "Locked"}</td>
            </tr>
          `;
        }).join("")}
      </tbody>
    </table>
  `;
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
  renderVisualMuseum();
  renderPedestalTable();
  renderRecommendations();
  renderOptimizer();
  renderBuffs();
}

function saveAssignments() {
  localStorage.setItem(TIME_RIFT_STORAGE_KEY, JSON.stringify(timeRiftAssignments));
}

function loadAssignments() {
  try { timeRiftAssignments = JSON.parse(localStorage.getItem(TIME_RIFT_STORAGE_KEY)) || {}; } catch { timeRiftAssignments = {}; }
  try { timeRiftSlotTypes = JSON.parse(localStorage.getItem(TIME_RIFT_SLOT_STORAGE_KEY)) || {}; } catch { timeRiftSlotTypes = {}; }
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

function applyOptimizedSetup() {
  const goalKey = document.getElementById("optimizer-goal")?.value || "points";
  const priority = document.getElementById("optimizer-priority")?.value || "balanced";
  const setup = buildOptimizedSetup(goalKey, priority);
  timeRiftAssignments = {};
  setup.forEach((item) => { timeRiftAssignments[String(item.pedestal.slot)] = item.relic.id; });
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
