// starts the app once the view partials are in the page
import { $, store, setCourse } from './core.js';
import { route } from './router.js';
import { HeroBg, FeatViz } from './views/home.js';
import { badge } from './views/recall.js';
import { Tour } from './tour.js';
import './theme.js';

setCourse(/^#py\//.test(location.hash) ? 'py' : 'ml').then(() => {
  $('#readLink').href = '#' + store.get('lastRead', 'py/ch1');
  badge(); HeroBg.init(); FeatViz.init();
  route();
  if (!store.get('toured2', false) && (!location.hash || location.hash === '#home')) setTimeout(() => Tour.start(0), 900);
}).catch(() => { document.querySelector('.stage').insertAdjacentHTML('afterbegin', '<p class="loading" style="padding:40px">The course data didn\'t load. Reload the page to try again.</p>'); });
