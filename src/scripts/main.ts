import { initTheme } from './theme';
import { initSidebar } from './sidebar';
import { initTopicNav } from './topic';
import { initToc } from './toc';
import { initPalette } from './palette';
import { initPanels } from './panels';
import { initLightbox } from './lightbox';

// Astro defers component scripts (type="module"), so the DOM is ready here.
initTheme();
initSidebar();
initTopicNav();
initToc();
initPalette();
initPanels();
initLightbox();
