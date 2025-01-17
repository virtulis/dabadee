import { readFile } from 'fs/promises';
import * as http from 'node:http';
import { Config, isSome, Maybe, Swatch, WorkState } from '../types.js';
import ws, { WebSocketServer, WebSocket } from 'ws';
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

let saving = Promise.resolve();
const save = () => {
	saving = saving.then(() => writeFile(config.swatchesFile, JSON.stringify(swatches, null, '\t')));
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

function broadcast(msg: any[]) {
	const json = JSON.stringify(msg);
	for (const ws of sockets) ws.send(json);
}
function broadcastState() {
	const json = JSON.stringify(['state', state]);
	for (const ws of sockets) ws.send(json);
}

const passCmds = ['scan', 'calibrate', 'disconnect', 'reconnect', 'status'];
let upstream: Maybe<WebSocket>;
let upstreamUp = false;

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
		const msg: [string, ...any[]] = JSON.parse((data as Buffer).toString('utf8'));
		console.log(msg);
		const [cmd, ...args] = msg;
		if (cmd == 'set_current') {
			state.current = args[0];
		}
		else if (passCmds.includes(cmd) && upstreamUp) {
			upstream!.send(JSON.stringify([cmd]));
		}
		broadcastState();
	});
	
	ws.send(JSON.stringify(['state', state]));
	
});

server.listen(config.port, config.host);

let reconnect: Maybe<NodeJS.Timeout>;
let connecting = false;
function connect() {
	reconnect = null;
	connecting = true;
	const url = `ws://${config.bluecolorHost}:${config.bluecolorPort}`;
	console.log('connecting to', url);
	upstream = new WebSocket(url);
	upstream.on('close', failed);
	upstream.on('error', failed);
	upstream.on('open', () => {
		upstreamUp = true;
		console.log('connected!');
	});
	upstream.on('message', (data) => {
	
		const msg: any[] = JSON.parse(data as any);
		console.log(msg);
		const [cmd, ...args] = msg;
		
		if (cmd == 'state') {
			Object.assign(state, args[0]);
		}
		else if (cmd == 'connecting') {
			state.connecting = true;
			state.connected = false;
			state.device_name = args[0];
			state.device_name = args[1];
		}
		else if (cmd == 'connected') {
			state.connecting = false;
			state.connected = true;
			state.device_name = args[0];
			state.device_name = args[1];
		}
		else if (cmd == 'disconnected') {
			state.connecting = false;
			state.connected = false;
		}
		else if (cmd == 'power_level') {
			state.power_level = args[0];
		}
		else if (cmd == 'scan') {
			const [_idx, res] = args;
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
			save();
		}
		
		if (cmd != 'state') {
			broadcast(msg);
		}
		
		broadcastState();
		
	});
}
function failed(e: any) {
	console.error(e);
	state.connected = null;
	state.connecting = null;
	upstreamUp = false;
	if (!reconnect) reconnect = setTimeout(connect, 10_000);
}

connect();

//
// const reader = spawn(config.bluecolorPath, config.bluecolorArgs, {
// 	stdio: [null, 'pipe', 'inherit'],
// });
// const rl = createInterface({ input: reader.stdout });
// for await (const line of rl) {
// 	console.log(line);
// 	const res = JSON.parse(line);
// 	if (res.scan) {

// 	}
// }
