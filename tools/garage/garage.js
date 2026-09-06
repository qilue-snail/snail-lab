"use strict";

(() => {
  const LIVE_DATA_URL =
    "https://docs.google.com/spreadsheets/d/e/2PACX-1vQt9dkXKEDeiQYyGmYaSZpcq7CY1eM9ALn-kxxmm8qASUHznh0avCAz7hp3ojGNOXxIZncAKcpEMJ5J/pub?gid=337762531&single=true&output=csv";

  const STORAGE_KEY = "snailLabGarageV1";
  const TIER_COLORS = {
    White: "#f2f2f2",
    Green: "#6aa84f",
    Blue: "#4a86e8",
    Purple: "#8e7cc3",
    Orange: "#e69138",
  };
  const MINION_COLORS = {
    Dragon: "#cfe2f3",
    Zombie: "#d9ead3",
    Angel: "#fff2cc",
    Demon: "#f4cccc",
    Mutant: "#d9d2e9",
    Mecha: "#d9d9d9",
    Player: "#f9cb9c",
    Unknown: "#eeeeee",
  };
  const MINION_TYPES = {
    "Drawn Dragon": "Dragon",
    "Undead Turtle": "Zombie",
    Stan: "Angel",
    "Tomb Guardian": "Zombie",
    Imp: "Demon",
    Mummy: "Zombie",
    "Slug Dragonling": "Dragon",
    Roachikun: "Mutant",
    "Demonic Tentacle": "Mutant",
    "Baby Bud": "Zombie",
    "Jaden Embryo": "Dragon",
    "Little Monk": "Mutant",
    Mechanic: "Mecha",
    Berserker: "Demon",
    Catcolyte: "Angel",
    "Sanctum Warrior": "Angel",
    "Koryeon Snail": "Angel",
    Minorino: "Mutant",
    "Nightmare Steed": "Demon",
    "Wood Golem": "Mecha",
    Wraith: "Zombie",
    Vampire: "Demon",
    Nanosaur: "Dragon",
    "Ironball Thrower": "Demon",
    "Keyboard Warrior": "Mecha",
    NeuroMecha: "Mecha",
    "Frost Drake": "Dragon",
    "Snail Mech": "Mecha",
    Chika: "Mutant",
    Gaiastapo: "Angel",
    Player: "Player",
  };
  const RELIC_STATES = [
    "Not Met",
    "1 Star",
    "2 Star",
    "3 Star",
    "4 Star",
    "5 Star",
    "6 Star",
    "Awakened",
  ];
  const ORGAN_STATES = [
    "Not Met",
    "Tier 1",
    "Tier 2",
    "Tier 3",
    "Tier 4",
    "Tier 5",
    "Awakened",
  ];

  const elements = {
    garage: document.getElementById("garage"),
    garageView: document.getElementById("garage-view"),
    requirementsView: document.getElementById("requirements-view"),
    relicRequirements: document.getElementById("relic-requirements"),
    organRequirements: document.getElementById("organ-requirements"),
    modStat: document.getElementById("mod-stat"),
    vehicleStat: document.getElementById("vehicle-stat"),
    dataStatus: document.getElementById("data-status"),
    reset: document.getElementById("reset-progress"),
  };

  let vehicles = [];
  let activeArea = 1;
  let activeView = "garage";
  let state = loadState();

  function defaultState() {
    return {
      itemStates: {},
      localRequirements: {},
      vehicleProgress: {},
      vehicleTier: {},
    };
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return { ...defaultState(), ...(saved || {}) };
    } catch {
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function normalize(value) {
    return String(value ?? "").trim().toLowerCase();
  }

  function vehicleKey(vehicle) {
    return [
      vehicle.area,
      vehicle.group,
      vehicle.position,
      normalize(vehicle.name),
    ].join("|");
  }

  function modKey(vehicle, mod) {
    return `${vehicleKey(vehicle)}|mod:${mod.number}`;
  }

  function itemKey(type, name) {
    return `${normalize(type)}|${normalize(name)}`;
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = "";
    let quoted = false;

    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];

      if (quoted) {
        if (char === '"' && text[i + 1] === '"') {
          cell += '"';
          i += 1;
        } else if (char === '"') {
          quoted = false;
        } else {
          cell += char;
        }
        continue;
      }

      if (char === '"') {
        quoted = true;
      } else if (char === ",") {
        row.push(cell);
        cell = "";
      } else if (char === "\n") {
        row.push(cell.replace(/\r$/, ""));
        rows.push(row);
        row = [];
        cell = "";
      } else {
        cell += char;
      }
    }

    row.push(cell.replace(/\r$/, ""));
    if (row.some((value) => value !== "")) rows.push(row);
    return rows;
  }

  function validateRows(rows) {
    if (!Array.isArray(rows) || rows.length < 2) return false;
    const header = rows[0].map(normalize);
    return (
      header.includes("area") &&
      header.includes("vehicle") &&
      header.includes("mod #")
    );
  }

  function rowObjects(rows) {
    const headers = rows[0].map((header) => String(header ?? "").trim());

    return rows.slice(1).map((row) => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = row[index] ?? "";
      });
      return record;
    });
  }

  function areaNumber(value) {
    const match = String(value ?? "").match(/\d+/);
    return match ? Number(match[0]) : 0;
  }

  function numberValue(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function formatCondition(type, value) {
    const conditionType = String(type ?? "").trim();
    const conditionValue = String(value ?? "").trim();

    if (!conditionType) return "";
    if (normalize(conditionType) === "awakened") return "Awakened";
    if (normalize(conditionType) === "star") {
      return conditionValue ? `${conditionValue} Star` : "Star";
    }
    if (normalize(conditionType) === "tier") {
      return conditionValue ? `Tier ${conditionValue}` : "Tier";
    }
    if (normalize(conditionType) === "level") {
      return conditionValue ? `Lv. ${conditionValue}` : "Level";
    }
    return conditionValue
      ? `${conditionType} ${conditionValue}`
      : conditionType;
  }

  function buildVehicles(rows) {
    const map = new Map();

    rowObjects(rows).forEach((record) => {
      const area = areaNumber(record.Area);
      const group = numberValue(record["Garage Group"]);
      const position = String(record.Position || "Full").trim() || "Full";
      const name = String(record.Vehicle || "").trim();

      if (!area || !group || !name) return;

      const key = [area, group, position, normalize(name)].join("|");
      if (!map.has(key)) {
        const minion = String(record.Minion || "").trim();
        map.set(key, {
          area,
          group,
          position,
          name,
          minion,
          minionType: MINION_TYPES[minion] || "Unknown",
          bonus: String(record.Bonus || "").trim(),
          mods: [],
        });
      }

      const vehicle = map.get(key);
      const type = ["Relic", "Organ"].includes(record["Requirement Type"])
        ? record["Requirement Type"]
        : "Unknown";
      const conditionType = String(record["Condition Type"] || "").trim();
      const conditionValue = String(record["Condition Value"] || "").trim();

      vehicle.mods.push({
        number: numberValue(record["Mod #"], vehicle.mods.length + 1),
        type,
        name: String(record.Requirement || "").trim(),
        conditionType,
        conditionValue,
        condition: formatCondition(conditionType, conditionValue),
      });
    });

    return [...map.values()]
      .map((vehicle) => ({
        ...vehicle,
        mods: vehicle.mods.sort((a, b) => a.number - b.number),
      }))
      .sort(
        (a, b) =>
          a.area - b.area ||
          a.group - b.group ||
          a.position.localeCompare(b.position),
      );
  }

  async function loadData() {
    elements.dataStatus.textContent = "Loading garage data…";
    elements.dataStatus.classList.remove("error");

    try {
      const response = await fetch(LIVE_DATA_URL, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const rows = parseCsv(await response.text());
      if (!validateRows(rows)) throw new Error("Unexpected sheet format");

      vehicles = buildVehicles(rows);
      elements.dataStatus.textContent =
        "Garage data synced from the Snail Lab database.";
    } catch {
      vehicles = [];
      elements.dataStatus.textContent =
        "Garage data could not be loaded from the public Vehicle Data sheet.";
      elements.dataStatus.classList.add("error");
    }

    render();
  }

  function stateOptions(type) {
    return type === "Relic" ? RELIC_STATES : ORGAN_STATES;
  }

  function requiredRank(mod) {
    const conditionType = normalize(mod.conditionType);
    const value = numberValue(mod.conditionValue, 0);

    if (conditionType === "awakened") {
      return mod.type === "Relic"
        ? RELIC_STATES.length - 1
        : ORGAN_STATES.length - 1;
    }

    if (["star", "tier", "level"].includes(conditionType) && value > 0) {
      return value;
    }

    return 1;
  }

  function canShare(mod) {
    return ["Relic", "Organ"].includes(mod.type) && Boolean(mod.name);
  }

  function currentRank(mod) {
    if (!canShare(mod)) return -1;
    const options = stateOptions(mod.type);
    const current = state.itemStates[itemKey(mod.type, mod.name)] || "Not Met";
    return Math.max(0, options.indexOf(current));
  }

  function isModMet(vehicle, mod) {
    if (canShare(mod)) return currentRank(mod) >= requiredRank(mod);
    return Boolean(state.localRequirements[modKey(vehicle, mod)]);
  }

  function setSharedRequirement(mod, checked) {
    const key = itemKey(mod.type, mod.name);
    const options = stateOptions(mod.type);
    const target = requiredRank(mod);
    const current = Math.max(
      0,
      options.indexOf(state.itemStates[key] || "Not Met"),
    );

    if (checked) {
      state.itemStates[key] = options[Math.max(current, target)];
    } else {
      state.itemStates[key] = options[Math.max(0, target - 1)];
    }
  }

  function setModMet(vehicle, mod, checked) {
    if (canShare(mod)) {
      setSharedRequirement(mod, checked);
    } else {
      state.localRequirements[modKey(vehicle, mod)] = checked;
    }

    saveState();
    render();
  }

  function vehicleComplete(vehicle) {
    return (
      vehicle.mods.length > 0 &&
      vehicle.mods.every((mod) => isModMet(vehicle, mod))
    );
  }

  function requirementLabel(mod) {
    if (mod.name) return mod.name;
    if (mod.type === "Relic") return "Relic requirement not entered";
    if (mod.type === "Organ") return "Organ requirement not entered";
    return "Requirement not entered";
  }

  function sharedUsageCount(mod) {
    if (!canShare(mod)) return 0;
    const key = itemKey(mod.type, mod.name);
    const vehicleKeys = new Set();

    vehicles.forEach((vehicle) => {
      vehicle.mods.forEach((candidate) => {
        if (
          canShare(candidate) &&
          itemKey(candidate.type, candidate.name) === key
        ) {
          vehicleKeys.add(vehicleKey(vehicle));
        }
      });
    });

    return vehicleKeys.size;
  }

  function renderStats() {
    const areaVehicles = vehicles.filter((vehicle) => vehicle.area === activeArea);
    const mods = areaVehicles.flatMap((vehicle) => vehicle.mods);
    const met = areaVehicles.reduce(
      (sum, vehicle) =>
        sum + vehicle.mods.filter((mod) => isModMet(vehicle, mod)).length,
      0,
    );
    const complete = areaVehicles.filter(vehicleComplete).length;

    elements.modStat.textContent = `${met} / ${mods.length}`;
    elements.vehicleStat.textContent = `${complete} / ${areaVehicles.length}`;
  }

  function renderMeter(vehicle, card) {
    const key = vehicleKey(vehicle);
    const tier = state.vehicleTier[key] || "White";
    const progress = numberValue(state.vehicleProgress[key], 0);

    card.style.setProperty("--tier-color", TIER_COLORS[tier]);

    const wrap = document.createElement("div");
    wrap.className = "meter-wrap";

    const meter = document.createElement("div");
    meter.className = "vehicle-meter";
    meter.setAttribute("aria-label", `${vehicle.name} progress`);

    for (let index = 1; index <= 5; index += 1) {
      const segment = document.createElement("button");
      segment.type = "button";
      segment.className = `meter-segment${index <= progress ? " active" : ""}`;
      segment.title = `Set vehicle progress to ${index} / 5`;
      segment.setAttribute("aria-label", `Set progress to ${index} of 5`);
      segment.addEventListener("click", () => {
        state.vehicleProgress[key] = progress === index ? index - 1 : index;
        saveState();
        render();
      });
      meter.appendChild(segment);
    }

    const select = document.createElement("select");
    select.className = "tier-select";
    select.setAttribute("aria-label", `${vehicle.name} vehicle tier`);

    Object.keys(TIER_COLORS).forEach((name) => {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      option.selected = name === tier;
      select.appendChild(option);
    });

    select.addEventListener("change", () => {
      state.vehicleTier[key] = select.value;
      saveState();
      render();
    });

    wrap.append(meter, select);
    return wrap;
  }

  function renderVehicle(vehicle) {
    const card = document.createElement("article");
    card.className = `vehicle-card${vehicle.position === "Full" ? " full" : ""}`;

    const minionColor =
      MINION_COLORS[vehicle.minionType] || MINION_COLORS.Unknown;
    card.style.setProperty("--minion-color", minionColor);

    const top = document.createElement("div");
    top.className = "vehicle-top";

    const name = document.createElement("div");
    name.className = "vehicle-name";
    name.textContent = vehicle.name;

    top.append(name, renderMeter(vehicle, card));

    const meta = document.createElement("div");
    meta.className = "vehicle-meta";

    const minionBlock = document.createElement("div");
    minionBlock.className = "meta-block minion-block";

    const minionLabel = document.createElement("span");
    minionLabel.className = "meta-label";
    minionLabel.textContent = "Minion";

    const minionLine = document.createElement("div");
    minionLine.className = "minion-line";

    const minionName = document.createElement("span");
    minionName.className = "meta-value";
    minionName.textContent = vehicle.minion || "—";

    const minionType = document.createElement("span");
    minionType.className = "minion-type";
    minionType.textContent = vehicle.minionType;

    minionLine.append(minionName, minionType);
    minionBlock.append(minionLabel, minionLine);

    const bonusBlock = document.createElement("div");
    bonusBlock.className = "meta-block";

    const bonusLabel = document.createElement("span");
    bonusLabel.className = "meta-label";
    bonusLabel.textContent = "Bonus / Stat";

    const bonusValue = document.createElement("div");
    bonusValue.className = "meta-value";
    bonusValue.textContent = vehicle.bonus || "—";

    bonusBlock.append(bonusLabel, bonusValue);
    meta.append(minionBlock, bonusBlock);

    const modificationsTitle = document.createElement("div");
    modificationsTitle.className = "modifications-title";
    modificationsTitle.textContent = "MODIFICATIONS";

    const modifications = document.createElement("div");
    modifications.className = "modifications";

    vehicle.mods.forEach((mod) => {
      const met = isModMet(vehicle, mod);
      const row = document.createElement("div");
      row.className = `mod-row${met ? " met" : ""}`;

      const main = document.createElement("div");
      main.className = "requirement-main";

      const requirement = document.createElement("span");
      requirement.className = `requirement-name${mod.name ? "" : " unknown"}`;
      requirement.textContent = requirementLabel(mod);
      main.appendChild(requirement);

      const shared = sharedUsageCount(mod);
      if (shared > 1) {
        const sharedPill = document.createElement("span");
        sharedPill.className = "shared-pill";
        sharedPill.textContent = `shared ×${shared}`;
        main.appendChild(sharedPill);
      }

      const requirementState = document.createElement("div");
      requirementState.className = "requirement-state";

      const type = document.createElement("span");
      type.className = `requirement-type ${normalize(mod.type) || "unknown"}`;
      type.textContent = ["Relic", "Organ"].includes(mod.type)
        ? mod.type
        : "Unknown";

      const condition = document.createElement("span");
      condition.className = "condition-pill";
      condition.textContent = mod.condition || "Requirement";

      requirementState.append(type, condition);

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "mod-check";
      checkbox.checked = met;
      checkbox.setAttribute(
        "aria-label",
        `${requirementLabel(mod)} ${mod.condition || "requirement"} complete`,
      );
      checkbox.addEventListener("change", () => {
        setModMet(vehicle, mod, checkbox.checked);
      });

      row.append(main, requirementState, checkbox);
      modifications.appendChild(row);
    });

    card.append(top, meta, modificationsTitle, modifications);
    return card;
  }

  function renderGarage() {
    elements.garage.innerHTML = "";
    const areaVehicles = vehicles.filter((vehicle) => vehicle.area === activeArea);

    if (!areaVehicles.length) {
      const empty = document.createElement("div");
      empty.className = "empty-message";
      empty.textContent = `No vehicles are entered for Area ${activeArea} yet.`;
      elements.garage.appendChild(empty);
      return;
    }

    const groups = [...new Set(areaVehicles.map((vehicle) => vehicle.group))].sort(
      (a, b) => a - b,
    );

    groups.forEach((group) => {
      const groupVehicles = areaVehicles.filter(
        (vehicle) => vehicle.group === group,
      );
      const level = document.createElement("div");
      level.className = "garage-level";

      if (groupVehicles.some((vehicle) => vehicle.position === "Full")) {
        level.classList.add("full-level");
      }

      groupVehicles
        .sort((a, b) => {
          const order = { Left: 0, Right: 1, Full: 2 };
          return (order[a.position] ?? 3) - (order[b.position] ?? 3);
        })
        .forEach((vehicle) => {
          level.appendChild(renderVehicle(vehicle));
        });

      elements.garage.appendChild(level);
    });
  }

  function uniqueRequirements() {
    const map = new Map();

    vehicles.forEach((vehicle) => {
      vehicle.mods.forEach((mod) => {
        if (!canShare(mod)) return;

        const key = itemKey(mod.type, mod.name);
        if (!map.has(key)) {
          map.set(key, {
            key,
            type: mod.type,
            name: mod.name,
            uses: new Map(),
          });
        }

        const requirement = map.get(key);
        requirement.uses.set(vehicleKey(vehicle), {
          vehicle: vehicle.name,
          minionType: vehicle.minionType,
        });
      });
    });

    return [...map.values()]
      .map((requirement) => ({
        ...requirement,
        uses: [...requirement.uses.values()],
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  function renderRequirementMaster() {
    elements.relicRequirements.innerHTML = "";
    elements.organRequirements.innerHTML = "";

    uniqueRequirements().forEach((item) => {
      const row = document.createElement("div");
      row.className = "master-row";

      const details = document.createElement("div");

      const nameLine = document.createElement("div");
      nameLine.className = "master-name-line";

      const name = document.createElement("span");
      name.className = "master-name";
      name.textContent = item.name;
      nameLine.appendChild(name);

      if (item.uses.length > 1) {
        const shared = document.createElement("span");
        shared.className = "shared-pill";
        shared.textContent = `shared ×${item.uses.length}`;
        nameLine.appendChild(shared);
      }

      const usedBy = document.createElement("div");
      usedBy.className = "used-by";

      const usedByLabel = document.createElement("span");
      usedByLabel.className = "used-by-label";
      usedByLabel.textContent = "Used by:";
      usedBy.appendChild(usedByLabel);

      item.uses.forEach((use) => {
        const vehicleUse = document.createElement("span");
        vehicleUse.className = "vehicle-use";

        const vehicleName = document.createElement("span");
        vehicleName.textContent = use.vehicle;

        const type = document.createElement("span");
        type.className = "vehicle-type-pill";
        type.textContent = use.minionType;
        type.style.setProperty(
          "--minion-color",
          MINION_COLORS[use.minionType] || MINION_COLORS.Unknown,
        );

        vehicleUse.append(vehicleName, type);
        usedBy.appendChild(vehicleUse);
      });

      details.append(nameLine, usedBy);

      const select = document.createElement("select");
      select.className = "requirement-select";
      select.setAttribute("aria-label", `${item.name} current state`);

      const current = state.itemStates[item.key] || "Not Met";
      stateOptions(item.type).forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        option.selected = value === current;
        select.appendChild(option);
      });

      select.addEventListener("change", () => {
        state.itemStates[item.key] = select.value;
        saveState();
        render();
      });

      row.append(details, select);

      const target =
        item.type === "Relic"
          ? elements.relicRequirements
          : elements.organRequirements;
      target.appendChild(row);
    });

    if (!elements.relicRequirements.children.length) {
      elements.relicRequirements.innerHTML =
        '<div class="empty-message">No known relic requirements yet.</div>';
    }
    if (!elements.organRequirements.children.length) {
      elements.organRequirements.innerHTML =
        '<div class="empty-message">No known organ requirements yet.</div>';
    }
  }

  function renderTabs() {
    document.querySelectorAll(".area-tab").forEach((button) => {
      const selected = Number(button.dataset.area) === activeArea;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    document.querySelectorAll(".view-tab").forEach((button) => {
      const selected = button.dataset.view === activeView;
      button.classList.toggle("active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    elements.garageView.classList.toggle("hidden", activeView !== "garage");
    elements.requirementsView.classList.toggle(
      "hidden",
      activeView !== "requirements",
    );
  }

  function render() {
    renderTabs();
    renderStats();
    renderGarage();
    renderRequirementMaster();
  }

  function bindControls() {
    document.querySelectorAll(".area-tab").forEach((button) => {
      button.addEventListener("click", () => {
        activeArea = Number(button.dataset.area);
        render();
      });
    });

    document.querySelectorAll(".view-tab").forEach((button) => {
      button.addEventListener("click", () => {
        activeView = button.dataset.view;
        render();
      });
    });

    elements.reset.addEventListener("click", () => {
      if (
        !confirm(
          "Reset all saved Garage progress and requirement states?",
        )
      ) {
        return;
      }

      state = defaultState();
      localStorage.removeItem(STORAGE_KEY);
      render();
    });
  }

  bindControls();
  loadData();
})();
