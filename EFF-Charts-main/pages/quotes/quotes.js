'use strict';

/* =====================================================================
   QUOTES PAGE  (pages/quotes/quotes.js)
   =====================================================================
   The watch-list: one row per symbol with live prices.
   Prices are LIVE TradingView quotes: core.js keeps them in Q (bid, ask,
   day change ch/chp, day low/high and the live spread) and this page
   simply paints Q every time the Feed fires.

   This file uses things defined by the shared scripts that load before it:
     core.js  -> State, Q (live quotes), MAP, MARKET, Feed, $, clock, icon, pxHTML, UI, gated
     shell.js -> Actions, App, renderRoute

   HOW THE PAGE WORKS
     render()  builds the empty rows ONCE (one <div> per symbol with empty price boxes)
     mount()   fills the numbers, then subscribes to the price Feed
     paintRow  runs every tick and only changes the TEXT inside each box.
               That is why the list does not flicker: the rows are never rebuilt.
   ===================================================================== */

/* ---------------------------------------------------------------------
   1) THE PAGE DESCRIPTION
   --------------------------------------------------------------------- */
const PAGE = (() => {
  let off = null; // the "unsubscribe" handle returned by Feed.on() (so unmount can stop listening)

  // Update ONE row's numbers in place (no full re-render = smooth, no flicker)
  function paintRow(sym) {
    const m = MAP[sym], q = Q[sym], S = State.settings;
    // small helper: put html into the element called "<id>-<symbol>", e.g. #chg-EURUSD
    const set = (id, html) => { const el = $(`#${id}-${sym}`); if (el) el.innerHTML = html; };
    // Day change: TradingView's own ch / chp (kept in Q by core.js) when the symbol is
    // live, otherwise worked out from the day's reference price (q.open) as before.
    const useTV = q.live && q.ch !== null && q.ch !== undefined && q.chp !== null && q.chp !== undefined;
    const pts = useTV ? Math.round(q.ch / m.point) : Math.round((q.bid - q.open) / m.point);   // change, in points
    const pct = useTV ? q.chp : (q.bid - q.open) / q.open * 100;                               // change, in percent
    const cls = pts < 0 ? 'dn' : 'up';                           // red when down, blue when up
    set('chg',  `<span class="${cls}">${pts > 0 ? '+' : ''}${pts} &nbsp;${pct > 0 ? '+' : ''}${pct.toFixed(2)}%</span>`);
    set('time', q.live ? clock(q.time) : '…');                   // time of the last live tick ("…" while connecting)
    set('spr',  S.showSpread ? `${icon('spread', 18, 1.6)} ${q.spread}` : '');   // LIVE spread (ask-bid) in points, if enabled in Settings
    ['bid', 'ask'].forEach(side => {                             // the two big prices
      const el = $(`#${side}-${sym}`);
      if (el) { el.className = 'px ' + (q.dir > 0 ? 'up' : 'dn'); el.innerHTML = pxHTML(q[side], m.digits); }
    });
    set('lh', S.showHL ? `<span>L: ${q.lo.toFixed(m.digits)}</span><span>H: ${q.hi.toFixed(m.digits)}</span>` : ''); // day low/high, only if enabled
  }
  const paintAll = () => State.watchlist.forEach(paintRow);

  return {
    id: 'quotes',               // used by the bottom nav to highlight this tab and by go()
    parent: 'quotes',           // where the header back-arrow would go
    nav: true,                  // show the bottom navigation
    // What the top bar shows: a menu button on the left, a title, and two icon buttons on the right
    header: () => ({ left: 'menu', title: 'Quotes', actions: [
      { icon: 'plus', action: 'addSymbol', label: 'Add symbol' },
      { icon: 'edit', action: 'toast', msg: 'Edit mode: coming soon', label: 'Edit' }
    ]}),
    // The rows. Every price box has an id like "bid-EURUSD" so paintRow can find it.
    // data-action="symbolMenu" + data-sym="EURUSD" -> tapping the row calls Actions.symbolMenu (below).
    render: () => State.watchlist.map(sym => `
      <div class="q-row" data-action="symbolMenu" data-sym="${sym}">
        <div>
          <div class="q-chg" id="chg-${sym}"></div>
          <div class="q-sym">${sym}</div>
          <div class="q-meta"><span id="time-${sym}"></span><span id="spr-${sym}" class="q-spr"></span></div>
        </div>
        <div class="q-right">
          <div class="q-prices"><span id="bid-${sym}" class="px"></span><span id="ask-${sym}" class="px"></span></div>
          <div class="q-lh" id="lh-${sym}"></div>
        </div>
      </div>`).join('') || '<div class="empty">Your list is empty. Tap + to add symbols.</div>',
    mount() { paintAll(); off = Feed.on(paintAll); },          // fill numbers now, and again on every tick
    unmount() { if (off) off(); off = null; }                  // stop listening when the page redraws or closes
  };
})();


/* ---------------------------------------------------------------------
   2) ACTIONS ONLY THIS PAGE USES
   Object.assign adds these to the shared Actions object from shell.js.
   --------------------------------------------------------------------- */
Object.assign(Actions, {
  // Tap a row -> bottom sheet with 3 choices
  symbolMenu(el) {
    const s = el.dataset.sym;
    UI.sheet(`<h3>${s}</h3>
      <button class="item" data-action="orderFor" data-sym="${s}">New order</button>
      <button class="item" data-action="chartFor" data-sym="${s}">Chart</button>
      <button class="item" data-action="removeSymbol" data-sym="${s}"><span class="dn">Remove from list</span></button>`);
  },
  orderFor(el)  { UI.close(); openOrder(el.dataset.sym); },     // openOrder() lives in shell.js
  // chartFor is shared (shell.js) because Charts and Trade use it too

  // Remove a symbol from the watch-list, then redraw the page
  removeSymbol(el) { State.watchlist = State.watchlist.filter(s => s !== el.dataset.sym); UI.close(); renderRoute(); },

  // "+" button in the header: list the symbols that are NOT in the watch-list yet
  addSymbol() {
    const left = MARKET.filter(m => !State.watchlist.includes(m.sym));
    UI.sheet(`<h3>Add symbol</h3>` + (left.length
      ? left.map(m => `<button class="item" data-action="addThis" data-sym="${m.sym}"><span>${m.sym}<br><small class="muted">${m.name}</small></span>${icon('plus', 20)}</button>`).join('')
      : '<p class="muted all-added">All symbols are already in your list.</p>'));
  },
  addThis(el) { State.watchlist.push(el.dataset.sym); UI.close(); renderRoute(); }
});


/* ---------------------------------------------------------------------
   3) START
   gated() = show "No trading accounts" until the user logs in.
   --------------------------------------------------------------------- */
App.start(gated(PAGE));
