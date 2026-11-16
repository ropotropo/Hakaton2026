import './site-menu.css';
import { KC_MARKUP } from './brand.js';
import { icon } from './ui-icons.js';
export const AUTHOR_PORTRAIT_PATH = './assets/mykyta-portrait.jpg';
let installation;

// Author information belongs to the field guide, not a second navigation menu.
export function installSiteMenu({ onOpen = () => {}, onClose = () => {} } = {}) {
  if (installation) return installation;
  const guide = document.getElementById('guide-dialog');
  const more = document.getElementById('guide-panel-more');
  if (!guide || !more) throw new Error('Install author information after the field guide.');
  const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'field-guide-author';
  trigger.textContent = 'About the author'; trigger.setAttribute('aria-haspopup', 'dialog');
  more.append(trigger);
  const biography = document.createElement('dialog'); biography.className = 'site-biography'; biography.hidden = true;
  biography.setAttribute('aria-labelledby', 'kinetic-biography-title');
  biography.innerHTML = `<header class="site-biography-header"><span class="site-menu-brand"><span class="menu-kc">${KC_MARKUP}</span>Kinetic Core</span><button type="button" class="kc-tool" aria-label="Close author information">${icon('close')}</button></header><div class="site-biography-content" lang="en"><figure class="site-author-portrait"><img src="${AUTHOR_PORTRAIT_PATH}" alt="Mykyta Borisov in a spacesuit" width="1024" height="1536" loading="lazy" decoding="async"></figure><article class="site-author-copy"><p class="site-author-eyebrow">The creator</p><h1 id="kinetic-biography-title" tabindex="-1">Mykyta <br>Borisov</h1><p class="site-author-country"><span class="site-country-mark" aria-hidden="true"></span>Ukraine · 14 years old</p><p class="site-author-biography">Drawn to space, technology and the people who pursue bold goals, Mykyta believes curiosity can change the world. To him, space exploration is humanity’s greatest journey of discovery—and Kinetic Core is an invitation to be part of it.</p><p class="site-author-attribution">Created by Mykyta Borisov</p></article></div>`;
  document.body.append(biography);
  let returnFocus, openNow = false;
  function showBiography() {
    if (openNow) return;
    returnFocus = document.activeElement; onOpen(); openNow = true; biography.hidden = false;
    biography.showModal(); biography.querySelector('button').focus({ preventScroll: true });
  }
  function close() { if (biography.open) biography.close(); }
  function finish() {
    if (!openNow) return;
    openNow = false; biography.hidden = true; onClose();
    if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true });
  }
  trigger.addEventListener('click', showBiography);
  biography.querySelector('button').addEventListener('click', close);
  biography.addEventListener('close', finish);
  biography.addEventListener('keydown', event => event.stopPropagation());
  installation = { open() { document.getElementById('guide-button').click(); }, close, openBiography: showBiography, destroy() { close(); trigger.remove(); biography.remove(); installation = null; } };
  return installation;
}
