'use strict';

/* =====================================================================
   CALENDAR PAGE  (pages/calendar/calendar.js)
   =====================================================================
   A "coming soon" placeholder. The message is plain HTML in calendar.html;
   this file only describes the page: back arrow, title "Economic calendar", no bottom nav.

   EDIT: when you build the real page, add render() / mount() here
   (see pages/trade/trade.js for a page with live data).
   ===================================================================== */
const PAGE = {
  id: 'calendar', parent: 'quotes', nav: false,
  header: () => ({ left: 'back', title: 'Economic calendar' })
};

App.start(PAGE);
