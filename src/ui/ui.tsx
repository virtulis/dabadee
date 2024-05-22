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
			const json = JSON.parse(ev.data);
			state.value = { ...state.peek(), ...json };
			bell.current?.play();
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
	
	const setCurrent = (current: number) => socket.peek()?.send(JSON.stringify({ current }));
	const { columnCount, rowsPerPage } = s.config;
	const perPage = columnCount * rowsPerPage;
	const length = s.swatches.length;
	
	return <div>
	
		<audio src="/static/bell.mp3" ref={bell} />
		
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
		
	</div>;
			
};

render(<App />, document.getElementById('app')!);
