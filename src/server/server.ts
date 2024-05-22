import { readFile } from 'fs/promises';
import * as http from 'node:http';
import { Config, isSome, SocketMessage, Swatch, WorkState } from '../types.js';
import ws, { WebSocketServer } from 'ws';
import mime from 'mime';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { open, writeFile } from 'node:fs/promises';
import json5 from 'json5';

const { parse } = json5;
const config: Config = await readFile('data/config.json5', 'utf-8').then(parse);
const swatches: Swatch[] = await readFile(config.swatchesFile, 'utf8').then(parse);

const state: WorkState = {
	config,
	swatches,
	current: Math.max(0, swatches.findIndex(s => !s.read)),
};

const server = http.createServer((req, res) => {
	
	res.setHeader('Cache-Control', 'no-cache');
	
	console.log(req.url);
	const url = new URL(req.url!, 'http://localhost');
	
	const serve = (file: string, ct?: string) => open(file).then(fh => {
		res.setHeader('Content-Type', ct ?? mime.getType(file)!);
		fh.createReadStream().pipe(res);
	}).catch(e => {
		console.error(e);
		res.statusCode = 404;
		res.end('Nope');
	});
	
	if (url.pathname == '/') {
		return serve('src/ui/index.html', 'text/html; charset=utf-8');
	}
	if (url.pathname.startsWith('/ui.js')) {
		return serve(`out${url.pathname}`);
	}
	if (url.pathname.startsWith('/static/')) {
		return serve(url.pathname.slice(1));
	}
	
	res.statusCode = 404;
	res.end('U wot m8');

});

const sockets = new Set<ws.WebSocket>();

const wss = new WebSocketServer({ server });

function broadcast() {
	const json = JSON.stringify(state);
	for (const ws of sockets) ws.send(json);
}

wss.on('connection', function connection(ws) {
	
	sockets.add(ws);
	
	ws.on('error', e => {
		console.error(e);
		sockets.delete(ws);
	});
	ws.on('close', e => {
		console.error(e);
		sockets.delete(ws);
	});
	
	ws.on('message', data => {
		const msg: SocketMessage = JSON.parse((data as Buffer).toString('utf8'));
		const { current } = msg;
		if (isSome(current)) state.current = current;
		broadcast();
	});
	
	ws.send(JSON.stringify(state));
	
});

server.listen(config.port, config.host);

const reader = spawn(config.bluecolorPath, config.bluecolorArgs, {
	stdio: [null, 'pipe', 'inherit'],
});
const rl = createInterface({ input: reader.stdout });
for await (const line of rl) {
	console.log(line);
	const res = JSON.parse(line);
	if (res.scan) {
		let swatch = swatches[state.current];
		if (!swatch) {
			swatch = swatches[state.current] = {
				rgb: res.scan.rgb,
				cmyk: res.scan.cmyk,
			};
		}
		swatch.read = {
			rgb: res.scan.rgb,
			lab: res.scan.lab,
		};
		state.current++;
		broadcast();
		await writeFile(config.swatchesFile, JSON.stringify(swatches, null, '\t'));
	}
}
