'use strict';

/* =====================================================================
   CHARTS PAGE  (pages/charts/charts.js)
   =====================================================================
   A live candlestick chart using the Lightweight Charts library
   (loaded by a <script> tag in charts.html, available as window.LightweightCharts).
   Candle HISTORY comes from Yahoo Finance (section 1 below); the candle
   that is still forming is then updated live from TradingView prices.

   Uses from shared scripts:
     core.js  -> State, Q, MAP, Feed, $, icon, UI
     shell.js -> Actions, App, renderRoute
   ===================================================================== */

/* ---------------------------------------------------------------------
   1) TIMEFRAMES + HISTORY (Yahoo Finance, as in chart.js)
   ---------------------------------------------------------------------
   History comes from Yahoo's chart API, e.g.
     https://query1.finance.yahoo.com/v8/finance/chart/EURUSD=X?interval=1m&range=2d
   Yahoo sends no CORS headers, so (as in chart.js) the request goes
   through a CORS proxy - proxy.cors.dev first, then a fallback proxy,
   then direct. Each app timeframe maps to the closest Yahoo interval;
   Yahoo has no 4-hour bars, so H4 groups four 1-hour candles.
   The still-forming candle is then kept live by TradingView (see mount).
   --------------------------------------------------------------------- */
const TF = { M1:60, M5:300, M15:900, M30:1800, H1:3600, H4:14400, D1:86400 }; // timeframe -> seconds per candle
const YAHOO_TF = {                                    // timeframe -> how to ask Yahoo for it
  M1:  { interval: '1m',  range: '2d'  },             // the interval/range used in chart.js
  M5:  { interval: '5m',  range: '5d'  },
  M15: { interval: '15m', range: '1mo' },
  M30: { interval: '30m', range: '1mo' },
  H1:  { interval: '60m', range: '3mo' },
  H4:  { interval: '60m', range: '6mo', group: 4 },   // no Yahoo 4h interval: group 1h candles
  D1:  { interval: '1d',  range: '2y'  }
};

// Turn one Yahoo chart response into clean Lightweight Charts candles:
// drop half-empty bars, sort by time, remove duplicate times, group
// (H4 only), round to the symbol's decimals, and stitch each open to
// the previous close (as chart.js does) so there are no artificial gaps.
function yahooToCandles(json, digits, group = 1, tfSec = 60) {
  const result = json && json.chart && json.chart.result && json.chart.result[0];
  if (!result || !Array.isArray(result.timestamp) || !result.indicators || !result.indicators.quote || !result.indicators.quote[0]) return [];
  const quote = result.indicators.quote[0];
  let rows = result.timestamp
    .map((time, i) => ({ time, open: quote.open && quote.open[i], high: quote.high && quote.high[i], low: quote.low && quote.low[i], close: quote.close && quote.close[i] }))
    .filter(c => [c.time, c.open, c.high, c.low, c.close].every(Number.isFinite))
    .sort((a, b) => a.time - b.time);
  rows = rows.filter((c, i) => i === 0 || c.time > rows[i - 1].time);   // strictly increasing times (library requirement)
  if (group > 1) {                                                      // e.g. four 1h candles -> one H4 candle
    const grouped = [];
    for (const c of rows) {
      const t = Math.floor(c.time / tfSec) * tfSec;
      const last = grouped[grouped.length - 1];
      if (last && last.time === t) { last.high = Math.max(last.high, c.high); last.low = Math.min(last.low, c.low); last.close = c.close; }
      else grouped.push({ time: t, open: c.open, high: c.high, low: c.low, close: c.close });
    }
    rows = grouped;
  }
  const r = x => +x.toFixed(digits);
  let prevClose = null;
  return rows.map(c => {
    const open = prevClose !== null && prevClose !== undefined ? prevClose : c.open;
    prevClose = c.close;
    return { time: c.time, open: r(open), close: r(c.close), high: r(Math.max(c.high, open, c.close)), low: r(Math.min(c.low, open, c.close)) };
  });
}

