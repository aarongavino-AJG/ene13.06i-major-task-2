'use strict';

(() => {
  const slider = document.querySelector('.photo-story');
  if (!slider) return;
  const slides = [...slider.querySelectorAll('.slide')];
  const thumbs = slider.querySelector('.thumbnail-list');
  const current = slider.querySelector('[data-current]');
  const liveStatus = slider.querySelector('[data-live-status]');
  const progress = slider.querySelector('.story-progress-fill');
  const playButton = slider.querySelector('[data-play]');
  const dialog = document.querySelector('#photo-dialog');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let active = 0;
  let playing = false;
  let interval = null;
  let hovering = false;
  let focused = false;
  let pointerStart = null;
  const pad = (number) => String(number).padStart(2, '0');

  const thumbButtons = slides.map((slide, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumbnail' + (index === 0 ? ' is-active' : '');
    button.setAttribute('aria-label', `View photo ${index + 1}: ${slide.querySelector('h3').textContent}`);
    button.setAttribute('aria-current', index === 0 ? 'true' : 'false');
    const photo = document.createElement('span');
    photo.className = 'thumb-photo';
    const img = slide.querySelector('img').cloneNode(true);
    img.alt = '';
    img.loading = 'eager';
    photo.append(img);
    const number = document.createElement('span');
    number.className = 'thumbnail-number';
    number.textContent = pad(index + 1);
    number.setAttribute('aria-hidden', 'true');
    button.append(photo, number);
    button.addEventListener('click', () => { setPlaying(false); goTo(index); });
    thumbs.append(button);
    return button;
  });

  function refreshTimer() {
    window.clearInterval(interval);
    interval = null;
    if (playing && !hovering && !focused && !document.hidden && !dialog.open) {
      interval = window.setInterval(() => goTo(active + 1, false), 6500);
    }
  }

  function setPlaying(value) {
    playing = value;
    playButton.setAttribute('aria-pressed', String(value));
    playButton.setAttribute('aria-label', value ? 'Pause automatic slideshow' : 'Play automatic slideshow');
    playButton.querySelector('[data-play-label]').textContent = value ? 'Pause story' : 'Play story';
    playButton.querySelector('[data-play-icon]').innerHTML = value
      ? '<path d="M8 5v14M16 5v14"/>'
      : '<path d="m9 5 10 7-10 7Z"/>';
    refreshTimer();
  }

  function updateDialog() {
    const slide = slides[active];
    const photo = dialog.querySelector('.lightbox-image');
    const img = slide.querySelector('img').cloneNode(true);
    img.loading = 'eager';
    photo.replaceChildren(img);
    dialog.querySelector('[data-dialog-count]').textContent = `Photo ${pad(active + 1)} of ${pad(slides.length)}`;
    dialog.querySelector('#dialog-heading').textContent = slide.querySelector('h3').textContent;
    dialog.querySelector('[data-dialog-caption]').textContent = slide.querySelector('.caption-text').textContent;
  }

  function goTo(index, announce = true) {
    const next = ((index % slides.length) + slides.length) % slides.length;
    if (next === active) return;
    active = next;
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === active);
      slide.setAttribute('aria-hidden', String(i !== active));
      slide.inert = i !== active;
      thumbButtons[i].classList.toggle('is-active', i === active);
      thumbButtons[i].setAttribute('aria-current', String(i === active));
    });
    current.textContent = pad(active + 1);
    progress.style.width = `${((active + 1) / slides.length) * 100}%`;
    const button = thumbButtons[active];
    // Move only the thumbnail strip. Never move the reader's page.
    const target = button.offsetLeft - thumbs.offsetLeft - (thumbs.clientWidth - button.clientWidth) / 2;
    thumbs.scrollTo({ left: Math.max(0, target), behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    if (announce) liveStatus.textContent = `Photo ${active + 1} of ${slides.length}. ${slides[active].querySelector('h3').textContent}. ${slides[active].querySelector('.caption-text').textContent}`;
    if (dialog.open) updateDialog();
  }

  slider.querySelector('[data-prev]').addEventListener('click', () => { setPlaying(false); goTo(active - 1); });
  slider.querySelector('[data-next]').addEventListener('click', () => { setPlaying(false); goTo(active + 1); });
  playButton.addEventListener('click', () => setPlaying(!playing));
  slides.forEach((slide, i) => { slide.inert = i !== 0; });

  function handleKeys(event) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    if (event.target.matches('input, textarea, select, [contenteditable="true"]')) return;
    event.preventDefault();
    setPlaying(false);
    if (event.key === 'Home') goTo(0);
    else if (event.key === 'End') goTo(slides.length - 1);
    else goTo(active + (event.key === 'ArrowRight' ? 1 : -1));
  }
  slider.addEventListener('keydown', handleKeys);
  dialog.addEventListener('keydown', handleKeys);

  // Automatic playback is opt-in and pauses while the reader interacts.
  slider.addEventListener('pointerenter', (event) => { if (event.pointerType === 'mouse') { hovering = true; refreshTimer(); } });
  slider.addEventListener('pointerleave', () => { hovering = false; refreshTimer(); });
  slider.addEventListener('focusin', () => { focused = true; refreshTimer(); });
  slider.addEventListener('focusout', (event) => { focused = slider.contains(event.relatedTarget); refreshTimer(); });
  document.addEventListener('visibilitychange', refreshTimer);
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) setPlaying(false); });

  const stage = slider.querySelector('.story-stage');
  stage.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button') || event.pointerType === 'mouse') return;
    pointerStart = { x: event.clientX, y: event.clientY };
  });
  stage.addEventListener('pointerup', (event) => {
    if (!pointerStart) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    pointerStart = null;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      setPlaying(false);
      goTo(active + (dx < 0 ? 1 : -1));
    }
  });
  stage.addEventListener('pointercancel', () => { pointerStart = null; });

  const expandButton = slider.querySelector('[data-expand]');
  expandButton.addEventListener('click', () => {
    setPlaying(false);
    updateDialog();
    dialog.showModal();
    document.body.classList.add('modal-open');
    dialog.querySelector('[data-close-dialog]').focus();
  });
  dialog.querySelector('[data-close-dialog]').addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-dialog-prev]').addEventListener('click', () => goTo(active - 1));
  dialog.querySelector('[data-dialog-next]').addEventListener('click', () => goTo(active + 1));
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => { document.body.classList.remove('modal-open'); expandButton.focus(); });

  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.querySelector('.main-nav');
  function closeMenu() { menu.classList.remove('is-open'); menuButton.setAttribute('aria-expanded', 'false'); menuButton.setAttribute('aria-label', 'Open navigation'); }
  menuButton.addEventListener('click', () => {
    const open = menu.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
  document.addEventListener('click', event => { if (!event.target.closest('.header-inner')) closeMenu(); });

  const navLinks = [...menu.querySelectorAll('a')];
  const observed = navLinks.map(link => document.querySelector(link.getAttribute('href'))).filter(Boolean);
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      navLinks.forEach(link => {
        const selected = link.getAttribute('href') === `#${entry.target.id}`;
        link.classList.toggle('current', selected);
        if (selected) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
      });
    });
  }, { rootMargin: '-10% 0px -65% 0px', threshold: 0 });
  observed.forEach(section => observer.observe(section));
})();
