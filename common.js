function showToast(msg) {
    let el = document.querySelector('.toast');
    if (!el) {
        el = document.createElement('div');
        el.className = 'toast';
        document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._hide);
    el._hide = setTimeout(() => el.classList.remove('show'), 1900);
}

function escapeHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}

function initParticles(canvas) {
    const ctx = canvas.getContext('2d');
    let w, h, stars = [];
    function resize() { w = canvas.width = innerWidth; h = canvas.height = innerHeight; }
    window.addEventListener('resize', resize);
    resize();
    for (let i = 0; i < 200; i++) stars.push({
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.5 + 0.3, a: Math.random(),
        s: Math.random() * 0.008 + 0.003
    });
    function draw() {
        ctx.clearRect(0, 0, w, h);
        for (const s of stars) {
            s.a += s.s;
            const opacity = (Math.sin(s.a) + 1) / 2;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255,215,0,${opacity * 0.8})`;
            ctx.fill();
        }
        requestAnimationFrame(draw);
    }
    draw();
}

function initTabSwitching() {
    document.addEventListener('click', e => {
        const btn = e.target.closest('.tab-btn');
        if (!btn) return;
        const container = btn.closest('.tabs').parentElement;
        container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const target = container.querySelector(btn.dataset.tab);
        if (target) target.classList.add('active');
    });
}
