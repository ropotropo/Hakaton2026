import { DESTINATIONS } from './destinations.js';
import { BODY_TEXTURE_PATHS } from './celestial.js';
import { icon } from './ui-icons.js';
import './destination-carousel.css';

// A lightweight sphere-thumbnail rail: no extra WebGL contexts or changes to flight.
export function installDestinationCarousel({ select, dialog }) {
  if (!select || !dialog) return null;
  const group = document.createElement('section');
  group.className = 'world-carousel';
  group.innerHTML = `<div class="world-carousel-heading"><span>Choose your world</span><div><button type="button" data-world-step="-1" aria-label="Previous world">${icon('chevron-left')}</button><button type="button" data-world-step="1" aria-label="Next world">${icon('chevron-right')}</button></div></div><div class="world-rail" role="group" aria-label="Landing worlds"></div>`;
  const enclosingLabel = select.closest('label');
  (enclosingLabel ?? select).after(group);
  select.hidden = true;
  if (enclosingLabel) enclosingLabel.hidden = true;
  dialog.querySelector(`label[for="${select.id}"]`)?.setAttribute('hidden', '');
  const rail = group.querySelector('.world-rail');
  let signature = '';
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  function sync(scroll = false) {
    for (const button of rail.querySelectorAll('[data-world]')) {
      const active = button.dataset.world === select.value;
      button.setAttribute('aria-pressed', String(active));
      button.tabIndex = active ? 0 : -1;
      if (active && scroll && dialog.open) button.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reducedMotion() ? 'instant' : 'smooth' });
    }
  }
  function choose(id, focus = false) {
    if (!Array.from(select.options).some(option => option.value === id && !option.disabled)) return;
    select.value = id;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    sync(true);
    if (focus) rail.querySelector(`[data-world="${id}"]`)?.focus({ preventScroll: true });
  }
  function render(scroll = false) {
    const options = Array.from(select.options).filter(option => !option.disabled);
    const next = options.map(option => option.value).join('|');
    if (signature !== next) {
      signature = next; rail.replaceChildren();
      for (const option of options) {
        const world = DESTINATIONS.find(item => item.id === option.value);
        if (!world) continue;
        const button = document.createElement('button');
        button.type = 'button'; button.className = 'world-choice'; button.dataset.world = world.id;
        button.setAttribute('aria-label', `Land on ${world.name}`);
        const globe = document.createElement('span'); globe.className = `world-globe world-globe-${world.id}`; globe.setAttribute('aria-hidden', 'true');
        globe.style.setProperty('--world-color', world.color);
        const map = BODY_TEXTURE_PATHS[world.id];
        if (map) globe.style.backgroundImage = `url("${new URL(map, document.baseURI).href}")`;
        const name = document.createElement('strong'); name.textContent = world.name;
        const parent = document.createElement('small'); parent.textContent = world.parent === world.name ? 'Planet' : `${world.parent} system`;
        button.append(globe, name, parent); button.addEventListener('click', () => choose(world.id)); rail.append(button);
      }
    }
    sync(scroll && dialog.open);
  }
  function step(direction) {
    const buttons = [...rail.querySelectorAll('[data-world]')];
    const index = buttons.findIndex(button => button.dataset.world === select.value);
    const next = Math.max(0, Math.min(buttons.length - 1, index + direction));
    if (buttons[next]) choose(buttons[next].dataset.world, true);
  }
  group.querySelectorAll('[data-world-step]').forEach(button => button.addEventListener('click', () => step(Number(button.dataset.worldStep))));
  rail.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    if (event.key === 'Home' || event.key === 'End') {
      const buttons = [...rail.querySelectorAll('[data-world]')]; choose((event.key === 'Home' ? buttons[0] : buttons.at(-1)).dataset.world, true);
    } else step(event.key === 'ArrowLeft' ? -1 : 1);
  });
  select.addEventListener('change', () => sync());
  const observer = new MutationObserver(() => render(true)); observer.observe(select, { childList: true }); observer.observe(dialog, { attributes: true, attributeFilter: ['open'] });
  render();
  return { render, destroy() { observer.disconnect(); group.remove(); select.hidden = false; if (enclosingLabel) enclosingLabel.hidden = false; dialog.querySelector(`label[for="${select.id}"]`)?.removeAttribute('hidden'); } };
}
