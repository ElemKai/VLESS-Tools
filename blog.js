async function initBlog() {
    const container = document.getElementById('blog-list');
    if (!container || container.dataset.loaded) return;
    container.dataset.loaded = '1';
    try {
        const resp = await fetch(`${BLOG_API_URL}/api/posts`);
        const posts = await resp.json();
        container.innerHTML = '';
        if (posts.length === 0) {
            container.innerHTML = '<div style="color:var(--white-muted);font-size:13px">Нет постов</div>';
            return;
        }
        for (const p of posts) {
            const div = document.createElement('div');
            div.className = 'blog-card';
            div.innerHTML = `
                <div class="blog-card-title">${escapeHtml(p.title)}</div>
                <div class="blog-card-excerpt">${escapeHtml((p.excerpt || p.content || '').substring(0, 200))}</div>
                <div class="blog-card-meta">${p.created_at ? new Date(p.created_at).toLocaleString('ru-RU') : ''} · ${escapeHtml(p.author || '')}</div>
            `;
            div.addEventListener('click', () => openPost(p.slug || p.id));
            container.appendChild(div);
        }
    } catch {
        container.innerHTML = '<div style="color:var(--red);font-size:13px">Ошибка загрузки</div>';
    }
}

async function openPost(slug) {
    try {
        const resp = await fetch(`${BLOG_API_URL}/api/posts/${slug}`);
        const post = await resp.json();
        if (!post) return;
        const container = document.getElementById('blog-list');
        container.innerHTML = `
            <button class="btn btn-ghost" onclick="initBlog()" style="margin-bottom:16px">← Назад</button>
            <h2 style="font-size:22px;color:var(--white);margin-bottom:8px">${escapeHtml(post.title)}</h2>
            <div style="font-size:12px;color:var(--white-muted);margin-bottom:16px">
                ${post.created_at ? new Date(post.created_at).toLocaleString('ru-RU') : ''} · ${escapeHtml(post.author || '')}
            </div>
            <div style="font-size:14px;line-height:1.7;color:var(--white)">${post.content}</div>
        `;
    } catch {}
}
