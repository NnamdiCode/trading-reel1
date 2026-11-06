# Trading Reel — Binance-style PNL Studio

A faithful, fully offline recreation of the Binance Futures position screen from the
reference clip: live-ticking **PNL**, **ROI**, size, margin, mark price, liquidation
price, the dotted entry line, PNL/size tags, a live candlestick chart, timeframe tabs
and the bottom navigation.

It is built for one job: **making five clean trading videos a day for five accounts**.
Choose an account, tap once, record your screen, and the position moves from a red
start to your exact peak profit, with every figure calculated from the same numbers.

> **Simulation only.** This app is not connected to Binance or any exchange and does not
> place trades. It recreates the trading screen itself — not the social app's surrounding
> video-player chrome — so your recordings stay clean. Binance is a trademark of its
> owner; this project is not affiliated. Label fabricated PNL as simulated/entertainment
> where required, and never use it to mislead people or sell financial advice.

---

## What is included

- **Five account presets** (01–05), each with its own ticker, direction, margin, leverage
  and peak PNL.
- **30 coins** ready in the picker: BTC, ETH, XRP, SOL, POL, NEAR, LIT, ONDO, AAVE, PEPE,
  BNB, DOGE, ADA, TRX, LTC, SUI, APT, ARB, OP, TIA, SEI, JUP, WIF, BONK, RENDER, INJ, STX,
  IMX, ENA and TON. Any other ticker can be typed manually.
- **Long and short** positions with the Binance-style **B / S** badge (no coin artwork).
- The four-bar **risk-profile indicator** beside the Cross/Isolated pill: its active bars
  are green for long and red for short, and more bars light up as leverage/margin risk
  increases.
- Editable **margin** and **leverage**, with Entry, TP, ROI, size, margin ratio and
  liquidation all calculated from the same position.
- **11 interface languages**, including Arabic with RTL layout: English, العربية,
  日本語, 中文, Español, Português, Русский, Italiano, Français, Tiếng Việt and
  Bahasa Indonesia.
- **60-second takes** by default (6–60 s selectable), with the opening 8–10 seconds
  underwater and the trade turning in your favor at the 8–8.8-second mark.
- A freshly generated chart every time: **100 pre-history structures** (10 structural
  families × 10 variants) drawn from a no-repeat deck, plus mixed candle colors and
  motions. The first 100 recordings all get a different structure before the deck
  reshuffles. The exact Home-screen Binance glyph is used both for the nav icon and the
  faint chart watermark.
- Responsive portrait layout for **Android** and **iPhone XR-class screens**, including
  notch/home-indicator safe areas.

---

## Quick start on Android

### Recommended: host it once (2 minutes)

1. Put the `trading-reel` folder online. The easiest options:
   - **Netlify Drop** — open <https://app.netlify.com/drop> and drag the whole folder in.
   - **GitHub Pages** — upload the folder to a repo, then Settings → Pages → deploy from a branch.
2. Open the URL in **Chrome on Android**.
3. Optional: Chrome menu → **Add to Home screen** — the included manifest makes the
   shortcut launch fullscreen in portrait where Chrome supports it.
4. Tap **Start recording**.

Hosting is recommended because browser storage and fullscreen work most reliably over
HTTPS, and you can update the presets from any device.

### Offline alternative

Copy the `trading-reel` folder to your phone (e.g. `Download/trading-reel/`). Open
`index.html` with Chrome (in your file manager choose **Open with → Chrome**), or type
this in Chrome's address bar:

```
file:///sdcard/Download/trading-reel/index.html
```

All files load locally with no internet. If your file manager only previews HTML,
install a file manager that can hand the file to Chrome. Some browsers restrict local
storage on `file://`; in-app edits still work for the session, and hosting avoids the
limitation entirely.

---

## iPhone XR (and other iPhones)

Safari does not allow the page to hide its toolbar with the Fullscreen API. To record a
clean frame:

1. Host the folder (Netlify Drop / GitHub Pages) and open the URL in **Safari**.
2. Tap **Share → Add to Home Screen**.
3. Launch the app **from the new Home Screen icon**. It runs standalone, without Safari's
   toolbar or address bar.
4. In **Settings → Display & Brightness → Auto-Lock**, choose **Never** (or the longest
   option). Safari has no Wake Lock, so the screen would otherwise sleep mid-take.
5. Start **Control Center → Screen Recording**, then tap **Start recording** in the app.
   The included countdown gives you a few seconds to switch back.

The layout is tested at 390 × 844 and at the iPhone XR's 414 × 896 logical resolution,
with safe-area padding for the notch and home indicator. The studio, editor, modals and
chart all scale from the same 390 px reference canvas.

---

## Recording a take (the daily loop)

1. Open the studio.
2. Tap the account card you want (01–05).
3. **Start the screen recorder first** — Android: Quick Settings → Screen record.
   iPhone: Control Center → Screen Recording. Use portrait, 1080 × 2400 or native,
   30 or 60 fps, microphone optional.
