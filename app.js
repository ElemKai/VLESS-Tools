function openSupport() {
    window.open('https://yoomoney.ru/to/4100119557658879', '_blank');
}

const ROUTES = {
    '': 'home',
    'home': 'home',
    'converter': 'converter',
    'checker': 'checker',
    'blog': 'blog',
    'admin': 'admin',
};

function router() {
    const hash = location.hash.replace(/^#\//, '') || 'home';
    const base = hash.split('/')[0];
    const page = ROUTES[base] || 'home';

    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));

    const el = document.getElementById(`page-${page}`);
    if (el) {
        el.classList.add('active');
        if (page === 'converter') initConverter();
        if (page === 'checker') initChecker();
        if (page === 'blog') initBlog();
        if (page === 'admin') initAdmin();
    }

    const navLink = document.querySelector(`.nav-links a[href="#/${base}"]`);
    if (navLink) navLink.classList.add('active');
}

window.addEventListener('hashchange', router);

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('bg-canvas');
    if (canvas) initParticles(canvas);
    initTabSwitching();

    const urlParams = new URLSearchParams(location.search);
    const token = urlParams.get('token');
    if (token) {
        sessionStorage.setItem('gh_token', token);
        history.replaceState(null, '', location.pathname + location.hash);
    }

    router();
});
