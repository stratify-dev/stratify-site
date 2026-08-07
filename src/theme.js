const root = document.documentElement;
const live = document.querySelector('.sr-live');

document.querySelector('.theme-toggle')?.addEventListener('click', () => {
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
  root.dataset.theme = next;
  localStorage.setItem('stratify-theme', next);
  if (live) live.textContent = `${next} theme`;
});

for (const button of document.querySelectorAll('[data-copy]')) {
  button.addEventListener('click', async () => {
    const source = document.querySelector(button.dataset.copy);
    if (!source) return;
    try {
      await navigator.clipboard.writeText(source.innerText.trim());
      button.classList.add('copied');
      if (live) live.textContent = 'Copied to clipboard';
      setTimeout(() => button.classList.remove('copied'), 1600);
    } catch {
      if (live) live.textContent = 'Copy failed, select the text instead';
    }
  });
}

const reveals = document.querySelectorAll('[data-reveal]');
if (reveals.length && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('is-visible');
      io.unobserve(entry.target);
    }
  }, { rootMargin: '0px 0px -12% 0px' });
  reveals.forEach((el, i) => {
    el.style.setProperty('--reveal-index', String(i % 6));
    io.observe(el);
  });
} else {
  reveals.forEach((el) => el.classList.add('is-visible'));
}
