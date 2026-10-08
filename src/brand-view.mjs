import {company} from './content.mjs';
import {logoContent} from './logo-content.mjs';

const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export function renderBrand(lang) {
  const l = logoContent[lang] || logoContent.bg;
  return `<div class="brand-stage" data-brand-logo><div class="brand-static"><img src="/assets/logo.png" width="1502" height="628" alt="${escape(company.name)}"></div><button class="brand-controller" type="button" aria-label="${escape(l.label)}" aria-describedby="brand-logo-help" hidden><span class="brand-object" aria-hidden="true">${Array.from({length:5},()=>'<img class="brand-depth" src="/assets/logo.png" width="1502" height="628" alt="" draggable="false">').join('')}<img class="brand-face" src="/assets/logo.png" width="1502" height="628" alt="" draggable="false"></span></button><p id="brand-logo-help" class="sr-only">${escape(l.help)}</p></div>`;
}
