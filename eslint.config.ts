// eslint.config.js
import eslintConfigPrettier from "eslint-config-prettier/flat";
import js from "@eslint/js";
import ts from "typescript-eslint";
import globals from "globals";
import { includeIgnoreFile } from "@eslint/compat";
import { fileURLToPath, URL } from "node:url";

export default [
	includeIgnoreFile(fileURLToPath(new URL(".gitignore", import.meta.url))),
	js.configs.recommended,
	...ts.configs.recommended,
	{
		languageOptions: {
			globals: {
				...globals.node,
			},
		},
	},
	eslintConfigPrettier,
];