4. Tap **Start recording** in the app. It hides the studio, goes fullscreen, shows a
   3-second countdown, then the PNL starts in the red and climbs.
5. Wait for the peak — once the big profit figure reaches your target it holds there
   through the end of the take (plus about 1.75 seconds after the animation ends).
6. Stop the recorder, trim the countdown/tap from the start, and post.
7. Come back: **hold the top-left corner of the trading screen for 1 second**
   (or press `Esc` on a computer).
8. Tap the account's **check circle**. The studio shows `1 / 5` and the checkmarks
   reset automatically the next day.

The take loops by default, so you can record one pass and cut, or leave it running.
Turn **Loop** off in Settings if you want it to stop at the peak.

**Tip:** `Start recording` requests fullscreen on touch devices. If your Android
recorder still captures the status bar, use the recorder's crop option or stop before
pulling down the notification shade.

---

## Editing the five accounts

Tap the **pencil** on any card.

| Field | What it does |
|---|---|
| **Ticker symbol** | Shown everywhere. `SOL` is accepted and becomes `SOLUSDT`. |
| **Peak profit / PNL (USDT)** | The figure the animation climbs to and holds. |
| **Margin (USDT)** | Initial margin. `margin × leverage = entry notional`. |
| **Direction** | Long (`B`) or Short (`S`). |
| **Margin mode** | Cross or Isolated label on the trading screen. |
| **Leverage** | Changes the `Cross 20X` label and every margin/ROI/liq figure. |
| **Take length** | 6–60 s; default 60 s. The peak hold adds ~1.75 s. |
| **Entry price** *(advanced)* | Leave blank for the automatic price for that ticker. |
| **Start below zero %** *(advanced)* | How deep the opening loss is, as a % of the peak PNL. Default 14.5%. |
| **Realized PNL** | The small red figure in the realized row. Default −63. |
| **24h change** | The % under the ticker. Auto if blank. |

The editor shows a **Setup preview** before you save, with the exact values that will be
used on the trading screen:

- entry notional and quantity
- TP / exit price for the selected direction (pre-record only)
- peak PNL and ROI
- size and margin ratio at the peak
- liquidation price
- starting PNL and starting price

The trading screen deliberately does **not** show a “Target” chip or an Exit/TP price.
The peak PNL is displayed as the live PNL. The matching TP is calculated internally and
shown only in the pre-record setup checks (editor preview and studio summary), so the
screen you record stays clean.

### The maths (all margin-driven)

Let `L` be leverage, `M` margin, `E` entry, `P` peak profit and `mmr = 0.005`:

```
notional       = M × L
quantity       = notional / E
peak move      = P / notional
TP (long)      = E + P / quantity
TP (short)     = E − P / quantity
ROI at peak    = P / M × 100%
size           = quantity × mark price
start PNL      = −P × startLossPct / 100
start price    = E + dirSign × start PNL / quantity
liq (long)     = E × (1 − 1/L) / (1 − mmr)
liq (short)    = E × (1 + 1/L) / (1 + mmr)
margin ratio   = size × mmr / (margin + PNL) × 100%
```

The margin stays fixed during the take. Size, PNL, ROI and margin ratio move with mark
price; Entry and Liq. Price are stable for that take. The TP is calculated from the same
numbers but is not displayed on the trading screen; it remains available in the pre-record
setup checks before recording.

### Editing from the file

`js/config.js` contains the five presets with comments. Edit it before deploying, then
use **Settings → Reset accounts to file defaults** in the app. In-app edits are saved in
the browser, so they take priority over the file until you reset.

---

## The five-video workflow

- There are **five cards = five accounts**, with a distinct ticker and target already set.
- Each day, change only the profit (and ticker if wanted), record, and check off the card.
- The `0 / 5` progress and checks are stored per day and reset automatically.
- To get a different-looking take for the next account, keep **Vary each loop** on; every
  run gets a new chart history, a new candle sequence, a new intraday shape and slightly
  different auto values.
- If several accounts should show the same trade, set the same ticker/profit/margin.

Suggested rhythm: record all five takes in one sitting. Start the screen recorder once per
take or keep it running and cut the loops in your editor.

---

## Chart and candle generation

The chart is not a repeating template. Each take generates:

- a fresh pre-history with random swing highs/lows, bodies and wicks;
- a new live sequence whose **colors are planned, not uniformly trend-colored**;
- random wick depth, intrabar wiggle, auto-scale and high/low callouts;
- a seconds-precision time axis anchored to the device clock. Every new take is forced
  at least one second past the previous take's chart clock, so two recordings can never
  show the same chart time while the candles keep their correct timeframe spacing.

