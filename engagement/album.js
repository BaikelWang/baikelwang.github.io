(() => {
  'use strict';
  const cards = [...document.querySelectorAll('.photo-grid [data-photo]')];
  const photos = cards.map(card => ({
    id: card.dataset.photo,
    src: card.getAttribute('href'),
    caption: card.dataset.caption,
    alt: card.querySelector('img').alt
  }));
  const dialog = document.querySelector('#photo-dialog');
  const image = document.querySelector('#lightbox-image');
  const caption = document.querySelector('#lightbox-caption');
  const counter = document.querySelector('#photo-counter');
  let current = 0;
  let opener = null;
  let touchStart = null;

  function renderPhoto(index) {
    current = (index + photos.length) % photos.length;
    const photo = photos[current];
    image.src = photo.src;
    image.alt = photo.alt;
    caption.textContent = photo.caption;
    counter.textContent = `${String(current + 1).padStart(2, '0')} / ${photos.length}`;
  }

  function closePhoto() {
    if (dialog.open) dialog.close();
  }

  document.querySelectorAll('[data-photo]').forEach(link => {
    link.addEventListener('click', event => {
      // Native image links remain usable without dialog support or with modifier keys.
      if (typeof dialog.showModal !== 'function' || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0) return;
      const index = photos.findIndex(photo => photo.id === link.dataset.photo);
      if (index < 0) return;
      event.preventDefault();
      opener = link;
      renderPhoto(index);
      dialog.showModal();
      document.body.classList.add('modal-open');
      dialog.querySelector('.close-lightbox').focus({preventScroll: true});
    });
  });
  dialog.querySelector('.close-lightbox').addEventListener('click', closePhoto);
  dialog.querySelector('.previous-photo').addEventListener('click', () => renderPhoto(current - 1));
  dialog.querySelector('.next-photo').addEventListener('click', () => renderPhoto(current + 1));
  dialog.addEventListener('keydown', event => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); renderPhoto(current - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); renderPhoto(current + 1); }
  });
  dialog.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    touchStart = null;
    if (opener && opener.isConnected) opener.focus({preventScroll: true});
  });
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) closePhoto();
  });
  image.addEventListener('touchstart', event => {
    if (event.touches.length !== 1) { touchStart = null; return; }
    touchStart = {x: event.touches[0].clientX, y: event.touches[0].clientY};
  }, {passive: true});
  image.addEventListener('touchend', event => {
    if (!touchStart || !event.changedTouches.length) return;
    const dx = event.changedTouches[0].clientX - touchStart.x;
    const dy = event.changedTouches[0].clientY - touchStart.y;
    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5) renderPhoto(current + (dx < 0 ? 1 : -1));
    touchStart = null;
  }, {passive: true});
  image.addEventListener('touchcancel', () => { touchStart = null; }, {passive: true});

  const blessingButton = document.querySelector('#blessing-button');
  const blessingStatus = document.querySelector('#blessing-status');
  const burst = document.querySelector('#heart-burst');
  blessingButton.addEventListener('click', () => {
    blessingStatus.textContent = '小心心收到啦！也祝你每天都被爱包围。';
    blessingButton.innerHTML = '<span aria-hidden="true">♥</span> 谢谢你的祝福';
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // A local-only celebration: no tracking, storage, or public blessing counter.
    burst.replaceChildren();
    for (let i = 0; i < 7; i++) {
      const heart = document.createElement('span');
      heart.className = 'floating-heart';
      heart.textContent = i % 2 ? '♡' : '♥';
      heart.style.setProperty('--x', `${(i - 3) * 25}px`);
      heart.style.setProperty('--rotate', `${(i - 3) * 12}deg`);
      heart.style.animationDelay = `${i * 0.08}s`;
      heart.addEventListener('animationend', () => heart.remove(), {once: true});
      burst.appendChild(heart);
    }
  });
})();
