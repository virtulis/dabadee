type N = number;

export type None = undefined | null;
export type Maybe<T> = T | None;
export type Some<T> = NonNullable<T>;

interface TupleOf<T> {
	0: [];
	1: [T];
	2: [T, T];
	3: [T, T, T];
	4: [T, T, T, T];
	5: [T, T, T, T, T];
	6: [T, T, T, T, T, T];
	7: [T, T, T, T, T, T, T];
	8: [T, T, T, T, T, T, T, T];
	9: [T, T, T, T, T, T, T, T, T];
	10: [T, T, T, T, T, T, T, T, T, T];
	11: [T, T, T, T, T, T, T, T, T, T, T];
	12: [T, T, T, T, T, T, T, T, T, T, T, T];
}

export type AtLeastN<T, N extends keyof TupleOf<T>> = [...TupleOf<T>[N], ...T[]];
export type NonEmptyList<T> = AtLeastN<T, 1>;

export type Pair<T> = [T, T];
export type Triple<T> = [T, T, T];
export type Four<T> = [T, T, T, T];
export type Five<T> = [T, T, T, T, T];

export type ColorTriple = Triple<N>;
export type ColorTuple = [N, N, N, ...N[]];

export interface Swatch {
	cmyk: Four<N>;
	rgb: ColorTriple;
	read?: Maybe<{
		lab: ColorTriple;
		rgb: ColorTriple;
	}>;
}

export interface Config {
	
	port: number;
	host: string;
	
	columnCount: number;
	rowsPerPage: number;
	
	swatchesFile: string;
	
	blackL: number;
	whiteL: number;
	
	bluecolorHost: string;
	bluecolorPort: number,
	
}

export interface WorkState {

	config: Config;
	
	swatches: Swatch[];
	current: number;
	
	connected?: Maybe<boolean>;
	connecting?: Maybe<boolean>;
	device_address?: Maybe<string>;
	device_name?: Maybe<string>;
	power_level?: Maybe<number>;
	calibrated?: Maybe<string>;
	
}

type MaybeCB<A, B> = (it: Some<A>) => B;

export function isNone(it: any): it is None {
	return it === null || it === undefined;
}

export function isSome<T>(it: T): it is Some<T> {
	return it !== null && it !== undefined;
}

export function maybe<IT, RT>(it: IT, action: MaybeCB<IT, RT>): RT | Extract<IT, null | undefined> {
	if (!isSome(it)) return it as Extract<IT, null | undefined>;
	return action(it);
}
