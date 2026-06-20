// Глобальные переменные
let checkResults = [];
let isChecking = false;

// Установка статуса
function setStatus(type, text) {
    const sb = document.getElementById('statusBar');
    if (!sb) return;
    sb.className = 'status-bar ' + type;
    document.getElementById('statusText').textContent = text;
}

// Парсинг VLESS URL
function parseVlessUrl(url) {
    try {
        const cleanUrl = url.trim();
        if (!cleanUrl.startsWith('vless://')) {
            throw new Error('Неверный формат URL');
        }

        const withoutProto = cleanUrl.replace(/^vless:\/\//, '');
        const [main, fragment = ''] = withoutProto.split('#');
        const [userHostPort, queryString = ''] = main.split('?');
        const [uuid, hostPort] = userHostPort.split('@');
        const [host, port] = hostPort.split(':');
        
        const params = new URLSearchParams(queryString);
        
        return {
            uuid: uuid,
            host: host,
            port: parseInt(port),
            name: fragment ? decodeURIComponent(fragment) : host,
            security: params.get('security') || 'none',
            type: params.get('type') || 'tcp',
            sni: params.get('sni') || '',
            fp: params.get('fp') || '',
            flow: params.get('flow') || '',
            originalUrl: cleanUrl
        };
    } catch (e) {
        console.error('Ошибка парсинга URL:', url, e);
        return null;
    }
}

// Проверка одного сервера
async function checkServer(server, timeout) {
    const startTime = Date.now();
    
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        
        const protocol = (server.security === 'tls' || server.security === 'reality') ? 'https' : 'http';
        const testUrl = `${protocol}://${server.host}:${server.port}/`;
        
        await fetch(testUrl, {
            method: 'HEAD',
            mode: 'no-cors',
            signal: controller.signal,
            cache: 'no-cache'
        });
        
        clearTimeout(timeoutId);
        const ping = Date.now() - startTime;
        
        return {
            success: true,
            ping: ping,
            error: null
        };
    } catch (error) {
        const ping = Date.now() - startTime;
        
        if (error.name === 'AbortError') {
            return {
                success: false,
                ping: timeout,
                error: 'Таймаут'
            };
        }
        
        if (ping < 1000) {
            return {
                success: true,
                ping: ping,
                error: null,
                note: 'Сервер отвечает'
            };
        }
        
        return {
            success: false,
            ping: ping,
            error: error.message || 'Неизвестная ошибка'
        };
    }
}

// Массовая проверка
async function checkServers() {
    if (isChecking) {
        setStatus('err', '[ ERROR ] проверка уже выполняется');
        return;
    }

    const input = document.getElementById('vless-input').value.trim();
    if (!input) {
        setStatus('err', '[ ERROR ] введите VLESS ссылки');
        return;
    }

    const timeout = parseInt(document.getElementById('timeout-input').value) || 5000;
    const parallel = parseInt(document.getElementById('parallel-input').value) || 5;

    const lines = input.split('\n').filter(line => line.trim());
    const servers = lines.map(line => parseVlessUrl(line)).filter(s => s !== null);

    if (servers.length === 0) {
        setStatus('err', '[ ERROR ] не найдено валидных VLESS ссылок');
        return;
    }

    isChecking = true;
    setStatus('', `[ INFO ] проверка ${servers.length} серверов...`);
    checkResults = [];

    const batches = [];
    for (let i = 0; i < servers.length; i += parallel) {
        batches.push(servers.slice(i, i + parallel));
    }

    let checked = 0;
    const total = servers.length;

    for (const batch of batches) {
        const promises = batch.map(async (server) => {
            const result = await checkServer(server, timeout);
            checked++;
            
            const serverResult = {
                ...server,
                online: result.success,
                ping: result.ping,
                error: result.error,
                note: result.note
            };
            
            checkResults.push(serverResult);
            setStatus('', `[ INFO ] проверено ${checked}/${total}...`);
            
            return serverResult;
        });

        await Promise.all(promises);
    }

    isChecking = false;
    renderResults();
    
    const onlineCount = checkResults.filter(r => r.online).length;
    const timeStr = new Date().toLocaleTimeString('ru');
    setStatus('ok', `[ OK ] проверка завершена (${onlineCount}/${total} онлайн) — ${timeStr}`);
}

