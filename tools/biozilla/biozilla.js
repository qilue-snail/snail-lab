"use strict";

const RELIC_DATA_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQt9dkXKEDeiQYyGmYaSZpcq7CY1eM9ALn-kxxmm8qASUHznh0avCAz7hp3ojGNOXxIZncAKcpEMJ5J/pub?gid=538475015&single=true&output=csv";
function cloneSeed() {
  return JSON.parse(JSON.stringify(window.BIOZILLA_SEED));
}

let seed = cloneSeed();
const builtInSeed = cloneSeed();
const slots = ["FAME", "ART", "FTH", "CIV", "TECH"];
const statName = {
  FAME: "HARD",
  ART: "HP",
  FTH: "RUSH",
  CIV: "ATK",
  TECH: "DEF",
};
const statKeys = [
  "HP",
  "ATK",
  "RUSH",
  "DEF",
  "CRIT",
  "CRITDMG",
  "DMG",
  "DMGReduc",
  "HeroDMG",
  "ELMTDMG",
];
let state = JSON.parse(
  localStorage.getItem("snailBiozillaCalcV7") || "null",
) || {
  inputs: seed.inputs,
  owned: seed.owned,
  biozilla: seed.inputs.biozilla || "Hamster",
  loadout: seed.loadout,
  snapshots: [],
};
state.autoSyncRelics = state.autoSyncRelics !== false;
const cachedRelicRows = localStorage.getItem("snailBiozillaRelicRowsV1");
if (cachedRelicRows) {
  try {
    seed.relicRows = JSON.parse(cachedRelicRows);
    refreshSeedLists();
  } catch (e) {}
}
function $(id) {
  return document.getElementById(id);
}
function fmt(n, d = 1) {
  if (n === null || n === undefined || isNaN(n) || Math.abs(n) < 1e-9)
    return "";
  return Number(n).toLocaleString(undefined, {
    maximumFractionDigits: d,
  });
}
function val(id) {
  return parseFloat($(id).value) || 0;
}
function save() {
  localStorage.setItem("snailBiozillaCalcV7", JSON.stringify(state));
  $("saveStatus").textContent = "Saved";
  setTimeout(() => ($("saveStatus").textContent = ""), 1500);
}
function refreshSeedLists() {
  seed.biozillas = [
    ...new Set(
      seed.relicRows
        .map((r) => String(r.biozilla || "").trim())
        .filter((b) => b && b !== "Any"),
    ),
  ].sort();
  if (!seed.biozillas.includes(state?.biozilla))
    state.biozilla = seed.inputs?.biozilla || seed.biozillas[0] || "Hamster";
}
function extractSheetId(v) {
  const s = (v || "").trim();
  const m = s.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return m ? m[1] : s;
}
function googleCsvUrl(v) {
  const id = extractSheetId(v);
  if (!id) throw new Error("Paste a Google Sheet URL or spreadsheet ID first.");
  return `https://docs.google.com/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=Relic`;
}
function parseCsv(text) {
  const rows = [];
  let row = [],
    cell = "",
    q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i],
      n = text[i + 1];
    if (q) {
      if (c === '"' && n === '"') {
        cell += '"';
        i++;
      } else if (c === '"') {
        q = false;
      } else cell += c;
    } else {
      if (c === '"') q = true;
      else if (c === ",") {
        row.push(cell);
        cell = "";
      } else if (c === "\n") {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = "";
      } else if (c !== "\r") cell += c;
    }
  }
  row.push(cell);
  rows.push(row);
  return rows;
}
function numCell(v) {
  if (v === undefined || v === null) return 0;
  const s = String(v).replace(/,/g, "").replace(/%/g, "").trim();
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
function parseRelicRowsFromArray(rows) {
  const out = [];
  for (const r of rows) {
    const name = (r[0] || "").trim(),
      type = (r[2] || "").trim().toUpperCase();
    if (!name || !slots.includes(type)) continue;
    const starRaw = (r[1] || "").trim();
    let star = starRaw;
    if (starRaw !== "" && !/^awaken$/i.test(starRaw)) {
      const n = numCell(starRaw);
      star = isNaN(n) ? starRaw : n;
    }
    out.push({
      name,
      star: /^awaken$/i.test(starRaw) ? "Awaken" : star,
      type,
      main: numCell(r[3]),
      stamp1: r[4] || "",
      stamp2: r[5] || "",
      stamp3: r[6] || "",
      HP: numCell(r[7]),
      ATK: numCell(r[8]),
      RUSH: numCell(r[9]),
      DEF: numCell(r[10]),
      CRIT: numCell(r[11]),
      CRITDMG: numCell(r[12]),
      DMG: numCell(r[13]),
      DMGReduc: numCell(r[14]),
      HeroDMG: numCell(r[15]),
      ELMTDMG: numCell(r[16]),
      AFFCT: numCell(r[17]),
      biozilla: (r[18] || "Any").trim() || "Any",
    });
  }
  if (out.length < 10)
    throw new Error(
      "Relic tab loaded, but too few valid rows were found. The relic data source may not be published correctly or the columns may have changed.",
    );
  return out;
}
function parseRelicRowsFromCsv(csv) {
  return parseRelicRowsFromArray(parseCsv(csv));
}
function gvizUrlFromPublishedCsv(url) {
  const keyMatch = String(url).match(/\/spreadsheets\/d\/e\/([^/]+)\//);
  const gidMatch = String(url).match(/[?&]gid=([^&]+)/);
  if (!keyMatch || !gidMatch)
    throw new Error(
      "The built-in Relic data link is not in the expected published Google Sheets format.",
    );
  return `https://docs.google.com/spreadsheets/d/e/${keyMatch[1]}/gviz/tq?gid=${gidMatch[1]}&tqx=out:json&headers=0&cacheBust=${Date.now()}`;
}
function loadGoogleSheetJsonp(url) {
  return new Promise((resolve, reject) => {
    const oldGoogle = window.google;
    const oldCb = oldGoogle?.visualization?.Query?.setResponse;
    let done = false;
    const cleanup = (script) => {
      if (script && script.parentNode) script.parentNode.removeChild(script);
      if (oldGoogle === undefined) {
        try {
          delete window.google;
        } catch (e) {
          window.google = undefined;
        }
      } else {
        window.google = oldGoogle;
        if (oldCb) window.google.visualization.Query.setResponse = oldCb;
      }
    };
    window.google = window.google || {};
    window.google.visualization = window.google.visualization || {};
    window.google.visualization.Query = window.google.visualization.Query || {};
    const script = document.createElement("script");
    const timer = setTimeout(() => {
      if (!done) {
        done = true;
        cleanup(script);
        reject(new Error("Google Sheets sync timed out."));
      }
    }, 15000);
    window.google.visualization.Query.setResponse = (data) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      cleanup(script);
      try {
        if (data.status && data.status !== "ok")
          throw new Error(
            data.errors?.[0]?.detailed_message ||
              data.errors?.[0]?.message ||
              "Google Sheets returned an error.",
          );
        const table = data.table;
        const rows = (table.rows || []).map((row) =>
          (row.c || []).map((cell) => (cell ? (cell.f ?? cell.v ?? "") : "")),
        );
        resolve(rows);
      } catch (e) {
        reject(e);
      }
    };
    script.onerror = () => {
      if (!done) {
        done = true;
        clearTimeout(timer);
        cleanup(script);
        reject(new Error("Could not load Google Sheets published data."));
      }
    };
    script.src = url;
    document.head.appendChild(script);
  });
}
async function fetchRelicRowsWithFallback() {
  const bust =
    (RELIC_DATA_URL.includes("?") ? "&" : "?") + "cacheBust=" + Date.now();
  try {
    const res = await fetch(RELIC_DATA_URL + bust, {
      cache: "no-store",
      mode: "cors",
    });
    if (!res.ok) throw new Error(`Relic data source returned ${res.status}.`);
    const csv = await res.text();
    return parseRelicRowsFromCsv(csv);
  } catch (fetchErr) {
    const rows = await loadGoogleSheetJsonp(
      gvizUrlFromPublishedCsv(RELIC_DATA_URL),
    );
    try {
      return parseRelicRowsFromArray(rows);
    } catch (parseErr) {
      throw new Error(
        `Direct sync was blocked and Google Sheets fallback loaded but could not parse the Relic tab: ${parseErr.message}`,
      );
    }
  }
}
function setSyncStatus(msg, cls = "") {
  const el = $("syncStatus");
  if (!el) return;
  el.className = "syncstatus " + cls;
  el.textContent = msg;
}
async function loadRelicTabFromSheet(manual = false) {
  state.autoSyncRelics = !!$("autoSyncRelics")?.checked;
  save();
  setSyncStatus("Syncing relic data...", "warn");
  const rows = await fetchRelicRowsWithFallback();
  seed.relicRows = rows;
  refreshSeedLists();
  localStorage.setItem("snailBiozillaRelicRowsV1", JSON.stringify(rows));
  const names = new Set(rows.map((r) => r.name));
  setSyncStatus(
    `Synced ${rows.length.toLocaleString()} Relic rows / ${names.size.toLocaleString()} relics at ${new Date().toLocaleString()}.`,
    "ok",
  );
  bindInputs();
  $("ownedBiozilla").innerHTML =
    '<option value="">All</option>' +
    seed.biozillas.map((b) => `<option>${b}</option>`).join("");
  renderOwned();
  renderBio();
  renderSnapshots();
  save();
}
function useBuiltInRelicData() {
  seed.relicRows = JSON.parse(JSON.stringify(builtInSeed.relicRows));
  refreshSeedLists();
  localStorage.removeItem("snailBiozillaRelicRowsV1");
  setSyncStatus(
    `Using built-in v8 data: ${seed.relicRows.length.toLocaleString()} Relic rows.`,
    "warn",
  );
  $("ownedBiozilla").innerHTML =
    '<option value="">All</option>' +
    seed.biozillas.map((b) => `<option>${b}</option>`).join("");
  renderOwned();
  renderBio();
  save();
}
function bioMatch(row) {
  return row.biozilla === state.biozilla || row.biozilla === "Any";
}
function relicHasBiozilla(name, bio) {
  if (!bio) return true;
  return seed.relicRows.some(
    (r) => r.name === name && (r.biozilla === bio || r.biozilla === "Any"),
  );
}
function normalizeLevel(x) {
  if (x === undefined || x === null) return "Unowned";
  return String(x).replace(/\.0$/, "");
}
function rowMatchesLevel(row, level) {
  level = normalizeLevel(level);
  let star = normalizeLevel(row.star);
  if (level === "Unowned") return false;
  if (level === "Awaken") return star === "Awaken";
  return star === level;
}
function baseMain(r) {
  if (!r) return 0;
  if (Number(r.main) || normalizeLevel(r.star) === "Awaken")
    return Number(r.main) || 0;
  const lvl = normalizeLevel(r.star);
  const sameBioAwaken = seed.relicRows.find(
    (x) =>
      x.name === r.name &&
      normalizeLevel(x.star) === "Awaken" &&
      x.biozilla === r.biozilla &&
      Number(x.main),
  );
  const anyAwaken = seed.relicRows.find(
    (x) =>
      x.name === r.name &&
      normalizeLevel(x.star) === "Awaken" &&
      Number(x.main),
  );
  const aw = sameBioAwaken || anyAwaken;
  if (!aw) return 0;
  const drop =
    lvl === "6" || lvl === "5" ? 10 : lvl === "4" ? 24 : lvl === "3" ? 34 : 0;
  return Math.max(0, (Number(aw.main) || 0) - drop);
}
function effectiveMain(r) {
  return baseMain(r) + (Number(r?.AFFCT) || 0);
}
function rowPriority(r) {
  return (
    (r.biozilla === state.biozilla ? 3 : r.biozilla === "Any" ? 2 : 1) +
    (Number(r.main) ? 0.1 : 0)
  );
}
function getOwnedRow(name) {
  const lvl = normalizeLevel(state.owned[name]);
  let rows = seed.relicRows.filter(
    (r) => r.name === name && rowMatchesLevel(r, lvl) && bioMatch(r),
  );
  if (!rows.length)
    rows = seed.relicRows.filter(
      (r) => r.name === name && rowMatchesLevel(r, lvl),
    );
  rows.sort((a, b) => rowPriority(b) - rowPriority(a));
  return rows[0] || null;
}
function availableForSlot(slot) {
  const names = [
    ...new Set(
      seed.relicRows
        .filter((r) => r.type === slot && bioMatch(r))
        .map((r) => r.name),
    ),
  ].sort();
  return names.filter((n) => getOwnedRow(n));
}
function affctBump(effective, slot) {
  let last = seed.affctTable[0] || [0, 0, 0];
  for (const row of seed.affctTable) {
    if (effective >= row[0]) last = row;
    else break;
  }
  return slot === "FAME" ? last[1] : last[2];
}
function scoreRow(r) {
  if (!r) return 0;
  const eff = effectiveMain(r),
    bump = affctBump(eff, r.type);
  return (
    r.CRIT +
    r.CRITDMG +
    r.DMG +
    r.DMGReduc +
    r.HeroDMG +
    r.ELMTDMG +
    (r.type === "FAME" || r.type === "CIV" ? bump : 0) +
    (r.type === "FAME" || r.type === "FTH" ? bump : 0)
  );
}
function totalsForLoadout(loadout) {
  const total = {
    HP: 0,
    ATK: 0,
    RUSH: 0,
    DEF: 0,
    CRIT: 0,
    CRITDMG: 0,
    DMG: 0,
    DMGReduc: 0,
    HeroDMG: 0,
    ELMTDMG: 0,
  };
  for (const s of slots) {
    const line = statLine(getOwnedRow(loadout[s]), s);
    for (const k of statKeys) total[k] += line[k] || 0;
  }
  return total;
}
function damageForLoadout(loadout) {
  return calcDamage(totalsForLoadout(loadout));
}
function candidateDamage(slot, name, baseLoadout = state.loadout) {
  const test = Object.assign({}, baseLoadout);
  test[slot] = name;
  return damageForLoadout(test);
}
function candidateDelta(slot, name) {
  return candidateDamage(slot, name) - damageForLoadout(state.loadout);
}
function statLine(r, slot) {
  const out = {
    HP: 0,
    ATK: 0,
    RUSH: 0,
    DEF: 0,
    CRIT: 0,
    CRITDMG: 0,
    DMG: 0,
    DMGReduc: 0,
    HeroDMG: 0,
    ELMTDMG: 0,
    Main: 0,
  };
  if (!r) return out;
  for (const k of statKeys) out[k] = r[k] || 0;
  out.Main = effectiveMain(r);
  const bump = affctBump(out.Main, slot);
  if (slot === "FAME") {
    out.HP += bump;
    out.ATK += bump;
    out.RUSH += bump;
    out.DEF += bump;
  }
  if (slot === "ART") out.HP += bump;
  if (slot === "FTH") out.RUSH += bump;
  if (slot === "CIV") out.ATK += bump;
  if (slot === "TECH") out.DEF += bump;
  return out;
}
function totals() {
  return totalsForLoadout(state.loadout);
}
function calcDamage(t) {
  const atk = state.inputs.atk * (1 + t.ATK / 100),
    rush = state.inputs.rush * (1 + t.RUSH / 100),
    def = state.inputs.def;
  const dmgMult = 1 + (state.inputs.dmg + t.DMG) / 100 + t.HeroDMG / 100;
  const crit = (state.inputs.crit + t.CRIT) / 100;
  const critD = 1.5 + (state.inputs.critDmg + t.CRITDMG) / 100;
  const critFactor = crit * critD + (1 - crit) * 1;
  const e = t.ELMTDMG || 0;
  const hit = (stat) =>
    (stat - def) * dmgMult * critFactor +
    (Math.log(stat) / Math.log(5)) * e * dmgMult;
  return hit(atk) + hit(rush);
}
function bindInputs() {
  $("baseAtk").value = state.inputs.atk;
  $("baseRush").value = state.inputs.rush;
  $("baseDmg").value = state.inputs.dmg;
  $("baseCrit").value = state.inputs.crit;
  $("baseCritDmg").value = state.inputs.critDmg;
  $("enemyDef").value = state.inputs.def;
  for (const id of [
    "baseAtk",
    "baseRush",
    "baseDmg",
    "baseCrit",
    "baseCritDmg",
    "enemyDef",
  ])
    $(id).oninput = () => {
      state.inputs = {
        atk: val("baseAtk"),
        rush: val("baseRush"),
        dmg: val("baseDmg"),
        crit: val("baseCrit"),
        critDmg: val("baseCritDmg"),
        def: val("enemyDef"),
      };
      renderBio();
      save();
    };
}
function renderOwned() {
  const q = $("ownedSearch").value.toLowerCase(),
    type = $("ownedType").value,
    bio = $("ownedBiozilla").value;
  const names = [...new Set(seed.relicRows.map((r) => r.name))].sort();
  const tbody = $("ownedTable").querySelector("tbody");
  tbody.innerHTML = "";
  for (const name of names) {
    const base = seed.relicRows.find((r) => r.name === name);
    if (type && base.type !== type) continue;
    if (bio && !relicHasBiozilla(name, bio)) continue;
    if (q && !name.toLowerCase().includes(q)) continue;
    const bioz = [
      ...new Set(
        seed.relicRows
          .filter((r) => r.name === name)
          .map((r) => r.biozilla)
          .filter(Boolean),
      ),
    ].join(", ");
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${name}</td><td><span class="pill slot-${base.type}">${base.type || ""}</span></td><td><select data-name="${name.replace(/"/g, "&quot;")}">${["Unowned", "3", "4", "5", "6", "Awaken"].map((l) => `<option ${normalizeLevel(state.owned[name]) === l ? "selected" : ""}>${l}</option>`).join("")}</select></td><td>${bioz}</td>`;
    tbody.appendChild(tr);
  }
  tbody.querySelectorAll("select").forEach(
    (sel) =>
      (sel.onchange = () => {
        state.owned[sel.dataset.name] = sel.value;
        renderBio();
        save();
      }),
  );
}
function renderMobileLoadout() {
  const root = $("mobileLoadout");
  if (!root) return;
  const currentDmg = damageForLoadout(state.loadout);
  let html = `<div class="mobile-damage">Damage Per Round<br><span>${fmt(currentDmg, 0) || "0"}</span></div>`;
  for (const slot of slots) {
    const row = getOwnedRow(state.loadout[slot]);
    const line = statLine(row, slot);
    const opts = ["", ...availableForSlot(slot)]
      .map(
        (n) =>
          `<option value="${n.replace(/"/g, "&quot;")}" ${state.loadout[slot] === n ? "selected" : ""}>${n || "—"}</option>`,
      )
      .join("");
    const shown = [
      "Main",
      "ATK",
      "RUSH",
      "CRIT",
      "CRITDMG",
      "DMG",
      "HeroDMG",
      "ELMTDMG",
    ];
    html += `<div class="mobile-slot-card"><div class="mobile-slot-head slot-${slot}"><span>${slot}</span><span>${statName[slot]}</span></div><div class="mobile-slot-body"><select data-slot="${slot}">${opts}</select><div class="mobile-stat-grid">${shown.map((k) => `<div class="mobile-stat"><b>${k === "CRITDMG" ? "CRIT DMG" : k === "HeroDMG" ? "Hero DMG" : k === "ELMTDMG" ? "ELMT DMG" : k}</b>${fmt(line[k], k === "Main" ? 0 : 1) || "0"}</div>`).join("")}</div></div></div>`;
  }
  root.innerHTML = html;
  root.querySelectorAll("select").forEach(
    (sel) =>
      (sel.onchange = () => {
        state.loadout[sel.dataset.slot] = sel.value;
        renderBio();
        save();
      }),
  );
}
function renderBio() {
  $("bioTitle").textContent = state.biozilla;
  $("biozillaSelect").innerHTML = seed.biozillas
    .map(
      (b) => `<option ${b === state.biozilla ? "selected" : ""}>${b}</option>`,
    )
    .join("");
  const body = $("loadoutBody");
  body.innerHTML = "";
  const t = totals();
  for (const slot of slots) {
    const row = getOwnedRow(state.loadout[slot]);
    const line = statLine(row, slot);
    const opts = ["", ...availableForSlot(slot)]
      .map(
        (n) =>
          `<option value="${n.replace(/"/g, "&quot;")}" ${state.loadout[slot] === n ? "selected" : ""}>${n || "—"}</option>`,
      )
      .join("");
    const tr = document.createElement("tr");
    tr.innerHTML = `<td class="slot-${slot}"><select data-slot="${slot}">${opts}</select></td><td class="slot-${slot}">${slot}</td><td>${statName[slot]}</td><td class="num">${fmt(line.Main, 0)}</td>${["HP", "ATK", "RUSH", "DEF", "CRIT", "CRITDMG", "DMG", "DMGReduc", "HeroDMG", "ELMTDMG"].map((k) => `<td class="num">${fmt(line[k])}</td>`).join("")}`;
    body.appendChild(tr);
  }
  body.querySelectorAll("select").forEach(
    (sel) =>
      (sel.onchange = () => {
        state.loadout[sel.dataset.slot] = sel.value;
        renderBio();
        save();
      }),
  );
  for (const k of statKeys) $("t" + k).textContent = fmt(t[k]);
  $("damageOut").textContent = fmt(calcDamage(t), 0);
  renderMobileLoadout();
  renderRecommendations();
  renderDetails();
}
function renderRecommendations() {
  const root = $("recommendations");
  root.innerHTML = "";
  const current = damageForLoadout(state.loadout);
  for (const slot of slots) {
    const cands = availableForSlot(slot)
      .map((n) => getOwnedRow(n))
      .filter(Boolean)
      .map((r) => ({
        r,
        dmg: candidateDamage(slot, r.name),
        delta: candidateDamage(slot, r.name) - current,
      }))
      .sort((a, b) => b.dmg - a.dmg)
      .slice(0, 5);
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<h3><span class="pill slot-${slot}">${slot}</span></h3><ol>${cands.map((x) => `<li><button data-slot="${slot}" data-name="${x.r.name.replace(/"/g, "&quot;")}">Use</button> ${x.r.name}<br><span class="small">${normalizeLevel(state.owned[x.r.name])} · damage ${fmt(x.dmg, 0)} · ${x.delta >= 0 ? "+" : ""}${fmt(x.delta, 0)}</span></li>`).join("")}</ol>`;
    root.appendChild(div);
  }
  root.querySelectorAll("button").forEach(
    (btn) =>
      (btn.onclick = () => {
        state.loadout[btn.dataset.slot] = btn.dataset.name;
        renderBio();
        save();
      }),
  );
}
function renderDetails() {
  const tbody = $("detailsTable").querySelector("tbody");
  tbody.innerHTML = "";
  for (const slot of slots) {
    const r = getOwnedRow(state.loadout[slot]);
    if (!r) continue;
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${r.name}</td><td>${normalizeLevel(state.owned[r.name])}</td><td>${r.type}</td><td class="num">${fmt(effectiveMain(r), 0)}</td><td>${r.stamp1}</td><td>${r.stamp2}</td><td>${r.stamp3}</td><td>${r.biozilla}</td><td class="num">${fmt(scoreRow(r))}</td>`;
    tbody.appendChild(tr);
  }
}
function renderSnapshots() {
  const root = $("snapshots");
  root.innerHTML = "";
  (state.snapshots || []).forEach((s, i) => {
    const div = document.createElement("div");
    div.className = "snapshot";
    div.innerHTML = `<div><b>${s.note || "Snapshot"}</b><br><span class="small">${s.date} · ${s.biozilla} · Damage ${fmt(s.damage, 0)}</span></div><div><button data-i="${i}" class="loadSnap">Load</button> <button data-i="${i}" class="delSnap">Delete</button></div>`;
    root.appendChild(div);
  });
  root.querySelectorAll(".loadSnap").forEach(
    (b) =>
      (b.onclick = () => {
        const s = state.snapshots[b.dataset.i];
        state.inputs = s.inputs;
        state.owned = s.owned;
        state.biozilla = s.biozilla;
        state.loadout = s.loadout;
        bindInputs();
        renderOwned();
        renderBio();
        save();
      }),
  );
  root.querySelectorAll(".delSnap").forEach(
    (b) =>
      (b.onclick = () => {
        state.snapshots.splice(b.dataset.i, 1);
        renderSnapshots();
        save();
      }),
  );
}
function init() {
  document.querySelectorAll(".tab").forEach(
    (t) =>
      (t.onclick = () => {
        document
          .querySelectorAll(".tab,.sheet")
          .forEach((x) => x.classList.remove("active"));
        t.classList.add("active");
        $(t.dataset.tab).classList.add("active");
      }),
  );
  $("autoSyncRelics").checked = state.autoSyncRelics !== false;
  $("syncRelics").onclick = () =>
    loadRelicTabFromSheet(true).catch((e) => setSyncStatus(e.message, "err"));
  if (localStorage.getItem("snailBiozillaRelicRowsV1")) {
    const names = new Set(seed.relicRows.map((r) => r.name));
    setSyncStatus(
      `Using last synced Relic data: ${seed.relicRows.length.toLocaleString()} rows / ${names.size.toLocaleString()} relics. Click Sync Relic Data to refresh.`,
      "ok",
    );
  }
  bindInputs();
  $("ownedBiozilla").innerHTML =
    '<option value="">All</option>' +
    seed.biozillas.map((b) => `<option>${b}</option>`).join("");
  renderOwned();
  renderBio();
  renderSnapshots();
  if (state.autoSyncRelics && !localStorage.getItem("snailBiozillaRelicRowsV1"))
    loadRelicTabFromSheet(false).catch((e) =>
      setSyncStatus(
        "Auto-sync failed: " + e.message + " Built-in data is still available.",
        "err",
      ),
    );
  $("ownedSearch").oninput = renderOwned;
  $("ownedType").onchange = renderOwned;
  $("ownedBiozilla").onchange = renderOwned;
  $("biozillaSelect").onchange = () => {
    state.biozilla = $("biozillaSelect").value;
    for (const s of slots)
      if (!availableForSlot(s).includes(state.loadout[s]))
        state.loadout[s] = "";
    renderBio();
    save();
  };
  $("autoBtn").onclick = () => {
    let work = Object.assign({}, state.loadout);
    let improved = true,
      guard = 0;
    while (improved && guard++ < 20) {
      improved = false;
      for (const slot of slots) {
        const currentDmg = damageForLoadout(work);
        let bestName = work[slot] || "",
          bestDmg = currentDmg;
        for (const name of availableForSlot(slot)) {
          const d = candidateDamage(slot, name, work);
          if (d > bestDmg) {
            bestDmg = d;
            bestName = name;
          }
        }
        if (bestName !== work[slot]) {
          work[slot] = bestName;
          improved = true;
        }
      }
    }
    state.loadout = work;
    renderBio();
    save();
  };
  $("clearLoadout").onclick = () => {
    slots.forEach((s) => (state.loadout[s] = ""));
    renderBio();
    save();
  };
  $("snapBtn").onclick = () => {
    const t = totals();
    state.snapshots = state.snapshots || [];
    state.snapshots.unshift({
      date: new Date().toLocaleString(),
      note: $("snapshotNote").value,
      inputs: JSON.parse(JSON.stringify(state.inputs)),
      owned: JSON.parse(JSON.stringify(state.owned)),
      biozilla: state.biozilla,
      loadout: JSON.parse(JSON.stringify(state.loadout)),
      damage: calcDamage(t),
    });
    $("snapshotNote").value = "";
    renderSnapshots();
    save();
  };
  $("resetBtn").onclick = () => {
    if (!confirm("Reset Biozilla data? This cannot be undone.")) return;
    localStorage.removeItem("snailBiozillaCalcV7");
    localStorage.removeItem("snailBiozillaRelicRowsV1");
    location.reload();
  };
}
init();
