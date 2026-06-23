/** Reusable UI components */

export function $(id) { return document.getElementById(id); }

export function el(tag, attrs = {}, children = []) {
  const elem = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') elem.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(elem.style, v);
    else if (k.startsWith('on')) elem.addEventListener(k.slice(2), v);
    else if (k === 'html') elem.innerHTML = v;
    else elem.setAttribute(k, v);
  }
  for (const child of (Array.isArray(children) ? children : [children])) {
    if (typeof child === 'string') elem.appendChild(document.createTextNode(child));
    else if (child instanceof Node) elem.appendChild(child);
  }
  return elem;
}

export function clear(el) { el.innerHTML = ''; }

export function glassPanel(children, classes = '') {
  return el('div', { class: `glass-panel ${classes}` }, children);
}

export function statBadge(label, value, color = '') {
  return el('div', { class: 'stat-badge' }, [
    el('span', { class: 'stat-label' }, [label]),
    el('span', { class: 'stat-value', style: color ? `color:${color}` : {} }, [String(value)]),
  ]);
}

export function progressBar(pct, color = '#66dd88') {
  return el('div', { class: 'progress-track' }, [
    el('div', { class: 'progress-fill', style: { width: Math.min(100, Math.max(0, pct)) + '%', background: color } }),
  ]);
}

export function btn(text, onClick, primary = false, disabled = false) {
  return el('button', {
    class: `game-btn ${primary ? 'primary' : ''}`,
    disabled,
    onClick,
  }, [text]);
}

export function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const view = $(id);
  if (view) view.classList.add('active');
}

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
