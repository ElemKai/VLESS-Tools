// ============================================
// 🎯 НАСТРОЙКИ САЙТА — МЕНЯЕМ ССЫЛКИ ЗДЕСЬ
// ============================================
const SITE_CONFIG = {
    donateUrl: 'https://yoomoney.ru/to/4100119516467414',
    githubUrl: 'https://github.com/',
};

// ============================================
// 📦 ЗАГРУЗКА ОБЩИХ КОМПОНЕНТОВ
// ============================================
async function loadComponent(url, targetId) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const html = await response.text();
        const target = document.getElementById(targetId);
        if (target) {
            target.innerHTML = html;
            return true;
        }
    } catch (e) {
        console.error(`Ошибка загрузки ${url}:`, e);
    }
    return false;
}

// ============================================
// 🎨 АКТИВНЫЕ ПУНКТЫ МЕНЮ
// ============================================
function setActiveMenuItems() {
    const currentFile = window.location.pathname.split('/').pop() || 'index.html';
    
    let activePage = 'index';
    if (currentFile === 'converter.html') activePage = 'converter';
    else if (currentFile === 'checker.html') activePage = 'checker';
    
    // Подсветка главной
    document.querySelectorAll('[data-page="index"]').forEach(el => {
        if (activePage === 'index') el.classList.add('active');
    });
    
    // Подсветка dropdown "Инструменты"
    if (activePage === 'converter' || activePage === 'checker') {
        document.querySelectorAll('[data-page="tools"]').forEach(el => {
            el.classList.add('active');
        });
    }
    
    // Подсветка конкретного инструмента
    const toolMap = {
        'converter': 'converter',
        'checker': 'checker'
    };
    
    if (toolMap[activePage]) {
        document.querySelectorAll(`[data-tool="${toolMap[activePage]}"]`).forEach(el => {
            el.classList.add('active');
        });
    }
}

// ============================================
// 📱 МОБИЛЬНОЕ МЕНЮ
// ============================================
function initMobileMenu() {
    const btn = document.getElementById('burgerBtn');
    const menu = document.getElementById('mobileMenu');
    
    if (!btn || !menu) return;
    
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        btn.classList.toggle('open');
        menu.classList.toggle('open');
    });
    
    document.addEventListener('click', function(e) {
        if (!btn.contains(e.target) && !menu.contains(e.target)) {
            btn.classList.remove('open');
            menu.classList.remove('open');
        }
    });
}

// ============================================
// 💛 АНИМАЦИЯ "ПОДДЕРЖАТЬ ПРОЕКТ"
// ============================================
function initDonateAnimation() {
    const chars = '0123456789ABCDEF#$%&!?*+=-[]';
    const elMain = document.getElementById('donateText');
    const elSub = document.getElementById('donateSub');
    
    if (!elMain || !elSub) return;
    
    function scramble(el, final) {
        let frame = 0;
        const total = 16;
        const timer = setInterval(() => {
            el.textContent = final.split('').map((c, i) => {
                if (frame > total - final.length + i) return c;
                return chars[Math.floor(Math.random() * chars.length)];
            }).join('');
            if (++frame > total + final.length) {
                clearInterval(timer);
                el.textContent = final;
            }
        }, 45);
    }
    
    function run() {
        scramble(elMain, 'Поддержать');
        setTimeout(() => scramble(elSub, 'проект'), 150);
    }
    
    setTimeout(run, 2000);
    setInterval(run, 6000);
}

// ============================================
// 🚀 ИНИЦИАЛИЗАЦИЯ
// ============================================
document.addEventListener('DOMContentLoaded', async function() {
    // Параллельно загружаем header и footer
    const [headerLoaded, footerLoaded] = await Promise.all([
        loadComponent('header.html', 'header-placeholder'),
        loadComponent('footer.html', 'footer-placeholder')
    ]);
    
    // После загрузки — инициализируем
    if (headerLoaded) {
        setActiveMenuItems();
        initMobileMenu();
        initDonateAnimation();
    }
    
    // Уведомляем другие скрипты о загрузке
    window.dispatchEvent(new Event('componentsLoaded'));
});