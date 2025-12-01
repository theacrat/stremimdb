import { type Config } from "prettier";

const config: Config = {
	useTabs: true,
	overrides: [
		{
			files: ["**/*.jsonc"],
			options: {
				trailingComma: "none",
			},
		},
	],
};

export default config;
