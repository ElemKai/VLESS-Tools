const PROXY_API = 'https://spare-macaque-5540.svoboda.deno.net/api/proxy';

function parseVless(link) {
    try {
        if (!link.startsWith('vless://')) return null;
        const u = new URL(link);
        const params = Object.fromEntries(u.searchParams);
        return {
            id: u.username, addr: u.hostname, port: u.port || '443',
            type: params.type || 'tcp', security: params.security || 'none',
            encryption: params.encryption || 'none', flow: params.flow || '',
            sni: params.sni || '', fp: params.fp || '',
            pbk: params.pbk || '', sid: params.sid || '',
            remark: decodeURIComponent(u.hash.replace('#', '') || ''),
        };
    } catch { return null; }
}

function parseSubscription(text) {
    const links = text.split(/[\r\n]+/).filter(l => l.trim());
    const servers = [];
    for (const raw of links) {
        // try base64 decode
        let decoded = raw.trim();
        try {
            const b64 = atob(decoded);
            if (b64.includes('vless://')) {
                const inner = b64.split(/[\r\n]+/).filter(l => l.trim());
                for (const l of inner) {
                    const s = parseVless(l);
                    if (s) servers.push(s);
                }
                continue;
            }
        } catch {}
        const s = parseVless(decoded);
        if (s) servers.push(s);
    }
    return servers;
}

async function fetchViaProxy(subUrl) {
    const url = `${PROXY_API}?url=${encodeURIComponent(subUrl)}`;
    const resp = await fetch(url);
    const text = await resp.text();
    try {
        const data = JSON.parse(text);
        if (data.body !== undefined || data.error) return data;
    } catch {}
    return { status: resp.status, body: text, ua: '' };
}

async function fetchViaLocalWs(subUrl) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket('ws://127.0.0.1:8888');
        const timeout = setTimeout(() => { ws.close(); reject(new Error('WebSocket timeout')); }, 20000);
        ws.onopen = () => {
            ws.send(JSON.stringify({ mode: 'fetch', url: subUrl }));
        };
        ws.onmessage = (e) => {
            clearTimeout(timeout);
            ws.close();
            try {
                const data = JSON.parse(e.data);
                resolve(data);
            } catch {
                resolve({ type: 'fetch_result', status: 0, body: '', error: 'Parse error' });
            }
        };
        ws.onerror = () => { clearTimeout(timeout); reject(new Error('WebSocket error')); };
    });
}

function renderVlessList(servers, container) {
    container.innerHTML = '';
    if (servers.length === 0) {
        container.innerHTML = '<div style="color:var(--white-muted);padding:12px 0;font-size:13px">Нет серверов</div>';
        return;
    }
    for (const s of servers) {
        const div = document.createElement('div');
        div.className = 'vless-item';
        div.innerHTML = `
            <div class="vless-remark">${escapeHtml(s.remark || 'Без имени')}</div>
            <div>${s.addr} · ${s.port}</div>
            <div style="color:var(--white-muted);font-size:11px">${s.type} · ${s.security} · ${s.encryption}</div>
        `;
        div.addEventListener('click', () => {
            navigator.clipboard.writeText(
                `vless://${s.id}@${s.addr}:${s.port}?type=${s.type}&security=${s.security}&encryption=${s.encryption}${s.sni ? '&sni='+s.sni : ''}${s.fp ? '&fp='+s.fp : ''}${s.pbk ? '&pbk='+s.pbk : ''}${s.sid ? '&sid='+s.sid : ''}#${encodeURIComponent(s.remark)}`
            ).then(() => showToast('Скопировано'));
        });
        container.appendChild(div);
    }
}

