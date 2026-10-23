'use strict';

/* =====================================================================
   NEWS PAGE  (pages/news/news.js)
   =====================================================================
   The headlines are plain HTML in news.html (sample text), so this file
   only describes the page: a back arrow, the title, and no bottom nav.

   EDIT: to use a real news API later, add a render() or mount() here that
   fetches the headlines and fills <main id="main">.
   ===================================================================== */
const PAGE = {
  id: 'news', parent: 'quotes', nav: false,
  header: () => ({ left: 'back', title: 'News' })
};

App.start(PAGE);
