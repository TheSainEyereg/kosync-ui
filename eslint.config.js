import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import stylistic from "@stylistic/eslint-plugin";
import svelte from "eslint-plugin-svelte";
import globals from "globals";
import ts from "typescript-eslint";

export default defineConfig(
	{
		ignores: ['**/node_modules/**', '**/.svelte-kit/**', '**/build/**', '**/dist/**']
	},
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	{
		languageOptions: {
			globals: { ...globals.browser, ...globals.node }
		}
	},
	{
		files: ["**/*.svelte", "**/*.svelte.ts", "**/*.svelte.js"],
		languageOptions: {
			parserOptions: { parser: ts.parser, extraFileExtensions: ['.svelte'] }
		}
	},
	{
		...stylistic.configs.customize({
			indent: "tab",
			quotes: "double",
			semi: true,
			jsx: false,
			arrowParens: true,
			commaDangle: "never"
		}),
		files: ["**/*.{js,mjs,cjs,ts,mts,cts,svelte}"]
	},
	{
		files: ["**/*.{js,mjs,cjs,ts,mts,cts,svelte}"],
		rules: {
			// "@typescript-eslint/no-non-null-assertion": "off",
			// "@typescript-eslint/no-unsafe-declaration-merging": "off",
			// "@typescript-eslint/no-namespace": "off",
			"no-cond-assign": "off",
			// "no-fallthrough": "off",
			// "no-case-declarations": "off",
			"curly": ["error", "multi"],
			"arrow-body-style": ["error", "as-needed"],
			"prefer-arrow-callback": ["error", { allowNamedFunctions: false }],
			"prefer-const": "error",
			"no-var": "error",
			"object-shorthand": ["error", "always"],
			"prefer-template": "error",
			"prefer-destructuring": [
				"warn",
				{
					VariableDeclarator: { array: true, object: true },
					AssignmentExpression: { array: false, object: false }
				},
				{ enforceForRenamedProperties: false }
			],
			"@stylistic/nonblock-statement-body-position": ["error", "below"],
			"@stylistic/implicit-arrow-linebreak": ["error", "below"],
			"@stylistic/brace-style": ["error", "1tbs", { allowSingleLine: false }],
			"@stylistic/indent": ["error", "tab", { SwitchCase: 1 }],
			"@stylistic/member-delimiter-style": [
				"error",
				{
					multiline: { delimiter: "semi", requireLast: true },
					singleline: { delimiter: "semi", requireLast: false }
				}
			],
			"@stylistic/padding-line-between-statements": [
				"error",
				{ blankLine: "always", prev: "*", next: "return" }
			]
		}
	},
	{
		files: ["**/*.svelte"],
		rules: {
			"@stylistic/indent": "off",
			"svelte/indent": ["error", { indent: "tab", indentScript: true, switchCase: 1 }]
		}
	},
	{
		files: [
			"**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts}",
			"**/__tests__/**/*.{js,mjs,cjs,ts,mts,cts}"
		],
		languageOptions: {
			globals: globals.jest
		}
	}
);
