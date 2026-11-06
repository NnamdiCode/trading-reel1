/* ==========================================================================
   TRADING REEL — app logic
   A simulated Binance-style futures position that climbs from a loss into
   the configured profit. Five editable account presets, daily checkmarks,
   and a distraction-free recording mode.
   ========================================================================== */

(function () {
  "use strict";

  window.addEventListener("error", (e) => {
    window.__reelErrors = (window.__reelErrors || []).concat(
      `${e.message} @ ${e.filename}:${e.lineno}`
    );
  });
  window.addEventListener("unhandledrejection", (e) => {
    window.__reelErrors = (window.__reelErrors || []).concat(
      `promise: ${e.reason && (e.reason.stack || e.reason.message || e.reason)}`
    );
  });

  const CFG = window.REEL_CONFIG;
  const STORE_KEY = "reeldesk.v1";
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ======================================================================
     Small helpers
     ====================================================================== */

  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const pad2 = (n) => String(n).padStart(2, "0");

  function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function formatNum(n, dec, signed) {
    if (!isFinite(n)) n = 0;
    const eps = 0.5 * Math.pow(10, -dec);
    if (Math.abs(n) < eps) n = 0;
    const body = Math.abs(n).toLocaleString("en-US", {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec
    });
    return (n < 0 ? "-" : signed ? "+" : "") + body;
  }

  function parseNumber(value) {
    if (value == null) return null;
    const cleaned = String(value).replace(/[,\s$%]/g, "");
    if (cleaned === "" || cleaned === "-") return null;
    const n = Number(cleaned);
    return isFinite(n) ? n : null;
  }

  function normalizeSymbol(input) {
    let s = String(input || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!s) return "BRUSDT";
    if (!s.endsWith("USDT")) s += "USDT";
    return s.slice(0, 18);
  }

  const COINS = (CFG.coins || []).slice();

  function baseAsset(symbol) {
    const s = normalizeSymbol(symbol);
    return s.endsWith("USDT") ? s.slice(0, -4) : s;
  }

  function updatePositionBadge(direction) {
    const badge = document.getElementById("directionBadge");
    if (!badge) return;
    const short = direction === "short";
    badge.textContent = short ? "S" : "B";
    badge.classList.toggle("short", short);
  }

  function updateRiskMeter(direction, bars) {
    const meter = el.riskMeter;
    if (!meter) return;
    const short = direction === "short";
    meter.classList.toggle("short", short);
    meter.classList.toggle("long", !short);
    const count = clamp(Math.round(Number(bars) || 1), 1, 4);
    meter.querySelectorAll(".risk-bar").forEach((bar, i) => {
      bar.classList.toggle("on", i < count);
    });
  }

  function renderCoinPicker(currentSymbol) {
    const picker = document.getElementById("coinPicker");
    if (!picker) return;
    const base = baseAsset(currentSymbol || "");
    picker.innerHTML = "";
    COINS.forEach((coin) => {
      const ticker = coin.ticker || `${coin.symbol}USDT`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "coin-chip" + (coin.symbol === base ? " selected" : "");
      btn.setAttribute("aria-label", `${coin.name} (${coin.symbol})`);
      btn.textContent = coin.symbol;
      btn.addEventListener("click", () => {
        el.fSymbol.value = ticker;
        syncEntryForSymbol();
        renderCoinPicker(ticker);
        updateSetupPreview();
      });
      picker.appendChild(btn);
    });
    const selected = picker.querySelector(".coin-chip.selected");
    if (selected) {
      requestAnimationFrame(() => {
        picker.scrollLeft =
          selected.offsetLeft - picker.clientWidth / 2 + selected.clientWidth / 2;
      });
    }
  }

  function todayISO() {
    const d = new Date();
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }

  function todayLabel() {
    const locale =
      (window.REEL_LOCALES && window.REEL_LOCALES[state.settings.language]) || "en-US";
    return new Date().toLocaleDateString(locale, {
      month: "short",
      day: "numeric"
    });
  }

  function t(key, vars) {
    const lang = (state && state.settings && state.settings.language) || "en";
    const dict = (window.REEL_I18N && window.REEL_I18N[lang]) || {};
    const base = (window.REEL_I18N && window.REEL_I18N.en) || {};
    let str = dict[key] != null ? dict[key] : base[key] != null ? base[key] : key;
    if (vars) {
      Object.keys(vars).forEach((name) => {
        str = str.split(`{${name}}`).join(String(vars[name]));
      });
    }
    return str;
  }

  function applyI18n() {
    const supported = window.REEL_I18N && window.REEL_I18N[state.settings.language];
    const lang = supported ? state.settings.language : "en";
    state.settings.language = lang;
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    $$("[data-i18n]").forEach((node) => {
      node.textContent = t(node.dataset.i18n);
    });
    $$("[data-i18n-html]").forEach((node) => {
      node.innerHTML = t(node.dataset.i18nHtml);
    });
    if (el.langSelect) el.langSelect.value = lang;
    el.todayLabel.textContent = todayLabel();
    if (editingId) {
      const p = getPresetById(editingId);
      if (p) el.editTitle.textContent = t("editAccount", { symbol: normalizeSymbol(p.symbol) });
    }
    if (model) {
      el.crossLabel.textContent = `${t(
        model.marginMode === "Isolated" ? "isolated" : "cross"
      )} ${model.leverage}X`;
    }
    if (sim && sim.values && chart) chart.setFrame(makeFrame());
    if (!el.editModal.hidden) renderCoinPicker(el.fSymbol.value);
  }

  function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function priceDecimalsFor(price) {
    if (price < 0.0001) return 8;
    if (price < 0.01) return 7;
    if (price < 0.1) return 6;
    if (price < 1) return 5;
    if (price < 10) return 4;
    if (price < 100) return 3;
    if (price < 1000) return 2;
    if (price < 10000) return 2;
    return 1;
  }

  function deriveEntryPrice(symbol) {
    const h = hashString(symbol);
    const tier = h % 6;
    const bases = [0.048, 0.31, 1.85, 11.5, 68, 420];
    let p = bases[tier] * (1 + ((h >>> 4) % 12000) / 10000);
    p = Number(p.toPrecision(4));
    return Math.max(p, 0.00001);
  }

  function formatAxisTime(ms) {
    const d = new Date(ms);
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(
      d.getHours()
    )}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  }

  /* ======================================================================
     State
     ====================================================================== */

  function loadState() {
    let saved = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    } catch (e) {
      saved = null;
    }
    const sameVersion = saved && saved.version === CFG.appVersion;
    const presets = deepCopy(CFG.presets).map((base) => {
      if (!sameVersion || !saved || !Array.isArray(saved.presets)) return base;
      const over = saved.presets.find((p) => p && p.id === base.id);
      return over ? Object.assign({}, base, over) : base;
    });
    return {
      presets,
      settings: Object.assign({}, CFG.settings, sameVersion && saved.settings ? saved.settings : {}),
      checks: sameVersion && saved && saved.checks ? saved.checks : {},
      selectedId:
        sameVersion && saved && saved.selectedId ? saved.selectedId : presets[0] ? presets[0].id : 1,
      lastChartTime: saved && Number(saved.lastChartTime) ? Number(saved.lastChartTime) : 0,
      structureDeck: saved && Array.isArray(saved.structureDeck) ? saved.structureDeck : [],
      structurePos:
        saved && Number.isInteger(saved.structurePos) ? saved.structurePos : 0,
      structureLast:
        saved && Number.isInteger(saved.structureLast) ? saved.structureLast : -1
    };
  }

  const state = loadState();

  function saveState() {
    try {
      localStorage.setItem(
        STORE_KEY,
        JSON.stringify({
          version: CFG.appVersion,
          presets: state.presets,
          settings: state.settings,
          checks: state.checks,
          selectedId: state.selectedId,
          lastChartTime: state.lastChartTime || 0,
          structureDeck: state.structureDeck || [],
          structurePos: state.structurePos || 0,
          structureLast: state.structureLast != null ? state.structureLast : -1
        })
      );
    } catch (e) {
      /* storage can be unavailable when opened from some local file contexts */
    }
  }

  // A take's chart clock is the real device time, but every new recording is
  // guaranteed to land at least one second after the previous one. Seconds are
  // shown on the time axis, so two videos can never display the same chart time.
  function nextChartTime() {
    const now = Date.now();
    const previous = Number(state.lastChartTime) || 0;
    const stamp = Math.max(now, previous + 1000);
    state.lastChartTime = stamp;
    saveState();
    return stamp;
  }

  const STRUCTURE_COUNT = 100;
  const STRUCTURE_FAMILIES = [
    "downtrend",
    "vrecovery",
    "range",
    "retest",
    "doublebottom",
    "base",
    "doubletop",
    "breakout",
    "breakdown",
    "staircase"
  ];

  function shuffleStructureDeck() {
    const deck = Array.from({ length: STRUCTURE_COUNT }, (_, i) => i);
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = deck[i];
      deck[i] = deck[j];
      deck[j] = t;
    }
    return deck;
  }

  function ensureStructureDeck() {
    const deck = state.structureDeck;
    const valid =
      Array.isArray(deck) &&
      deck.length === STRUCTURE_COUNT &&
      deck.every((n) => Number.isInteger(n) && n >= 0 && n < STRUCTURE_COUNT) &&
      new Set(deck).size === STRUCTURE_COUNT;
    if (!valid) {
      state.structureDeck = shuffleStructureDeck();
      state.structurePos = 0;
    }
    if (
      !Number.isInteger(state.structurePos) ||
      state.structurePos < 0 ||
      state.structurePos > STRUCTURE_COUNT
    ) {
      state.structurePos = 0;
    }
  }

  // Draw one structure without replacement. A full deck of 100 is shuffled
  // again only after every structure has appeared once.
  function drawStructureId() {
    ensureStructureDeck();
    if (state.structurePos >= STRUCTURE_COUNT) {
      let deck;
      do {
        deck = shuffleStructureDeck();
      } while (deck[0] === state.structureLast);
      state.structureDeck = deck;
      state.structurePos = 0;
    }
    const id = state.structureDeck[state.structurePos];
    state.structurePos += 1;
    state.structureLast = id;
    saveState();
    return id;
  }

  function getPresetById(id) {
    return state.presets.find((p) => p.id === id) || state.presets[0];
  }

  function getSelected() {
    const p = getPresetById(state.selectedId);
    if (sessionPreset && sessionPreset.id === p.id) return sessionPreset;
    return p;
  }

  function isDoneToday(id) {
    return state.checks[id] === todayISO();
  }

  /* ======================================================================
     Simulation model
     ====================================================================== */

  const TF = {
    "1s": { step: 1000, count: 58 },
    "1m": { step: 60000, count: 44 },
    "3m": { step: 180000, count: 40 },
    "5m": { step: 300000, count: 38 },
    "15m": { step: 900000, count: 34 },
    "30m": { step: 1800000, count: 30 },
    "1h": { step: 3600000, count: 28 }
  };

  let activeTF = "1m";

  function randomBetween(rng, a, b) {
    return a + rng() * (b - a);
  }

  /* Build a unique PNL trajectory for this take. The path always starts in
     the red, wiggles through 2-5 waves and reaches exactly 1.0 at a random
     point, then holds. Because the timings, depths, dips and peak time are
     random, the resulting candles/chart look different on every recording. */
  function buildPnlPoints(startLossFrac, rng, duration) {
    const loss = -Math.abs(startLossFrac || 0);
    const peakU = randomBetween(rng, 0.76, 0.92);
    const pts = [[0, loss]];

    const dipU = randomBetween(rng, 0.035, 0.11);
    pts.push([dipU, loss * randomBetween(rng, 1.05, 1.45)]);

    // A 60s take spends the opening 8-10s underwater, then crosses into favor.
    // Shorter takes scale the crossing earlier (never more than 55% in).
    const crossTime = Math.min(8 + rng() * 0.8, duration * 0.55);
    const crossU = Math.max(0.05, crossTime / duration);
    const pre = 2 + Math.floor(rng() * 3);
    for (let i = 1; i <= pre; i++) {
      const t = dipU + (crossU - dipU) * (i / (pre + 1));
      let v = loss * (1 - (i / (pre + 1)) * randomBetween(rng, 0.75, 1.35));
      if (v > 0.02) v = 0.02;
      pts.push([t, v]);
    }
    pts.push([crossU, randomBetween(rng, -0.04, 0.05)]);

    const pumpStart = crossU + randomBetween(rng, 0.04, 0.1);
    const waveCount = 2 + Math.floor(rng() * 4);
    const endWaves = peakU * randomBetween(rng, 0.86, 0.93);
    let val = randomBetween(rng, 0.04, 0.18);
    for (let i = 1; i <= waveCount; i++) {
      const t = pumpStart + (endWaves - pumpStart) * (i / (waveCount + 1));
      const up = randomBetween(rng, 0.1, 0.32);
      const pullback = rng() < 0.55 ? -randomBetween(rng, 0.06, 0.24) : 0;
      val = clamp(val + up + pullback, 0.02, 0.9);
      pts.push([t, val]);
    }
    pts.push([peakU * 0.965, randomBetween(rng, 0.9, 0.97)]);
    pts.push([peakU, 1]);
    pts.push([1, 1]);

    pts.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const point of pts) {
      if (merged.length && point[0] - merged[merged.length - 1][0] < 0.006) {
        merged[merged.length - 1][1] = point[1];
      } else {
        merged.push(point);
      }
    }
    merged[merged.length - 1] = [1, 1];
    if (merged.length > 1 && merged[merged.length - 2][0] > 0.995) {
      merged[merged.length - 2] = [0.995, 1];
    }
    return { points: merged, peakU, crossU };
  }

  function interpPoints(points, u) {
    if (u <= points[0][0]) return points[0][1];
    for (let i = 1; i < points.length; i++) {
      if (u <= points[i][0]) {
        const [x0, y0] = points[i - 1];
        const [x1, y1] = points[i];
        const t = x1 === x0 ? 0 : (u - x0) / (x1 - x0);
        return y0 + (y1 - y0) * t;
      }
    }
    return points[points.length - 1][1];
  }

  function pnlFraction(u, model) {
    if (u >= model.peakU) return 1;
    let f = interpPoints(model.pnlPoints, u);
    const envelope = Math.min(1, u / 0.04) * (u > model.peakU - 0.07 ? 0.25 : 1);
    const s = (model.seed % 1000) / 13.7;
    const noise =
      Math.sin(u * 54 + s * 1.31) * 0.6 +
      Math.sin(u * 123 + s * 2.13) * 0.28 +
      Math.sin(u * 21 + s * 0.71) * 0.35;
    f += noise * model.pnlNoise * envelope;
    return Math.min(0.998, Math.max(-0.6, f));
  }

  /* Margin-driven position model:
     margin x leverage = entry notional
     quantity = notional / entry
     TP price = entry +/- targetPNL / quantity
     ROI at TP = targetPNL / margin
     liquidation and margin ratio come from the same margin. */
  function computePosition(preset) {
    const symbol = normalizeSymbol(preset.symbol);
    const entryOverride = parseNumber(preset.entryPrice);
    const entry =
      entryOverride && entryOverride > 0
        ? entryOverride
        : CFG.priceTable[symbol] || deriveEntryPrice(symbol);
    const leverage = clamp(Math.round(parseNumber(preset.leverage) || 20), 2, 125);
    const marginInput = parseNumber(preset.margin);
    const margin = clamp(marginInput != null ? marginInput : 7500, 1, 1e12);
    const profit = Math.max(0.01, parseNumber(preset.profit) || 1000);
    const direction = preset.direction === "short" ? "short" : "long";
    const dirSign = direction === "long" ? 1 : -1;
    const marginMode = preset.marginMode === "Isolated" ? "Isolated" : "Cross";
    const notional = margin * leverage;
    const qty = notional / entry;
    const peakMove = profit / notional;
    const tp = entry + (dirSign * profit) / qty;
    const roiAtTp = (profit / margin) * 100;
    const mmr = 0.005;
    const liq =
      direction === "long"
        ? (entry * (1 - 1 / leverage)) / (1 - mmr)
        : (entry * (1 + 1 / leverage)) / (1 + mmr);
    const lossRaw = parseNumber(preset.startLossPct);
    const startLossPct = clamp(lossRaw != null ? lossRaw : 14.5, 0, 90);
    const startPnl = -profit * (startLossPct / 100);
    const startPrice = entry + (dirSign * startPnl) / qty;
    const sizeAtTp = qty * tp;
    const marginRatioAtTp = ((sizeAtTp * mmr) / (margin + profit)) * 100;
    const priceDec = priceDecimalsFor(entry);
    const markDec = Math.min(priceDec + 2, 9);
    const valid =
      isFinite(notional) &&
      notional > 0 &&
      isFinite(qty) &&
      qty > 0 &&
      isFinite(tp) &&
      tp > 0 &&
      isFinite(margin) &&
      margin > 0 &&
      profit > 0;

    return {
      symbol,
      entry,
      leverage,
      margin,
      profit,
      direction,
      dirSign,
      marginMode,
      notional,
      qty,
      peakMove,
      tp,
      roiAtTp,
      mmr,
      liq,
      startLossPct,
      startPnl,
      startPrice,
      sizeAtTp,
      marginRatioAtTp,
      priceDec,
      markDec,
      valid
    };
  }


  function buildLiveColors(dirSign, count, crossU, duration, rng) {
    const trend = dirSign > 0 ? "G" : "R";
    const counter = trend === "G" ? "R" : "G";
    const n = Math.max(6, count + 3);
    const crossIndex = Math.max(0, Math.min(n - 1, Math.floor(crossU * count)));
    const favorIndex = Math.max(
      crossIndex,
      Math.min(n - 1, Math.floor((10 / duration) * count))
    );
    const out = [];
    let run = 0;

    for (let i = 0; i < n; i++) {
      let c;
      if (i >= crossIndex && i <= favorIndex) {
        // The turn and the rest of the 8-10s window stay in the trade
        // direction, so the trade is visibly in profit by ten seconds.
        c = trend;
      } else if (i === 0 && crossIndex > 0) {
        c = rng() < 0.7 ? counter : trend;
      } else if (run >= 3) {
        c = counter;
      } else if (run === 2) {
        c = rng() < 0.5 ? counter : trend;
      } else {
        c = rng() < 0.72 ? trend : counter;
      }
      out.push(c);
      run = c === trend ? run + 1 : 0;
    }

    // Make sure the opening stretch is genuinely mixed.
    if (crossIndex > 0 && !out.slice(0, crossIndex).includes(counter)) {
      out[Math.max(0, crossIndex - 1)] = counter;
    }
    return out;
  }

  function buildModel(preset, seed, structureId) {
    const pos = computePosition(preset);
    const startEquity = pos.margin + pos.startPnl;
    const startMarginRatio =
      startEquity > 0 ? (pos.qty * pos.startPrice * pos.mmr) / startEquity * 100 : 999;
    const riskBars =
      startMarginRatio < 18 ? 1 : startMarginRatio < 32 ? 2 : startMarginRatio < 55 ? 3 : 4;
    const rng = mulberry32(
      hashString(`${preset.symbol}|${preset.profit}|${preset.margin}|${seed}`)
    );
    const duration = clamp(parseNumber(preset.duration) || 60, 4, 60);
    const realized = parseNumber(preset.realizedPnl);
    const changeOverride = parseNumber(preset.change24h);
    const change24 =
      changeOverride != null
        ? changeOverride
        : pos.direction === "short"
          ? -(10 + rng() * 46)
          : 10 + rng() * 46;

    const baseCount = (TF[activeTF] || TF["1m"]).count;
    // A longer visible history lets the entry sit around the first third of
    // the chart and still stay visible as the live candles progress.
    const chartCount = Math.max(72, baseCount + Math.floor(rng() * 15) + 22);
    const liveCandles = clamp(12 + Math.floor(rng() * 9), 10, 20);
    const volatility = 0.0006 + rng() * 0.0022;
    const pnlNoise = 0.002 + rng() * 0.0032;
    const pnl = buildPnlPoints(pos.startLossPct / 100, rng, duration);
    const priceNoise = 0.0022 + rng() * 0.0018;
    const liveColors = buildLiveColors(pos.dirSign, liveCandles, pnl.crossU, duration, rng);
    const wickNoise = 0.00045 + rng() * 0.00075;
    const wickCycles = 1 + Math.floor(rng() * 3);

    const yMin = Math.min(pos.entry * 0.955, pos.tp) * 0.995;
    const yMax = Math.max(pos.entry * 1.045, pos.tp) * 1.005;

    return Object.assign({}, pos, {
      peakPrice: pos.tp,
      duration,
      change24,
      realized: realized != null ? realized : -63,
      chartCount,
      liveCandles,
      volatility,
      pnlNoise,
      pnlPoints: pnl.points,
      peakU: pnl.peakU,
      crossU: pnl.crossU,
      structureId,
      priceNoise,
      liveColors,
      riskBars,
      wickNoise,
      wickCycles,
      yMin,
      yMax,
      seed,
      rng
    });
  }

  /* Generate a different pre-history structure for every take. There are
     100 structures: 10 families x 10 deterministic variants. The take deck
     draws them without replacement, so the first 100 recordings are unique. */
  function generateHistory(model, tfInfo, seed, chartNow) {
    const N = model.chartCount;
    const step = tfInfo.step;
    const structureId = clamp(Number(model.structureId) || 0, 0, STRUCTURE_COUNT - 1);
    const variant = Math.floor(structureId / STRUCTURE_FAMILIES.length);
    const rng = mulberry32(
      hashString(`structure|${structureId}|${activeTF}|${N}`)
    );
    const endTime = chartNow - model.liveCandles * step;
    const startTime = endTime - (N - 1) * step;
    const endMult = model.startPrice / model.entry;
    const lowMult = () => randomBetween(rng, 0.963, 0.978);
    const highMult = () => randomBetween(rng, 1.005, 1.022);

    const kind = STRUCTURE_FAMILIES[structureId % STRUCTURE_FAMILIES.length];
    let keys;

    switch (kind) {
      case "downtrend":
        keys = [
          [0, highMult()],
          [0.18, randomBetween(rng, 0.99, 1.004)],
          [0.34, lowMult()],
          [0.52, randomBetween(rng, 0.969, 0.982)],
          [0.7, randomBetween(rng, 0.978, 0.99)],
          [0.86, randomBetween(rng, 0.984, 0.996)],
          [1, endMult]
        ];
        break;
      case "vrecovery":
        keys = [
          [0, randomBetween(rng, 0.968, 0.98)],
          [0.16, lowMult()],
          [0.34, randomBetween(rng, 0.982, 0.996)],
          [0.5, highMult()],
          [0.68, randomBetween(rng, 0.994, 1.006)],
          [0.84, randomBetween(rng, 0.982, 0.994)],
          [1, endMult]
        ];
        break;
      case "range":
        keys = [
          [0, randomBetween(rng, 0.99, 1.004)],
          [0.14, highMult()],
          [0.28, lowMult()],
          [0.42, randomBetween(rng, 1.0, 1.012)],
          [0.55, randomBetween(rng, 0.972, 0.985)],
          [0.68, randomBetween(rng, 1.0, 1.01)],
          [0.82, randomBetween(rng, 0.98, 0.992)],
          [1, endMult]
        ];
        break;
      case "retest":
        keys = [
          [0, randomBetween(rng, 0.97, 0.984)],
          [0.2, randomBetween(rng, 0.983, 0.996)],
          [0.4, highMult()],
          [0.58, randomBetween(rng, 0.997, 1.004)],
          [0.74, randomBetween(rng, 0.986, 0.998)],
          [0.9, randomBetween(rng, 0.99, 1.0)],
          [1, endMult]
        ];
        break;
      case "doublebottom":
        keys = [
          [0, randomBetween(rng, 0.996, 1.008)],
          [0.12, randomBetween(rng, 0.983, 0.994)],
          [0.26, lowMult()],
          [0.38, randomBetween(rng, 0.982, 0.994)],
          [0.5, randomBetween(rng, 0.965, 0.978)],
          [0.62, randomBetween(rng, 0.982, 0.994)],
          [0.78, randomBetween(rng, 0.992, 1.004)],
          [1, endMult]
        ];
        break;
      case "doubletop":
        keys = [
          [0, randomBetween(rng, 1.0, 1.012)],
          [0.14, randomBetween(rng, 0.988, 1.002)],
          [0.28, highMult()],
          [0.42, randomBetween(rng, 0.976, 0.99)],
          [0.58, randomBetween(rng, 0.992, 1.006)],
          [0.74, randomBetween(rng, 0.964, 0.98)],
          [0.88, randomBetween(rng, 0.976, 0.99)],
          [1, endMult]
        ];
        break;
      case "breakout":
        keys = [
          [0, randomBetween(rng, 0.982, 0.996)],
          [0.24, randomBetween(rng, 0.986, 1.0)],
          [0.48, randomBetween(rng, 0.988, 1.002)],
          [0.64, highMult()],
          [0.8, randomBetween(rng, 0.998, 1.012)],
          [1, endMult]
        ];
        break;
      case "breakdown":
        keys = [
          [0, randomBetween(rng, 1.004, 1.018)],
          [0.24, randomBetween(rng, 0.996, 1.008)],
          [0.48, randomBetween(rng, 0.99, 1.002)],
          [0.64, lowMult()],
          [0.8, randomBetween(rng, 0.984, 0.996)],
          [1, endMult]
        ];
        break;
      case "staircase":
        keys = [
          [0, randomBetween(rng, 0.968, 0.982)],
          [0.15, randomBetween(rng, 0.974, 0.988)],
          [0.3, randomBetween(rng, 0.984, 0.996)],
          [0.45, randomBetween(rng, 0.978, 0.99)],
          [0.6, randomBetween(rng, 0.99, 1.002)],
          [0.75, randomBetween(rng, 0.984, 0.996)],
          [0.9, randomBetween(rng, 0.998, 1.012)],
          [1, endMult]
        ];
        break;
      default:
        keys = [
          [0, randomBetween(rng, 0.968, 0.98)],
          [0.2, randomBetween(rng, 0.974, 0.986)],
          [0.4, randomBetween(rng, 0.982, 0.994)],
          [0.6, randomBetween(rng, 0.978, 0.99)],
          [0.8, randomBetween(rng, 0.988, 0.998)],
          [1, endMult]
        ];
    }

    // Each of the ten variants gets its own timing/amplitude bias, then the
    // keyframes are jittered so the structure is still individually random.
    const variantBias = (variant - 4.5) * 0.0012;
    for (let i = 1; i < keys.length - 1; i++) {
      keys[i][0] = clamp(
        keys[i][0] + (variant - 4.5) * 0.002 + (rng() - 0.5) * 0.035,
        keys[i - 1][0] + 0.02,
        0.95
      );
      keys[i][1] += variantBias * (0.7 + rng() * 0.6);
    }
    keys[keys.length - 1][0] = 1;

    const pathAt = (n) => {
      for (let i = 1; i < keys.length; i++) {
        if (n <= keys[i][0]) {
          const [x0, y0] = keys[i - 1];
          const [x1, y1] = keys[i];
          const t = (n - x0) / (x1 - x0 || 1);
          return y0 + (y1 - y0) * t;
        }
      }
      return keys[keys.length - 1][1];
    };

    const candles = [];
    let prevClose = model.entry * (keys[0][1] + (rng() - 0.5) * model.volatility);

    for (let i = 0; i < N; i++) {
      const n = i / (N - 1);
      const noise = (rng() - 0.5) * model.volatility * 2.0;
      const micro = (rng() - 0.5) * (model.priceNoise || 0.003) * 0.55;
      const variantWave =
        Math.sin(n * Math.PI * (2.2 + variant * 0.43) + variant * 1.7) *
        (0.0016 + variant * 0.00012);
      let close = model.entry * (pathAt(n) + noise + micro + variantWave);
      if (i === N - 1) close = model.startPrice;

      const open = prevClose;
      const wickUp = model.entry * (0.00025 + rng() * model.volatility * 1.2);
      const wickDn = model.entry * (0.00025 + rng() * model.volatility * 1.2);
      let high = Math.max(open, close) + wickUp;
      let low = Math.min(open, close) - wickDn;

      const t = startTime + i * step;
      candles.push({
        o: open,
        h: high,
        l: low,
        c: close,
        t,
        label: formatAxisTime(t)
      });
      prevClose = close;
    }

    // Entry marker: place it in the left third of the visible history so the
    // recording looks like a position opened much earlier, with the progress
    // after entry occupying most of the chart. The small search picks the
    // candle closest to the entry price inside that early window.
    const entryFloor = Math.ceil(model.liveCandles * 1.05) + 1;
    const entryTarget = Math.floor(N * randomBetween(rng, 0.28, 0.36));
    let entryIndex = clamp(entryTarget, entryFloor, N - 6);
    let best = Infinity;
    const from = Math.max(entryFloor, entryIndex - 3);
    const to = Math.min(N - 3, entryIndex + 3);
    for (let i = from; i <= to; i++) {
      const d = Math.abs(candles[i].c - model.entry);
      if (d < best) {
        best = d;
        entryIndex = i;
      }
    }

    return { candles, entryIndex };
  }

  /* ======================================================================
     DOM refs
     ====================================================================== */

  const stage = $("#stage");
  const appEl = $("#app");
  const studioEl = $("#studio");
  const chartCanvas = $("#chartCanvas");
  const countdownEl = $("#countdown");
  const countdownNum = $("#countdownNum");
  const exitHotspot = $("#exitHotspot");

  const el = {
    symbolTitle: $("#symbolTitle"),
    change24h: $("#change24h"),
    instName: $("#instName"),
    crossLabel: $("#crossLabel"),
    riskMeter: $("#riskMeter"),
    pnlValue: $("#pnlValue"),
    roiValue: $("#roiValue"),
    sizeValue: $("#sizeValue"),
    marginValue: $("#marginValue"),
    marginRatioValue: $("#marginRatioValue"),
    entryValue: $("#entryValue"),
    markValue: $("#markValue"),
    liqValue: $("#liqValue"),
    realizedValue: $("#realizedValue"),
    tfBar: $("#tfBar"),
    accountList: $("#accountList"),
    startBtn: $("#startBtn"),
    startTicker: $("#startTicker"),
    doneCount: $("#doneCount"),
    doneBar: $("#doneBar"),
    todayLabel: $("#todayLabel"),
    editModal: $("#editModal"),
    settingsModal: $("#settingsModal"),
    howModal: $("#howModal"),
    editTitle: $("#editTitle"),
    fSymbol: $("#fSymbol"),
    fProfit: $("#fProfit"),
    fMargin: $("#fMargin"),
    fDirection: $("#fDirection"),
    fMarginMode: $("#fMarginMode"),
    fLeverage: $("#fLeverage"),
    fDuration: $("#fDuration"),
    fEntry: $("#fEntry"),
    fStartLoss: $("#fStartLoss"),
    fRealized: $("#fRealized"),
    fChange: $("#fChange"),
    toast: $("#toast"),
    setLoop: $("#setLoop"),
    setVary: $("#setVary"),
    setCountdown: $("#setCountdown"),
    langSelect: $("#langSelect")
  };

  /* ======================================================================
     Runtime state
     ====================================================================== */

  let chart = null;
  let phase = "studio"; // studio | countdown | running | done
  let model = null;
  let sim = null;
  let currentStructureId = null;
  let rafId = null;
  let elapsed = 0;
  let holdMs = 0;
  let lastFrameTs = 0;
  let lastPaint = 0;
  let cycle = 0;
  let wakeLock = null;
  let countdownTimeout = null;
  let countdownResolve = null;
  let editingId = null;
  let sessionPreset = null;
  let toastTimeout = null;
  let exitTimer = null;
  let exitFired = false;

  const lastPaintCache = {};

  /* ======================================================================
     Simulation setup / update
     ====================================================================== */

  function setupTake(seed, options) {
    const preset = getSelected();
    const opts = options || {};
    let structureId;
    if (opts.nextStructure) {
      structureId = drawStructureId();
    } else if (Number.isInteger(opts.structure)) {
      structureId = clamp(opts.structure, 0, STRUCTURE_COUNT - 1);
    } else if (currentStructureId != null) {
      structureId = currentStructureId;
    } else {
      structureId =
        Number.isInteger(state.structureLast) && state.structureLast >= 0
          ? state.structureLast
          : 0;
    }
    currentStructureId = structureId;
    model = buildModel(preset, seed >>> 0, structureId);

    const tfInfo = TF[activeTF] || TF["1m"];
    const history = generateHistory(model, tfInfo, model.seed, nextChartTime());

    sim = {
      N: model.chartCount,
      step: tfInfo.step,
      tf: activeTF,
      candles: history.candles,
      entryInitIndex: history.entryIndex,
      candleEvery: (model.duration * 1000) / model.liveCandles,
      nextRollAt: (model.duration * 1000) / model.liveCandles,
      livePlan: null,
      liveIndex: 0,
      values: null,
      chartPnl: 0
    };

    // First live candle, continuous with the end of the history.
    beginLiveCandle(model.startPrice, 0, 0);

    updateFrame(0, 0, true);
    paintPanel(sim.values);
    chart.setFrame(makeFrame());

    // Static header bits
    el.symbolTitle.textContent = model.symbol;
    el.instName.textContent = model.symbol;
    el.crossLabel.textContent = `${t(
      model.marginMode === "Isolated" ? "isolated" : "cross"
    )} ${model.leverage}X`;
    updatePositionBadge(model.direction);
    updateRiskMeter(model.direction, model.riskBars);
    el.realizedValue.textContent = String(Math.round(model.realized * 100) / 100);
    el.entryValue.textContent = formatNum(model.entry, model.priceDec);

    if (new URLSearchParams(location.search).get("debug") === "1") {
      window.__reelDebug = {
        model,
        sim,
        structureId: model.structureId,
        drawStructure: drawStructureId,
        renderStructure: (id) => setupTake(freshSeed(), { structure: id })
      };
    }
  }

  function planLiveCandle(open, index, uStart, uNext) {
    const frac = pnlFraction(uNext, model);
    const macroPnl = model.profit * frac;
    const macroClose = model.entry + (model.dirSign * macroPnl) / model.qty;

    if (uNext >= model.peakU - 0.0005) {
      return {
        open,
        close: model.tp,
        color: model.tp >= open ? "G" : "R",
        phase: model.rng() * Math.PI * 2,
        peak: true
      };
    }

    const color = model.liveColors[index % model.liveColors.length];
    const jitter = (model.rng() - 0.5) * model.entry * 0.0011;
    let close = macroClose + jitter;
    const minBody = model.entry * (0.0007 + model.rng() * 0.0014);
    if (color === "G") close = Math.max(close, open + minBody);
    else close = Math.min(close, open - minBody);

    // The opening candle sequence must stay underwater until the 8-9s turn,
    // even when the smooth PNL curve briefly wiggles above zero early.
    const crosses = uStart < model.crossU && uNext > model.crossU;
    const beforeCross = !crosses && uNext <= model.crossU + 1e-9;
    if (beforeCross) {
      if (model.dirSign > 0) close = Math.min(close, model.entry - minBody);
      else close = Math.max(close, model.entry + minBody);
    }

    // The candle that contains the turn is pinned so it trades through entry
    // at the crossing time and finishes far enough on the profit side to be
    // visibly green (or red for shorts) by the 9-second mark.
    if (crosses) {
      const crossBuffer = Math.max(minBody, model.entry * 0.0011);
      if (color === "G") close = Math.max(close, model.entry + crossBuffer);
      else close = Math.min(close, model.entry - crossBuffer);
    }

    return {
      open,
      close,
      color,
      phase: model.rng() * Math.PI * 2,
      peak: false,
      crosses,
      crossU: crosses ? model.crossU : null
    };
  }

  function beginLiveCandle(open, startMs, index) {
    const durationMs = model.duration * 1000;
    const uStart = startMs / durationMs;
    const uNext = Math.min(1, (startMs + sim.candleEvery) / durationMs);
    const plan = planLiveCandle(open, index, uStart, uNext);
    plan.startMs = startMs;
    plan.endMs = startMs + sim.candleEvery;
    plan.index = index;
    sim.livePlan = plan;
    sim.liveIndex = index;

    const last = sim.candles[sim.candles.length - 1];
    const t = last ? last.t + sim.step : Date.now();
    sim.candles.push({
      o: open,
      h: open,
      l: open,
      c: open,
      t,
      label: formatAxisTime(t)
    });
  }

  function updateFrame(u, dt, initial) {
    if (!model || !sim) return;
    const durationMs = model.duration * 1000;

    // Freeze completed candles, then plan the next one. Each plan gets an
    // explicit colour and is forced onto that side of its open, which gives a
    // realistic mixed sequence (3 green / 1 red etc.) inside the macro path.
    if (!initial) {
      while (elapsed >= sim.nextRollAt && sim.nextRollAt < durationMs - 1) {
        const live = sim.candles[sim.candles.length - 1];
        const plan = sim.livePlan;
        if (live && plan) {
          live.c = plan.close;
          live.h = Math.max(live.h, plan.close);
          live.l = Math.min(live.l, plan.close);
        }
        sim.nextRollAt += sim.candleEvery;
        beginLiveCandle(
          plan ? plan.close : model.startPrice,
          sim.nextRollAt - sim.candleEvery,
          sim.liveIndex + 1
        );
      }
    }

    // The forming candle runs from its open toward its planned close with a
    // small intrabar wiggle. The plan's colour controls the finished candle.
    const plan = sim.livePlan;
    const live = sim.candles[sim.candles.length - 1];
    let price = model.entry;

    if (plan && live) {
      if (u >= model.peakU) {
        price = model.tp;
      } else {
        let from = plan.open;
        let to = plan.close;
        let segStart = plan.startMs;
        let segEnd = plan.endMs;

        if (plan.crossU != null) {
          const crossMs = plan.crossU * durationMs;
          if (elapsed <= crossMs) {
            to = model.entry;
            segEnd = crossMs;
          } else {
            from = model.entry;
            segStart = crossMs;
          }
        }

        const span = Math.max(1, segEnd - segStart);
        const p = clamp((elapsed - segStart) / span, 0, 1);
        if (p >= 1) {
          price = to;
        } else {
          const eased = p * p * (3 - 2 * p);
          const wiggle =
            model.entry *
            model.wickNoise *
            Math.sin(p * Math.PI * 2 * model.wickCycles + plan.phase) *
            Math.sin(p * Math.PI);
          price = from + (to - from) * eased + wiggle;
        }

        // Do not let the intrabar wiggle cross entry early or flip back
        // underwater inside the turn candle.
        if (plan.crossU != null) {
          const crossMs = plan.crossU * durationMs;
          if (elapsed < crossMs) {
            price =
              model.dirSign > 0
                ? Math.min(price, model.entry)
                : Math.max(price, model.entry);
          } else {
            price =
              model.dirSign > 0
                ? Math.max(price, model.entry)
                : Math.min(price, model.entry);
          }
        }
      }
      live.c = price;
      live.h = Math.max(live.h, price);
      live.l = Math.min(live.l, price);
    }

    const pnl = model.dirSign * model.qty * (price - model.entry);
    const chartPnl = pnl;
    const size = model.qty * price;
    const margin = model.margin;
    const roi = margin > 0 ? (pnl / margin) * 100 : 0;

    // Auto-scale like the real chart: fit the visible candles, always keeping
    // the entry line on screen, and ease between scales so it doesn't jitter.
    const visible = sim.candles.slice(-sim.N);
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < visible.length; i++) {
      if (visible[i].l < lo) lo = visible[i].l;
      if (visible[i].h > hi) hi = visible[i].h;
    }
    lo = Math.min(lo, model.entry);
    hi = Math.max(hi, model.entry);
    let span = hi - lo;
    const minSpan = model.entry * 0.0075;
    if (span < minSpan) {
      const mid = (hi + lo) / 2;
      lo = mid - minSpan / 2;
      hi = mid + minSpan / 2;
      span = minSpan;
    }
    const targetView = {
      yMin: lo - span * 0.075,
      yMax: hi + span * 0.125
    };
    if (!sim.view || initial) {
      sim.view = { yMin: targetView.yMin, yMax: targetView.yMax };
    } else {
      sim.view.yMin += (targetView.yMin - sim.view.yMin) * 0.16;
      sim.view.yMax += (targetView.yMax - sim.view.yMax) * 0.16;
    }

    const drift = Math.sin(u * 4.4 + (model.seed % 97) * 0.11) * 0.32;
    const change24 = model.change24 + drift * Math.min(1, u * 3);

    const equity = margin + pnl;
    const maintenance = size * model.mmr;
    const marginRatio = equity > 0 ? (maintenance / equity) * 100 : 9999;
    const liq = model.liq;

    sim.values = {
      pnl,
      chartPnl,
      price,
      size,
      margin,
      roi,
      marginRatio,
      liq,
      change24,
      u
    };
    sim.chartPnl = chartPnl;
  }

  function makeFrame() {
    const visible = sim.candles.slice(-sim.N);
    const entryIndex = sim.entryInitIndex - (sim.candles.length - sim.N);
    const v = sim.values;

    return {
      candles: visible,
      entry: model.entry,
      currentPrice: v.price,
      pnl: sim.chartPnl,
      pnlText: formatNum(sim.chartPnl, 2, true),
      pnlLabel: t("pnl"),
      sizeText: formatNum(v.size, 5),
      yMin: sim.view ? sim.view.yMin : model.yMin,
      yMax: sim.view ? sim.view.yMax : model.yMax,
      priceDecimals: model.priceDec,
      direction: model.direction,
      currentPriceText: formatNum(v.price, model.priceDec),
      entryPriceText: formatNum(model.entry, model.priceDec),
      entryIndex
    };
  }

  // Fast-forward the simulation (debug deep links / still frames).
  function seekTo(targetU) {
    if (!model || !sim) return;
    const durationMs = model.duration * 1000;
    const steps = 140;
    elapsed = 0;
    sim.nextRollAt = sim.candleEvery;
    for (let i = 1; i <= steps; i++) {
      const u = (i / steps) * targetU;
      elapsed = u * durationMs;
      updateFrame(u, 0, false);
    }
    elapsed = targetU * durationMs;
    paintPanel(sim.values);
    chart.setFrame(makeFrame());
  }

  /* ======================================================================
     Paint the trading screen
     ====================================================================== */

  function setText(node, text) {
    if (!node) return;
    if (lastPaintCache[node.id] === text) return;
    node.textContent = text;
    lastPaintCache[node.id] = text;
  }

  function paintPanel(v) {
    if (!v) return;
    const pnlPos = v.pnl >= 0;

    setText(el.pnlValue, `${formatNum(v.pnl, 2, true)}`);
    setText(el.roiValue, `${formatNum(v.roi, 2, true)}%`);
    setText(el.sizeValue, formatNum(v.size, 2));
    setText(el.marginValue, formatNum(v.margin, 2));
    setText(el.marginRatioValue, `${formatNum(v.marginRatio, 2)}%`);
    setText(el.markValue, formatNum(v.price, model.markDec));
    setText(el.liqValue, formatNum(v.liq, model.priceDec + 2));
    setText(el.change24h, `${formatNum(v.change24, 2, true)}%`);

    el.pnlValue.classList.toggle("negative", !pnlPos);
    el.roiValue.classList.toggle("negative", v.roi < 0);
    el.change24h.classList.toggle("negative", v.change24 < 0);
  }

  function clearPaintCache() {
    Object.keys(lastPaintCache).forEach((k) => delete lastPaintCache[k]);
  }

  /* ======================================================================
     Take lifecycle
     ====================================================================== */

  function requestFullscreen() {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        const p = document.documentElement.requestFullscreen({ navigationUI: "hide" });
        if (p && p.catch) p.catch(() => {});
      }
    } catch (e) {
      /* not supported */
    }
  }

  function exitFullscreen() {
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        const p = document.exitFullscreen();
        if (p && p.catch) p.catch(() => {});
      }
    } catch (e) {
      /* ignore */
    }
  }

  async function acquireWakeLock() {
    try {
      if ("wakeLock" in navigator && !wakeLock) {
        wakeLock = await navigator.wakeLock.request("screen");
        wakeLock.addEventListener("release", () => {
          wakeLock = null;
        });
      }
    } catch (e) {
      wakeLock = null;
    }
  }

  function releaseWakeLock() {
    try {
      if (wakeLock) wakeLock.release();
    } catch (e) {
      /* ignore */
    }
    wakeLock = null;
  }

  function showCountdown(secs) {
    return new Promise((resolve) => {
      if (!secs || secs <= 0) {
        countdownEl.classList.remove("show");
        resolve();
        return;
      }
      countdownEl.classList.add("show");
      let n = secs;
      countdownNum.textContent = String(n);
      const tick = () => {
        if (phase !== "countdown" && phase !== "studio") {
          resolve();
          return;
        }
        n--;
        if (n <= 0) {
          countdownEl.classList.remove("show");
          resolve();
          return;
        }
        countdownNum.textContent = String(n);
        countdownNum.classList.remove("pop");
        void countdownNum.offsetWidth;
        countdownNum.classList.add("pop");
        try {
          if (navigator.vibrate) navigator.vibrate(6);
        } catch (e) {
          /* ignore */
        }
        countdownTimeout = setTimeout(tick, 1000);
      };
      countdownNum.classList.remove("pop");
      void countdownNum.offsetWidth;
      countdownNum.classList.add("pop");
      countdownTimeout = setTimeout(tick, 1000);
    });
  }

  function cancelCountdown() {
    if (countdownTimeout) clearTimeout(countdownTimeout);
    countdownTimeout = null;
    countdownEl.classList.remove("show");
  }

  function selectPreset(id, rerender) {
    state.selectedId = id;
    sessionPreset = null;
    saveState();
    el.startTicker.textContent = getPresetById(id).symbol;
    if (rerender !== false) renderStudio();
  }

  async function startTake() {
    if (phase === "running" || phase === "countdown") return;
    const preset = getSelected();
    if (!computePosition(preset).valid) {
      showToast(t("toastInvalidSetup"));
      return;
    }
    state.selectedId = preset.id;
    saveState();
    sessionPreset = null;

    phase = "countdown";
    clearPaintCache();
    setupTake(freshSeed(), { nextStructure: true });
    studioEl.classList.add("hidden");
    studioEl.inert = true;
    appEl.inert = false;
    appEl.classList.remove("is-off");
    appEl.setAttribute("aria-hidden", "false");

    const touch = window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    if (touch) requestFullscreen();
    acquireWakeLock();

    const secs = clamp(parseNumber(state.settings.countdown) || 0, 0, 10);
    await showCountdown(secs);
    if (phase !== "countdown") return;

    phase = "running";
    elapsed = 0;
    holdMs = 0;
    lastFrameTs = performance.now();
    lastPaint = 0;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }

  function freshSeed() {
    cycle += 1;
    return (hashString(`${Date.now()}|${cycle}|${Math.random()}`) >>> 0) || 1;
  }

  function makeSeed() {
    cycle += 1;
    if (state.settings.varyEachLoop) {
      return (hashString(`${Date.now()}|${cycle}|${Math.random()}`) >>> 0) || 1;
    }
    return (hashString(`fixed|${state.selectedId}`) >>> 0) || 1;
  }

  function beginCycle() {
    phase = "running";
    clearPaintCache();
    setupTake(makeSeed(), { nextStructure: true });
    elapsed = 0;
    holdMs = 0;
    lastPaint = 0;
    lastFrameTs = performance.now();
    sim.nextRollAt = sim.candleEvery;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(tick);
  }

  function tick(now) {
    if (phase !== "running" || !model || !sim) return;
    const dt = Math.min(Math.max(now - lastFrameTs, 0), 120);
    lastFrameTs = now;
    elapsed += dt;

    const durationMs = model.duration * 1000;
    const u = Math.min(elapsed / durationMs, 1);
    updateFrame(u, dt, false);

    if (now - lastPaint > 65) {
      paintPanel(sim.values);
      lastPaint = now;
    }
    chart.setFrame(makeFrame());

    if (elapsed >= durationMs) {
      holdMs += dt;
      if (holdMs >= 1750) {
        if (state.settings.loop) {
          beginCycle();
          return;
        }
        phase = "done";
        return;
      }
    }
    rafId = requestAnimationFrame(tick);
  }

  function returnToStudio() {
    if (phase === "studio") return;
    phase = "studio";
    cancelCountdown();
    cancelAnimationFrame(rafId);
    releaseWakeLock();
    exitFullscreen();
    appEl.setAttribute("aria-hidden", "true");
    appEl.inert = true;
    studioEl.classList.remove("hidden");
    studioEl.inert = false;
    appEl.classList.add("is-off");
    renderStudio();
    try {
      if (navigator.vibrate) navigator.vibrate(18);
    } catch (e) {
      /* ignore */
    }
  }

  /* ======================================================================
     Studio rendering
     ====================================================================== */

  function renderStudio() {
    el.todayLabel.textContent = todayLabel();
    el.accountList.innerHTML = "";

    state.presets.forEach((p, i) => {
      const done = isDoneToday(p.id);
      const card = document.createElement("div");
      card.className = "account-card" + (p.id === state.selectedId ? " selected" : "");
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.dataset.id = String(p.id);

      const main = document.createElement("div");
      main.className = "account-main";
      const short = p.direction === "short";
      main.innerHTML = `
        <span class="account-symbol">${normalizeSymbol(p.symbol)}</span>
        <span class="account-sub ${short ? "short" : ""}">${t(short ? "short" : "long")} · ${t("pnlUsdt")}</span>
      `;

      const num = document.createElement("span");
      num.className = "account-index";
      num.textContent = pad2(i + 1);

      const profit = document.createElement("span");
      profit.className = "account-profit";
      profit.textContent = formatNum(parseNumber(p.profit) || 0, 2, true);

      const actions = document.createElement("div");
      actions.className = "account-actions";

      const editBtn = document.createElement("button");
      editBtn.type = "button";
      editBtn.className = "icon-round";
      editBtn.setAttribute("aria-label", `Edit ${p.symbol}`);
      editBtn.innerHTML = `<svg><use href="#i-pencil"/></svg>`;
      editBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openEdit(p.id);
      });

      const doneBtn = document.createElement("button");
      doneBtn.type = "button";
      doneBtn.className = "done-btn" + (done ? " done" : "");
      doneBtn.setAttribute("aria-label", `Mark ${p.symbol} recorded today`);
      doneBtn.innerHTML = `<svg><use href="#i-check"/></svg>`;
      doneBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleDone(p.id);
      });

      actions.appendChild(editBtn);
      actions.appendChild(doneBtn);
      card.appendChild(num);
      card.appendChild(main);
      card.appendChild(profit);
      card.appendChild(actions);

      card.addEventListener("click", () => selectPreset(p.id));
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectPreset(p.id);
        }
      });

      el.accountList.appendChild(card);
    });

    const selected = getSelected();
    el.startTicker.textContent = normalizeSymbol(selected.symbol);

    const pos = computePosition(selected);
    const setSummary = (id, text) => {
      const node = document.getElementById(id);
      if (node) node.textContent = text;
    };
    setSummary("tsEntry", formatNum(pos.entry, pos.priceDec));
    setSummary("tsMargin", formatNum(pos.margin, 2));
    setSummary("tsLev", `${pos.leverage}×`);
    setSummary("tsTp", pos.valid ? formatNum(pos.tp, pos.markDec) : "—");

    updateProgress();
  }

  function updateProgress() {
    const done = state.presets.filter((p) => isDoneToday(p.id)).length;
    el.doneCount.textContent = `${done} / ${state.presets.length}`;
    el.doneBar.style.width = `${(done / Math.max(1, state.presets.length)) * 100}%`;
  }

  function toggleDone(id) {
    if (isDoneToday(id)) delete state.checks[id];
    else state.checks[id] = todayISO();
    saveState();
    renderStudio();
  }

  /* ======================================================================
     Edit / settings / how-to
     ====================================================================== */

  function openModal(modal) {
    closeAllModals();
    modal.hidden = false;
  }

  function closeAllModals() {
    [el.editModal, el.settingsModal, el.howModal].forEach((m) => {
      if (m) m.hidden = true;
    });
  }

  function formatQuantity(n, symbol) {
    const abs = Math.abs(n);
    const dec = abs >= 100000 ? 0 : abs >= 1000 ? 2 : abs >= 1 ? 4 : 6;
    return `${formatNum(n, dec)} ${baseAsset(symbol)}`;
  }

  function syncEntryForSymbol() {
    if (!editingId) return;
    const p = getPresetById(editingId);
    if (!p) return;
    if (normalizeSymbol(el.fSymbol.value) === normalizeSymbol(p.symbol)) return;
    const oldEntry = parseNumber(p.entryPrice);
    const current = parseNumber(el.fEntry.value);
    if (oldEntry != null && current != null && Math.abs(oldEntry - current) < 1e-12) {
      el.fEntry.value = "";
    }
  }

  function editFormPreset() {
    const round2 = (v) => (v == null ? null : Math.round(v * 100) / 100);
    return {
      symbol: el.fSymbol.value,
      profit: round2(parseNumber(el.fProfit.value)),
      margin: round2(parseNumber(el.fMargin.value)),
      leverage: parseNumber(el.fLeverage.value),
      direction: el.fDirection.value,
      marginMode: el.fMarginMode.value,
      entryPrice: parseNumber(el.fEntry.value),
      startLossPct: parseNumber(el.fStartLoss.value),
      duration: parseNumber(el.fDuration.value)
    };
  }

  function updateSetupPreview() {
    if (!el.editModal || el.editModal.hidden) return;
    const pos = computePosition(editFormPreset());
    const set = (id, text) => {
      const node = document.getElementById(id);
      if (node) node.textContent = text;
    };
    const ok = pos.valid;
    set("pvNotional", formatNum(pos.notional, 2));
    set("pvQty", formatQuantity(pos.qty, pos.symbol));
    set("pvTp", ok ? formatNum(pos.tp, pos.markDec) : "—");
    set("pvPeak", formatNum(pos.profit, 2, true));
    set("pvRoi", ok ? `${formatNum(pos.roiAtTp, 2, true)}%` : "—");
    set("pvSize", ok ? formatNum(pos.sizeAtTp, 2) : "—");
    set("pvRatio", ok ? `${formatNum(pos.marginRatioAtTp, 2)}%` : "—");
    set("pvLiq", ok ? formatNum(pos.liq, pos.markDec) : "—");
    set("pvStartPnl", formatNum(pos.startPnl, 2, true));
    set("pvStartPrice", ok ? formatNum(pos.startPrice, pos.markDec) : "—");
  }

  function openEdit(id) {
    const p = getPresetById(id);
    if (!p) return;
    editingId = id;
    el.editTitle.textContent = t("editAccount", { symbol: normalizeSymbol(p.symbol) });
    el.fSymbol.value = p.symbol || "";
    el.fProfit.value = p.profit != null ? String(p.profit) : "";
    el.fDirection.value = p.direction === "short" ? "short" : "long";
    el.fMarginMode.value = p.marginMode === "Isolated" ? "Isolated" : "Cross";
    el.fLeverage.value = String(p.leverage || 20);
    el.fMargin.value = p.margin != null ? String(p.margin) : "7500";
    el.fDuration.value = String(p.duration || 60);
    el.fEntry.value = p.entryPrice != null ? String(p.entryPrice) : "";
    el.fStartLoss.value = p.startLossPct != null ? String(p.startLossPct) : "14.5";
    el.fRealized.value = p.realizedPnl != null ? String(p.realizedPnl) : "-63";
    el.fChange.value = p.change24h != null && p.change24h !== "" ? String(p.change24h) : "";
    openModal(el.editModal);
    renderCoinPicker(p.symbol);
    updateSetupPreview();
  }

  function saveEdit() {
    const p = getPresetById(editingId);
    if (!p) return;

    const symbol = normalizeSymbol(el.fSymbol.value);
    const profit = parseNumber(el.fProfit.value);
    if (profit == null || profit <= 0) {
      showToast(t("toastProfit"));
      el.fProfit.focus();
      return;
    }
    const margin = parseNumber(el.fMargin.value);
    if (margin == null || margin <= 0) {
      showToast(t("toastMargin"));
      el.fMargin.focus();
      return;
    }

    const previousSymbol = normalizeSymbol(p.symbol);
    const symbolChanged = symbol !== previousSymbol;
    const entry = parseNumber(el.fEntry.value);
    let entryOverride = entry && entry > 0 ? entry : null;
    if (
      symbolChanged &&
      entryOverride != null &&
      p.entryPrice != null &&
      Math.abs(entryOverride - Number(p.entryPrice)) < 1e-12
    ) {
      entryOverride = null;
    }

    const startLoss = parseNumber(el.fStartLoss.value);
    const realized = parseNumber(el.fRealized.value);
    const change = parseNumber(el.fChange.value);

    const next = Object.assign({}, p, {
      symbol,
      profit: Math.round(profit * 100) / 100,
      margin: Math.round(margin * 100) / 100,
      direction: el.fDirection.value === "short" ? "short" : "long",
      marginMode: el.fMarginMode.value === "Isolated" ? "Isolated" : "Cross",
      leverage: clamp(Math.round(parseNumber(el.fLeverage.value) || 20), 2, 125),
      duration: clamp(parseNumber(el.fDuration.value) || 60, 4, 60),
      entryPrice: entryOverride,
      startLossPct: startLoss != null ? clamp(startLoss, 0, 90) : 14.5,
      realizedPnl: realized != null ? realized : -63,
      change24h: change != null ? change : null
    });

    if (!computePosition(next).valid) {
      showToast(t("toastInvalidSetup"));
      return;
    }

    Object.assign(p, next);
    state.selectedId = p.id;
    saveState();
    closeAllModals();
    renderStudio();
    showToast(t("toastSaved", { symbol }));
  }

  function openSettings() {
    el.setLoop.checked = !!state.settings.loop;
    el.setVary.checked = !!state.settings.varyEachLoop;
    el.setCountdown.value = String(state.settings.countdown ?? 3);
    openModal(el.settingsModal);
  }

  function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add("show");
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => el.toast.classList.remove("show"), 2600);
  }

  /* ======================================================================
     URL parameters / boot
     ====================================================================== */

  function applyUrlConfig() {
    const params = new URLSearchParams(window.location.search);
    if (!params.toString()) return { run: false, hideStudio: false };

    const presetParam = parseNumber(params.get("preset"));
    if (presetParam != null) {
      const found = state.presets.find((p) => p.id === presetParam);
      if (found) state.selectedId = found.id;
    }

    const symbol = params.get("symbol");
    const profit = parseNumber(params.get("profit"));
    const entry = parseNumber(params.get("entry"));
    const leverage = parseNumber(params.get("leverage"));
    const directionParam = params.get("direction");
    const durationParam = parseNumber(params.get("duration"));
    const marginParam = parseNumber(params.get("margin"));

    if (
      symbol ||
      profit != null ||
      entry != null ||
      leverage != null ||
      durationParam != null ||
      marginParam != null ||
      directionParam === "short" ||
      directionParam === "long"
    ) {
      sessionPreset = Object.assign({}, getSelected());
      if (symbol) {
        sessionPreset.symbol = symbol;
        // A symbol override should not carry an old ticker's entry override.
        if (entry == null) sessionPreset.entryPrice = null;
      }
      if (profit != null) sessionPreset.profit = profit;
      if (entry != null) entry > 0 ? (sessionPreset.entryPrice = entry) : (sessionPreset.entryPrice = null);
      if (leverage != null) sessionPreset.leverage = leverage;
      if (durationParam != null) {
        sessionPreset.duration = clamp(durationParam, 4, 60);
      }
      if (marginParam != null) {
        sessionPreset.margin = clamp(marginParam, 1, 1e12);
      }
      if (directionParam === "short" || directionParam === "long") {
        sessionPreset.direction = directionParam;
      }
    }

    if (params.has("countdown")) {
      state.settings.countdown = clamp(parseNumber(params.get("countdown")) || 0, 0, 10);
    }

    const tfParam = params.get("tf");
    if (tfParam && TF[tfParam]) activeTF = tfParam;

    const seedParam = parseNumber(params.get("seed"));

    return {
      run: params.get("run") === "1",
      hideStudio: params.get("studio") === "0",
      freezeAt: params.has("u") ? clamp(parseNumber(params.get("u")) || 0, 0, 1) : null,
      seed: seedParam != null ? seedParam >>> 0 : null
    };
  }

  function bindEvents() {
    el.startBtn.addEventListener("click", startTake);
    window.addEventListener("resize", scheduleUnit);
    window.addEventListener("orientationchange", scheduleUnit);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && phase === "running") acquireWakeLock();
    });

    el.fSymbol.addEventListener("input", () => {
      syncEntryForSymbol();
      renderCoinPicker(el.fSymbol.value);
      updateSetupPreview();
    });
    ["fProfit", "fMargin", "fLeverage", "fEntry", "fStartLoss"].forEach((id) => {
      if (el[id]) el[id].addEventListener("input", updateSetupPreview);
    });
    ["fDirection", "fMarginMode"].forEach((id) => {
      if (el[id]) el[id].addEventListener("change", updateSetupPreview);
    });

    el.langSelect.addEventListener("change", () => {
      state.settings.language = el.langSelect.value;
      saveState();
      applyI18n();
      renderStudio();
    });

    // exit the trading view by holding the top-left corner
    const beginHold = (e) => {
      if (phase === "studio") return;
      exitFired = false;
      if (exitTimer) clearTimeout(exitTimer);
      exitTimer = setTimeout(() => {
        exitFired = true;
        returnToStudio();
      }, 850);
    };
    const cancelHold = () => {
      if (exitTimer) clearTimeout(exitTimer);
      exitTimer = null;
    };
    exitHotspot.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      beginHold(e);
    });
    exitHotspot.addEventListener("pointerup", cancelHold);
    exitHotspot.addEventListener("pointercancel", cancelHold);
    exitHotspot.addEventListener("pointerleave", cancelHold);

    // timeframe tabs
    el.tfBar.addEventListener("click", (e) => {
      const btn = e.target.closest(".tf");
      if (!btn) return;
      const tf = btn.dataset.tf;
      if (!TF[tf]) return;
      $$(".tf", el.tfBar).forEach((b) => b.classList.toggle("active", b === btn));
      activeTF = tf;
      if (phase === "running" || phase === "countdown") {
        cancelCountdown();
        clearPaintCache();
        setupTake(makeSeed());
        elapsed = 0;
        holdMs = 0;
        lastFrameTs = performance.now();
        sim.nextRollAt = sim.candleEvery;
        phase = "running";
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(tick);
      }
    });

    $("#fsBtn").addEventListener("click", () => {
      if (document.fullscreenElement) exitFullscreen();
      else requestFullscreen();
    });

    // studio buttons
    $("#settingsBtn").addEventListener("click", openSettings);
    $("#howBtn").addEventListener("click", () => openModal(el.howModal));
    $("#editClose").addEventListener("click", closeAllModals);
    $("#editCancel").addEventListener("click", closeAllModals);
    $("#editSave").addEventListener("click", saveEdit);
    $("#settingsClose").addEventListener("click", closeAllModals);
    $("#howClose").addEventListener("click", closeAllModals);
    $("#howDone").addEventListener("click", closeAllModals);

    [el.editModal, el.settingsModal, el.howModal].forEach((modal) => {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeAllModals();
      });
    });

    el.setLoop.addEventListener("change", () => {
      state.settings.loop = el.setLoop.checked;
      saveState();
    });
    el.setVary.addEventListener("change", () => {
      state.settings.varyEachLoop = el.setVary.checked;
      saveState();
    });
    el.setCountdown.addEventListener("change", () => {
      state.settings.countdown = clamp(parseNumber(el.setCountdown.value) || 0, 0, 10);
      saveState();
    });

    $("#resetPresetsBtn").addEventListener("click", () => {
      if (!window.confirm("Reset all five accounts to the values in config.js?")) return;
      state.presets = deepCopy(CFG.presets);
      state.selectedId = state.presets[0].id;
      sessionPreset = null;
      saveState();
      closeAllModals();
      renderStudio();
      showToast(t("toastReset"));
    });

    $("#clearChecksBtn").addEventListener("click", () => {
      state.checks = {};
      saveState();
      closeAllModals();
      renderStudio();
      showToast(t("toastCleared"));
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (!el.editModal.hidden || !el.settingsModal.hidden || !el.howModal.hidden) {
          closeAllModals();
        } else if (phase !== "studio") {
          returnToStudio();
        }
        return;
      }
      if (phase === "studio") {
        if (/^[1-5]$/.test(e.key)) {
          const p = state.presets[Number(e.key) - 1];
          if (p) selectPreset(p.id);
        }
        return;
      }
      if (e.key === "r" || e.key === "R") beginCycle();
      if (e.key === "f" || e.key === "F") {
        if (document.fullscreenElement) exitFullscreen();
        else requestFullscreen();
      }
    });

    // tap/click on the app shows nothing extra, but a double tap should not zoom
    document.addEventListener("dblclick", (e) => {
      if (e.target.closest("#app")) e.preventDefault();
    });

    // prevent accidental navigation gestures while recording
    appEl.addEventListener("touchmove", (e) => {
      if (phase !== "studio") e.preventDefault();
    }, { passive: false });
  }

  /* ======================================================================
     Layout unit + boot
     ====================================================================== */

  function updateUnit() {
    const w = stage.clientWidth || window.innerWidth || 390;
    stage.style.setProperty("--u", `${w / 390}px`);
    // Older iOS Safari has no dvh unit; keep the stage on the visible viewport.
    if (!(window.CSS && CSS.supports && CSS.supports("height", "100dvh"))) {
      stage.style.height = `${window.innerHeight}px`;
    }
  }

  let unitRaf = 0;
  function scheduleUnit() {
    cancelAnimationFrame(unitRaf);
    unitRaf = requestAnimationFrame(updateUnit);
  }

  function boot() {
    updateUnit();
    new ResizeObserver(scheduleUnit).observe(stage);

    chart = window.ReelChart.createChart(chartCanvas);
    bindEvents();

    const langParam = new URLSearchParams(location.search).get("lang");
    if (langParam && window.REEL_I18N && window.REEL_I18N[langParam]) {
      state.settings.language = langParam;
    }
    applyI18n();
    renderStudio();

    // iPhone XR / all iOS: in Safari there is no Fullscreen API, so point the
    // user at the Home Screen app (the only chrome-free recording route).
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone =
      window.navigator.standalone === true ||
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches);
    if (isIOS && !standalone) {
      const tip = document.getElementById("deviceTip");
      if (tip) tip.hidden = false;
      stage.classList.add("is-ios");
    }

    // Fill the screen behind the studio so starts are instant.
    setupTake(hashString("preview") >>> 0);
    appEl.classList.add("is-off");
    appEl.inert = true;

    const url = applyUrlConfig();
    renderStudio();

    if (url.run || url.hideStudio || url.freezeAt != null) {
      if (url.hideStudio || url.run || url.freezeAt != null) studioEl.classList.add("hidden");
      const bootSeed =
        url.seed != null
          ? url.seed
          : url.run
            ? freshSeed()
            : (hashString("url-preview") >>> 0);
      setupTake(bootSeed, { nextStructure: !!url.run });
      appEl.classList.remove("is-off");
      appEl.inert = false;
      appEl.setAttribute("aria-hidden", "false");
      studioEl.inert = true;

      // Reflect the URL-selected timeframe in the tab bar.
      $$(".tf", el.tfBar).forEach((b) => b.classList.toggle("active", b.dataset.tf === activeTF));

      if (url.freezeAt != null) {
        clearPaintCache();
        seekTo(url.freezeAt);
        phase = "done";
      } else if (url.run) {
        phase = "running";
        elapsed = 0;
        holdMs = 0;
        lastFrameTs = performance.now();
        lastPaint = 0;
        acquireWakeLock();
        rafId = requestAnimationFrame(tick);
      } else if (url.hideStudio) {
        phase = "done";
      }
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
