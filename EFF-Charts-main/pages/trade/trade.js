'use strict';

/* =====================================================================
   TRADE PAGE  (pages/trade/trade.js)
   =====================================================================
   Balance / equity / margin summary + the list of open positions.

   Uses from shared scripts:
     core.js  -> State, Q, MAP, Feed, $, money, totals, profitOf, UI, gated
     shell.js -> Actions, App, renderRoute, renderNav
   ===================================================================== */

/* ---------------------------------------------------------------------
   1) THE PAGE DESCRIPTION
   --------------------------------------------------------------------- */
var _this = this;
const PAGE = function () {
  let off = null; // Feed unsubscribe handle

  // Runs on mount and on every price tick: updates only the numbers (no flicker)
  function paint() {
    var _this2 = this;
    const a = State.account,
      t = totals(); // t = { profit, margin, equity, free }
    const set = function (id, v) {
      const el = $('#' + id);
      if (el) el.textContent = v;
    };
    set('t-bal', money(a.balance));
    set('t-eq', money(t.equity));
    set('t-mar', money(t.margin));
    set('t-free', money(t.free));
    a.positions.forEach(function (p) {
      // one line per open position
      const q = Q[p.sym],
        pr = profitOf(p),
        el = $('#pp-' + p.id);
      set('pc-' + p.id, function () {
        if (p.side === 'buy') {
          return q.bid;
        }
        return q.ask;
      }.call(_this2).toFixed(MAP[p.sym].digits)); // current price
      if (el) {
        el.textContent = money(pr);
        el.className = 'pos-r ' + function () {
          if (pr < 0) {
            return 'dn';
          }
          return 'up';
        }.call(_this2);
      } // profit, red if negative
    });
  }
  return {
    id: 'trade',
    parent: 'quotes',
    nav: true,
    header: function () {
      return {
        left: 'menu',
        title: 'Trade',
        actions: [{
          icon: 'quotes',
          action: 'toast',
          msg: 'Sorting: by time',
          label: 'Sort'
        }, {
          icon: 'filePlus',
          action: 'newOrder',
          label: 'New order'
        }]
      };
    },
    // Summary rows (empty spans filled by paint) + one block per open position.
    // The ".dr" rows are the dotted-leader lines from shared/base.css.
    render: function () {
      return `
      <div class="summary">
        <div class="dr"><b>Balance:</b><i></i><span id="t-bal"></span></div>
        <div class="dr"><b>Equity:</b><i></i><span id="t-eq"></span></div>
        <div class="dr"><b>Margin:</b><i></i><span id="t-mar"></span></div>
        <div class="dr"><b>Free margin:</b><i></i><span id="t-free"></span></div>
      </div>
      ${State.account.positions.map(function (p) {
        return `
        <div class="pos" data-action="positionMenu" data-id="${p.id}">
          <div>
            <b>${p.sym}, <span class="${function () {
          if (p.side === 'buy') {
            return 'up';
          }
          return 'dn';
        }.call(_this)}">${p.side} ${p.vol.toFixed(2)}</span></b>
            <div class="sub">${p.price.toFixed(MAP[p.sym].digits)} → <span id="pc-${p.id}"></span></div>
          </div>
          <div class="pos-r" id="pp-${p.id}"></div>
        </div>`;
      }).join('')}
      ${function () {
        if (State.account.positions.length) {
          return '';
        }
        return '<p class="muted no-pos">No open positions.<br>Tap the + page icon to place an order.</p>';
      }.call(_this)}`;
    },
    mount: function () {
      paint();
      off = Feed.on(paint);
    },
    unmount: function () {
      if (off) off();
      off = null;
    }
  };
}();

/* ---------------------------------------------------------------------
   2) ACTIONS ONLY THIS PAGE USES
   (newOrder and chartFor are shared and live in shell.js)
   --------------------------------------------------------------------- */
Object.assign(Actions, {
  // Tap a position -> sheet with "Close position" and "Chart"
  positionMenu: function (el) {
    const p = State.account.positions.find(function (x) {
      return x.id == el.dataset.id;
    });
    if (!p) return;
    UI.sheet(`<h3>${p.sym}, ${p.side} ${p.vol.toFixed(2)}</h3>
      <button class="item" data-action="closePosition" data-id="${p.id}"><span class="dn">Close position</span></button>
      <button class="item" data-action="chartFor" data-sym="${p.sym}">Chart</button>`);
  },
  // Close a position: realise the profit into the balance and record it in the history
  closePosition: function (el) {
    const a = State.account,
      i = a.positions.findIndex(function (x) {
        return x.id == el.dataset.id;
      });
    if (i < 0) return;
    const p = a.positions[i],
      q = Q[p.sym],
      profit = profitOf(p);
    const closePrice = function () {
      if (p.side === 'buy') {
        return q.bid;
      }
      return q.ask;
    }.call(this); // buys close at bid, sells at ask
    a.positions.splice(i, 1); // remove from the open list
    a.balance += profit; // profit / loss becomes real balance
    a.closed.unshift(Object.assign({}, p, {
      closePrice: closePrice,
      closeTime: new Date(),
      profit: profit
    })); // History > Positions
    a.deals.unshift({
      type: 'trade',
      sym: p.sym,
      side: function () {
        if (p.side === 'buy') {
          return 'sell';
        }
        return 'buy';
      }.call(this),
      dir: 'out',
      vol: p.vol,
      price: closePrice,
      time: new Date(),
      profit: profit
    }); // History > Deals
    log(`'${a.login}': position #${p.id} closed, profit ${money(profit)}`);
    UI.close();
    UI.toast(`Closed ${p.sym}: ${function () {
      if (profit >= 0) {
        return '+';
      }
      return '';
    }.call(this)}${money(profit)}`);
    renderNav();
    renderRoute(); // balance pill in the nav + the list both changed
  }
});

/* ---------------------------------------------------------------------
   3) START  (gated: needs a logged-in account)
   --------------------------------------------------------------------- */
App.start(gated(PAGE));
