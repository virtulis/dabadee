import { useEffect, useMemo, useRef } from 'preact/hooks';
import { maybe, Maybe, Swatch, WorkState } from '../types.js';
import { useComputed, useSignal } from '@preact/signals';
import { render } from 'preact';
import chroma from 'chroma-js';

const side = 56;
const margin = side * 0.75;

const Square = ({ i, x, y, swatch, onClick }: {
	i: number;
	x: number;
	y: number;
	swatch: Swatch;
	onClick?: () => void;
}) => {
	const resHex = useMemo(() => {
		const lab =swatch.read?.lab;
		if (!lab) return null;
		lab[0] = (lab[0] - 16) * 1.35;
		return chroma.lab(...lab).hex();
	}, [swatch.read?.lab.join(',')]);
	return useMemo(() => <g onClick={onClick}>
		<rect
			x={x}
			y={y}
			height={side}
			width={side}
			fill={`rgb(${swatch.rgb.join(',')})`}
			stroke={`rgb(${swatch.rgb.join(',')})`}
			stroke-width={0.5}
		/>
		{resHex && <circle
			cx={x + side / 2}
			cy={y + side / 2}
			r={side * 0.3}
			fill={resHex}
		/>}
	</g>, [i, resHex]);
};


export const App = (_props: {}) => {
	
	const error = useSignal<Maybe<string>>(null);
	const socket = useSignal<Maybe<WebSocket>>(null);
	const state = useSignal<Maybe<WorkState>>(null);
	const bell = useRef<HTMLAudioElement>(null);
	const bellOn = useSignal(true);
	
	const log = useSignal<[number, string][]>([]);
	
	const reconnect = () => {
		const ws = new WebSocket('/');
		ws.onclose = ws.onerror = ev => {
			error.value = 'Connection failed. Refresh idk.';
			socket.value = null;
			state.value = null;
			console.error(ev);
			setTimeout(reconnect, 1000);
		};
		ws.onmessage = ev => {
			
			const json: [string, ...any[]] = JSON.parse(ev.data);
			const [cmd, ...args] = json;
			console.log(json);

			if (cmd != 'state') {
				log.value = [
					...log.value.slice(-30),
					[Date.now(), JSON.stringify(json)],
				];
			}
			
			if (cmd == 'state') {
				state.value = { ...state.peek(), ...args[0] };
			}
			else if (cmd == 'scan') {
				if (bellOn.peek()) bell.current?.play().catch(console.error);
			}
			
		};
		socket.value = ws;
	};
	useEffect(reconnect, []);
	
	const pages = useComputed(() => {
		const s = state.value;
		if (!s) return [];
		const { columnCount, rowsPerPage } = s.config;
		const perPage = columnCount * rowsPerPage;
		return [...Array(Math.ceil(s.swatches.length / perPage)).keys()].map(page => {
			const pagePatches = s.swatches.slice(page * perPage, page * perPage + perPage);
			const rows: Swatch[][] = [];
			for (let i = 0; i < pagePatches.length; i += columnCount) {
				rows.push(pagePatches.slice(i, i + columnCount));
			}
			return rows;
		});
	});
	
	const s = state.value;
	if (!s || !pages.value || !socket.value) return <div>Something went wrong and/or please wait. <strong>{error}</strong></div>;
	
	const send = (msg: any) => socket.peek()?.send(JSON.stringify(msg));
	const setCurrent = (idx: number) => {
		const prev = state.peek()?.current;
		if (idx !== prev) send(['set_current', idx]);
		else send(['scan']);
	};
	const { columnCount, rowsPerPage } = s.config;
	const perPage = columnCount * rowsPerPage;
	const length = s.swatches.length;
	
	return <div class="app">
	
		<audio src="/static/bell.mp3" ref={bell} />
		
		{maybe(state.value, s => <div class="commands">
			{['disconnect', 'reconnect', 'calibrate', 'scan', 'status'].map(cmd => <button
				onClick={() => send([cmd])}
			>{cmd}</button>)}
			<div>{s.connected ? 'connected' : s.connecting ? 'connecting' : s.connected == false ? 'disconnected' : 'down'}</div>
			<div>{s.device_address}</div>
			<div>{s.device_name}</div>
			<div>{maybe(s.power_level, n => (n / 10).toFixed(1) + 'V')}</div>
			<label>
				<input type="checkbox" checked={bellOn.value} onChange={e => bellOn.value = e.currentTarget.checked} />
				bell
			</label>
		</div>)}
		
		{pages.value.map((rows, page) => <svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox={`${-margin} ${-margin} ${margin * 2 + s.config.columnCount * side} ${margin * 2 + Math.max(rows.length, 2) * side}`}
		>
		
			{rows.map((row, y) => row.map((swatch, x) => {
				const i = perPage * page + y * columnCount + x;
				return <Square
					key={i}
					i={i}
					y={side * y}
					x={side * x}
					swatch={swatch}
					onClick={() => setCurrent(i)}
				/>;
			}))}
			
			{page == pages.value.length - 1 && <circle
				key="add"
				cy={side * (Math.floor((length % perPage) / columnCount) + 0.5)}
				cx={side * (((length % perPage) % columnCount) + 0.5)}
				r={side * 0.3}
				fill="transparent"
				stroke="black"
				stroke-dasharray="10 5"
				onClick={() => setCurrent(length)}
			/>}
			
			{maybe(s.current, cur => {
				const first = page * perPage;
				if (cur < first || cur > first + perPage) return '';
				const y = Math.floor((cur - first) / columnCount);
				const x = (cur - first) % columnCount;
				return <rect
					class="current-marker"
					x={side * x - side * 0.5}
					y={side * y - side * 0.5}
					height={side * 2}
					width={side * 2}
					fill="transparent"
					stroke="white"
					stroke-width={5}
					rx={side * 0.3}
				/>;
			})}
	
		</svg>)}
		
		<div class="log">
			{log.value.map(([at, msg]) => <div key={at}>
				{msg}
			</div>)}
		</div>
		
	</div>;
			
};

render(<App />, document.getElementById('app')!);
