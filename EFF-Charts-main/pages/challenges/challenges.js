'use strict';

/* =====================================================================
   CHALLENGES PAGE  (pages/challenges/challenges.js)
   =====================================================================
   A "coming soon" placeholder. The message is plain HTML in challenges.html;
   this file only describes the page: back arrow, title "My Challenges", no bottom nav.

   EDIT: when you build the real page, add render() / mount() here
   (see pages/trade/trade.js for a page with live data).
   ===================================================================== */
const PAGE = {
  id: 'challenges', parent: 'quotes', nav: false,
  header: () => ({ left: 'back', title: 'My Challenges' })
};

App.start(PAGE);
