'use strict';

/* =====================================================================
   MESSAGES PAGE  (pages/messages/messages.js)
   =====================================================================
   The mailbox. Its content is static HTML (see messages.html), so this
   file only has to describe the page for the shared shell:
   what the top bar shows, and whether the bottom nav is visible.

   The "Register" / "Sign in" buttons use data-action="go" in the html,
   which is handled by Actions.go() in shared/shell.js, so no actions
   are needed here.
   ===================================================================== */
const PAGE = {
  id: 'messages',     // lets the bottom nav highlight the Messages tab
  parent: 'quotes',   // where a back-arrow would go (this page shows a menu button instead)
  nav: true,          // show the bottom navigation
  // Menu button on the left, title, and one search icon on the right (just a "coming soon" toast)
  header: () => ({ left: 'menu', title: 'Messages', actions: [{ icon: 'info', action: 'toast', msg: 'Search: coming soon', label: 'Search' }] })
  // no render(): the content already exists in messages.html
};

App.start(PAGE);   // draw the header + nav and run the first-run checks
