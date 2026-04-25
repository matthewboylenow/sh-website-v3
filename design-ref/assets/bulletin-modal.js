/* Bulletin modal — zoom, page nav, download hooks.
   In production: pdf.js renders pages from Vercel Blob pdf_url;
   zoom/page state persists to localStorage. */
(function () {
  const modal = document.getElementById('bulletinModal');
  if (!modal) return;

  const page = document.getElementById('modalPage');
  const zoomLabel = document.getElementById('zoomLabel');
  const titleEl = document.getElementById('bulletinModalTitle');
  const subEl = document.getElementById('bulletinModalSub');
  const pageTitleEl = document.getElementById('modalPageTitle');
  const pageNumEl = document.getElementById('pageNum');
  const pageCountEl = document.getElementById('pageCount');

  let zoom = 1;
  let currentPage = 1;
  let totalPages = 12;

  const applyZoom = () => {
    page.style.transform = `scale(${zoom})`;
    page.style.marginBottom = `${(zoom - 1) * 900}px`;
    zoomLabel.textContent = `${Math.round(zoom * 100)}%`;
  };

  const updatePageCounter = () => {
    pageNumEl.textContent = currentPage;
    pageCountEl.textContent = totalPages;
  };

  const open = (meta) => {
    if (meta) {
      const title = meta.title || 'Weekly Bulletin';
      const date = meta.date || '';
      totalPages = meta.pages || 12;
      currentPage = 1;
      titleEl.childNodes[0].textContent = title;
      subEl.textContent = `${date} · Bulletin`;
      pageTitleEl.textContent = title;
    }
    zoom = 1;
    applyZoom();
    updatePageCounter();
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const close = () => {
    modal.classList.remove('open');
    document.body.style.overflow = '';
  };

  // Wire openers
  document.querySelectorAll('[data-open-bulletin]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        const meta = JSON.parse(btn.getAttribute('data-open-bulletin'));
        open(meta);
      } catch (_) { open(); }
    });
  });

  // Controls
  document.getElementById('closeBulletin').addEventListener('click', close);
  modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft' && currentPage > 1) { currentPage--; updatePageCounter(); }
    if (e.key === 'ArrowRight' && currentPage < totalPages) { currentPage++; updatePageCounter(); }
    if (e.key === '+' || e.key === '=') { zoom = Math.min(3, zoom + 0.15); applyZoom(); }
    if (e.key === '-') { zoom = Math.max(0.5, zoom - 0.15); applyZoom(); }
  });

  document.getElementById('zoomIn').addEventListener('click', () => { zoom = Math.min(3, zoom + 0.15); applyZoom(); });
  document.getElementById('zoomOut').addEventListener('click', () => { zoom = Math.max(0.5, zoom - 0.15); applyZoom(); });
  document.getElementById('zoomReset').addEventListener('click', () => { zoom = 1; applyZoom(); });

  document.getElementById('prevPage').addEventListener('click', () => {
    if (currentPage > 1) { currentPage--; updatePageCounter(); }
  });
  document.getElementById('nextPage').addEventListener('click', () => {
    if (currentPage < totalPages) { currentPage++; updatePageCounter(); }
  });

  document.getElementById('downloadBulletin').addEventListener('click', () => {
    // In production: window.open(pdf_url, '_blank') or anchor with download attr
    alert('Download PDF (production will fetch from Vercel Blob)');
  });
})();
