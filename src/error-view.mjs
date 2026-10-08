import {company, languages, href} from './content.mjs';
import {renderBrand} from './brand-view.mjs';

export const errorContent = {
  bg: {
    home: 'Към началната страница', language: 'Език', status: 'Грешка',
    400: ['Нека опитаме отначало.', 'Не успяхме да обработим тази заявка. Проверете адреса или продължете от началната страница.'],
    404: ['Тази страница не е намерена.', 'Възможно е адресът да е променен или страницата да е преместена. Продължете от началната страница.'],
    500: ['Възникна временен проблем.', 'Не успяхме да отворим страницата. Опитайте отново след малко или се върнете към началната страница.'],
  },
  en: {
    home: 'Back to home', language: 'Language', status: 'Error',
    400: ['Let’s start again.', 'We could not process this request. Check the address or continue from the home page.'],
    404: ['This page could not be found.', 'The address may have changed or the page may have moved. Continue from the home page.'],
    500: ['A temporary problem occurred.', 'We could not open the page. Try again shortly or return to the home page.'],
  },
  fr: {
    home: 'Retour à l’accueil', language: 'Langue', status: 'Erreur',
    400: ['Reprenons depuis le début.', 'Nous n’avons pas pu traiter cette demande. Vérifiez l’adresse ou repartez de la page d’accueil.'],
    404: ['Cette page est introuvable.', 'L’adresse a peut-être changé ou la page a été déplacée. Continuez depuis la page d’accueil.'],
    500: ['Un problème temporaire est survenu.', 'Nous n’avons pas pu ouvrir la page. Réessayez dans quelques instants ou revenez à l’accueil.'],
  },
  de: {
    home: 'Zur Startseite', language: 'Sprache', status: 'Fehler',
    400: ['Beginnen wir noch einmal.', 'Diese Anfrage konnte nicht verarbeitet werden. Prüfen Sie die Adresse oder gehen Sie zur Startseite.'],
    404: ['Diese Seite wurde nicht gefunden.', 'Die Adresse wurde möglicherweise geändert oder die Seite verschoben. Gehen Sie zur Startseite.'],
    500: ['Ein vorübergehendes Problem ist aufgetreten.', 'Die Seite konnte nicht geöffnet werden. Versuchen Sie es später erneut oder gehen Sie zur Startseite.'],
  },
};

const escape = value => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

export function renderErrorPage(status, lang = 'bg') {
  if (!Object.hasOwn(errorContent, lang)) lang = 'bg';
  if (![400, 404, 500].includes(status)) status = 500;
  const t = errorContent[lang], [title, description] = t[status];
  const route = locale => `${locale === 'bg' ? '' : '/' + locale}/${status}.html`;
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex, nofollow"><meta name="theme-color" content="#f3f6f9"><title>${status} — ${escape(title)} | ${escape(company.name)}</title><link rel="icon" href="/favicon.ico"><link rel="stylesheet" href="/assets/fonts.css"><link rel="stylesheet" href="/styles.css"><script src="/hero.js"></script><script type="module" src="/logo.js"></script></head><body class="recovery-page" data-error="${status}"><header class="recovery-header container"><a class="recovery-brand" href="${href(lang)}">Transcommunity Logistic</a><nav class="recovery-languages" aria-label="${escape(t.language)}">${Object.entries(languages).map(([locale, name]) => `<a href="${route(locale)}" lang="${locale}" hreflang="${locale}" aria-label="${escape(name)}"${locale === lang ? ' aria-current="page"' : ''}>${locale.toUpperCase()}</a>`).join('')}</nav></header><main class="recovery-main container"><div class="recovery-heading" data-hero-introduction><p class="recovery-status">${escape(t.status)} <span>${status}</span></p><h1>${escape(title)}</h1></div>${renderBrand(lang)}<div class="recovery-action"><p>${escape(description)}</p><a class="button button-primary" href="${href(lang)}">${escape(t.home)}</a></div></main></body></html>`;
}