// fetch + JSON with a timeout, so a hanging proxy cannot hang the chart
async function fetchJSON(url, ms = 12000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally { clearTimeout(timer); }
}

// Load candle history for one symbol/timeframe from Yahoo. Tries each
// Yahoo name for the symbol (gold: "XAUUSD=X" then "GC=F") and each
// route in turn. Returns [] when every route fails (offline, proxy
// down...) - the chart then draws live TradingView candles only.
async function loadHistoricalCandles(sym, tfName) {
  const m = MAP[sym], cfg = YAHOO_TF[tfName], tfSec = TF[tfName];
  for (const ySym of m.yahoo) {
    const yahooURL = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ySym)}?interval=${cfg.interval}&range=${cfg.range}`;
    const routes = [
      'https://proxy.cors.dev/' + yahooURL,                             // as in chart.js
      'https://corsproxy.io/?url=' + encodeURIComponent(yahooURL),      // fallback proxy
      yahooURL                                                          // direct (if CORS ever allows it)
    ];
    for (const url of routes) {
      try {
        const candles = yahooToCandles(await fetchJSON(url), m.digits, cfg.group || 1, tfSec);
        if (candles.length) return candles;
      } catch { /* try the next route */ }
    }
  }
  return [];
}

/* ---------------------------------------------------------------------
   2) THE PAGE DESCRIPTION
   --------------------------------------------------------------------- */
const PAGE = (() => {
  // chart  = the library's chart object        series  = the candle series inside it
  // cur    = the candle that is forming NOW    off     = Feed unsubscribe handle
  // loadGen= load counter: a slow Yahoo reply must never draw over a newer chart
  let chart = null, series = null, cur = null, off = null, loadGen = 0;

  return {
    id: 'charts', parent: 'quotes', nav: true,
    // Header: crosshair, indicators, the timeframe as TEXT (e.g. "M5"), objects, new order
    header: () => ({ left: 'menu', title: '', actions: [
      { icon: 'crosshair', action: 'toast', msg: 'Crosshair: tap and hold on the chart', label: 'Crosshair' },
      { icon: 'indicator', action: 'toast', msg: 'Indicators: coming soon', label: 'Indicators' },
      { text: State.chart.tf, action: 'pickTf' },
      { icon: 'clock', action: 'toast', msg: 'Objects: coming soon', label: 'Objects' },
      { icon: 'filePlus', action: 'newOrder', label: 'New order' }
    ]}),
    // The empty chart box + the label on top (tapping the label opens the symbol picker)
    // + a small status pill ("Loading history…" etc.), hidden once live candles update
    render: () => {
      const m = MAP[State.chart.sym];
      return `<div class="chart-wrap">
        <div id="chart"></div>
        <button class="chart-label" data-action="pickChartSymbol">
          <b>${m.sym}</b> ▾ ${State.chart.tf}<br><span>${m.name}</span>
        </button>
        <div class="chart-status" id="chart-status">Loading ${m.sym} history…</div>
      </div>`;
    },
    // Runs after render(): create the chart inside #chart
    mount() {
      // If the library script could not download (no internet) show a message instead
      if (!window.LightweightCharts) {
        $('#chart').innerHTML = '<div class="empty">The chart library could not load. Check your internet connection.</div>';
        const s = $('#chart-status'); if (s) s.style.display = 'none';
        return;
      }
      const L = window.LightweightCharts, m = MAP[State.chart.sym], tfName = State.chart.tf, tf = TF[tfName];
      // read the current theme colours from the CSS variables so the chart matches light/dark
      const css = getComputedStyle(document.documentElement), col = n => css.getPropertyValue(n).trim();

      chart = L.createChart($('#chart'), {
        autoSize: true,                                            // fill the container
        layout: { background: { type: L.ColorType.Solid, color: col('--bg') }, textColor: col('--muted'), fontFamily: 'Roboto' },
        grid: { vertLines: { color: col('--grid'), style: L.LineStyle.Dashed }, horzLines: { color: col('--grid'), style: L.LineStyle.Dashed } },
        rightPriceScale: { borderColor: col('--line') },
        timeScale: { borderColor: col('--line'), timeVisible: true, secondsVisible: false, rightOffset: 6 }
      });
      series = chart.addSeries(L.CandlestickSeries, {
        upColor: col('--cup'), downColor: col('--cdn'), borderVisible: false,
        wickUpColor: col('--cup'), wickDownColor: col('--cdn'),
        priceFormat: { type: 'price', precision: m.digits, minMove: m.point }
      });

      cur = null;                                  // no forming candle until Yahoo history arrives
      const gen = ++loadGen;                       // this mount's number (see the history load below)
      const setStatus = txt => { const el = $('#chart-status'); if (el) { el.textContent = txt || ''; el.style.display = txt ? '' : 'none'; } };

      // Live: fold every TradingView bid (from Q, kept by core.js) into the
      // forming candle, exactly like updateCandleFromQuote() in feedPrice.js.
      // Subscribed before history loads; ticks are ignored until cur exists.
      off = Feed.on(() => {
        if (!cur || !series) return;
        const bid = Q[m.sym].bid, t = Math.floor(Date.now() / 1000 / tf) * tf;
        if (t > cur.time) cur = { time: t, open: bid, high: bid, low: bid, close: bid };   // a new candle period began
        else { cur.high = Math.max(cur.high, bid); cur.low = Math.min(cur.low, bid); cur.close = bid; } // same candle: stretch it
        // (if Yahoo's last bar starts after our UTC bucket - e.g. daily bars - t < cur.time:
        //  keep cur.time, because the library refuses older times, and stretch that candle)
        series.update(cur);
        if (Q[m.sym].live) setStatus('');
      });

      // History: Yahoo candles first, then live TradingView ticks continue the last one.
      (async () => {
        const data = await loadHistoricalCandles(m.sym, tfName);
        if (gen !== loadGen || !series) return;    // symbol/timeframe changed while loading: drop this result
        if (data.length) {
          series.setData(data);
          cur = { ...data[data.length - 1] };      // the candle currently forming
          chart.timeScale().setVisibleLogicalRange({ from: data.length - 60, to: data.length + 6 }); // zoom: show the last 60 candles
          setStatus(Q[m.sym].live ? '' : 'Connecting to live feed…');
        } else {
          // No history (Yahoo/proxy unreachable): still start the live candle from the current price
          const q = Q[m.sym], t = Math.floor(Date.now() / 1000 / tf) * tf;
          cur = { time: t, open: q.bid, high: q.bid, low: q.bid, close: q.bid };
          setStatus('History unavailable — showing live prices only');
        }
      })();
    },
    // Runs when the page redraws or closes: stop listening and free the chart's memory
    unmount() {
      loadGen++;                                   // invalidate any history load still in flight
      if (off) off(); off = null;
      cur = null; series = null;
      if (chart) { chart.remove(); chart = null; }
    }
  };
})();

/* ---------------------------------------------------------------------
   3) ACTIONS ONLY THIS PAGE USES
   (chartFor and newOrder are shared and live in shell.js)
   --------------------------------------------------------------------- */
Object.assign(Actions, {
  // Header "M5" button: sheet listing the timeframes, a chevron marks the current one
  pickTf() {
    UI.sheet(`<h3>Timeframe</h3>` + Object.keys(TF).map(t =>
      `<button class="item" data-action="setTf" data-tf="${t}"><span>${t}</span>${t === State.chart.tf ? icon('chevron', 20) : ''}</button>`).join(''));
  },
  setTf(el) { State.chart.tf = el.dataset.tf; UI.close(); renderRoute(); },   // remember the choice, redraw the chart
  // Tap the label at the top-left: sheet listing the watch-list symbols
  pickChartSymbol() {
    UI.sheet(`<h3>Symbol</h3>` + State.watchlist.map(s => `<button class="item" data-action="chartFor" data-sym="${s}">${s}</button>`).join(''));
  }
});

/* ---------------------------------------------------------------------
   4) START  (gated: needs a logged-in account)
   --------------------------------------------------------------------- */
App.start(gated(PAGE));
