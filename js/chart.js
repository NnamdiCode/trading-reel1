/* ==========================================================================
   TRADING REEL — chart renderer
   A small canvas implementation of the Binance-style futures chart:
   candles, faint watermark, dotted entry/current lines, PNL & size tags,
   high/low callouts, price axis and time axis.
   ========================================================================== */

(function () {
  "use strict";

  const FONT = '"SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const clampTo = (v, a, b) => Math.max(a, Math.min(b, v));
  const C = {
    up: "#59ba8e",
    down: "#e25162",
    entryLine: "rgba(221, 228, 238, 0.42)",
    currentLine: "rgba(221, 228, 238, 0.18)",
    axis: "#757f8e",
    axisBright: "#c3cad6",
    tagWhite: "#edf1f6",
    tagInk: "#0c0f14",
    entryBorder: "#59ba8e",
    entryTagText: "#82d4b2",
    watermark: "rgba(223, 230, 240, 0.048)",
    grid: "rgba(255, 255, 255, 0.016)",
    pnlInk: "#f7fffb",
    sizeBox: "rgba(19, 23, 31, 0.92)"
  };

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, rr);
    } else {
      ctx.moveTo(x + rr, y);
      ctx.arcTo(x + w, y, x + w, y + h, rr);
      ctx.arcTo(x + w, y + h, x, y + h, rr);
      ctx.arcTo(x, y + h, x, y, rr);
      ctx.arcTo(x, y, x + w, y, rr);
      ctx.closePath();
    }
  }

  function spacedText(ctx, text, x, y, spacing, align) {
    if (!spacing) {
      ctx.textAlign = align || "left";
      ctx.fillText(text, x, y);
      return;
    }
    let total = 0;
    for (const ch of text) total += ctx.measureText(ch).width + spacing;
    total -= spacing;
    let cx = align === "center" ? x - total / 2 : align === "right" ? x - total : x;
    ctx.textAlign = "left";
    for (const ch of text) {
      ctx.fillText(ch, cx, y);
      cx += ctx.measureText(ch).width + spacing;
    }
  }


  function createChart(canvas) {
    const parent = canvas.parentElement;
    const ctx = canvas.getContext("2d");
    let W = 0;
    let H = 0;
    let dpr = 1;
    let frame = null;

    // The chart watermark uses the exact Home glyph from the nav.
    const homeLogo = new Image();
    homeLogo.decoding = "async";
    homeLogo.src = "assets/icons/home.png";
    let homeLogoReady = false;
    let homeLogoTint = null;
    function tintHomeLogo() {
      const S = 128;
      const c = document.createElement("canvas");
      c.width = S;
      c.height = S;
      const g = c.getContext("2d");
      g.drawImage(homeLogo, 0, 0, S, S);
      g.globalCompositeOperation = "source-in";
      g.fillStyle = "#dfe6f0";
      g.fillRect(0, 0, S, S);
      return c;
    }
    homeLogo.onload = () => {
      homeLogoReady = true;
      homeLogoTint = tintHomeLogo();
      draw(true);
    };

    function resize() {
      const rect = parent.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      W = rect.width;
      H = rect.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(true);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(parent);

    function draw(force) {
      if (!frame) {
        ctx.clearRect(0, 0, W, H);
        return;
      }
      const f = frame;
      const N = f.candles.length;
      if (!N) return;

      const axisW = Math.max(58, W * 0.158);
      const plotLeft = 0;
      const plotRight = W - axisW;
      const plotTop = Math.max(6, H * 0.035);
      const timeH = Math.max(17, H * 0.092);
      const plotBottom = H - timeH;
      const plotW = plotRight - plotLeft;
      const plotH = plotBottom - plotTop;
      const slot = plotW / N;
      const bodyW = Math.max(2.3, Math.min(6.4, slot * 0.62));

      const yMin = f.yMin;
      const yMax = f.yMax;
      const yOf = (v) => plotTop + ((yMax - v) / (yMax - yMin || 1)) * plotH;
      const xOf = (i) => plotLeft + slot * (i + 0.5);

      ctx.clearRect(0, 0, W, H);
      ctx.textBaseline = "middle";

      /* ---------------- watermark ---------------- */
      const wmFS = Math.min(W * 0.053, 21);
      const logo = wmFS * 1.42;
      ctx.save();
      ctx.fillStyle = C.watermark;
      ctx.font = `600 ${wmFS}px ${FONT}`;
      const wmText = "BINANCE";
      const spacing = wmFS * 0.14;
      let wmTextW = 0;
      for (const ch of wmText) wmTextW += ctx.measureText(ch).width + spacing;
      wmTextW -= spacing;
      const totalW = logo + wmFS * 0.55 + wmTextW;
      const wmX = plotLeft + plotW / 2 - totalW / 2;
      const wmY = plotTop + plotH * 0.43;
      if (homeLogoReady) {
        if (!homeLogoTint) homeLogoTint = tintHomeLogo();
        ctx.globalAlpha = 0.05;
        ctx.drawImage(homeLogoTint, wmX, wmY - logo / 2, logo, logo);
        ctx.globalAlpha = 1;
      }
      spacedText(ctx, wmText, wmX + logo + wmFS * 0.55, wmY + wmFS * 0.03, spacing, "left");
      ctx.restore();

      /* ---------------- faint horizontal guides ---------------- */
      ctx.save();
      ctx.strokeStyle = C.grid;
      ctx.lineWidth = 1;
      for (let i = 1; i <= 3; i++) {
        const y = plotTop + (plotH * i) / 4;
        ctx.beginPath();
        ctx.moveTo(plotLeft, Math.round(y) + 0.5);
        ctx.lineTo(plotRight, Math.round(y) + 0.5);
        ctx.stroke();
      }
      ctx.restore();

      /* ---------------- candles ---------------- */
      const maxIdx = N - 1;
      let hiIdx = 0;
      let loIdx = 0;
      for (let i = 0; i < N; i++) {
        if (f.candles[i].h > f.candles[hiIdx].h) hiIdx = i;
        if (f.candles[i].l < f.candles[loIdx].l) loIdx = i;
      }

      for (let i = 0; i < N; i++) {
        const c = f.candles[i];
        const up = c.c >= c.o;
        const col = up ? C.up : C.down;
        const x = Math.round(xOf(i)) + 0.5;
        const yO = yOf(c.o);
        const yC = yOf(c.c);
        const yH = yOf(c.h);
        const yL = yOf(c.l);

        ctx.strokeStyle = col;
        ctx.fillStyle = col;
        ctx.lineWidth = i === maxIdx ? 1.3 : 1;

        ctx.beginPath();
        ctx.moveTo(x, yH);
        ctx.lineTo(x, yL);
        ctx.stroke();

        const top = Math.min(yO, yC);
        const h = Math.max(Math.abs(yC - yO), 1);
        ctx.fillRect(Math.round(x - bodyW / 2), Math.round(top), Math.round(bodyW), Math.round(h));
      }

      /* ---------------- entry level ---------------- */
      const yEntry = yOf(f.entry);
      ctx.save();
      ctx.strokeStyle = C.entryLine;
      ctx.lineWidth = 1;
      ctx.setLineDash([1.2, 3]);
      ctx.beginPath();
      ctx.moveTo(plotLeft, Math.round(yEntry) + 0.5);
      ctx.lineTo(plotRight, Math.round(yEntry) + 0.5);
      ctx.stroke();
      ctx.restore();

      /* ---------------- current price level ---------------- */
      const yCurRaw = yOf(f.currentPrice);
      ctx.save();
      ctx.strokeStyle = C.currentLine;
      ctx.lineWidth = 1;
      ctx.setLineDash([1, 3.5]);
      ctx.beginPath();
      ctx.moveTo(plotLeft, Math.round(yCurRaw) + 0.5);
      ctx.lineTo(plotRight, Math.round(yCurRaw) + 0.5);
      ctx.stroke();
      ctx.restore();

      /* ---------------- price axis ---------------- */
      const axisFS = Math.max(9.4, W * 0.0265);
      ctx.font = `450 ${axisFS}px ${FONT}`;
      ctx.fillStyle = C.axis;
      ctx.textAlign = "right";
      const tickFracs = [0.11, 0.37, 0.63, 0.88];
      const priceDec = f.priceDecimals != null ? f.priceDecimals : 5;
      const fmt = (n) =>
        Number(n).toLocaleString("en-US", {
          minimumFractionDigits: priceDec,
          maximumFractionDigits: priceDec
        });
      for (const t of tickFracs) {
        const y = plotTop + plotH * t;
        const price = yMax - (y - plotTop) / plotH * (yMax - yMin);
        ctx.fillText(fmt(price), W - Math.max(3, W * 0.008), y);
      }

      /* ---------------- high / low callouts ---------------- */
      const callFS = Math.max(9.6, W * 0.0275);
      ctx.font = `450 ${callFS}px ${FONT}`;
      ctx.fillStyle = C.axisBright;
      ctx.textAlign = "right";
      ctx.strokeStyle = "rgba(190, 198, 211, 0.52)";
      ctx.lineWidth = 1;

      const hi = f.candles[hiIdx];
      const lo = f.candles[loIdx];
      const hiX = xOf(hiIdx);
      const loX = xOf(loIdx);
      const yHi = yOf(hi.h);
      const yLo = yOf(lo.l);

      const drawCallout = (value, wickX, wickY, above) => {
        if (!Number.isFinite(value)) return;
        const txt = fmt(value);
        const tw = ctx.measureText(txt).width;
        const gap = callFS * 0.9;
        const lineH = callFS * 1.15;

        let baseY = wickY + (above ? -1 : 1) * Math.max(15, plotH * 0.105);
        if (above) baseY = clampTo(baseY, plotTop + lineH / 2 + 1, plotBottom - lineH / 2 - 1);
        else baseY = clampTo(baseY, plotTop + lineH / 2 + 1, plotBottom - lineH / 2 - 1);

        // Keep the plain chart label, but place it on whichever side of the
        // wick has room. The leader then runs from the nearest text edge
        // toward the wick instead of crossing back through the value.
        let labelX = wickX - tw - gap;
        let side = "left";
        let connect = true;
        if (labelX < plotLeft + 2) {
          labelX = wickX + gap;
          side = "right";
          if (labelX + tw > plotRight - 2) {
            if (wickX - plotLeft > plotRight - wickX) {
              labelX = plotLeft + 2;
              side = "left";
            } else {
              labelX = plotRight - tw - 2;
              side = "right";
            }
            connect = false;
          }
        }
        labelX = clampTo(labelX, plotLeft + 2, Math.max(plotLeft + 2, plotRight - tw - 2));

        const edgeX = side === "left" ? labelX + tw + 4 : labelX - 4;
        const wx = clampTo(wickX, plotLeft + 1, plotRight - 1);

        ctx.save();
        ctx.strokeStyle = "rgba(190, 198, 211, 0.52)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        if (connect) {
          ctx.moveTo(edgeX, Math.round(baseY) + 0.5);
          ctx.lineTo(wx, Math.round(baseY) + 0.5);
        }
        ctx.moveTo(Math.round(wx) + 0.5, Math.round(baseY) + 0.5);
        ctx.lineTo(Math.round(wx) + 0.5, Math.round(wickY) + 0.5);
        ctx.stroke();

        ctx.fillStyle = C.axisBright;
        ctx.font = `450 ${callFS}px ${FONT}`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(txt, labelX, baseY + 0.5);
        ctx.restore();
      };

      drawCallout(hi.h, hiX, yHi, true);
      drawCallout(lo.l, loX, yLo, false);

      /* ---------------- entry marker ---------------- */
      if (f.entryIndex != null && f.entryIndex >= 0 && f.entryIndex < N) {
        const mx = xOf(f.entryIndex);
        const my = yEntry + Math.max(15, plotH * 0.10);
        const r = Math.max(6.6, W * 0.0195);
        const isShort = f.direction === "short";
        ctx.save();
        ctx.fillStyle = isShort ? C.down : C.up;
        ctx.beginPath();
        ctx.moveTo(mx, my - r - 4);
        ctx.lineTo(mx + 4, my - r + 1);
        ctx.lineTo(mx - 4, my - r + 1);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.arc(mx, my, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#f3fff9";
        ctx.font = `700 ${r * 1.08}px ${FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(isShort ? "S" : "B", mx, my + r * 0.06);
        ctx.restore();
      }

      /* ---------------- PNL tag on the entry line ---------------- */
      const tagFS = Math.max(9.8, W * 0.027);
      const tagH = tagFS * 1.72;
      const positive = f.pnl >= 0;
      const pillColor = positive ? C.up : C.down;
      const pillText = `${f.pnlLabel || "PNL"} ${f.pnlText}`;
      ctx.font = `500 ${tagFS}px ${FONT}`;
      const pillPad = tagFS * 0.68;
      const pillW = ctx.measureText(pillText).width + pillPad * 2;
      const pillX = -3;
      const pillY = yEntry - tagH / 2;

      ctx.save();
      ctx.fillStyle = pillColor;
      roundRect(ctx, pillX, pillY, pillW + 3, tagH, Math.max(3, tagFS * 0.32));
      ctx.fill();

      ctx.fillStyle = C.pnlInk;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(pillText, pillX + pillPad, yEntry + 0.2);

      const sizeText = f.sizeText;
      const sizePad = tagFS * 0.62;
      const sizeW = ctx.measureText(sizeText).width + sizePad * 2;
      const sizeX = pillX + pillW + tagFS * 0.28;
      const sizeY = yEntry - tagH / 2;

      ctx.fillStyle = C.sizeBox;
      roundRect(ctx, sizeX, sizeY, sizeW, tagH, Math.max(3, tagFS * 0.3));
      ctx.fill();
      ctx.strokeStyle = positive ? "rgba(126, 211, 177, 0.52)" : "rgba(226, 112, 126, 0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = positive ? "#e8f4ee" : "#f4e9eb";
      ctx.fillText(sizeText, sizeX + sizePad, yEntry + 0.2);
      ctx.restore();

      /* ---------------- right-side price tags ---------------- */
      const tagW = axisW - Math.max(4, W * 0.012);
      const tagX = W - tagW - Math.max(2, W * 0.006);
      const smallH = Math.max(15, W * 0.046);
      const smallFS = Math.max(9.6, W * 0.0268);
      const priceString = f.currentPriceText;
      const entryString = f.entryPriceText;

      const drawEntryTag = (yy) => {
        ctx.save();
        ctx.fillStyle = "rgba(31, 35, 46, 0.9)";
        roundRect(ctx, tagX, yy - smallH / 2, tagW, smallH, Math.max(3, W * 0.011));
        ctx.fill();
        ctx.strokeStyle = C.entryBorder;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = C.entryTagText;
        ctx.font = `500 ${smallFS}px ${FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(entryString, tagX + tagW / 2, yy + 0.3);
        ctx.restore();
      };

      const drawCurrentTag = (yy) => {
        ctx.save();
        ctx.fillStyle = C.tagWhite;
        roundRect(ctx, tagX, yy - smallH / 2, tagW, smallH, Math.max(3, W * 0.011));
        ctx.fill();
        ctx.fillStyle = C.tagInk;
        ctx.font = `650 ${smallFS}px ${FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(priceString, tagX + tagW / 2, yy + 0.3);
        ctx.restore();
      };

      // entry tag
      let eTagY = yEntry;
      drawEntryTag(eTagY);

      // current tag, nudged apart if they collide
      let cTagY = yCurRaw;
      const minGap = smallH + 2;
      if (Math.abs(cTagY - eTagY) < minGap) {
        const dir = cTagY >= eTagY ? 1 : -1;
        let target = eTagY + dir * minGap;
        if (target > plotBottom - smallH / 2) target = eTagY - dir * minGap;
        if (target < plotTop + smallH / 2) target = eTagY + dir * minGap;
        cTagY = target;
        ctx.save();
        ctx.strokeStyle = "rgba(220, 227, 237, 0.35)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(tagX - 3, yCurRaw);
        ctx.lineTo(tagX - 2, cTagY);
        ctx.stroke();
        ctx.restore();
      }
      drawCurrentTag(cTagY);

      /* ---------------- time axis ---------------- */
      const timeFS = Math.max(8.1, W * 0.0215);
      ctx.save();
      ctx.font = `450 ${timeFS}px ${FONT}`;
      ctx.fillStyle = "#717b8a";
      ctx.textAlign = "left";
      ctx.textBaseline = "bottom";

      const idxs = [0, Math.floor(N / 3), Math.floor((N * 2) / 3)];
      const used = [];
      for (const i of idxs) {
        const txt = f.candles[i] && f.candles[i].label;
        if (!txt) continue;
        let x = i === 0 ? 3 : xOf(i) - timeFS * 1.2;
        const textW = ctx.measureText(txt).width;
        if (used.some((r) => x < r.end + 5 && x + textW > r.start)) continue;
        if (x + textW > plotRight + axisW) x = plotRight + axisW - textW - 2;
        used.push({ start: x, end: x + textW });
        ctx.fillText(txt, x, H - Math.max(3, H * 0.018));
      }
      ctx.restore();
    }

    return {
      setFrame(f) {
        frame = f;
        draw(false);
      },
      draw,
      resize
    };
  }

  window.ReelChart = { createChart, FONT };
})();
