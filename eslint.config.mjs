import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import stylistic from '@stylistic/eslint-plugin';

export default tseslint.config(
	eslint.configs.recommended,
	...tseslint.configs.recommendedTypeChecked,
	{
		ignores: [
			'**/*.js',
			'src/server/scripts/migrations/archive/*.ts',
		],
	},
	{
		languageOptions: {
			parserOptions: {
				tsconfigRootDir: import.meta.dirname,
				project: ['./tsconfig.json'],
			},
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: {
				...globals.browser,
				...globals.node,
			},
		},
		plugins: {
			'@stylistic': stylistic,
		},
		rules: {
			'@stylistic/indent': ['error', 'tab', {
				ignoredNodes: ['TemplateLiteral *'],
				flatTernaryExpressions: true,
			}],
			'@stylistic/linebreak-style': 'off',
			'@stylistic/no-trailing-spaces': ['error', { skipBlankLines: true }],
			'@stylistic/eol-last': ['error'],
			'no-debugger': 'off',
			
			'no-constant-condition': ['error', { checkLoops: false }],
			'no-extra-boolean-cast': 'off',
			
			'@typescript-eslint/ban-types': 'off', // no quick fix, revisit
			'@typescript-eslint/no-empty-interface': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/ban-ts-comment': 'off',
			'@typescript-eslint/explicit-module-boundary-types': 'off',
			'@typescript-eslint/no-var-requires': 'off', // generally forced due to module system problem, lack of types or similar
			'@typescript-eslint/no-non-null-assertion': 'off', // might want to replace with an actual runtime assertion - later
			'@typescript-eslint/no-unused-vars': 'off', // lots of false positives and no auto fix
			'@typescript-eslint/no-misused-promises': 'off', // too annoying for now
			'@typescript-eslint/unbound-method': 'off', // breaks @submitQueue (https://github.com/typescript-eslint/typescript-eslint/issues/6741)
			
			// silence these for now but fix eventually
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			
			'@typescript-eslint/no-floating-promises': ['error', {
				allowForKnownSafeCalls: [
					{ from: 'file', name: 'setState', path: 'src/admin/components/base.tsx' },
				],
			}],
			
			'@typescript-eslint/no-loss-of-precision': ['error'],
			'no-template-curly-in-string': ['error'],
			'no-unreachable-loop': ['error'],
			'no-unsafe-optional-chaining': ['error'],
			'@typescript-eslint/no-unnecessary-condition': ['error', { allowConstantLoopConditions: true }],
			
			'array-callback-return': ['error'],
			'@stylistic/dot-location': ['error', 'property'],
			'@typescript-eslint/dot-notation': ['error'],
			'no-else-return': ['error'],
			'no-eq-null': ['error'],
			'@stylistic/no-multi-spaces': ['error'],
			'no-sequences': ['error'],
			'no-throw-literal': ['error'],
			'no-unused-expressions': ['error', {
				allowTaggedTemplates: true,
				enforceForJSX: true,
			}],
			'no-useless-return': ['error'],
			
			'@stylistic/quotes': ['error', 'single', { allowTemplateLiterals: true }],
			'@stylistic/quote-props': ['error', 'as-needed'],
			'@stylistic/semi': ['error', 'always'],
			'@stylistic/array-bracket-newline': ['error', 'consistent'],
			'@stylistic/array-bracket-spacing': ['error'],
			'@stylistic/array-element-newline': ['error', 'consistent'],
			'@stylistic/block-spacing': ['error'],
			'@stylistic/brace-style': ['error', 'stroustrup', { allowSingleLine: true }],
			'@stylistic/comma-dangle': ['error', {
				arrays: 'always-multiline',
				objects: 'always-multiline',
				imports: 'always-multiline',
				exports: 'always-multiline',
				functions: 'only-multiline',
				enums: 'always-multiline',
				generics: 'only-multiline',
				tuples: 'only-multiline',
			}],
			'@stylistic/comma-spacing': ['error'],
			'@stylistic/comma-style': ['error'],
			'@stylistic/computed-property-spacing': ['error'],
			'@stylistic/func-call-spacing': ['error'],
			'@stylistic/function-call-argument-newline': ['error', 'consistent'],
			'@stylistic/function-paren-newline': ['error', 'consistent'],
			'@stylistic/implicit-arrow-linebreak': ['error'],
			'@stylistic/jsx-quotes': ['error'],
			'@stylistic/key-spacing': ['error'],
			'@stylistic/keyword-spacing': ['error'],
			'no-lonely-if': ['error'],
			'@stylistic/no-whitespace-before-property': ['error'],
			'@stylistic/nonblock-statement-body-position': ['error'],
			'@stylistic/object-curly-newline': ['error', { consistent: true }],
			'@stylistic/object-curly-spacing': ['error', 'always'],
			'@stylistic/object-property-newline': ['error', { allowAllPropertiesOnSameLine: true }],
			'@stylistic/operator-linebreak': ['error', 'before'],
			'@stylistic/semi-spacing': ['error'],
			'@stylistic/semi-style': ['error'],
			'@stylistic/space-before-blocks': ['error'],
			'unicode-bom': ['error'],
			'@stylistic/arrow-spacing': ['error'],
			'no-useless-computed-key': ['error'],
			// '@stylistic/member-delimiter-style': ['error'],
			
			'prefer-object-spread': ['error'],
		},
	},
);
