// starts the app once the view partials are in the page
import { $, store, setCourse } from './core.js';
import { route } from './router.js';
import { toKey } from './paths.js';
import { badge } from './views/recall.js';
import { Tour } from './tour.js';
import './theme.js';

setCourse(toKey().startsWith('py/') ? 'py' : 'ml').then(() => {
  badge();
  route();
  if (!store.get('toured2', false) && toKey() === 'home') setTimeout(() => Tour.start(0), 900);
}).catch(() => { document.querySelector('.stage').insertAdjacentHTML('afterbegin', '<p class="loading" style="padding:40px">The course data didn\'t load. Reload the page to try again.</p>'); });
