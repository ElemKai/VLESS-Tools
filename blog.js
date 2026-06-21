function initBlog() {
    const list = document.getElementById('blog-list');
    if (!list) return;
    list.innerHTML = '<p style="color:var(--white-muted);">Загрузка...</p>';

    fetch(`${getBlogApiUrl()}/api/posts`)
        .then(r => r.json())
        .then(posts => {
            if (!Array.isArray(posts) || posts.length === 0) {
                list.innerHTML = '<p style="color:var(--white-muted);">Нет постов</p>';
                return;
            }
            list.innerHTML = posts.map(p => {
                const date = new Date(p.created_at || p.createdAt);
                return `<div class="blog-card" onclick="window.location='#/blog/${p.slug}'">
                    <div class="blog-card-title">${escapeHtml(p.title)}</div>
                    <div class="blog-card-excerpt">${escapeHtml(p.excerpt || p.content?.substring(0, 200) || '')}</div>
                    <div class="blog-card-meta">${date.toLocaleDateString()} · ${(p.tags || []).join(', ')}</div>
                </div>`;
            }).join('');
        })
        .catch(() => {
            list.innerHTML = '<p style="color:var(--red);">Ошибка загрузки блога</p>';
        });
}
