// Глобальная переменная для хранения результатов
let currentResults = [];

// Ждем полной загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(tabName).classList.add('active');
        });
    });
});

// Show message
function showMessage(text, type = 'success') {
    const msgDiv = document.getElementById('message');
    const resultSection = document.getElementById('result-section');
    
    resultSection.style.display = 'block';
    msgDiv.textContent = text;
    msgDiv.className = `message ${type}`;
    
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    
    setTimeout(() => {
        msgDiv.style.display = 'none';
    }, 5000);
}

// Clear all
function clearAll() {
    document.getElementById('koala-input').value = '';
    document.getElementById('happ-input').value = '';
    document.getElementById('results-list').innerHTML = '';
    document.getElementById('result-section').style.display = 'none';
    document.getElementById('message').style.display = 'none';
    currentResults = [];
}

// Copy all results
function copyAll() {
    if (currentResults.length === 0) return;
    
    const allLinks = currentResults.map(r => r.link).join('\n');
    
    navigator.clipboard.writeText(allLinks).then(() => {
        showMessage(`✅ Скопировано ${currentResults.length} ссылок!`);
    }).catch(() => {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = allLinks;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showMessage(`✅ Скопировано ${currentResults.length} ссылок!`);
    });
}

// Download all results as file
function downloadAll() {
    if (currentResults.length === 0) return;
    
    const content = currentResults.map(r => r.link).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vless_links.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showMessage(`💾 Файл скачан с ${currentResults.length} ссылками!`);
}

// Copy single item
function copyItem(index) {
    const item = currentResults[index];
    if (!item) return;
    
    navigator.clipboard.writeText(item.link).then(() => {
        const btn = document.querySelector(`[data-copy-index="${index}"]`);
        if (btn) {
            btn.textContent = '✓ Скопировано';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = '📋 Копировать';
                btn.classList.remove('copied');
            }, 2000);
        }
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = item.link;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        
        const btn = document.querySelector(`[data-copy-index="${index}"]`);
        if (btn) {
            btn.textContent = '✓ Скопировано';
            btn.classList.add('copied');
            setTimeout(() => {
                btn.textContent = '📋 Копировать';
                btn.classList.remove('copied');
            }, 2000);
        }
    });
}

