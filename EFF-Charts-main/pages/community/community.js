'use strict';

/* =====================================================================
   COMMUNITY PAGE  (pages/community/community.js)
   =====================================================================
   A "coming soon" placeholder. The message is plain HTML in community.html;
   this file only describes the page: back arrow, title "Traders Community", no bottom nav.

   EDIT: when you build the real page, add render() / mount() here
   (see pages/trade/trade.js for a page with live data).
   ===================================================================== */
const PAGE = {
  id: 'community', parent: 'quotes', nav: false,
  header: () => ({ left: 'back', title: 'Traders Community' })
};

App.start(PAGE);
