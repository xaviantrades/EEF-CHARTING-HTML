'use strict';

/* =====================================================================
   HISTORY PAGE  (pages/history/history.js)
   =====================================================================
   Closed positions, orders and deals in three tabs + a profit summary.

   The selected tab is stored in State.histTab (core.js) instead of a
   private variable, so it is remembered when you leave and come back
   (the original page remembered it too, because the app never reloaded).

   Uses from shared scripts:
     core.js  -> State, MAP, money, stamp, gated
     shell.js -> Actions, App, renderRoute
   ===================================================================== */

/* ---------------------------------------------------------------------
   1) THE PAGE DESCRIPTION
   --------------------------------------------------------------------- */
const PAGE = function () {
  // Builds the list of lines for the selected tab
  function list() {
    var _this = this;
    const a = State.account,
      tab = State.histTab;
    // Tab 1: closed positions (open price -> close price, close time, profit)
    if (tab === 'positions') return a.closed.map(function (p) {
      return `
      <div class="deal"><div><b>${p.sym}, ${p.side} ${p.vol.toFixed(2)}</b>
        <div class="muted deal-sub">${p.price.toFixed(MAP[p.sym].digits)} → ${p.closePrice.toFixed(MAP[p.sym].digits)}</div></div>
        <div class="r"><div>${stamp(p.closeTime)}</div><div class="${function () {
        if (p.profit < 0) {
          return 'dn';
        }
        return 'up';
      }.call(_this)}">${money(p.profit)}</div></div></div>`;
    }).join('');
    // Tab 2: orders (every order that was placed, with its ticket number)
    if (tab === 'orders') return a.orders.map(function (o) {
      return `
      <div class="deal"><div><b>${o.sym}, ${o.side} ${o.vol.toFixed(2)}</b><div class="muted deal-sub">Filled at ${o.price.toFixed(MAP[o.sym].digits)}</div></div>
        <div class="r"><div>${stamp(o.time)}</div><div>#${o.id}</div></div></div>`;
    }).join('');
    // Tab 3: deals = the deposit line + every "in" and "out" trade
    return a.deals.map(function (d) {
      return function () {
        if (d.type === 'balance') {
          return `<div class="deal"><b>Balance</b><div class="r"><div>${stamp(d.time)}</div><div class="up">${money(d.amount)}</div></div></div>`;
        }
        return `<div class="deal"><div><b>${d.sym}, ${d.side} ${d.dir}</b><div class="muted deal-sub">${d.vol.toFixed(2)} at ${d.price.toFixed(MAP[d.sym].digits)}</div></div>
         <div class="r"><div>${stamp(d.time)}</div><div class="${function () {
          if (d.profit < 0) {
            return 'dn';
          }
          return function () {
            if (d.profit > 0) {
              return 'up';
            }
            return '';
          }.call(this);
        }.call(this)}">${money(d.profit)}</div></div></div>`;
      }.call(_this);
    }).join('');
  }
  return {
    id: 'history',
    parent: 'quotes',
    nav: true,
    // "sub" makes the title two lines: "History" with "All symbols" under it
    header: function () {
      return {
        left: 'menu',
        title: 'History',
        sub: 'All symbols',
        actions: [{
          icon: 'refresh',
          action: 'toast',
          msg: 'History updated',
          label: 'Refresh'
        }, {
          icon: 'quotes',
          action: 'toast',
          msg: 'Sorting: by time',
          label: 'Sort'
        }, {
          icon: 'calendar',
          action: 'toast',
          msg: 'Period: all time',
          label: 'Period'
        }]
      };
    },
    render: function () {
      var _this2 = this;
      const a = State.account;
      const profit = a.closed.reduce(function (s, p) {
        return s + p.profit;
      }, 0); // total profit of closed positions
      const deposit = a.deals.filter(function (d) {
        return d.type === 'balance';
      }).reduce(function (s, d) {
        return s + d.amount;
      }, 0); // total deposits
      return `
        <div class="tabs">${['positions', 'orders', 'deals'].map(function (t) {
        return `<button class="tab ${function () {
          if (t === State.histTab) {
            return 'on';
          }
          return '';
        }.call(_this2)}" data-action="histTab" data-tab="${t}">${t}</button>`;
      }).join('')}</div>
        <div class="summary">
          <div class="dr"><b>Profit:</b><i></i><span class="${function () {
        if (profit < 0) {
          return 'dn';
        }
        return 'up';
      }.call(this)}">${money(profit)}</span></div>
          <div class="dr"><b>Deposit</b><i></i><span>${money(deposit)}</span></div>
          <div class="dr"><b>Swap:</b><i></i><span>0.00</span></div>
          <div class="dr"><b>Commission:</b><i></i><span>0.00</span></div>
          <div class="dr"><b>Balance:</b><i></i><span>${money(a.balance)}</span></div>
        </div>
        <div id="hist-list">${list()}</div>`;
    }
  };
}();

/* ---------------------------------------------------------------------
   2) ACTIONS ONLY THIS PAGE USES
   --------------------------------------------------------------------- */
Object.assign(Actions, {
  // Tap a tab: remember it and redraw the page with the new tab
  histTab: function (el) {
    State.histTab = el.dataset.tab;
    renderRoute();
  }
});

/* ---------------------------------------------------------------------
   3) START  (gated: needs a logged-in account)
   --------------------------------------------------------------------- */
App.start(gated(PAGE));
