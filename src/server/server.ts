import { readFile } from 'fs/promises';
import * as http from 'node:http';
import { isSome, SocketMessage, WorkState } from '../types.js';
import ws, { WebSocketServer } from 'ws';
import { createReadStream } from 'node:fs';
import mime from 'mime';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { writeFile } from 'node:fs/promises';

const state: WorkState = {
	swatches: JSON.parse(await readFile('data/swatches.json', 'utf8')),
	current: 0,
};

state.current = Math.max(0, state.swatches.findIndex(s => !s.read));

const server = http.createServer((req, res) => {
	
	res.setHeader('Cache-Control', 'no-cache');
	
	console.log(req.url);
	const url = new URL(req.url!, 'http://localhost');
	
	const serve = (file: string, ct?: string) => {
		res.setHeader('Content-Type', ct ?? mime.getType(file)!);
		createReadStream(file).pipe(res);
	};
	
	if (url.pathname == '/') {
		return serve('src/ui/index.html', 'text/html; charset=utf-8');
	}
	if (url.pathname.startsWith('/ui.js')) {
		return serve(`out${url.pathname}`);
	}
	
	res.statusCode = 404;
	res.end('U wot m8');

});

const sockets = new Set<ws.WebSocket>();

const wss = new WebSocketServer({
	server,
	
});

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

server.listen(1752);

const reader = spawn('bluecolor', ['--get-status', '--format', 'json'], {
	stdio: [null, 'pipe', 'inherit'],
});
const rl = createInterface({ input: reader.stdout });
for await (const line of rl) {
	console.log(line);
	const res = JSON.parse(line);
	if (res.scan) {
		state.swatches[state.current]!.read = {
			rgb: res.scan.rgb,
			lab: res.scan.lab,
		};
		state.current++;
		broadcast();
		await writeFile('data/swatches.json', JSON.stringify(state.swatches, null, '\t'));
	}
}
