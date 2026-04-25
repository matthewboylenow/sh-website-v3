/* Saint Helen 3.0 — shared masthead + footer + behaviors
   Drop <div id="sh-mast"></div> at top of <body>, <div id="sh-foot"></div> at bottom.
   Call SH.init() on DOMContentLoaded. */

window.SH = window.SH || {};

SH.masthead = function(active) {
  const isActive = (key) => active === key ? ' aria-current="page"' : '';
  const activeCls = (key) => active === key ? ' active' : '';
  return `
  <header class="mast" id="mast">
    <div class="wrap-wide mast-inner">
      <a class="brand" href="${SH.rel('index.html')}">
        <img src="${SH.rel('assets/logo-submark.png')}" alt="" />
        <span class="name">Saint Helen</span>
      </a>
      <nav class="mast-nav" aria-label="Primary">
        <div class="item" data-mega="about">
          <button type="button">About <svg class="chev" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4l3 3 3-3"/></svg></button>
          <div class="mega">
            <div class="mega-grid">
              <div>
                <h6>The Parish</h6>
                <a class="link" href="#">Who we are</a>
                <a class="link" href="#">Our history</a>
                <a class="link" href="#">Staff &amp; clergy</a>
                <a class="link" href="#">Parish council</a>
                <a class="link" href="#">Contact us</a>
              </div>
              <div>
                <h6>Visiting</h6>
                <a class="link" href="${SH.rel('pages/plan-your-visit.html')}">I'm new here</a>
                <a class="link" href="${SH.rel('pages/plan-your-visit.html')}">Plan your visit</a>
                <a class="link" href="${SH.rel('pages/mass.html')}">Mass schedule</a>
                <a class="link" href="#">Directions &amp; parking</a>
              </div>
              <a class="feature" href="#">
                <span class="tag">Featured</span>
                <div class="t">A word from Msgr. Tom</div>
                <div class="p">A short welcome video from our pastor.</div>
                <span class="go">Watch <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg></span>
              </a>
            </div>
          </div>
        </div>
        <div class="item" data-mega="worship">
          <button type="button">Worship <svg class="chev" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4l3 3 3-3"/></svg></button>
          <div class="mega">
            <div class="mega-grid">
              <div>
                <h6>Liturgy</h6>
                <a class="link" href="${SH.rel('pages/mass.html')}">Mass schedule</a>
                <a class="link" href="#">Livestream</a>
                <a class="link" href="#">Daily readings</a>
                <a class="link" href="#">Mass intentions</a>
              </div>
              <div>
                <h6>Sacraments</h6>
                <a class="link" href="#">Baptism</a>
                <a class="link" href="#">First Communion</a>
                <a class="link" href="#">Confirmation</a>
                <a class="link" href="#">Marriage</a>
                <a class="link" href="#">Reconciliation</a>
                <a class="link" href="#">Anointing of the sick</a>
              </div>
              <a class="feature" href="#">
                <span class="tag">This Sunday</span>
                <div class="t">Second Sunday of Easter</div>
                <div class="p">Readings, homily, and livestream.</div>
                <span class="go">Open <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg></span>
              </a>
            </div>
          </div>
        </div>
        <div class="item" data-mega="formation">
          <button type="button">Faith Formation <svg class="chev" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4l3 3 3-3"/></svg></button>
          <div class="mega">
            <div class="mega-grid">
              <div>
                <h6>Children &amp; Youth</h6>
                <a class="link" href="#">Kids Corner (2–5)</a>
                <a class="link" href="#">Faith Formation (1–10)</a>
                <a class="link" href="#">Youth Ministry (9–12)</a>
                <a class="link" href="#">Mission trips</a>
              </div>
              <div>
                <h6>Adults</h6>
                <a class="link" href="#">Adult discipleship</a>
                <a class="link" href="#">Bible studies</a>
                <a class="link" href="#">LifeLines groups</a>
                <a class="link" href="#">Ageless</a>
                <a class="link" href="#">RCIA</a>
              </div>
              <a class="feature" href="#">
                <span class="tag">Registration open</span>
                <div class="t">2026–27 Formation Year</div>
                <div class="p">Register children and youth for the coming year.</div>
                <span class="go">Register <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg></span>
              </a>
            </div>
          </div>
        </div>
        <div class="item" data-mega="ministries">
          <button type="button">Ministries <svg class="chev" viewBox="0 0 10 10" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M2 4l3 3 3-3"/></svg></button>
          <div class="mega">
            <div class="mega-grid">
              <div>
                <h6>Worship &amp; Prayer</h6>
                <a class="link" href="#">Altar servers</a>
                <a class="link" href="#">Lectors</a>
                <a class="link" href="#">Eucharistic ministers</a>
                <a class="link" href="#">Music ministry</a>
                <a class="link" href="#">Sing 'N Pray</a>
              </div>
              <div>
                <h6>Service &amp; Outreach</h6>
                <a class="link" href="#">Garden Ministry</a>
                <a class="link" href="#">Social justice</a>
                <a class="link" href="#">Meals ministry</a>
                <a class="link" href="#">Bereavement</a>
                <a class="link" href="${SH.rel('pages/ministries.html')}">All ministries →</a>
              </div>
              <a class="feature" href="${SH.rel('pages/ministries.html')}#matchmaker">
                <span class="tag">Find your fit</span>
                <div class="t">Ministry matchmaker</div>
                <div class="p">Three questions, and we'll point you to the ministries that fit your time, gifts, and season of life.</div>
                <span class="go">Start <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg></span>
              </a>
            </div>
          </div>
        </div>
        <div class="item"><a href="${SH.rel('pages/events.html')}"${isActive('events')}>Events</a></div>
        <div class="item"><a href="${SH.rel('pages/plan-your-visit.html')}"${isActive('new')}>I'm New</a></div>
      </nav>
      <div class="ctas">
        <a class="mine" href="#">mySaintHelen</a>
        <a class="give" href="${SH.rel('pages/give.html')}">Give</a>
      </div>
    </div>
  </header>`;
};

