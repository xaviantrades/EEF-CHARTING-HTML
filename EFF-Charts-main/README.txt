KILELE TRADER - MULTI-PAGE STATIC PROJECT

Every screen is now its own page, with its own HTML, CSS and JS file.
The look and behaviour are the same as the single-page version.

Run:
Open index.htm in a browser (it forwards to pages/quotes/quotes.html).
The chart library and Google Fonts load from online CDNs, and the live
TradingView feed + Yahoo candle history (see DATA FEEDS below) also need
an internet connection. No server is needed; double-clicking the files works.

FOLDERS
index.htm                     front door: redirects to the Quotes page

shared/                       used by EVERY page
  base.css                    theme colours, app shell, buttons, drawer, sheets, order ticket, toast
  theme-boot.js               tiny <head> script: applies light/dark before first paint (no flash)
  core.js                     helpers, icons, symbols + LIVE TradingView price feed, State,
                              SESSION saving, trading maths, theme, toast/sheet/dialog/drawer helpers
  shell.js                    shared actions, order ticket, header + bottom nav, go()/renderRoute(),
                              App.start(), first-run consent dialog

pages/<name>/<name>.html|css|js     one folder per screen:
  quotes      watch-list with live prices (needs account)
  charts      live candlestick chart (needs account; loads the chart library)
  trade       balance / equity / open positions (needs account)
  history     closed positions, orders, deals (needs account)
  messages    mailbox empty state, Register / Sign in
  login       demo account + login form
  settings    theme, quote options, log in/out
  news        sample headlines (static html)
  journal     terminal log
  about       version + risk warning (static html)
  calendar, community, challenges, help      "coming soon" placeholders

DATA FEEDS
Live prices (Quotes/watchlist, Charts, Trade, the order ticket) come from
TradingView's public WebSocket, wss://data.tradingview.com (one anonymous
quote session: lp / bid / ask / ch / chp) - see section 2d in shared/core.js.
Candle HISTORY on the Charts page comes from Yahoo Finance
(query1.finance.yahoo.com, fetched through a CORS proxy) - see
loadHistoricalCandles() in pages/charts/charts.js. The still-forming candle
then updates tick-by-tick from the TradingView prices.
Symbol mapping lives in MARKET (shared/core.js): TradingView uses
exchange:sym (FX:EURUSD, OANDA:XAUUSD), Yahoo uses sym=X (EURUSD=X; spot
gold often returns no Yahoo data, so gold falls back to GC=F futures).
TradingView quotes are indicative, not an executable broker feed.

HOW A PAGE LOADS
Each page html loads, in order:  theme-boot.js -> base.css -> <page>.css ... then at the
end of <body>:  core.js -> shell.js -> <page>.js.   The page js describes the page
(PAGE = { id, parent, nav, header(), render(), mount(), unmount() }), adds its own tap
handlers with Object.assign(Actions, {...}) and finishes with App.start(PAGE).

WHAT CHANGED, AND WHY
- Navigation: the old hash router (#/quotes) is replaced by real page loads.
  go('quotes') opens pages/quotes/quotes.html.
- Because the browser forgets JavaScript memory on every page load, the app data
  (account, positions, history, watch-list, chart choice, journal, live prices) is saved
  to sessionStorage when you leave a page and restored by the next one (core.js, "SESSION").
  Like the original, it lives only in the current browser tab. Theme/settings and the
  "accepted terms" flag still use localStorage as before.
- A toast that is showing while you change page (e.g. "Connected to Kilele-Demo")
  is carried to the next page.
- Pages that need no live data (messages, login, news, about, placeholders) now have
  their content written directly in the html. Icons there use <i data-icon="name"></i>,
  turned into SVG by hydrateIcons().
- Inline style="..." attributes were moved into the page css files.
- The empty js/index.js from the old project is not needed and was removed.
- The chart library is loaded only by the Charts page.
