function openSupport() {
    window.open('https://yoomoney.ru/to/4100119557658879', '_blank');
}

const ROUTES = {
    '': 'home',
    'home': 'home',
    'converter': 'converter',
    'checker': 'checker',
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

    router();
});
