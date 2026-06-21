function navigate(hash) {
    const cleanHash = hash.replace(/^#\/?/, '');
    const page = cleanHash.split('/')[0] || 'home';
    const slug = cleanHash.split('/')[1] || null;

    document.querySelectorAll('.nav-links a').forEach(a => a.classList.remove('active'));
    const navMap = { home: 'home', converter: 'conv', checker: 'check', blog: 'blog', admin: 'admin' };
    const linkId = navMap[page];
    const activeLink = document.querySelector(`.nav-links a[data-id="${linkId}"]`);
    if (activeLink) activeLink.classList.add('active');

    const app = document.getElementById('app');
    if (!app) return;

    const tpl = document.getElementById(`page-${page}`) || document.getElementById('page-home');
    if (!tpl) return;

    // OAuth token extraction from hash
    if (page === 'admin' && cleanHash.includes('&token=')) {
        const token = cleanHash.split('&token=')[1];
        if (token) try { localStorage.setItem('blog_token', token); } catch {}
        const cleanUrl = window.location.href.split('&token=')[0];
        window.history.replaceState(null, '', cleanUrl);
    }

    app.innerHTML = '';
    const clone = tpl.content.cloneNode(true);
    app.appendChild(clone);

    if (page === 'blog' && slug) {
        renderBlogPost(slug);
    }

    if (PAGE_INIT[page]) PAGE_INIT[page]();
}

function renderBlogPost(slug) {
    const container = document.getElementById('blog-post-container');
    if (!container) return;
    container.innerHTML = '<p style="color:var(--white-muted);">Загрузка...</p>';
    fetch(`${getBlogApiUrl()}/api/posts`)
        .then(r => r.json())
        .then(posts => {
            const post = posts.find(p => p.slug === slug || String(p.id) === slug);
            if (!post) { container.innerHTML = '<p style="color:var(--red);">Пост не найден</p>'; return; }
            container.innerHTML = `
                <div style="margin-bottom:20px;">
                    <h2 style="color:var(--gold);font-size:24px;margin-bottom:8px;">${escapeHtml(post.title)}</h2>
                    <div style="font-size:12px;color:var(--white-muted);">${new Date(post.created_at || post.createdAt).toLocaleDateString()} · ${(post.tags || []).join(', ')}</div>
                </div>
                <div class="blog-post-content">${post.content}</div>
                <div style="margin-top:24px;"><a href="#/blog" style="color:var(--gold);font-size:14px;">← Назад к списку</a></div>
            `;
        })
        .catch(() => { container.innerHTML = '<p style="color:var(--red);">Ошибка загрузки поста</p>'; });
}

// Tab switching (delegated to #app because content comes from <template>)
document.addEventListener('click', (e) => {
    const btn = e.target.closest('.tab-btn');
    if (!btn) return;
    const tabId = btn.dataset.tab;
    if (!tabId) return;
    const container = btn.closest('.tabs');
    if (!container) return;
    container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const parent = container.parentElement;
    parent.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    const target = parent.querySelector(`#${CSS.escape(tabId)}`);
    if (target) target.classList.add('active');
});

// Hash routing
window.addEventListener('hashchange', () => navigate(window.location.hash));
window.addEventListener('DOMContentLoaded', () => navigate(window.location.hash || '#/home'));

// Support modal
function openSupport() {
    window.open('https://yoomoney.ru/to/4100119557658879', '_blank');
}
