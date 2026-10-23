'use strict';

/* =====================================================================
   ABOUT PAGE  (pages/about/about.js)
   =====================================================================
   The content (logo, version, risk text, credits) is static HTML in
   about.html. This file only describes the page for the shared shell.
   ===================================================================== */
const PAGE = {
  id: 'about',
  parent: 'settings',   // the back arrow returns to Settings
  nav: false,
  header: () => ({ left: 'back', title: 'About' })
};

App.start(PAGE);
