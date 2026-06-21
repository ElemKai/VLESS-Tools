let checkerResults = [];

function initChecker() {
    //
}

function addCheckerServer() {
    const input = document.getElementById('checker-input');
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;

    const servers = val.split('\n').map(l => l.trim()).filter(l => l.startsWith('vless://'));
    if (servers.length === 0) {
        // Try parsing as single link
        if (val.startsWith('vless://')) servers.push(val);
    }

    if (servers.length === 0) {
        setStatus('checker-status', 'Вставьте VLESS ссылки', 'err');
        return;
    }

    checkerResults = servers;
    renderCheckerResults();
    setStatus('checker-status', `${servers.length} серверов добавлено. Нажмите Проверить.`, 'ok');
}

function renderCheckerResults() {
    const list = document.getElementById('checker-list');
    if (!list) return;
    if (checkerResults.length === 0) {
        list.innerHTML = '<div style="color:var(--white-muted);text-align:center;padding:20px;font-size:13px;">Нет серверов для проверки</div>';
        return;
    }
    list.innerHTML = checkerResults.map((link, i) => {
        const p = parseVlessLink(link);
        return `<div class="server-item">
            <div class="server-info">
                <div style="color:var(--gold);font-weight:600;font-size:13px;">${escapeHtml(p.remark || '#' + (i+1))}</div>
                <div>${escapeHtml(p.server || '')}:${p.port || ''}</div>
                <div style="font-size:11px;color:var(--white-muted);">${p.type || ''} · ${p.network || ''}${p.security ? ' · ' + p.security : ''}</div>
            </div>
            <div class="server-status" id="check-status-${i}">⏳</div>
        </div>`;
    }).join('');
}

async function runChecker() {
    if (checkerResults.length === 0) return;
    setStatus('checker-status', 'Проверка...', 'ok');
    const apiUrl = getBlogApiUrl();

    for (let i = 0; i < checkerResults.length; i++) {
        const el = document.getElementById(`check-status-${i}`);
        if (el) el.textContent = '⏳';

        try {
            const resp = await fetch(`${apiUrl}/api/health`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ link: checkerResults[i], timeout: 5000 }),
            });
            const data = await resp.json();
            if (el) {
                if (data.alive) {
                    el.textContent = '✅';
                    el.title = `Пинг: ${data.ping || 0}ms`;
                } else {
                    el.textContent = '❌';
                    el.title = data.error || 'Недоступен';
                }
            }
        } catch {
            if (el) el.textContent = '❌';
        }
    }

    // Simple ping test without backend - try direct connection
    for (let i = 0; i < checkerResults.length; i++) {
        const el = document.getElementById(`check-status-${i}`);
        if (!el || el.textContent !== '⏳') continue;

        const p = parseVlessLink(checkerResults[i]);
        if (!p.server) { el.textContent = '❌'; continue; }

        try {
            const start = Date.now();
            const resp = await fetch(`https://${p.server}/`, { mode: 'no-cors', signal: AbortSignal.timeout(5000) });
            const ping = Date.now() - start;
            el.textContent = '✅';
            el.title = `${ping}ms (no-cors)`;
        } catch {
            el.textContent = '❌';
        }
    }

    setStatus('checker-status', 'Проверка завершена', 'ok');
}

function clearChecker() {
    checkerResults = [];
    const list = document.getElementById('checker-list');
    if (list) list.innerHTML = '';
    setStatus('checker-status', 'очищено', '');
}