function initConverter() {
    if (initConverter._done) return;
    initConverter._done = true;
    const subUrl = document.getElementById('sub-url');
    const fetchBtn = document.getElementById('sub-fetch');
    const useLocal = document.getElementById('sub-local-proxy');
    const statusBar = document.getElementById('sub-status');
    const vlessList = document.getElementById('vless-list');
    const exportYaml = document.getElementById('export-yaml');
    const exportHapp = document.getElementById('export-happ');
    const rawBtn = document.getElementById('show-raw');
    const rawDiv = document.getElementById('raw-response');
    let lastServers = [];
    let lastRaw = '';

    function setStatus(text, ok) {
        statusBar.textContent = '';
        const dot = document.createElement('span');
        dot.className = 'dot-status';
        const span = document.createElement('span');
        span.textContent = text;
        statusBar.append(dot, span);
        statusBar.className = 'status-bar ' + (ok ? 'ok' : 'err');
    }

    fetchBtn.addEventListener('click', async () => {
        const url = subUrl.value.trim();
        if (!url) return;
        setStatus('Загрузка...', true);
        fetchBtn.disabled = true;
        rawDiv.style.display = 'none';
        lastServers = [];
        lastRaw = '';
        try {
            let data;
            if (useLocal.checked) {
                setStatus('Локальный прокси...', true);
                data = await fetchViaLocalWs(url);
            } else {
                setStatus('Deno прокси...', true);
                data = await fetchViaProxy(url);
            }
            if (data.status === 200 && data.body) {
                lastRaw = data.body;
                const servers = parseSubscription(data.body);
                lastServers = servers;
                const ua = data.ua || '';
                setStatus(`Найдено серверов: ${servers.length}` + (ua ? ` (${ua})` : ''), servers.length > 0);
                renderVlessList(servers, vlessList);
            } else if (data.error) {
                setStatus('Ошибка: ' + data.error, false);
            } else {
                setStatus('Ошибка: статус ' + data.status, false);
            }
        } catch (e) {
            setStatus('Ошибка: ' + e.message, false);
        }
        fetchBtn.disabled = false;
    });

    rawBtn.addEventListener('click', () => {
        if (lastRaw) {
            rawDiv.textContent = lastRaw;
            rawDiv.style.display = rawDiv.style.display === 'none' ? 'block' : 'none';
        }
    });

    exportYaml.addEventListener('click', () => {
        if (lastServers.length === 0) { showToast('Сначала загрузите подписку'); return; }
        let yaml = 'port: 7890\nsocks-port: 7891\nmode: rule\nlog-level: info\ndns:\n  enable: true\n  ipv6: false\n  enhanced-mode: redir-host\nproxies:\n';
        for (const s of lastServers) {
            const name = (s.remark || 'server').replace(/[^a-zA-Z0-9\u0400-\u04FF]/g, '_');
            yaml += `  - name: "${name}"\n    type: vless\n    server: ${s.addr}\n    port: ${s.port}\n    uuid: ${s.id}\n    network: ${s.type}\n    tls: ${s.security === 'tls' ? 'true' : 'false'}\n    servername: ${s.sni || s.addr}\n`;
            if (s.pbk) yaml += `    reality-opts:\n      public-key: ${s.pbk}\n      short-id: ${s.sid || ''}\n`;
        }
        const blob = new Blob([yaml], { type: 'text/yaml' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'clash-config.yaml';
        a.click();
        URL.revokeObjectURL(a.href);
        showToast('YAML сохранён');
    });

    exportHapp.addEventListener('click', () => {
        if (lastServers.length === 0) { showToast('Сначала загрузите подписку'); return; }
        const nodes = lastServers.map(s => ({
            name: s.remark || 'server',
            server: s.addr, port: parseInt(s.port),
            uuid: s.id, encryption: s.encryption || 'none',
            network: s.type, tls: s.security || 'none',
            sni: s.sni || '', flow: s.flow || '',
            publicKey: s.pbk || '', shortId: s.sid || '',
        }));
        const json = JSON.stringify({ version: 1, nodes }, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'happ-config.json';
        a.click();
        URL.revokeObjectURL(a.href);
        showToast('JSON сохранён');
    });
}