// Рендер результатов
function renderResults() {
    const tableDiv = document.getElementById('results-table');
    const countSpan = document.getElementById('result-count');
    
    const onlineCount = checkResults.filter(r => r.online).length;
    const offlineCount = checkResults.length - onlineCount;
    
    const sorted = [...checkResults].sort((a, b) => {
        if (a.online && !b.online) return -1;
        if (!a.online && b.online) return 1;
        if (a.online && b.online) return a.ping - b.ping;
        return 0;
    });
    
    countSpan.textContent = `Проверено: ${checkResults.length} серверов`;
    document.getElementById('online-count').textContent = onlineCount;
    document.getElementById('offline-count').textContent = offlineCount;
    
    const onlineServers = sorted.filter(r => r.online);
    if (onlineServers.length > 0) {
        const avgPing = Math.round(onlineServers.reduce((sum, r) => sum + r.ping, 0) / onlineServers.length);
        document.getElementById('avg-ping').textContent = `${avgPing}мс`;
    } else {
        document.getElementById('avg-ping').textContent = '-';
    }
    
    let html = `
        <table class="checker-table">
            <thead>
                <tr>
                    <th>Статус</th>
                    <th>Сервер</th>
                    <th>Пинг</th>
                    <th>Протокол</th>
                    <th>Безопасность</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    sorted.forEach(server => {
        const statusClass = server.online ? 'status-online' : 'status-offline';
        const statusText = server.online ? '●' : '○';
        const pingText = server.online ? `${server.ping}мс` : (server.error || 'Недоступен');
        
        html += `
            <tr class="${statusClass}">
                <td class="status-cell">${statusText}</td>
                <td class="name-cell">
                    <div class="server-name">${escapeHtml(server.name)}</div>
                    <div class="server-host">${escapeHtml(server.host)}:${server.port}</div>
                </td>
                <td class="ping-cell">${pingText}</td>
                <td class="type-cell">${server.type.toUpperCase()}</td>
                <td class="security-cell">${server.security.toUpperCase()}</td>
            </tr>
        `;
    });
    
    html += `</tbody></table>`;
    
    tableDiv.innerHTML = html;
    document.getElementById('result-section').style.display = 'block';
    document.getElementById('result-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Копирование результатов
function copyResults() {
    if (checkResults.length === 0) return;
    
    const text = checkResults.map(r => {
        const status = r.online ? '✓' : '✗';
        const ping = r.online ? `${r.ping}мс` : 'недоступен';
        return `${status} ${r.name} | ${r.host}:${r.port} | ${ping}`;
    }).join('\n');
    
    navigator.clipboard.writeText(text).then(() => {
        setStatus('ok', '[ OK ] результаты скопированы');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setStatus('ok', '[ OK ] результаты скопированы');
    });
}

// Экспорт в CSV
function exportResults() {
    if (checkResults.length === 0) return;
    
    const csv = [
        ['Статус', 'Название', 'Хост', 'Порт', 'Пинг (мс)', 'Протокол', 'Безопасность', 'UUID'],
        ...checkResults.map(r => [
            r.online ? 'Онлайн' : 'Офлайн',
            r.name,
            r.host,
            r.port,
            r.online ? r.ping : '',
            r.type,
            r.security,
            r.uuid
        ])
    ].map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vless_check_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setStatus('ok', '[ OK ] файл экспортирован');
}

// Очистка
function clearChecker() {
    document.getElementById('vless-input').value = '';
    document.getElementById('results-table').innerHTML = '';
    document.getElementById('result-section').style.display = 'none';
    checkResults = [];
    setStatus('', 'ожидание ввода...');
}