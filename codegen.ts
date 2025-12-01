import type { CodegenConfig } from "@graphql-codegen/cli";

const config: CodegenConfig = {
	schema: "./schemas/schema.graphql",
	documents: ["src/**/*.ts"],
	ignoreNoDocuments: true,
	generates: {
		"./src/generated/graphql/": {
			preset: "client",
		},
		"./schemas/schema.graphql": {
			plugins: ["schema-ast"],
			config: {
				includeDirectives: true,
			},
		},
	},
};

export default config;
