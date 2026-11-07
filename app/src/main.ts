import './style.css';
import mochi from '../../shared/mochi.html?raw';

/** Boots Mochi's window: draws the mascot. */
function boot(): void {
  const buddy = document.getElementById('buddy');
  if (!buddy) throw new Error('Mochi: #buddy missing from index.html');
  buddy.innerHTML = mochi;
}

boot();
