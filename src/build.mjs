import { mkdir, cp, writeFile, readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { company, languages, pages, href } from './content.mjs';
import { content, allPages, serviceFields, detailPages } from './upgrades.mjs';
import { createHash } from 'node:crypto';
import { carouselContent, heroImages } from './carousel-content.mjs';
import { renderBrand } from './brand-view.mjs';
import { renderErrorPage } from './error-view.mjs';
import { renderDigital } from './digital-view.mjs';
const jsonHashes = new Set();

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'dist');
const originFlag = process.argv.indexOf('--origin');
const origin = (process.argv[originFlag + 1] && originFlag !== -1 ? process.argv[originFlag + 1] : process.env.SITE_ORIGIN || process.env.APP_ORIGIN || process.env.RENDER_EXTERNAL_URL || 'https://www.transcommunitylogistic.com').replace(/\/$/, '');
if (!/^https:\/\/[^/?#]+$/.test(origin)) throw new Error('Site origin must be an HTTPS origin without a path.');
const esc = (s) => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const lines = (s) => esc(s).replaceAll('\n', '<br>');
const iconPaths = {
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a17 17 0 0 1 0 20 17 17 0 0 1 0-20M2 12h20"/>',
  warehouse: '<path d="M3 21V8l9-5 9 5v13M3 11h18M7 21v-6h10v6M10 15v6"/>',
  partners: '<rect x="2" y="3" width="8" height="6" rx="1"/><rect x="14" y="15" width="8" height="6" rx="1"/><path d="M6 9v9h8M18 15V6h-8"/>',
  consulting: '<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12a22 22 0 0 0 18 0M12 12v3"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2.1Z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconPaths[name]}</svg>`;
const serviceIcon = (id) => icon({ warehousing: 'warehouse', trade: 'globe', partners: 'partners', consulting: 'consulting' }[id]);
const button = (label, link, style = 'primary') => `<a class="button button-${style}" href="${esc(link)}">${esc(label)}</a>`;
const list = (items, cls = '') => `<ul class="clean-list ${cls}">${items.map(x => `<li>${icon('check')}<span>${esc(x)}</span></li>`).join('')}</ul>`;

function header(lang, page, t) {
  const links = pages.filter(x => x !== 'index' && x !== 'contacts').map(p => `<a href="${href(lang, p)}"${p === page ? ' aria-current="page"' : ''}>${esc(t.nav[p])}</a>`).join('');
  return `<a class="skip-link" href="#main">${esc(t.ui.skip)}</a>
  <header class="site-header"><div class="container header-inner">
    <a class="brand" href="${href(lang)}" aria-label="${company.name} — ${esc(t.nav.index)}"><img src="/assets/logo.png" width="1502" height="628" alt="" fetchpriority="high"><span>Transcommunity<strong>Logistic</strong></span></a>
    <nav class="desktop-nav" aria-label="${esc(t.ui.navigation)}"><details class="services-picker"><summary>${esc(t.upgrade.services)}${icon('chevron')}</summary><div class="services-options">${t.services.map(s=>`<a href="${href(lang,s.page)}"${page===s.page?' aria-current="page"':''}>${serviceIcon(s.id)}${esc(s.title)}</a>`).join('')}</div></details><a href="${href(lang,'digital-solutions')}"${page==='digital-solutions'?' aria-current="page"':''}>${esc(t.digital.nav)}</a>${links}</nav>
    <div class="header-actions"><details class="language-picker"><summary aria-label="${esc(t.ui.language)}: ${lang.toUpperCase()} — ${esc(languages[lang])}">${icon('globe')}<span>${lang.toUpperCase()}</span>${icon('chevron')}</summary><nav class="language-options" aria-label="${esc(t.ui.language)}">${Object.entries(languages).map(([l, label]) => `<a href="${href(l, page)}" lang="${l}" hreflang="${l}"${l === lang ? ' aria-current="true"' : ''}>${esc(label)}${l === lang ? icon('check') : ''}</a>`).join('')}</nav></details>
    <a class="button button-primary header-contact" href="${href(lang, 'contacts')}">${esc(t.ui.contact)}</a>
    <details class="mobile-menu"><summary aria-label="${esc(t.ui.menu)}">${icon('menu')}</summary><nav class="mobile-nav" aria-label="${esc(t.ui.navigation)}"><a href="${href(lang)}"${page === 'index' ? ' aria-current="page"' : ''}>${esc(t.nav.index)}</a>${t.services.map(s=>`<a class="mobile-service" href="${href(lang,s.page)}"${page===s.page?' aria-current="page"':''}>${serviceIcon(s.id)}${esc(s.title)}</a>`).join('')}<a href="${href(lang,'digital-solutions')}"${page==='digital-solutions'?' aria-current="page"':''}>${esc(t.digital.nav)}</a>${links}<a href="${href(lang,'contacts')}">${esc(t.nav.contacts)}</a><a class="mobile-phone" href="tel:${company.tel}">${icon('phone')}${company.telephone}</a></nav></details></div>
  </div></header>`;
}

function footer(lang, t) {
  return `<footer class="site-footer"><div class="container footer-main"><div class="footer-brand"><a href="${href(lang)}"><img src="/assets/logo.png" width="1502" height="628" alt="${company.name}" loading="lazy"></a><p>${esc(t.ui.footer)}</p></div><nav aria-label="${esc(t.ui.footerNavigation)}">${allPages.filter(p => p !== 'index').map(p => `<a href="${href(lang,p)}">${esc(t.nav[p])}</a>`).join('')}</nav><address><span>${esc(t.ui.location)}</span><p>${esc(t.ui.addressText)}</p><a href="tel:${company.tel}">${company.telephone}</a><a class="email-link" href="mailto:${company.email}">${company.email}</a></address></div><div class="container footer-bottom"><small>© ${new Date().getFullYear()} ${company.name}. ${esc(t.ui.copyright)}</small><nav aria-label="${esc(t.ui.footerLanguage)}">${Object.entries(languages).map(([l,n]) => `<a href="${href(l)}" lang="${l}" hreflang="${l}">${esc(n)}</a>`).join('')}</nav></div></footer>`;
}

function cta(lang, t) {
  return `<section class="contact-banner"><div class="container banner-inner"><div><h2>${esc(t.cta.title)}</h2><p>${esc(t.cta.text)}</p></div>${button(t.ui.contact, href(lang,'contacts'), 'brass')}</div></section>`;
}

function focus(lang, t) {
  return `<section class="section focus-section"><div class="container focus-grid"><div><h2>${esc(t.focus.title)}</h2><p>${esc(t.focus.text)}</p>${button(t.focus.cta,href(lang,'strategy'),'outline')}</div><div class="market-diagram" role="group" aria-label="${esc(t.focus.label)}"><p class="diagram-label">${esc(t.focus.label)}</p><div class="market-routes"><div class="market-base">${icon('pin')}<strong>${esc(t.focus.base)}</strong><span>${esc(t.ui.location.split(', ')[1] || t.ui.location)}</span></div><div class="market-destinations">${t.focus.regions.map(r=>`<span>${esc(r)}</span>`).join('')}</div></div></div></div></section>`;
}

function home(lang, t) {
  const c=carouselContent[lang];
  return `<section class="hero carousel-hero" data-hero-carousel data-interval="4000"><div class="hero-carousel" aria-hidden="true"><div class="carousel-images">${heroImages.map((image,i)=>`<figure class="hero-slide" data-carousel-slide="${i}"${i===0?' data-active="true"':''}><img ${i===0?'src':'data-src'}="${image.src}" width="${image.width}" height="${image.height}" alt="" ${i===0?'fetchpriority="high"':'loading="lazy"'} decoding="async"></figure>`).join('')}</div></div><div class="container hero-inner"><div class="hero-copy"><h1>${lines(t.hero.title)}</h1><p>${esc(t.hero.text)}</p><div class="hero-actions">${button(c.contact,href(lang,'contacts'),'brass')}<a class="text-link" href="#services">${esc(t.ui.explore)}</a></div></div></div><div class="hero-base"><div class="container">${icon('pin')}<span>${esc(t.hero.base)}</span></div></div></section><div class="brand-slogan"><div class="container"><p>${t.hero.caption.split(/(?<=\.) /u).map(sentence=>`<span>${esc(sentence)}</span>`).join(' ')}</p><svg class="slogan-flourish" viewBox="0 0 300 36" width="300" height="36" aria-hidden="true" focusable="false"><defs><linearGradient id="slogan-ink"><stop stop-color="#96723b"/><stop offset=".46" stop-color="#b39761"/><stop offset=".7" stop-color="#5279ac"/><stop offset="1" stop-color="#142e48"/></linearGradient></defs><path fill="url(#slogan-ink)" d="M4 5C76-5 112 43 166 21C209 3 252 9 296 33C251 5 209 0 166 15C115 36 72-1 4 5Z"/></svg></div></div>
  <section id="services" class="services-section"><div class="container"><h2 class="sr-only">${esc(t.ui.services)}</h2><nav class="service-tabs" aria-label="${esc(t.ui.selectService)}">${t.services.map((s,i)=>`<a id="tab-${s.id}" href="#service-${s.id}" class="service-tab" data-service-tab="${s.id}">${serviceIcon(s.id)}<span>${esc(s.title)}</span></a>`).join('')}</nav><div class="service-panels">${t.services.map(s=>`<section id="service-${s.id}" class="service-panel" data-service-panel="${s.id}"><div><p class="service-short">${esc(s.short)}</p><h2>${esc(s.title)}</h2><p>${esc(s.text)}</p><a class="text-link dark-link" href="${href(lang,s.page)}">${esc(t.upgrade.detail)}</a></div><div class="service-included"><h3>${esc(t.ui.included)}</h3>${list(s.items)}</div></section>`).join('')}</div></div></section>
  <section class="section company-section"><div class="container company-grid"><div class="company-intro"><h2>${esc(t.intro.title)}</h2><p>${esc(t.intro.text)}</p><p>${esc(t.intro.detail)}</p>${button(t.ui.company,href(lang,'about'),'outline')}</div><div class="advantages"><h3>${esc(t.intro.advantagesTitle)}</h3>${list(t.intro.advantages,'advantage-list')}</div></div></section><section class="section digital-teaser"><div class="container"><div><h2>${esc(t.digital.teaserTitle)}</h2><p>${esc(t.digital.teaserText)}</p></div>${button(t.digital.explore,href(lang,'digital-solutions'),'brass')}</div></section>${processSection(t)}${trust(lang,t)}${focus(lang,t)}${cta(lang,t)}`;
}

function pageHero(lang,page,title,subtitle,t) {
  if (page === 'contacts') {
    return `<section class="page-hero contact-hero"><div class="container contact-hero-grid"><nav class="breadcrumbs" aria-label="${esc(t.ui.pageNav)}"><a href="${href(lang)}">${esc(t.nav.index)}</a><span aria-hidden="true">/</span><span>${esc(t.nav[page])}</span></nav><div class="contact-hero-copy" data-hero-introduction><h1>${lines(title)}</h1><p>${esc(subtitle)}</p></div>${renderBrand(lang)}</div></section>`;
  }
  return `<section class="page-hero"><div class="container"><nav class="breadcrumbs" aria-label="${esc(t.ui.pageNav)}"><a href="${href(lang)}">${esc(t.nav.index)}</a><span aria-hidden="true">/</span><span>${esc(t.nav[page])}</span></nav><div class="hero-introduction" data-hero-introduction><h1>${lines(title)}</h1><p>${esc(subtitle)}</p></div></div></section>`;
}

function about(lang,t) {
  const a=t.about;
  return `${pageHero(lang,'about',a.title,a.subtitle,t)}<section class="section"><div class="container about-intro"><div class="reading-copy"><h2>${esc(t.intro.title)}</h2><p>${esc(t.intro.text)}</p><p>${esc(t.intro.detail)}</p></div><figure class="company-figure"><img src="/assets/company.jpg" alt="${esc(t.ui.marketsAlt)}" width="418" height="418" loading="lazy"><figcaption>${esc(t.ui.imageAlt)}</figcaption></figure></div></section><section class="mission-section"><div class="container mission-grid"><div><h2>${esc(a.missionTitle)}</h2><p>${esc(a.mission)}</p></div><div><h2>${esc(a.visionTitle)}</h2><p>${esc(a.vision)}</p></div></div></section><section class="section"><div class="container context-grid"><div><h2>${esc(a.environmentTitle)}</h2>${list(a.environment)}</div><div><h2>${esc(a.opportunitiesTitle)}</h2>${list(a.opportunities)}</div></div></section>${trust(lang,t)}${cta(lang,t)}`;
}

function strategy(lang,t) {
  const s=t.strategy;
  return `${pageHero(lang,'strategy',s.title,s.subtitle,t)}<section class="section"><div class="container strategy-intro"><div><h2>${esc(s.goalsTitle)}</h2>${list(s.goals,'large-list')}</div><img class="market-image" src="/assets/markets.jpg" alt="${esc(t.ui.marketsAlt)}" width="1920" height="980" loading="lazy"></div></section><section class="section methods-section"><div class="container"><h2>${esc(s.methodsTitle)}</h2><div class="method-grid">${s.methods.map((m,i)=>`<article class="method"><span class="method-icon">${icon(['consulting','warehouse','partners','globe'][i])}</span><h3>${esc(m.title)}</h3><p>${esc(m.text)}</p></article>`).join('')}</div><aside class="development-note"><h3>${esc(s.ambition)}</h3><p>${esc(s.ambitionText)}</p></aside></div></section>${focus(lang,t)}${cta(lang,t)}`;
}

function purpose(lang,t) {
  const p=t.purpose;
  return `${pageHero(lang,'purpose',p.title,p.subtitle,t)}<section class="section audience-section"><div class="container"><h2>${esc(p.audienceTitle)}</h2><div class="audience-grid">${p.audience.map((a,i)=>`<article class="audience-item">${icon(['consulting','warehouse','globe','partners'][i])}<div><h3>${esc(a.title)}</h3><p>${esc(a.text)}</p><a class="text-link dark-link" href="${href(lang,'contacts')}">${esc(t.ui.contact)}</a></div></article>`).join('')}</div></div></section><section class="section goals-section"><div class="container goals-grid"><h2>${esc(p.goalsTitle)}</h2>${list(p.goals,'large-list')}</div></section>${cta(lang,t)}`;
}

function processSection(t) {
  return `<section class="section process-section"><div class="container"><h2>${esc(t.upgrade.processTitle)}</h2><ol class="process-list">${t.upgrade.process.map(([title,text])=>`<li><h3>${esc(title)}</h3><p>${esc(text)}</p></li>`).join('')}</ol></div></section>`;
}
function trust(lang,t) {
  return `<section class="section trust-section"><div class="container trust-grid"><div><h2>${esc(t.upgrade.trustTitle)}</h2><p>${esc(t.upgrade.trustText)}</p>${button(t.ui.company,href(lang,'about'),'outline')}</div><dl class="company-facts"><div><dt>${esc(t.upgrade.companyLabel)}</dt><dd>${esc(t.upgrade.companyName)}</dd></div><div><dt>${esc(t.upgrade.baseLabel)}</dt><dd>${esc(t.ui.addressText)}</dd></div><div><dt>${esc(t.ui.phone)}</dt><dd><a href="tel:${company.tel}">${company.telephone}</a></dd></div><div><dt>${esc(t.ui.email)}</dt><dd><a href="mailto:${company.email}">${company.email}</a></dd></div></dl></div></section>`;
}
function servicePage(lang,t,page) {
  const s=t.services.find(s=>s.page===page), d=s.detail;
  return `${pageHero(lang,page,s.title,d.intro,t)}<section class="section"><div class="container service-detail-grid"><div><h2>${esc(t.ui.included)}</h2>${list(s.items,'large-list')}<p class="service-scope">${esc(d.note)}</p>${button(t.ui.contact,href(lang,'contacts')+'?service='+s.id)}</div><aside class="service-brief"><h2>${esc(t.upgrade.prepare)}</h2>${list(d.prepare)}<a class="text-link dark-link" href="${href(lang,'contacts')}?service=${s.id}">${esc(t.ui.contact)}</a></aside></div></section><section class="section company-section"><div class="container"><h2>${esc(t.upgrade.audience)}</h2>${list(d.audience,'audience-list')}</div></section>${processSection(t)}<section class="section"><div class="container"><h2>${esc(t.upgrade.related)}</h2><nav class="related-services" aria-label="${esc(t.upgrade.related)}">${t.services.filter(x=>x.id!==s.id).map(x=>`<a href="${href(lang,x.page)}">${serviceIcon(x.id)}<span>${esc(x.title)}</span></a>`).join('')}</nav></div></section>${cta(lang,t)}`;
}
function field(t,id,{type='text',required=false,autocomplete='off',max=200,textarea=false}={}) {
  const label=t.contact[id]||t.upgrade.form.fields[id];
  const attributes=`id="${id}" name="${id}" maxlength="${max}" autocomplete="${autocomplete}"${required?' required':''} aria-describedby="${id}-error"`;
  return `<div class="form-field"><label for="${id}">${esc(label)}${required?' <span aria-hidden="true">*</span>':''}</label>${textarea?`<textarea ${attributes} rows="5" placeholder="${esc(t.contact.messageHint)}"></textarea>`:`<input ${attributes} type="${type}">`}<span class="field-error" id="${id}-error"></span></div>`;
}
function contacts(lang,t) {
  const c=t.contact, f=t.upgrade.form;
  return `${pageHero(lang,'contacts',c.title,c.subtitle,t)}<section class="section contact-section"><div class="container contact-grid"><div class="contact-details"><h2>${esc(c.direct)}</h2><address><div class="contact-detail">${icon('pin')}<div><h3>${esc(t.ui.address)}</h3><p>${esc(t.ui.addressText)}</p><a class="text-link dark-link" href="${company.maps}" target="_blank" rel="noopener noreferrer">${esc(t.ui.directions)}</a></div></div><div class="contact-detail">${icon('phone')}<div><h3>${esc(t.ui.phone)}</h3><a class="contact-phone" href="tel:${company.tel}">${company.telephone}</a></div></div><div class="contact-detail">${icon('mail')}<div><h3>${esc(t.ui.email)}</h3><a class="email-link" href="mailto:${company.email}">${company.email}</a></div></div></address></div><div class="enquiry-surface"><h2>${esc(c.formTitle)}</h2><p>${esc(c.formText)}</p><p id="form-mode" class="form-mode">${esc(f.localNotice)}</p><form id="enquiry-form" action="/api/enquiries" method="post" data-required="${esc(c.required)}" data-invalid="${esc(c.invalid)}" data-email-error="${esc(c.invalidEmail)}" ${['sending','submit','localNotice','inboxNotice','smtpNotice','unavailable','localSuccess','inboxSuccess','success','receipt','failure','limited','tooLong'].map(k=>`data-${k.replace(/[A-Z]/g,m=>'-'+m.toLowerCase())}="${esc(f[k])}"`).join(' ')}><input type="hidden" name="language" value="${lang}"><div class="form-row">${field(t,'name',{required:true,autocomplete:'name',max:100})}${field(t,'email',{required:true,autocomplete:'email',type:'email',max:254})}</div><div class="form-row">${field(t,'phone',{type:'tel',autocomplete:'tel',max:50})}<div class="form-field"><label for="service">${esc(c.service)}</label><select id="service" name="service"><option value="">${esc(c.other)}</option>${t.services.map(s=>`<option value="${s.id}">${esc(s.title)}</option>`).join('')}<option value="digital">${esc(t.digital.nav)}</option></select></div></div><fieldset id="service-fields"><legend>${esc(f.details)}</legend>${Object.keys(f.fields).map(id=>`<div data-detail-field="${id}" data-services="${Object.entries(serviceFields).filter(([,fields])=>fields.includes(id)).map(([s])=>s).join(' ')}">${field(t,id)}</div>`).join('')}</fieldset>${field(t,'message',{textarea:true,required:true,max:1500})}<div class="form-trap" aria-hidden="true"><label for="website">Website</label><input id="website" name="website" tabindex="-1" autocomplete="off"></div><button class="button button-primary" type="submit">${esc(c.submit)}</button><p class="form-note">${esc(c.note)}</p><p id="form-status" class="form-status" role="status" aria-live="polite" tabindex="-1"></p><noscript><p class="form-note">${esc(f.noJs)}</p></noscript></form></div></div></section>`;
}

const views={'digital-solutions':(lang,t)=>renderDigital(lang,t,{esc,lines,button,href,list}),index:home,about,strategy,purpose,contacts,...Object.fromEntries(detailPages.map(p=>[p,(l,t)=>servicePage(l,t,p)]))};
function intro(lang) {
  const label = {bg:'Зареждане на уебсайта',en:'Loading the website',fr:'Chargement du site',de:'Website wird geladen'}[lang];
  return `<div id="site-intro" class="site-intro" hidden><div class="intro-inner"><img src="/assets/logo.png" width="1502" height="628" alt="${company.name}"><div class="intro-meter"><progress id="intro-progress" value="0" max="100" aria-label="${label}"></progress><output id="intro-percent" aria-hidden="true">0%</output></div></div></div>`;
}

function render(lang,page) {
  const t=content[lang];
  const title=page==='index'?`${t.services[0].title} | ${company.name} — ${t.focus.base}`:`${t.nav[page]} | ${company.name}`;
  const organization={'@type':'Organization','@id':origin+'/#organization',name:company.name,url:origin,email:company.email,telephone:company.tel,address:{'@type':'PostalAddress',streetAddress:'144 B Vasil Levski Street',addressLocality:'Plovdiv',postalCode:'4003',addressCountry:'BG'},logo:`${origin}/assets/logo.png`};
  const s=t.services.find(s=>s.page===page);
  const digital=page==='digital-solutions';
  const jsonLd=digital?{'@context':'https://schema.org','@graph':[organization,...t.digital.solutions.map(solution=>({'@type':'Service',name:solution.name,description:solution.intro,provider:{'@id':organization['@id']},url:origin+href(lang,page)+'#solution-'+solution.id}))]}:s?{'@context':'https://schema.org','@graph':[organization,{'@type':'Service',name:s.title,description:s.detail.intro,provider:{'@id':organization['@id']},url:origin+href(lang,page)}]}:{'@context':'https://schema.org',...organization};
  const json=JSON.stringify(jsonLd).replaceAll('<','\\u003c');
  jsonHashes.add(createHash('sha256').update(json).digest('base64'));
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#142E48"><meta name="trcl-refresh" content="normal"><script src="/intro.js"></script><script src="/hero.js"></script><title>${esc(title)}</title><meta name="description" content="${esc(t.meta[page])}"><link rel="canonical" href="${origin}${href(lang,page)}">${Object.keys(languages).map(l=>`<link rel="alternate" hreflang="${l}" href="${origin}${href(l,page)}">`).join('')}<link rel="alternate" hreflang="x-default" href="${origin}${href('bg',page)}"><meta property="og:type" content="website"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(t.meta[page])}"><meta property="og:locale" content="${{bg:'bg_BG',en:'en_GB',fr:'fr_FR',de:'de_DE'}[lang]}"><meta property="og:url" content="${origin}${href(lang,page)}"><link rel="icon" href="/favicon.ico"><link rel="stylesheet" href="/assets/fonts.css">${page==='index'?'<link rel="stylesheet" href="/assets/great-vibes.css">':''}<link rel="stylesheet" href="/styles.css"><script type="application/ld+json">${json}</script><script type="module" src="/main.js"></script></head><body data-page="${page}">${intro(lang)}<div id="site-content">${header(lang,page,t)}<main id="main" tabindex="-1">${views[page](lang,t)}</main>${footer(lang,t)}</div></body></html>`;
}

await mkdir(out,{recursive:true});
await cp(resolve(root,'public'),out,{recursive:true});
await cp(resolve(root,'src/styles.css'),resolve(out,'styles.css'));
await cp(resolve(root,'src/main.js'),resolve(out,'main.js'));
await cp(resolve(root,'src/intro.js'),resolve(out,'intro.js'));
await cp(resolve(root,'src/hero.js'),resolve(out,'hero.js'));
await cp(resolve(root,'src/carousel.js'),resolve(out,'carousel.js'));
await cp(resolve(root,'src/header.js'),resolve(out,'header.js'));
await cp(resolve(root,'src/logo.js'),resolve(out,'logo.js'));
await cp(resolve(root,'src/digital.js'),resolve(out,'digital.js'));
for(const lang of Object.keys(languages)) {
  const dir=lang==='bg'?out:resolve(out,lang);
  await mkdir(dir,{recursive:true});
  for(const page of allPages) await writeFile(resolve(dir,`${page}.html`),render(lang,page));
  for(const status of [400,404,500]) await writeFile(resolve(dir,`${status}.html`),renderErrorPage(status,lang));
}
await writeFile(resolve(out,'robots.txt'),`User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
await writeFile(resolve(out,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Object.keys(languages).flatMap(l=>allPages.map(p=>`<url><loc>${origin}${href(l,p)}</loc></url>`)).join('')}</urlset>`);
await writeFile(resolve(out,'_headers'),`/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: SAMEORIGIN\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: default-src 'self'; script-src 'self' ${[...jsonHashes].map(h=>`'sha256-${h}'`).join(' ')}; style-src 'self'; img-src 'self' data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self'\n/assets/*\n  Cache-Control: public, max-age=86400\n`);
console.log(`Built ${allPages.length * Object.keys(languages).length} localized pages in ${out}`);
