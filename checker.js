async function pingServer(addr, port, timeout = 5000) {
    return new Promise((resolve) => {
        const start = Date.now();
        const ws = new WebSocket(`wss://${addr}:${port}`, {
            protocols: [], handshakeTimeout: timeout,
        });
        const timer = setTimeout(() => {
            ws.close();
            resolve({ alive: false, ms: timeout, error: 'timeout' });
        }, timeout);
        ws.onopen = () => {
            clearTimeout(timer);
            resolve({ alive: true, ms: Date.now() - start });
            ws.close();
        };
        ws.onerror = () => {
            clearTimeout(timer);
            resolve({ alive: false, ms: Date.now() - start, error: 'connection error' });
        };
    });
}

function parseVless(link) {
    try {
        if (!link.startsWith('vless://')) return null;
        const u = new URL(link);
        return {
            id: u.username, addr: u.hostname, port: parseInt(u.port) || 443,
            remark: decodeURIComponent(u.hash.replace('#', '') || ''),
        };
    } catch { return null; }
}

function initChecker() {
    if (initChecker._done) return;
    initChecker._done = true;
    const input = document.getElementById('checker-input');
    const btn = document.getElementById('checker-btn');
    const result = document.getElementById('checker-result');

    btn.addEventListener('click', async () => {
        const val = input.value.trim();
        if (!val) return;
        btn.disabled = true;
        result.innerHTML = '⏳ Проверка...';

        let addr, port, remark = '';
        const parsed = parseVless(val);
        if (parsed) {
            addr = parsed.addr; port = parsed.port; remark = parsed.remark;
        } else if (val.includes(':')) {
            const parts = val.split(':');
            addr = parts[0]; port = parseInt(parts[1]) || 443;
        } else {
            result.innerHTML = '❌ Неверный формат. Используйте vless://... или IP:порт';
            btn.disabled = false; return;
        }

        const ping = await pingServer(addr, port);
        if (ping.alive) {
            result.innerHTML = `✅ ${remark || addr}:${port} — доступен (${ping.ms}ms)`;
        } else {
            result.innerHTML = `❌ ${remark || addr}:${port} — недоступен` + (ping.error ? ` (${ping.error})` : '');
        }
        btn.disabled = false;
    });

    // Batch checker
    const batchInput = document.getElementById('checker-batch-input');
    const batchBtn = document.getElementById('checker-batch-btn');
    const batchResult = document.getElementById('checker-batch-result');

    batchBtn.addEventListener('click', async () => {
        const lines = batchInput.value.split('\n').filter(l => l.trim());
        if (lines.length === 0) return;
        batchBtn.disabled = true;
        batchResult.innerHTML = '⏳ Проверка...';

        const targets = [];
        for (const line of lines) {
            const parsed = parseVless(line.trim());
            if (parsed) targets.push(parsed);
            else if (line.includes(':')) {
                const parts = line.split(':');
                targets.push({ addr: parts[0], port: parseInt(parts[1]) || 443, remark: '' });
            }
        }

        if (targets.length === 0) {
            batchResult.innerHTML = '❌ Нет валидных серверов';
            batchBtn.disabled = false; return;
        }

        batchResult.innerHTML = `<div style="color:var(--white-muted);margin-bottom:8px">Проверяю ${targets.length} серверов...</div>`;
        let html = '';
        for (const t of targets) {
            html += `<div style="margin-bottom:4px">⏳ ${t.remark || t.addr}:${t.port}</div>`;
            batchResult.innerHTML += html.slice(-500);
            const ping = await pingServer(t.addr, t.port);
            if (ping.alive) {
                html += `<div>✅ ${t.remark || t.addr}:${t.port} — ${ping.ms}ms</div>`;
            } else {
                html += `<div>❌ ${t.remark || t.addr}:${t.port} — нет ответа</div>`;
            }
            batchResult.innerHTML = html;
        }
        batchBtn.disabled = false;
    });
}
