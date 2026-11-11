/* =====================================================================
   THEME BOOT  (shared/theme-boot.js)
   =====================================================================
   WHY THIS FILE EXISTS
   In the original single-page app the page loaded ONCE, so the theme was
   applied once. Now every screen is its own HTML page, so the browser
   loads a fresh page on every navigation. Without this file, a user on
   the Light theme would see a flash of DARK on each page change while
   the main scripts were still loading.

   HOW IT WORKS
   This file is loaded in the <head> of every page (blocking, tiny), so it
   runs BEFORE the first paint. It reads the saved settings and sets
   <html data-theme="..."> immediately. The full applyTheme() in core.js
   runs later and does the same thing again (plus the phone bar colour),
   so the two always agree.

   It is wrapped in a function so it adds nothing to the global scope.
   ===================================================================== */
(function () {
  try {
    // Settings are saved by core.js under the key "kt_settings" (kt_ = Kilele Trader prefix)
    var saved = JSON.parse(localStorage.getItem('kt_settings')) || {};
    var mode = saved.theme || 'dark'; // 'dark' | 'light' | 'system'
    var dark = function () {
      if (mode === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches // follow the device
;
      }
      return mode === 'dark';
    }.call(this);
    document.documentElement.setAttribute('data-theme', function () {
      if (dark) {
        return 'dark';
      }
      return 'light';
    }.call(this));
  } catch (e) {
    /* storage blocked or bad JSON: do nothing, the HTML default (dark) stays */
  }
})();
