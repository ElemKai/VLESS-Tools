function initAdmin() {
    if (initAdmin._done) return;
    initAdmin._done = true;

    // -- ttyd --
    const ttydFrame = document.getElementById('ttyd-frame');
    if (ttydFrame) {
        const connectBtn = document.getElementById('ttyd-connect');
        if (connectBtn) {
            connectBtn.addEventListener('click', () => {
                const host = document.getElementById('ttyd-host').value || '192.168.2.1';
                const port = document.getElementById('ttyd-port').value || '7681';
                ttydFrame.src = `http://${host}:${port}/`;
                ttydFrame.style.display = 'block';
            });
        }
    }

    // -- IP tools --
    const ipBtn = document.getElementById('ip-lookup');
    const ipResult = document.getElementById('ip-result');
    if (ipBtn) {
        ipBtn.addEventListener('click', async () => {
            const ip = document.getElementById('ip-input').value.trim();
            if (!ip) return;
            ipBtn.disabled = true;
            ipResult.textContent = 'Поиск...';
            try {
                const proxyUrl = 'https://spare-macaque-5540.svoboda.deno.net/api/proxy';
                const target = `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,message,country,regionName,city,isp,org,as,proxy,hosting,query`;
                const resp = await fetch(`${proxyUrl}?url=${encodeURIComponent(target)}`);
                const text = await resp.text();
                if (!resp.ok) { ipResult.textContent = 'Ошибка прокси: ' + (resp.status === 502 ? 'сервер недоступен' : resp.status); return; }
                let data;
                try { data = JSON.parse(text); } catch { ipResult.textContent = 'Ошибка: невалидный ответ'; return; }
                if (data.error) { ipResult.textContent = 'Ошибка: ' + data.error; return; }
                if (data.body !== undefined) {
                    try { data = JSON.parse(data.body); } catch { ipResult.textContent = 'Ошибка: ' + data.body; return; }
                }
                ipResult.textContent = JSON.stringify(data, null, 2);
            } catch (e) {
                ipResult.textContent = 'Ошибка: ' + e.message;
            }
            ipBtn.disabled = false;
        });
    }

    // -- Speed test (speedometer) --
    const speedBtn = document.getElementById('speed-test');
    if (speedBtn) {
        const speedCanvas = document.getElementById('speed-canvas');
        const speedVal = document.getElementById('speed-value');
        const speedUnit = document.getElementById('speed-unit');

        speedBtn.addEventListener('click', () => {
            if (!speedCanvas || !speedVal || !speedUnit) return;
            const ctx = speedCanvas.getContext('2d');
            const w = speedCanvas.width = 280, h = speedCanvas.height = 280;
            const cx = w / 2, cy = h / 2, r = 110;
            let angle = 0;
            speedVal.textContent = '0';
            speedUnit.textContent = 'Mbps';

            const interval = setInterval(() => {
                angle += 0.02;
                if (angle > Math.PI * 1.5) { clearInterval(interval); speedBtn.disabled = false; return; }
                const speed = Math.round((angle / (Math.PI * 1.5)) * 500);
                speedVal.textContent = speed;
                ctx.clearRect(0, 0, w, h);

                ctx.strokeStyle = 'rgba(255,215,0,0.1)';
                ctx.lineWidth = 12;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0.75 * Math.PI, 2.25 * Math.PI);
                ctx.stroke();

                const grad = ctx.createLinearGradient(0, 0, w, h);
                grad.addColorStop(0, '#22c55e');
                grad.addColorStop(0.5, '#FFD700');
                grad.addColorStop(1, '#ef4444');
                ctx.strokeStyle = grad;
                ctx.beginPath();
                ctx.arc(cx, cy, r, 0.75 * Math.PI, 0.75 * Math.PI + angle);
                ctx.stroke();

                ctx.fillStyle = 'var(--white)';
                ctx.font = 'bold 14px monospace';
                ctx.textAlign = 'center';
                ctx.fillText('DOWNLOAD', cx, cy + 60);
            }, 30);
        });
    }
}
