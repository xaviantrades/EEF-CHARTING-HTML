'use strict';

/* =====================================================================
   SETTINGS PAGE  (pages/settings/settings.js)
   =====================================================================
   Theme picker, quote options, log in / out, and links to other pages.

   The rows show the CURRENT values (which theme is active, which
   switches are on), so the html is built by render() from State.settings.
   Settings are saved in localStorage (Store) so they survive closing
   the browser; shared/theme-boot.js reads them on every page load.

   Uses from shared scripts:
     core.js  -> State, saveSettings, applyTheme, icon, log, UI
     shell.js -> Actions, App, renderRoute, go
   ===================================================================== */

/* ---------------------------------------------------------------------
   1) THE PAGE DESCRIPTION
   --------------------------------------------------------------------- */
const PAGE = {
  id: 'settings', parent: 'quotes', nav: false,
  header: () => ({ left: 'back', title: 'Settings' }),
  render() {
    const S = State.settings;
    // sw() builds one on/off switch. class "on" = enabled. data-key says which setting it controls.
    const sw = (key, on) => `<button class="switch ${on ? 'on' : ''}" role="switch" aria-checked="${on}" data-action="toggleSetting" data-key="${key}"></button>`;
    return `
      <div class="section">Appearance</div>
      <div class="row"><div>Theme<small>Choose light, dark, or follow your device</small></div>
        <div class="seg">${['dark', 'light', 'system'].map(m => `<button class="${S.theme === m ? 'on' : ''}" data-action="setTheme" data-mode="${m}">${m[0].toUpperCase() + m.slice(1)}</button>`).join('')}</div>
      </div>

      <div class="section">Quotes</div>
      <div class="row"><div>Show high / low</div>${sw('showHL', S.showHL)}</div>
      <div class="row"><div>Show spread</div>${sw('showSpread', S.showSpread)}</div>

      <div class="section">Account</div>
      ${State.account
        ? `<button class="row" data-action="logout"><span class="dn">Log out of ${State.account.login}</span></button>`
        : `<button class="row" data-action="go" data-to="login"><span>Add trading account</span>${icon('chevron')}</button>`}

      <div class="section">More</div>
      <button class="row" data-action="go" data-to="journal"><span>Journal</span>${icon('chevron')}</button>
      <button class="row" data-action="go" data-to="about"><span>About</span>${icon('chevron')}</button>`;
  }
};

/* ---------------------------------------------------------------------
   2) ACTIONS ONLY THIS PAGE USES
   --------------------------------------------------------------------- */
Object.assign(Actions, {
  // Dark / Light / System buttons: save the choice, apply it right now, redraw the rows
  setTheme(el) { State.settings.theme = el.dataset.mode; saveSettings(); applyTheme(); renderRoute(); },
  // On/off switches: flip the setting (data-key), save it, redraw
  toggleSetting(el) { const k = el.dataset.key; State.settings[k] = !State.settings[k]; saveSettings(); renderRoute(); },
  // "Log out of 123456": forget the account, say so, and go back to Quotes
  logout() { log(`'${State.account.login}': disconnected`); State.account = null; UI.toast('Logged out'); go('quotes'); }
});

App.start(PAGE);
