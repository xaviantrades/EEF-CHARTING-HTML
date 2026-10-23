'use strict';

/* =====================================================================
   JOURNAL PAGE  (pages/journal/journal.js)
   =====================================================================
   Shows State.journal: the lines added by log() in core.js and the
   other pages (started, authorized, order executed, position closed...).
   Newest first, because log() puts new lines at the START of the array.

   The journal is saved in the session by core.js, so lines written on
   other pages (e.g. an order placed on Quotes) show up here.

   Uses from shared scripts:  core.js -> State, stamp     shell.js -> App
   ===================================================================== */
const PAGE = {
  id: 'journal',
  parent: 'settings',   // the back arrow returns to Settings (this page is opened from there)
  nav: false,
  header: () => ({ left: 'back', title: 'Journal' }),
  // one block per log line: small grey timestamp, then the message
  render: () => State.journal.map(j => `<div class="log"><small>${stamp(j.t)}</small>${j.msg}</div>`).join('')
};

App.start(PAGE);
