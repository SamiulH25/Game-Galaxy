const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function trapFocus(container: HTMLElement) {
  const getFocusable = () =>
    [...container.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
    );

  const previous = document.activeElement as HTMLElement | null;

  const focusFirst = () => {
    const items = getFocusable();
    (items[0] ?? container).focus();
  };

  requestAnimationFrame(focusFirst);

  function onKeydown(e: KeyboardEvent) {
    if (e.key !== 'Tab') return;
    const items = getFocusable();
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  container.addEventListener('keydown', onKeydown);

  return () => {
    container.removeEventListener('keydown', onKeydown);
    previous?.focus?.();
  };
}
