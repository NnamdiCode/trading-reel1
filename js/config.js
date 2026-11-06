/* ==========================================================================
   TRADING REEL — EDITABLE DEFAULTS
   --------------------------------------------------------------------------
   This is the only file you normally need to touch.

   Each of the 5 presets is one social-media account. You can also edit all
   of these from the setup screen inside the app (recommended on Android /
   iPhone).

   Only two fields really matter:
     symbol  → the futures ticker shown everywhere (e.g. "SOLUSDT")
     profit  → the peak PNL figure in USDT (e.g. 8420.75)

   Everything else (entry price, position size, ROI, liquidation price,
   chart levels, chart shape) is calculated automatically so the numbers
   stay consistent. A new chart structure is generated for every recording.

   Optional overrides per preset:
     direction     "long" or "short"
     leverage      default 20
     margin        initial margin in USDT; notional = margin × leverage
     marginMode    "Cross" or "Isolated"
     entryPrice    leave null to use the built-in price table / auto price
     duration      seconds per take (default 60)
     startLossPct  how far below zero the take starts, as % of the profit
     realizedPnl   the small "Realized PNL" figure
     change24h     the green % under the ticker; null = auto
   ========================================================================== */

window.REEL_CONFIG = {
  appVersion: 3,

  // The coins available in the ticker picker. Binance-style position badges
  // are B (long) / S (short), so no coin artwork is shown on the screen.
  coins: [
    { symbol: "BTC",  name: "Bitcoin",       ticker: "BTCUSDT" },
    { symbol: "ETH",  name: "Ethereum",      ticker: "ETHUSDT" },
    { symbol: "XRP",  name: "XRP",           ticker: "XRPUSDT" },
    { symbol: "SOL",  name: "Solana",        ticker: "SOLUSDT" },
    { symbol: "POL",  name: "Polygon",       ticker: "POLUSDT" },
    { symbol: "NEAR", name: "NEAR Protocol", ticker: "NEARUSDT" },
    { symbol: "LIT",  name: "Litentry",      ticker: "LITUSDT" },
    { symbol: "ONDO", name: "Ondo",          ticker: "ONDOUSDT" },
    { symbol: "AAVE", name: "Aave",          ticker: "AAVEUSDT" },
    { symbol: "PEPE", name: "Pepe",          ticker: "PEPEUSDT" },
    // 5 standard / major pairs
    { symbol: "BNB",  name: "BNB",           ticker: "BNBUSDT" },
    { symbol: "DOGE", name: "Dogecoin",      ticker: "DOGEUSDT" },
    { symbol: "ADA",  name: "Cardano",       ticker: "ADAUSDT" },
    { symbol: "TRX",  name: "TRON",          ticker: "TRXUSDT" },
    { symbol: "LTC",  name: "Litecoin",      ticker: "LTCUSDT" },
    // 15 newer Binance listings
    { symbol: "SUI",  name: "Sui",           ticker: "SUIUSDT" },
    { symbol: "APT",  name: "Aptos",         ticker: "APTUSDT" },
    { symbol: "ARB",  name: "Arbitrum",      ticker: "ARBUSDT" },
    { symbol: "OP",   name: "Optimism",      ticker: "OPUSDT" },
    { symbol: "TIA",  name: "Celestia",      ticker: "TIAUSDT" },
    { symbol: "SEI",  name: "Sei",           ticker: "SEIUSDT" },
    { symbol: "JUP",  name: "Jupiter",       ticker: "JUPUSDT" },
    { symbol: "WIF",  name: "dogwifhat",     ticker: "WIFUSDT" },
    { symbol: "BONK", name: "Bonk",          ticker: "BONKUSDT" },
    { symbol: "RENDER", name: "Render",      ticker: "RENDERUSDT" },
    { symbol: "INJ",  name: "Injective",     ticker: "INJUSDT" },
    { symbol: "STX",  name: "Stacks",        ticker: "STXUSDT" },
    { symbol: "IMX",  name: "Immutable",     ticker: "IMXUSDT" },
    { symbol: "ENA",  name: "Ethena",        ticker: "ENAUSDT" },
    { symbol: "TON",  name: "Toncoin",       ticker: "TONUSDT" }
  ],

  // Initial presets for the five accounts. Edit freely.
  presets: [
    {
      id: 1,
      account: "ACCOUNT 01",
      symbol: "BTCUSDT",
      direction: "long",
      profit: 12601.41,
      leverage: 20,
      margin: 7500,
      marginMode: "Cross",
      entryPrice: null,
      duration: 60,
      startLossPct: 14.5,
      realizedPnl: -63,
      change24h: null
    },
    {
      id: 2,
      account: "ACCOUNT 02",
      symbol: "ETHUSDT",
      direction: "long",
      profit: 8420.75,
      leverage: 20,
      margin: 7500,
      marginMode: "Cross",
      entryPrice: null,
      duration: 60,
      startLossPct: 14.5,
      realizedPnl: -63,
      change24h: null
    },
    {
      id: 3,
      account: "ACCOUNT 03",
      symbol: "SOLUSDT",
      direction: "short",
      profit: 5240.18,
      leverage: 20,
      margin: 7500,
      marginMode: "Cross",
      entryPrice: null,
      duration: 60,
      startLossPct: 14.5,
      realizedPnl: -112,
      change24h: null
    },
    {
      id: 4,
      account: "ACCOUNT 04",
      symbol: "XRPUSDT",
      direction: "long",
      profit: 3180.25,
      leverage: 20,
      margin: 7500,
      marginMode: "Cross",
      entryPrice: null,
      duration: 60,
      startLossPct: 14.5,
      realizedPnl: -63,
      change24h: null
    },
    {
      id: 5,
      account: "ACCOUNT 05",
      symbol: "PEPEUSDT",
      direction: "short",
      profit: 2640.5,
      leverage: 20,
      margin: 7500,
      marginMode: "Cross",
      entryPrice: null,
      duration: 60,
      startLossPct: 14.5,
      realizedPnl: -63,
      change24h: null
    }
  ],

  settings: {
    loop: true,
    varyEachLoop: true,
    countdown: 3,
    language: "en"
  },

  // Used only to seed a realistic entry price when you type a ticker that is
  // not in this list. The exact values are not important — they just need to
  // look plausible on screen.
  priceTable: {
    BTCUSDT: 67245.1,
    ETHUSDT: 3285.4,
    BNBUSDT: 592.4,
    SOLUSDT: 187.35,
    XRPUSDT: 0.5242,
    POLUSDT: 0.4782,
    NEARUSDT: 5.842,
    LITUSDT: 0.8421,
    ONDOUSDT: 1.052,
    AAVEUSDT: 264.8,
    PEPEUSDT: 0.00001084,
    DOGEUSDT: 0.13752,
    ADAUSDT: 0.4512,
    AVAXUSDT: 36.84,
    LINKUSDT: 17.42,
    DOTUSDT: 6.842,
    TRXUSDT: 0.1658,
    SUIUSDT: 3.2654,
    APTUSDT: 8.942,
    SHIBUSDT: 0.0000241,
    WIFUSDT: 2.842,
    BONKUSDT: 0.0000342,
    ICPUSDT: 9.84,
    FILUSDT: 5.263,
    INJUSDT: 24.63,
    SEIUSDT: 0.4421,
    TIAUSDT: 5.84,
    ARBUSDT: 0.8421,
    OPUSDT: 1.842,
    MATICUSDT: 0.4382,
    ENAUSDT: 0.9421,
    JUPUSDT: 0.9842,
    RENDERUSDT: 7.842,
    FETUSDT: 1.842,
    UNIUSDT: 8.942,
    LTCUSDT: 84.2,
    BCHUSDT: 428.4,
    ETCUSDT: 26.84,
    ATOMUSDT: 8.42,
    XLMUSDT: 0.1042,
    ALGOUSDT: 0.1842,
    STXUSDT: 1.842,
    IMXUSDT: 1.942,
    WLDUSDT: 2.842,
    ORDIUSDT: 36.84,
    "1000SATSUSDT": 0.000342,
    "1000PEPEUSDT": 0.01084,
    EGLDUSDT: 32.84,
    HBARUSDT: 0.2124,
    VETUSDT: 0.0421,
    SANDUSDT: 0.3421,
    MANAUSDT: 0.4121,
    GALAUSDT: 0.0242,
    THETAUSDT: 1.42,
    CRVUSDT: 0.3842,
    MKRUSDT: 2842.4,
    SNXUSDT: 2.42,
    COMPUSDT: 62.84,
    ZECUSDT: 32.42,
    DASHUSDT: 28.42,
    EOSUSDT: 0.6842,
    NEOUSDT: 12.84,
    IOTAUSDT: 0.2842,
    QNTUSDT: 92.84,
    GRTUSDT: 0.1842,
    RUNEUSDT: 5.42,
    RNDRUSDT: 7.84,
    API3USDT: 2.42,
    ENSUSDT: 24.84,
    "1INCHUSDT": 0.4421,
    GMTUSDT: 0.1842,
    ARUSDT: 24.84,
    BLURUSDT: 0.2842,
    FLOKIUSDT: 0.0001842,
    BOMEUSDT: 0.00842,
    JTOUSDT: 3.42,
    PYTHUSDT: 0.4421,
    STRKUSDT: 0.5421,
    WUSDT: 0.3421,
    ZKUSDT: 0.1842,
    TONUSDT: 7.42,
    TAOUSDT: 484.2,
    ONTUSDT: 0.2421,
    KAIAUSDT: 0.1842,
    AEROUSDT: 1.42,
    MORPHOUSDT: 2.42,
    POPCATUSDT: 1.062,
    MEWUSDT: 0.00842,
    NOTUSDT: 0.00421,
    DOGSUSDT: 0.0001842,
    HMSTRUSDT: 0.00421,
    CATIUSDT: 0.2842
  }
};
