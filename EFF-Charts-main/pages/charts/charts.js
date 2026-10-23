'use strict';

/* =====================================================================
   CHARTS PAGE  (pages/charts/charts.js)
   =====================================================================
   A live candlestick chart using the Lightweight Charts library
   (loaded by a <script> tag in charts.html, available as window.LightweightCharts).

   Uses from shared scripts:
     core.js  -> State, Q, MAP, Feed, $, icon, UI
     shell.js -> Actions, App, renderRoute
   ===================================================================== */

/* ---------------------------------------------------------------------
   1) TIMEFRAMES + FAKE HISTORY
   --------------------------------------------------------------------- */
const TF = { M1:60, M5:300, M15:900, M30:1800, H1:3600, H4:14400, D1:86400 }; // timeframe -> seconds per candle

// Make fake history that ENDS at the current price (replace with real candles later)
function genCandles(sym, tfSec, n = 300) {
  const m = MAP[sym], r = x => +x.toFixed(m.digits);                // r() rounds to the symbol's decimals
  const end = Math.floor(Date.now() / 1000 / tfSec) * tfSec;        // start of the current candle
  const sigma = Q[sym].bid * 0.0004 * Math.sqrt(tfSec / 300);       // typical candle size
  const out = []; let close = Q[sym].bid;
  for (let i = n - 1; i >= 0; i--) {                                // build backwards from "now"
    const open = close - (Math.random() - 0.5) * 2 * sigma;
    const high = Math.max(open, close) + Math.random() * sigma * 0.6;
    const low  = Math.min(open, close) - Math.random() * sigma * 0.6;
    out.push({ time: end - (n - 1 - i) * tfSec, open: r(open), high: r(high), low: r(low), close: r(close) });
    close = open;                                                   // this open = previous candle's close
  }
  return out.reverse();
}

/* ---------------------------------------------------------------------
   2) THE PAGE DESCRIPTION
   --------------------------------------------------------------------- */
const PAGE = (() => {
  // chart  = the library's chart object        series = the candle series inside it
  // cur    = the candle that is forming NOW    off    = Feed unsubscribe handle
  let chart = null, series = null, cur = null, off = null;

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
    render: () => {
      const m = MAP[State.chart.sym];
      return `<div class="chart-wrap">
        <div id="chart"></div>
        <button class="chart-label" data-action="pickChartSymbol">
          <b>${m.sym}</b> ▾ ${State.chart.tf}<br><span>${m.name}</span>
        </button>
      </div>`;
    },
    // Runs after render(): create the chart inside #chart
    mount() {
      // If the library script could not download (no internet) show a message instead
      if (!window.LightweightCharts) { $('#chart').innerHTML = '<div class="empty">The chart library could not load. Check your internet connection.</div>'; return; }
      const L = window.LightweightCharts, m = MAP[State.chart.sym], tf = TF[State.chart.tf];
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

      const data = genCandles(m.sym, tf);          // REAL FEED: replace with candles from your API
      series.setData(data);
      cur = { ...data[data.length - 1] };          // the candle currently forming
      chart.timeScale().setVisibleLogicalRange({ from: data.length - 60, to: data.length + 6 }); // zoom: show the last 60 candles

      // Live: every tick either updates the current candle or starts a new one
      off = Feed.on(() => {
        const bid = Q[m.sym].bid, t = Math.floor(Date.now() / 1000 / tf) * tf;
        if (t > cur.time) cur = { time: t, open: bid, high: bid, low: bid, close: bid };   // a new candle period began
        else { cur.high = Math.max(cur.high, bid); cur.low = Math.min(cur.low, bid); cur.close = bid; } // same candle: stretch it
        series.update(cur);
      });
    },
    // Runs when the page redraws or closes: stop listening and free the chart's memory
    unmount() {
      if (off) off(); off = null;
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