// Render results list
function renderResults(results) {
    currentResults = results;
    const listDiv = document.getElementById('results-list');
    const countSpan = document.getElementById('result-count');
    
    countSpan.textContent = `(${results.length} шт.)`;
    listDiv.innerHTML = '';
    
    results.forEach((item, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'result-item';
        
        itemDiv.innerHTML = `
            <div class="result-item-header">
                <div class="result-item-name">${escapeHtml(item.name)}</div>
                <button class="copy-item-btn" data-copy-index="${index}" onclick="copyItem(${index})">📋 Копировать</button>
            </div>
            <textarea class="result-item-link" readonly>${escapeHtml(item.link)}</textarea>
        `;
        
        listDiv.appendChild(itemDiv);
    });
    
    document.getElementById('result-section').style.display = 'block';
    document.getElementById('result-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== Happ JSON конвертация ====================

function convertHapp() {
    const input = document.getElementById('happ-input').value.trim();
    
    if (!input) {
        showMessage('❌ Введите JSON конфиг', 'error');
        return;
    }
    
    try {
        const config = JSON.parse(input);
        const results = jsonToVlessArray(config);
        
        if (results.length === 0) {
            showMessage('❌ Не найдено outbound с протоколом VLESS', 'error');
            return;
        }
        
        renderResults(results);
        showMessage(`✅ Найдено ${results.length} VLESS-ссылок!`);
    } catch (e) {
        showMessage(`❌ Ошибка: ${e.message}`, 'error');
    }
}

function jsonToVlessArray(configJson) {
    let config;
    if (typeof configJson === 'string') {
        config = JSON.parse(configJson);
    } else {
        config = configJson;
    }
    
    const results = [];
    
    // Ищем все VLESS outbound
    for (const outbound of config.outbounds || []) {
        if (outbound.protocol === 'vless') {
            try {
                const link = buildVlessFromOutbound(outbound, config.remarks || '');
                results.push({
                    name: config.remarks || outbound.tag || 'VLESS',
                    link: link
                });
            } catch (e) {
                console.warn('Ошибка при обработке outbound:', e);
            }
        }
    }
    
    return results;
}

function buildVlessFromOutbound(vlessOutbound, remarks) {
    const vnext = vlessOutbound.settings.vnext[0];
    const user = vnext.users[0];
    
    const uuid = user.id;
    const address = vnext.address;
    const port = vnext.port;
    
    const streamSettings = vlessOutbound.streamSettings || {};
    const network = streamSettings.network || 'tcp';
    const security = streamSettings.security || 'none';
    
    const params = {};
    params['security'] = security;
    params['type'] = network;
    
    if (network === 'tcp') {
        params['headerType'] = '';
        params['path'] = '';
        params['host'] = '';
        const tcpSettings = streamSettings.tcpSettings || {};
        const header = tcpSettings.header || {};
        if (header.type === 'http') {
            params['headerType'] = 'http';
            const request = header.request || {};
            if (request.path) {
                const pathVal = request.path;
                params['path'] = Array.isArray(pathVal) ? pathVal.join(',') : pathVal;
            }
            if (request.headers && request.headers.Host) {
                const hostVal = request.headers.Host;
                params['host'] = Array.isArray(hostVal) ? hostVal.join(',') : hostVal;
            }
        }
    } else if (network === 'ws') {
        const wsSettings = streamSettings.wsSettings || {};
        if (wsSettings.path) params['path'] = wsSettings.path;
        if (wsSettings.headers && wsSettings.headers.Host) {
            params['host'] = wsSettings.headers.Host;
        }
    }
    
    if (user.flow) params['flow'] = user.flow;
    
    if (security === 'reality') {
        const reality = streamSettings.realitySettings || {};
        if (reality.serverName) params['sni'] = reality.serverName;
        if (reality.fingerprint) params['fp'] = reality.fingerprint;
        if (reality.publicKey) params['pbk'] = reality.publicKey;
        if (reality.shortId) params['sid'] = reality.shortId;
        if (reality.spiderX) params['spx'] = reality.spiderX;
    } else if (security === 'tls') {
        const tls = streamSettings.tlsSettings || {};
        if (tls.serverName) params['sni'] = tls.serverName;
        if (tls.fingerprint) params['fp'] = tls.fingerprint;
        if (tls.alpn) {
            const alpnVal = tls.alpn;
            params['alpn'] = Array.isArray(alpnVal) ? alpnVal.join(',') : alpnVal;
        }
    }
    
    const paramOrder = ['security', 'type', 'headerType', 'path', 'host', 'flow', 
                       'sni', 'fp', 'pbk', 'sid', 'spx', 'alpn'];
    
    const queryParts = [];
    for (const key of paramOrder) {
        if (key in params) {
            const value = params[key];
            const encodedValue = encodeURIComponent(String(value));
            queryParts.push(`${key}=${encodedValue}`);
        }
    }
    
    const queryString = queryParts.join('&');
    const fragment = remarks ? encodeURIComponent(remarks) : '';
    
    let vlessUrl = `vless://${uuid}@${address}:${port}?${queryString}`;
    if (fragment) vlessUrl += `#${fragment}`;
    
    return vlessUrl;
}

// ==================== Koala Clash конвертация ====================

function convertKoala() {
    const input = document.getElementById('koala-input').value.trim();
    
    if (!input) {
        showMessage('❌ Введите конфиг Koala Clash', 'error');
        return;
    }
    
    try {
        let config;
        
        try {
            config = JSON.parse(input);
        } catch (e) {
            config = parseKoalaConfig(input);
        }
        
        const results = koalaToVlessArray(config);
        
        if (results.length === 0) {
            showMessage('❌ Не найдено прокси типа VLESS в конфиге', 'error');
            return;
        }
        
        renderResults(results);
        showMessage(`✅ Найдено ${results.length} VLESS-ссылок!`);
    } catch (e) {
        showMessage(`❌ Ошибка: ${e.message}`, 'error');
    }
}

// Улучшенный YAML-парсер для Koala Clash
function parseKoalaConfig(text) {
    const config = { proxies: [] };
    const lines = text.split('\n');
    
    let currentProxy = null;
    let inProxies = false;
    let currentKey = null;
    let currentArrayKey = null;
    
    for (let i = 0; i < lines.length; i++) {
        const rawLine = lines[i];
        const trimmed = rawLine.trim();
        
        // Пустые строки и комментарии
        if (!trimmed || trimmed.startsWith('#')) continue;
        
        // Определяем отступ
        const indent = rawLine.length - rawLine.trimStart().length;
        
        // Начало секции proxies
        if (trimmed === 'proxies:') {
            inProxies = true;
            continue;
        }
        
        // Если не в proxies - пропускаем
        if (!inProxies) continue;
        
        // Начало нового прокси (- name: ...)
        if (trimmed.startsWith('- ')) {
            // Сохраняем предыдущий прокси
            if (currentProxy) {
                config.proxies.push(currentProxy);
            }
            
            currentProxy = {};
            currentKey = null;
            currentArrayKey = null;
            
            // Парсим первую строку прокси
            const content = trimmed.substring(2).trim();
            if (content.includes(':')) {
                const colonIndex = content.indexOf(':');
                const key = content.substring(0, colonIndex).trim();
                const value = parseYamlValue(content.substring(colonIndex + 1).trim());
                currentProxy[key] = value;
                currentKey = key;
            }
            continue;
        }
        
        // Если нет текущего прокси - пропускаем
        if (!currentProxy) continue;
        
        // Обработка вложенных структур (headers, etc.)
        if (trimmed.endsWith(':') && !trimmed.includes(': ')) {
            // Это начало вложенного объекта
            currentKey = trimmed.slice(0, -1).trim();
            currentProxy[currentKey] = {};
            currentArrayKey = null;
            continue;
        }
        
        // Обработка массивов (- value)
        if (trimmed.startsWith('- ') && currentKey && typeof currentProxy[currentKey] === 'object' && !Array.isArray(currentProxy[currentKey])) {
            if (!Array.isArray(currentProxy[currentKey])) {
                currentProxy[currentKey] = [];
            }
            currentProxy[currentKey].push(parseYamlValue(trimmed.substring(2).trim()));
            continue;
        }
        
        // Обычное ключ: значение
        if (trimmed.includes(':')) {
            const colonIndex = trimmed.indexOf(':');
            const key = trimmed.substring(0, colonIndex).trim();
            const valueStr = trimmed.substring(colonIndex + 1).trim();
            
            // Если это вложенный ключ (есть отступ больше базового)
            if (indent > 6 && currentKey && typeof currentProxy[currentKey] === 'object') {
                currentProxy[currentKey][key] = parseYamlValue(valueStr);
            } else {
                currentProxy[key] = parseYamlValue(valueStr);
                currentKey = key;
            }
        }
    }
    
    // Не забываем добавить последний прокси
    if (currentProxy) {
        config.proxies.push(currentProxy);
    }
    
    return config;
}

// Парсинг значения YAML
function parseYamlValue(valueStr) {
    if (!valueStr) return '';
    
    // Убираем кавычки
    if ((valueStr.startsWith("'") && valueStr.endsWith("'")) ||
        (valueStr.startsWith('"') && valueStr.endsWith('"'))) {
        return valueStr.slice(1, -1);
    }
    
    // Boolean
    if (valueStr === 'true') return true;
    if (valueStr === 'false') return false;
    
    // Number
    if (/^\d+$/.test(valueStr)) return parseInt(valueStr, 10);
    if (/^\d+\.\d+$/.test(valueStr)) return parseFloat(valueStr);
    
    return valueStr;
}

// Конвертация всех VLESS прокси из Koala Clash
function koalaToVlessArray(config) {
    const results = [];
    
    for (const proxy of config.proxies || []) {
        if (proxy.type !== 'vless' && proxy.type !== 'VLESS') continue;
        
        try {
            const link = buildVlessFromKoalaProxy(proxy);
            results.push({
                name: proxy.name || 'VLESS',
                link: link
            });
        } catch (e) {
            console.warn('Ошибка при обработке прокси:', proxy.name, e);
        }
    }
    
    return results;
}

// Построение VLESS ссылки из одного Koala прокси
function buildVlessFromKoalaProxy(vlessProxy) {
    const uuid = vlessProxy.uuid || vlessProxy.id;
    const address = vlessProxy.server || vlessProxy.address;
    const port = vlessProxy.port;
    
    if (!uuid || !address || !port) {
        throw new Error("Отсутствуют обязательные параметры: uuid, server, port");
    }
    
    const params = {};
    params['security'] = (vlessProxy.tls === true || vlessProxy.tls === 'true') ? 'tls' : 'none';
    params['type'] = vlessProxy.network || 'tcp';
    
    // Network-specific settings
    if (params['type'] === 'ws') {
        if (vlessProxy.path) params['path'] = vlessProxy.path;
        if (vlessProxy.host) {
            params['host'] = vlessProxy.host;
        } else if (vlessProxy.headers && vlessProxy.headers.Host) {
            params['host'] = vlessProxy.headers.Host;
        }
    } else if (params['type'] === 'tcp') {
        params['headerType'] = vlessProxy.headerType || '';
        if (vlessProxy.path) params['path'] = vlessProxy.path;
        if (vlessProxy.host) params['host'] = vlessProxy.host;
    }
    
    // TLS settings
    if (params['security'] === 'tls') {
        if (vlessProxy.servername) params['sni'] = vlessProxy.servername;
        else if (vlessProxy.sni) params['sni'] = vlessProxy.sni;
        if (vlessProxy.fp) params['fp'] = vlessProxy.fp;
        else if (vlessProxy.fingerprint) params['fp'] = vlessProxy.fingerprint;
        if (vlessProxy.alpn) {
            params['alpn'] = Array.isArray(vlessProxy.alpn) ? vlessProxy.alpn.join(',') : vlessProxy.alpn;
        }
        if (vlessProxy.flow) params['flow'] = vlessProxy.flow;
    }
    
    // Reality settings
    if (vlessProxy.reality === true || vlessProxy.reality === 'true') {
        params['security'] = 'reality';
        if (vlessProxy.servername) params['sni'] = vlessProxy.servername;
        else if (vlessProxy.sni) params['sni'] = vlessProxy.sni;
        if (vlessProxy.fp) params['fp'] = vlessProxy.fp;
        else if (vlessProxy.fingerprint) params['fp'] = vlessProxy.fingerprint;
        if (vlessProxy.pbk || vlessProxy.publicKey) params['pbk'] = vlessProxy.pbk || vlessProxy.publicKey;
        if (vlessProxy.sid || vlessProxy.shortId) params['sid'] = vlessProxy.sid || vlessProxy.shortId;
        if (vlessProxy.spx || vlessProxy.spiderX) params['spx'] = vlessProxy.spx || vlessProxy.spiderX;
    }
    
    // Build query string
    const paramOrder = ['security', 'type', 'headerType', 'path', 'host', 'flow', 
                       'sni', 'fp', 'pbk', 'sid', 'spx', 'alpn'];
    
    const queryParts = [];
    for (const key of paramOrder) {
        if (key in params) {
            const value = params[key];
            const encodedValue = encodeURIComponent(String(value));
            queryParts.push(`${key}=${encodedValue}`);
        }
    }
    
    const queryString = queryParts.join('&');
    const remarks = vlessProxy.name || '';
    const fragment = remarks ? encodeURIComponent(remarks) : '';
    
    let vlessUrl = `vless://${uuid}@${address}:${port}?${queryString}`;
    if (fragment) vlessUrl += `#${fragment}`;
    
    return vlessUrl;
}