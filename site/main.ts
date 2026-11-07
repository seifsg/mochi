import './style.css';
import mochiMarkup from '../shared/mochi.html?raw';
import { startDemo } from './demo.ts';
import { latestRelease, RELEASES_URL, type Release } from './release.ts';

/** Element by id; a missing one is a broken page, so fail loudly. */
function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Mochi site: #${id} missing from index.html`);
  return el;
}

/** Shows the download button's state: installer link, coming soon, or the releases page. */
function showRelease(release: Release): void {
  const button = byId('download') as HTMLAnchorElement;
  const label = byId('download-label');
  const meta = byId('download-meta');
  switch (release.kind) {
    case 'ready':
      button.href = release.url;
      label.textContent = 'Download for Windows';
      meta.textContent = `${release.version} · ${release.sizeMb.toFixed(1)} MB · free`;
      return;
    case 'none':
      button.href = RELEASES_URL;
      button.classList.add('is-soon');
      label.textContent = 'Download coming soon';
      meta.textContent = 'The first installer is on its way. Watch the releases page.';
      return;
    case 'unknown':
      console.warn(`Mochi site: release check failed (${release.reason})`);
      button.href = RELEASES_URL;
      label.textContent = 'Download for Windows';
      meta.textContent = 'Get the installer on GitHub Releases';
  }
}

startDemo(byId('buddy'), byId('bubble'), byId('bubble-text'), byId('scene'), mochiMarkup);
void latestRelease().then(showRelease);
