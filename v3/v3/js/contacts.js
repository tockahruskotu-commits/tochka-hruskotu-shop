import { CONFIG } from './config.js';
import { initAnalytics, track } from './analytics.js';
import { initCartDrawer } from './cart-drawer.js';
import { mountSiteShell } from './ui.js';
function setHref(selector,value){const node=document.querySelector(selector);if(node)node.href=value;}
function boot(){mountSiteShell({active:'contacts'});initAnalytics();initCartDrawer();document.querySelector('[data-contact-phone-text]').textContent=CONFIG.business.phone;document.querySelector('[data-contact-phone]').href=`tel:${CONFIG.business.phone.replace(/\s/g,'')}`;document.querySelector('[data-contact-email-text]').textContent=CONFIG.business.email;document.querySelector('[data-contact-email]').href=`mailto:${CONFIG.business.email}`;setHref('[data-contact-telegram]',CONFIG.social.telegram);setHref('[data-google-profile]',CONFIG.google.profile);document.addEventListener('click',(event)=>{const link=event.target.closest('[data-contact-channel]');if(link)track(`click_${link.getAttribute('data-contact-channel')}`);});}boot();
