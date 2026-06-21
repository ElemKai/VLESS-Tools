#!/usr/bin/env python3
import asyncio
import json
import sys
import re
import socket
import struct
import base64
import hashlib
from urllib.request import Request, urlopen
from urllib.error import URLError
import websockets

LISTEN_HOST = '127.0.0.1'
LISTEN_PORT = 8888

USER_AGENTS = [
    'Hiddify/1.24.1 (Android 13)',
    'v2rayNG/1.8.19 (Android 14)',
    'V2Box/1.7.2 (iOS 18.0)',
    'Mozilla/5.0 (Linux; Android 14; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.83 Mobile Safari/537.36',
    'Shadowrocket/2.4.2 (iOS 18.0) CFNetwork/1561.0.1 Darwin/24.0.0',
    'Stash/2.6.3 (iOS 18.0)',
    'Nekoray/3.26',
    'Sing-box/1.9.0',
]


async def handle_fetch(url):
    for ua in USER_AGENTS:
        try:
            req = Request(url, headers={
                'User-Agent': ua,
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.9',
                'Cache-Control': 'no-cache',
            })
            loop = asyncio.get_event_loop()
            resp = await loop.run_in_executor(None, lambda: urlopen(req, timeout=15))
            body = resp.read().decode('utf-8', errors='replace')
            if resp.status == 200 and 'vless://' in body:
                headers = dict(resp.headers.items())
                return {'type': 'fetch_result', 'status': resp.status, 'body': body, 'ua': ua}
        except:
            pass
    try:
        req = Request(url, headers={'User-Agent': USER_AGENTS[0], 'Accept': '*/*'})
        loop = asyncio.get_event_loop()
        resp = await loop.run_in_executor(None, lambda: urlopen(req, timeout=15))
        body = resp.read().decode('utf-8', errors='replace')
        return {'type': 'fetch_result', 'status': resp.status, 'body': body, 'ua': USER_AGENTS[0]}
    except Exception as e:
        return {'type': 'fetch_result', 'status': 0, 'body': '', 'error': str(e)}


async def handler(ws):
    try:
        msg = await asyncio.wait_for(ws.recv(), timeout=15)
    except asyncio.TimeoutError:
        return
    try:
        data = json.loads(msg)
    except json.JSONDecodeError:
        return
    mode = data.get('mode', '')
    if mode == 'fetch':
        url = data.get('url', '')
        if url:
            result = await handle_fetch(url)
            await ws.send(json.dumps(result))
    elif mode == 'ssh':
        # SSH relay mode
        host = data.get('host', '')
        port = data.get('port', 22)
        user = data.get('user', 'root')
        password = data.get('password', '')
        if host:
            await ssh_relay(ws, host, port, user, password)


async def ssh_relay(ws, host, port, user, password):
    reader = None
    writer = None
    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(host, port), timeout=10
        )
        await ws.send(json.dumps({'type': 'ssh_ready'}))
        async def forward_ws_to_ssh():
            try:
                while True:
                    msg = await ws.recv()
                    if isinstance(msg, str) and msg.startswith('{'):
                        continue
                    if writer:
                        writer.write(msg.encode() if isinstance(msg, str) else msg)
                        await writer.drain()
            except:
                pass
        async def forward_ssh_to_ws():
            try:
                while reader:
                    data = await reader.read(4096)
                    if not data:
                        break
                    await ws.send(data.decode('utf-8', errors='replace'))
            except:
                pass
        await asyncio.gather(
            forward_ws_to_ssh(),
            forward_ssh_to_ws(),
        )
    except Exception as e:
        try:
            await ws.send(json.dumps({'type': 'ssh_error', 'error': str(e)}))
        except:
            pass
    finally:
        if writer:
            writer.close()
            try:
                await writer.wait_closed()
            except:
                pass


async def main():
    print(f'[ssh-proxy] WebSocket server on ws://{LISTEN_HOST}:{LISTEN_PORT}')
    print(f'[ssh-proxy] Modes: fetch (HTTP proxy) | ssh (terminal relay)')
    async with websockets.serve(handler, LISTEN_HOST, LISTEN_PORT):
        await asyncio.Future()


if __name__ == '__main__':
    asyncio.run(main())