SH.footer = function() {
  return `
  <div class="contact-bar">
    <div class="wrap-wide inner">
      <div class="cell">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.8.6 2.7a2 2 0 0 1-.5 2.1L8 9.7a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.5 2.7.6a2 2 0 0 1 1.7 2z"/></svg>
        <a href="tel:9082321214"><strong>(908) 232‑1214</strong></a>
        <span style="opacity:0.6;">· M–F 9:00–4:00</span>
      </div>
      <div class="cell">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18"/></svg>
        <span><strong>Mass Schedule</strong> · Sun 8, 10, 12, 6 · Sat Vigil 5 · Daily 9</span>
      </div>
      <div class="cell">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 7-8 12-8 12S4 17 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>
        <a href="#"><strong>1600 Rhode Island Ave</strong> · Westfield, NJ 07090</a>
      </div>
    </div>
  </div>
  <footer class="footer-min">
    <div class="wrap-wide inner">
      <div class="links">
        <a href="#">Privacy</a>
        <a href="#">Accessibility</a>
        <a href="#">Staff login</a>
        <a href="#">Archdiocese of Newark</a>
      </div>
      <div>© 2026 Saint Helen Parish</div>
      <div class="social">
        <a href="#" aria-label="Facebook"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M13.5 21v-8h2.7l.4-3.2h-3.1V7.7c0-.9.3-1.6 1.6-1.6h1.7V3.2c-.3 0-1.3-.2-2.4-.2-2.4 0-4 1.5-4 4.2V9.8H7.7V13h2.6v8z"/></svg></a>
        <a href="#" aria-label="Instagram"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg></a>
        <a href="#" aria-label="YouTube"><svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M21.6 7.2c-.2-.9-.9-1.6-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4c-.9.2-1.6.9-1.8 1.8C2 8.8 2 12 2 12s0 3.2.4 4.8c.2.9.9 1.6 1.8 1.8 1.6.4 7.8.4 7.8.4s6.2 0 7.8-.4c.9-.2 1.6-.9 1.8-1.8.4-1.6.4-4.8.4-4.8s0-3.2-.4-4.8zM10 15V9l5 3z"/></svg></a>
      </div>
    </div>
  </footer>`;
};

// Relative path helper — pages may live one level deep
SH.rel = function(path) {
  const depth = (window.SH_DEPTH || 0);
  return depth > 0 ? ('../'.repeat(depth) + path) : path;
};

SH.init = function(opts) {
  opts = opts || {};
  if (opts.depth) window.SH_DEPTH = opts.depth;

  const mastEl = document.getElementById('sh-mast');
  if (mastEl) mastEl.outerHTML = SH.masthead(opts.active);
  const footEl = document.getElementById('sh-foot');
  if (footEl) footEl.outerHTML = SH.footer();

  // Sticky masthead
  const mast = document.getElementById('mast');
  if (mast) {
    // Interior pages without a photo hero need the mast to be navy immediately
    if (opts.solidNav) mast.classList.add('solid');
    window.addEventListener('scroll', () => {
      if (window.scrollY > 120) mast.classList.add('scrolled');
      else mast.classList.remove('scrolled');
    }, { passive: true });
  }

  // Mega-menu hover/focus
  document.querySelectorAll('.mast-nav .item[data-mega]').forEach(item => {
    let t;
    item.addEventListener('mouseenter', () => { clearTimeout(t); item.classList.add('open'); });
    item.addEventListener('mouseleave', () => { t = setTimeout(() => item.classList.remove('open'), 120); });
    const btn = item.querySelector('button');
    if (btn) btn.addEventListener('click', (e) => {
      e.preventDefault();
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.mast-nav .item').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.mast-nav')) {
      document.querySelectorAll('.mast-nav .item').forEach(i => i.classList.remove('open'));
    }
  });

  // Give FAB visibility after scroll
  const fab = document.querySelector('.give-fab');
  if (fab) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 500) fab.classList.add('visible');
      else fab.classList.remove('visible');
    }, { passive: true });
  }
};
