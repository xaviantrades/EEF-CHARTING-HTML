'use strict';

/* =====================================================================
   HELP PAGE  (pages/help/help.js)
   =====================================================================
   A "coming soon" placeholder. The message is plain HTML in help.html;
   this file only describes the page: back arrow, title "User guide", no bottom nav.

   EDIT: when you build the real page, add render() / mount() here
   (see pages/trade/trade.js for a page with live data).
   ===================================================================== */
const PAGE = {
  id: 'help', parent: 'quotes', nav: false,
  header: () => ({ left: 'back', title: 'User guide' })
};

App.start(PAGE);
