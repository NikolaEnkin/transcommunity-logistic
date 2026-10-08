import './carousel.js';
import './header.js';
import './logo.js';
import './digital.js';

const disclosures = [...document.querySelectorAll('.language-picker, .mobile-menu, .services-picker')];
for (const details of disclosures) {
  details.addEventListener('toggle', () => {
    if (details.open) for (const other of disclosures) if (other !== details) other.open = false;
  });
}
document.addEventListener('click', (event) => {
  for (const details of disclosures) if (!details.contains(event.target)) details.open = false;
});
document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;
  for (const details of disclosures) if (details.open) {
    details.open = false;
    details.querySelector('summary').focus({preventScroll: true});
  }
});

const tabs = [...document.querySelectorAll('[data-service-tab]')];
const panels = [...document.querySelectorAll('[data-service-panel]')];
if (tabs.length) {
  document.querySelector('.service-tabs').setAttribute('role', 'tablist');
  function select(id, focus = false) {
    for (const tab of tabs) {
      const active = tab.dataset.serviceTab === id;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
    }
    for (const panel of panels) panel.hidden = panel.dataset.servicePanel !== id;
  }
  tabs.forEach((tab, i) => {
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', `service-${tab.dataset.serviceTab}`);
    tab.addEventListener('click', (event) => {
      event.preventDefault();
      select(tab.dataset.serviceTab);
      history.replaceState(null, '', `#service-${tab.dataset.serviceTab}`);
    });
    tab.addEventListener('keydown', (event) => {
      let target;
      if (event.key === 'ArrowRight') target = tabs[(i + 1) % tabs.length];
      if (event.key === 'ArrowLeft') target = tabs[(i - 1 + tabs.length) % tabs.length];
      if (event.key === 'Home') target = tabs[0];
      if (event.key === 'End') target = tabs.at(-1);
      if (event.key === ' ') target = tab;
      if (target) {
        event.preventDefault();
        select(target.dataset.serviceTab, true);
      }
    });
  });
  for (const panel of panels) {
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', `tab-${panel.dataset.servicePanel}`);
    panel.tabIndex = 0;
  }
  function syncHash() {
    const id = location.hash.replace('#service-', '');
    select(tabs.some(t => t.dataset.serviceTab === id) ? id : tabs[0].dataset.serviceTab);
  }
  syncHash();
  window.addEventListener('hashchange', syncHash);
}

const form = document.querySelector('#enquiry-form');
if (form) {
  form.noValidate = true;
  const status = document.querySelector('#form-status');
  const notice = document.querySelector('#form-mode');
  const submit = form.querySelector('[type="submit"]');
  const service = form.elements.service;
  const detailFields = [...form.querySelectorAll('[data-detail-field]')];
  let requestId, lastPayload, busy = false;
  const requested = new URLSearchParams(location.search).get('service');
  if ([...service.options].some(option => option.value === requested)) service.value = requested;
  function syncFields() {
    let visible = false;
    for (const wrapper of detailFields) {
      const active = wrapper.dataset.services.split(' ').includes(service.value);
      const input = wrapper.querySelector('input');
      wrapper.hidden = !active; input.disabled = !active; input.required = active;
      input.setAttribute('aria-invalid', 'false');
      document.getElementById(`${input.id}-error`).textContent = '';
      visible ||= active;
      const label = wrapper.querySelector('label');
      if (!label.querySelector('span')) {
        const star = document.createElement('span'); star.setAttribute('aria-hidden', 'true'); star.textContent = ' *'; label.append(star);
      }
    }
    document.querySelector('#service-fields').hidden = !visible;
  }
  syncFields();
  service.addEventListener('change', syncFields);
  function errorText(code) {
    return code === 'email' ? form.dataset.emailError : code === 'length' ? form.dataset.tooLong : form.dataset.required;
  }
  function setError(field, message) {
    field.setAttribute('aria-invalid', String(Boolean(message)));
    const error = document.getElementById(`${field.id}-error`);
    if (error) error.textContent = message;
  }
  function validate(field) {
    let message = '';
    if (field.required && !field.value.trim()) message = form.dataset.required;
    else if (field.type === 'email' && field.value && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(field.value)) message = form.dataset.emailError;
    else if (!field.validity.valid) message = field.validity.tooLong ? form.dataset.tooLong : form.dataset.required;
    setError(field, message); return !message;
  }
  form.addEventListener('input', event => {
    if (busy) return;
    if (event.target.getAttribute('aria-invalid') === 'true') validate(event.target);
    status.textContent = ''; delete status.dataset.state;
  });
  submit.disabled = true;
  fetch('/api/contact-config', {signal: AbortSignal.timeout(8000)}).then(async response => {
    if (!response.ok) throw new Error('Unavailable');
    const config = await response.json();
    if (!['local','inbox','smtp','disabled'].includes(config.mode)) throw new Error('Invalid mode');
    notice.textContent = config.mode === 'local' ? form.dataset.localNotice : config.mode === 'inbox' ? form.dataset.inboxNotice : config.mode === 'disabled' ? form.dataset.unavailable : form.dataset.smtpNotice;
    if (config.mode === 'disabled') return;
    submit.disabled = false;
  }).catch(() => { notice.textContent = form.dataset.unavailable; });

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || submit.disabled) return;
    const controls = [...form.querySelectorAll('input, select, textarea')].filter(field => !field.disabled && field.type !== 'hidden' && field.name !== 'website');
    if (!controls.map(validate).every(Boolean)) {
      status.textContent = form.dataset.invalid; status.dataset.state = 'error';
      form.querySelector('[aria-invalid="true"]').focus(); return;
    }
    const data = Object.fromEntries(new FormData(form));
    data.enhanced = true;
    const signature = JSON.stringify(data);
    if (signature !== lastPayload) { requestId = crypto.randomUUID(); lastPayload = signature; }
    data.requestId = requestId;
    busy = true; submit.disabled = true; submit.textContent = form.dataset.sending;
    form.setAttribute('aria-busy', 'true');
    for (const control of controls) control.disabled = true;
    let focusTarget = status;
    try {
      const response = await fetch('/api/enquiries', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data), signal:AbortSignal.timeout(22000)});
      const result = await response.json();
      if (!response.ok || result.ok !== true) {
        status.dataset.state = 'error';
        status.textContent = response.status === 429 ? form.dataset.limited : response.status === 422 ? form.dataset.invalid : form.dataset.failure;
        for (const [key,code] of Object.entries(result.errors || {})) {
          const field = form.elements.namedItem(key);
          if (field && controls.includes(field)) { setError(field,errorText(code)); if (focusTarget === status) focusTarget = field; }
        }
      } else {
        status.dataset.state = 'success';
        status.textContent = `${result.mode === 'local' ? form.dataset.localSuccess : result.mode === 'inbox' ? form.dataset.inboxSuccess : form.dataset.success} ${form.dataset.receipt}: ${result.id}`;
        const chosen = service.value; form.reset(); service.value = chosen;
        lastPayload = undefined; requestId = undefined;
      }
    } catch {
      status.dataset.state = 'error'; status.textContent = form.dataset.failure;
    } finally {
      for (const control of controls) control.disabled = false;
      busy = false; submit.disabled = false; submit.textContent = form.dataset.submit;
      form.removeAttribute('aria-busy');
      // Keep server field errors visible; sync only clears irrelevant service fields.
      for (const wrapper of detailFields) wrapper.querySelector('input').disabled = wrapper.hidden;
      focusTarget.focus();
    }
  });
}
