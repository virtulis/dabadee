import { useEffect, useMemo, useRef } from 'preact/hooks';
import { maybe, Maybe, Swatch, WorkState } from '../types.js';
import { useComputed, useSignal } from '@preact/signals';
import { render } from 'preact';
import chroma from 'chroma-js';

const columnCount = 23;
const rowsPerPage = 31;
const perPage = columnCount * rowsPerPage;

const side = 56;
const margin = side / 2; // 2 cm @ 72 dpi
const w = margin * 2 + columnCount * side;
const h = margin * 2 + rowsPerPage * side;

export const App = (_props: {}) => {
	
	const error = useSignal<Maybe<string>>(null);
	const socket = useSignal<Maybe<WebSocket>>(null);
	const state = useSignal<Maybe<WorkState>>(null);
	const bell = useRef<HTMLAudioElement>(null);
	
	useEffect(() => {
		const ws = new WebSocket('/');
		ws.onclose = ws.onerror = ev => {
			error.value = 'Connection failed. Refresh idk.';
			socket.value = null;
		};
		ws.onmessage = ev => {
			const json = JSON.parse(ev.data);
			state.value = { ...state.value, ...json };
			bell.current?.play();
		};
		socket.value = ws;
	}, []);
	
	const pages = useComputed(() => maybe(state.value, s => [0, 1].map(page => {
		const pagePatches = s.swatches.slice(page * perPage, page * perPage + perPage);
		const rows: Swatch[][] = [];
		for (let i = 0; i < pagePatches.length; i += columnCount) {
			rows.push(pagePatches.slice(i, i + columnCount));
		}
		return rows;
	})));
	
	function Square({ i, x, y, swatch }: {
		i: number;
		x: number;
		y: number;
		swatch: Swatch;
	}) {
		const resHex = useMemo(() => {
			const lab =swatch.read?.lab;
			if (!lab) return null;
			lab[0] = (lab[0] - 16) * 1.35;
			return chroma.lab(...lab).hex();
		}, [swatch.read?.lab.join(',')]);
		return useMemo(() => <g onClick={() => socket.value?.send(JSON.stringify({
			current: i,
		}))}>
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
	}
	
	if (!pages.value || !socket.value) return <div>Something went wrong and/or please wait. <strong>{error}</strong></div>;
	
	return <div>
	
		<audio src="/static/bell.mp3" ref={bell} />
		
		{pages.value.map((rows, page) => <svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox={`0 0 ${w} ${h}`}
		>
		
			{rows.map((row, y) => row.map((swatch, x) => {
				const i = perPage * page + y * columnCount + x;
				return <Square
					key={i}
					i={i}
					x={margin + side * x}
					y={margin + side * y}
					swatch={swatch}
				/>;
			}))}
			
			{maybe(state.value?.current, cur => {
				const first = page * perPage;
				if (cur < first || cur > first + perPage) return '';
				const y = Math.floor((cur - first) / columnCount);
				const x = (cur - first) % columnCount;
				return <rect
					x={margin + side * x - 5}
					y={margin + side * y - 5}
					height={side + 10}
					width={side + 10}
					fill="transparent"
					stroke={'#ff00ff'}
					stroke-width={5}
					stroke-dasharray="5 5"
				/>;
			})}
	
		</svg>)}
		
	</div>;
			
};

render(<App />, document.getElementById('app')!);
