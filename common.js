const BLOG_API_URL = 'https://spare-macaque-5540.svoboda.deno.net';

function getBlogApiUrl() {
    try { return localStorage.getItem('api_origin') || BLOG_API_URL; } catch { return BLOG_API_URL; }
}

function escapeHtml(text) {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
}

function showToast(msg) {
    let el = document.getElementById('toast');
    if (!el) {
        el = document.createElement('div');
        el.id = 'toast';
        el.className = 'toast';
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 2000);
}

function setStatus(id, text, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = type === 'ok' ? 'status-bar ok' : type === 'err' ? 'status-bar err' : 'status-bar';
    const textEl = el.querySelector('span') || el;
    textEl.textContent = text;
}

const SITE_CONFIG = {};

function initPageBackground() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas || canvas.dataset.inited) return;
    canvas.dataset.inited = '1';
    const ctx = canvas.getContext('2d');
    let w, h, stars = [];

    function resize() { w = canvas.width = window.innerWidth; h = canvas.height = window.innerHeight; }
    function initStars() {
        stars = [];
        for (let i = 0; i < 120; i++) {
            stars.push({
                x: Math.random() * w, y: Math.random() * h,
                r: Math.random() * 1.8 + 0.3,
                a: Math.random() * 0.8 + 0.2,
                dx: (Math.random() - 0.5) * 0.15,
                dy: (Math.random() - 0.5) * 0.15,
            });
        }
    }
    function draw() {
        ctx.clearRect(0, 0, w, h);
        for (const s of stars) {
            s.x += s.dx; s.y += s.dy;
            if (s.x < 0) s.x = w; if (s.x > w) s.x = 0;
            if (s.y < 0) s.y = h; if (s.y > h) s.y = 0;
            ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 215, 0, ${s.a})`;
            ctx.fill();
        }
        requestAnimationFrame(draw);
    }
    resize(); initStars(); draw();
    window.addEventListener('resize', () => { resize(); initStars(); });
}

const PAGE_INIT = {
    home: () => initPageBackground(),
    converter: () => { initPageBackground(); if (typeof initConverter === 'function') initConverter(); },
    checker: () => { initPageBackground(); if (typeof initChecker === 'function') initChecker(); },
    blog: () => { initPageBackground(); if (typeof initBlog === 'function') initBlog(); },
    admin: () => { initPageBackground(); if (typeof initAdminTabs === 'function') initAdminTabs(); },
};
