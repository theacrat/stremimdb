export const manifestJson = {
	id: "pet.thea.stremimdb",
	version: "1.0.0",
	name: "StremIMDb",
	description: "IMDb metadata in Stremio",
	logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/IMDB_Logo_2016.svg/575px-IMDB_Logo_2016.svg.png",
	background:
		"https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/IMDB_Logo_2016.svg/575px-IMDB_Logo_2016.svg.png",
	catalogs: [
		{
			type: "movie",
			id: "search",
			name: "Movies",
			extra: [
				{
					name: "search",
					isRequired: true,
				},
			],
		},
		{
			type: "series",
			id: "search",
			name: "Series",
			extra: [
				{
					name: "search",
					isRequired: true,
				},
			],
		},
	],
	resources: ["catalog", "meta"],
	types: ["movie", "series"],
	idPrefixes: ["tt"],
	behaviorHints: {
		configurable: false,
		configurationRequired: false,
	},
};