Live candles use a trend bias with deliberately inserted counter-candles — for example
three green candles, one red, then another green, with the trend direction following the
selected **Long** or **Short**. In the default 60-second take the first few live candles
always include a counter-candle, so the opening stretch is visibly mixed rather than a
straight run.

For a 60-second take, the opening roughly **8 seconds stays against the entry**, then the
candle that contains the 8–8.8-second mark trades through entry at that moment and closes
on the profit side. Mixed candles continue through the move, so the adverse phase is not
a uniform block of red candles either. The target is reached exactly; the peak candles
hold at the TP price until the take ends.

The 100 structures cover ten families: downtrend, V recovery, range, retest, double
bottom, base, double top, breakout, breakdown and staircase, with ten variants each.
Starting a recording, pressing `R`, or moving to the next loop draws the next unused
structure from a deck saved in local storage. Previews and timeframe changes do not use
up the deck. After all 100 have been used the deck reshuffles, avoiding an immediate
repeat. Turn **Vary each loop** off only when you specifically want a stable seed for the
same account.

A new chart is generated on every loop.

---

## Languages

Use the language selector in the app (or the `lang` URL parameter). The full interface,
studio, editor, setup preview, metric labels, buttons, toasts and help text are translated
into:

`en` English · `ar` العربية (RTL) · `ja` 日本語 · `zh` 中文 · `es` Español ·
`pt` Português · `ru` Русский · `it` Italiano · `fr` Français · `vi` Tiếng Việt ·
`id` Bahasa Indonesia

The trading screen's numeric formatting stays in the Binance-style decimal format for
readability.

---

## Controls

**Studio**

- Tap a card = select it for recording
- Pencil = edit the account
- Circle = mark recorded today
- Settings = loop, vary each loop, countdown, reset accounts
- How to record = the same steps as above

**Trading screen**

- Hold the **top-left corner for 1 second** = return to the studio
- Tap a timeframe (`1s`…`1h`) = redraw the chart on that interval
- Fullscreen icon = toggle fullscreen where supported
- `Esc` = back to studio (desktop)
- `1`–`5` = select an account in the studio, `R` = restart take, `F` = fullscreen

---

## Optional deep links

Useful for shortcuts, embedding, or quick one-off variations:

```
index.html?preset=2
index.html?studio=0&run=1&preset=1&countdown=0
index.html?symbol=PEPEUSDT&profit=25000&leverage=20&margin=5000&direction=long&run=1
index.html?studio=0&preset=1&u=0.95          ← freeze-frame at the peak (thumbnails)
index.html?studio=0&preset=1&tf=5m
index.html?lang=ar&preset=3&run=1
```

- `studio=0` hides the setup screen.
- `run=1` starts the animation immediately.
- `countdown=0` skips the countdown.
- `symbol` / `profit` / `margin` / `leverage` / `direction` / `duration` / `entry`
  override the selected preset for that load only.
- `u=0.95` fast-forwards to 95% of the take and stops — handy for a still/thumbnail.
- `tf=5m` sets the initial chart interval.
- `lang=ar` sets the interface language.

---

## Files

```
trading-reel/
├── index.html            structure and UI
├── css/style.css         all styling (scales from a 390 px reference canvas)
├── js/config.js          ← the five presets and defaults (start here)
├── js/app.js             simulation, studio, presets, checklist, recording flow
├── js/chart.js           canvas candlestick chart, tags, axes, watermark
├── js/i18n.js            11 language dictionaries and RTL handling
├── assets/icons/home.png exact Home glyph shared by nav and chart watermark
├── manifest.webmanifest  home-screen app metadata (fullscreen, portrait)
├── icon-180.png / icon-192.png / icon-512.png
└── README.md
```

No build step, libraries, fonts or network calls. Everything is local.

---

## Notes and troubleshooting

- **Nothing animates?** Tap **Start recording**; opening `index.html` alone shows a still
  frame behind the studio.
- **My config.js edits don't show up?** The browser has saved in-app edits. Use
  **Settings → Reset accounts to file defaults**.
- **Fullscreen / status bar:** Start requests fullscreen on Android. Chrome may show a
  short hint; it fades during the countdown. Trim the first seconds in your editor.
- **iPhone toolbar in the recording:** launch from the Home Screen icon, not a Safari tab.
- **iPhone screen sleeps:** set Auto-Lock to Never; Safari has no Wake Lock.
- **Recording length:** one take is `Take length + ~1.75 s` of peak hold. If Loop is on,
  the next take starts after that; stop before the reset or cut it out.
- **Local file on Android:** if JS/CSS do not load, open the file through Chrome rather
  than an in-app HTML preview, or host the folder.
- **Ticker price looks wrong:** set **Entry price** in Advanced, or add the ticker to
  `priceTable` in `js/config.js`.
- **Storage reset:** Settings → Reset accounts; or clear the site's local storage. The key
  is `reeldesk.v1`.

---

*Built as a content-creation tool. Use it responsibly and disclose simulated results.*
