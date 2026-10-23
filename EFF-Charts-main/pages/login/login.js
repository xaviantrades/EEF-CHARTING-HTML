'use strict';

/* =====================================================================
   LOGIN PAGE  (pages/login/login.js)
   =====================================================================
   Open a demo account, or log in to an existing one.
   The form itself is static HTML in login.html. This file adds the behaviour.

   Uses from shared scripts:
     core.js  -> State, log, UI, $
     shell.js -> Actions, App, go

   Reminder: this is a DEMO. No password is checked and nothing is sent
   to a server. "Logging in" just creates a simulated account object
   with 100 000 balance in State.account.
   ===================================================================== */

/* ---------------------------------------------------------------------
   1) THE PAGE DESCRIPTION
   --------------------------------------------------------------------- */
const PAGE = {
  id: 'login', parent: 'quotes',
  nav: false,                                                   // no bottom nav on this page
  header: () => ({ left: 'back', title: 'Kilele Capital' })     // EDIT: firm name. 'back' = arrow that goes to the parent page
  // no render(): the content already exists in login.html
};

/* ---------------------------------------------------------------------
   2) CREATE THE ACCOUNT
   --------------------------------------------------------------------- */
// Builds a fresh simulated account, records it in the journal, shows a toast and opens Quotes.
// go('quotes') saves State to the session first, so the Quotes page starts already logged in.
function createAccount({ name, login, server, demo }) {
  State.account = { name, login, server, demo, balance: 100000, positions: [], closed: [], orders: [],
    deals: [{ type: 'balance', time: new Date(), amount: 100000 }] };   // first deal = the starting deposit
  log(`'${login}': authorized on ${server}`);
  UI.toast('Connected to ' + server);     // the toast is carried over to the Quotes page by go()
  go('quotes');
}

/* ---------------------------------------------------------------------
   3) ACTIONS ONLY THIS PAGE USES
   --------------------------------------------------------------------- */
Object.assign(Actions, {
  // "Open a demo account" row -> confirmation dialog
  demoDialog() {
    UI.modal(`<h3>Open a demo account</h3>
      <p class="center">Kilele Capital<br><span class="up">www.example.com</span></p>
      <p class="muted center">By opening an account you agree to the account opening terms and the data protection policy.</p>
      <button class="btn block plain" data-action="openDemo">Open an Account</button>
      <p class="muted demo-note">To trade using real money, you need to apply for a real trading account by entering into a separate agreement with a financial services company.</p>`);
  },
  // "Open an Account" button in that dialog: make a demo account with a random 11-digit login
  openDemo() {
    UI.close();
    createAccount({ name: 'Demo Trader', login: String(10000000000 + Math.floor(Math.random() * 9e9)), server: 'Kilele-Demo', demo: true });
  },
  // "Login" button: read the form (ids are in login.html)
  doLogin() {
    const login = $('#l-login').value.trim();
    if (!login) return UI.toast('Enter your login number');
    const server = $('#l-server').value;
    // the display name is "Trader " + the last 4 digits; the account is "demo" if the server name says so
    createAccount({ name: 'Trader ' + login.slice(-4), login, server, demo: /demo/i.test(server) });
  }
});

App.start(PAGE);
