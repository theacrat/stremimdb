import { StremioMeta, Video } from "./classes/StremioMeta";
import { graphql } from "./generated/graphql/gql";
import {
	EpisodeConnection,
	MainSearchTitleType,
	MainSearchType,
	Title,
} from "./generated/graphql/graphql";
import { getImages, matchId } from "./tmdb";
import type { UserSettings } from "./userSettings";
import { Client, cacheExchange, fetchExchange } from "@urql/core";

function createClient(languageCode: string) {
	return new Client({
		url: "https://api.graphql.imdb.com/",
		exchanges: [cacheExchange, fetchExchange],
		preferGetMethod: false,
		fetchOptions: () => {
			return {
				headers: {
					"User-Agent":
						"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.3",
					"Content-Type": "application/json",
					"x-imdb-user-country": languageCode.split("-")[1] || "US",
					"x-imdb-user-language": languageCode,
				},
			};
		},
	});
}

const GetMoreEpisodesQuery = graphql(`
	query GetMoreEpisodes($id: ID!, $after: ID!) {
		title(id: $id) {
			episodes {
				episodes(
					sort: { by: EPISODE_THEN_RELEASE, order: ASC }
					first: 250
					after: $after
				) {
					edges {
						node {
							id
							series {
								displayableEpisodeNumber {
									displayableSeason {
										text
									}
									episodeNumber {
										text
									}
								}
							}
							titleText {
								text
							}
							plot {
								plotText {
									plainText
								}
							}
							releaseYear {
								year
							}
							releaseDate {
								year
								month
								day
							}
							primaryImage {
								url
							}
						}
					}
					pageInfo {
						endCursor
						hasNextPage
					}
				}
			}
		}
	}
`);

const TitleFull = graphql(`
	query Title($id: ID!) {
		title(id: $id) {
			id
			titleText {
				text
				isOriginalTitle
			}
			originalTitleText {
				text
			}
			spokenLanguages {
				spokenLanguages {
					text
				}
			}
			releaseYear {
				year
				endYear
			}
			releaseDate {
				year
				month
				day
			}
			titleType {
				canHaveEpisodes
			}
			plot {
				plotText {
					plainText
				}
			}
			ratingsSummary {
				aggregateRating
			}
			primaryImage {
				url
			}
			runtime {
				displayableProperty {
					value {
						plainText
					}
				}
			}
			titleGenres {
				genres {
					genre {
						text
					}
				}
			}
			principalCredits {
				category {
					id
				}
				credits {
					name {
						id
						nameText {
							text
						}
					}
				}
			}
			episodes {
				episodes(first: 250, sort: { by: EPISODE_THEN_RELEASE, order: ASC }) {
					edges {
						node {
							id
							series {
								displayableEpisodeNumber {
									displayableSeason {
										text
									}
									episodeNumber {
										text
									}
								}
							}
							titleText {
								text
							}
							plot {
								plotText {
									plainText
								}
							}
							releaseYear {
								year
							}
							releaseDate {
								year
								month
								day
							}
							primaryImage {
								url
							}
						}
					}
					pageInfo {
						hasNextPage
						endCursor
					}
					total
				}
			}
			countriesOfOrigin {
				countries {
					text
				}
			}
			awardNominations(first: 1000) {
				edges {
					node {
						isWinner
					}
				}
				total
			}
			externalLinks(first: 10, filter: { categories: ["official"] }) {
				edges {
					node {
						url
						label
					}
				}
			}
			connections(first: 1, filter: { categories: ["follows"] }) {
				edges {
					node {
						associatedTitle {
							id
						}
					}
				}
			}
		}
	}
`);

async function getAllEpisodes(t: Title, client: Client) {
	const e = t.episodes?.episodes;
	if (!e) {
		return;
	}
	let next = e?.pageInfo?.hasNextPage ? e.pageInfo.endCursor : undefined;
	while (next) {
		const nextEpisodes = await client.query(GetMoreEpisodesQuery, {
			id: t.id,
			after: next,
		});
		const n = nextEpisodes?.data?.title?.episodes
			?.episodes as EpisodeConnection;
		e?.edges.push(...(n?.edges || []));
		e.pageInfo = n.pageInfo;
		next = n?.pageInfo.hasNextPage ? n.pageInfo.endCursor : undefined;
	}

	e.edges
		.filter(
			(e) =>
				e?.node?.series?.displayableEpisodeNumber?.displayableSeason?.text ===
				"unknown",
		)
		.forEach((e, i) => {
			if (!e?.node?.series) {
				return;
			}
			e.node.series.displayableEpisodeNumber.displayableSeason.text = "0";
			e.node.series.displayableEpisodeNumber.episodeNumber.text = (
				i + 1
			).toString();
		});
}

export async function getFullTitle(
	settings: UserSettings,
	id: string,
): Promise<StremioMeta | undefined> {
	const client = createClient(settings.languageCode);
	const cleanId = id.replace(".json", "");
	const results = await Promise.all([
		client.query(TitleFull, { id: cleanId }),
		getImages(settings, cleanId),
	]);

	const [imdbResults] = results;
	let [, tmdbResults] = results;

	const title = imdbResults.data?.title;

	if (!title?.titleText?.text) {
		return;
	}

	if (!tmdbResults) {
		const connection = title.connections?.edges.find((c) => c)?.node
			.associatedTitle.id;
		if (connection) {
			tmdbResults = await getImages(settings, connection, true);
		}
	}

	let videos;

	if (title.titleType?.canHaveEpisodes) {
		await getAllEpisodes(title as Title, client);
		videos = title.episodes?.episodes?.edges?.flatMap((e) => {
			if (!e?.node.titleText || !e?.node.releaseDate?.year) {
				return [];
			}

			const season = parseInt(
				e.node.series?.displayableEpisodeNumber?.displayableSeason?.text || "",
			);
			const episode = parseInt(
				e.node.series?.displayableEpisodeNumber?.episodeNumber?.text || "",
			);

			const video: Video = {
				id: [title.id, season, episode].join(":"),
				title: e.node.titleText.text,
				released: new Date(
					Date.UTC(
						e.node.releaseDate.year,
						e.node.releaseDate.month || 11,
						e.node.releaseDate.day || 31,
					),
				),
				thumbnail: e.node.primaryImage?.url || undefined,
				episode: episode,
				season: season,
				overview: e.node.plot?.plotText?.plainText || undefined,
			};
			return video;
		});
	}

	if (videos) {
		videos
			.filter((v) => v.season && isNaN(v.season))
			.forEach((v, i) => {
				v.season = 0;
				v.episode = i + 1;
			});
	}

	const meta = new StremioMeta({
		id: title.id,
		type: title.titleType?.canHaveEpisodes ? "series" : "movie",
		name: title.titleText?.text,
		genres: title.titleGenres?.genres?.flatMap((g) => g?.genre.text || []),
		poster: title.primaryImage?.url || undefined,
		description: title.plot?.plotText?.plainText || undefined,
		releaseInfo:
			title.releaseYear?.year === title.releaseYear?.endYear
				? title.releaseYear?.year?.toString()
				: `${title.releaseYear?.year}-${title.releaseYear?.endYear || ""}`,
		director: title.principalCredits
			?.find((p) => p?.category.id === "director")
			?.credits.flatMap((d) => d?.name.nameText?.text || []),
		cast: title.principalCredits
			?.find((p) => p?.category.id === "cast")
			?.credits.flatMap((d) => d?.name.nameText?.text || []),
		imdbRating: title.ratingsSummary?.aggregateRating?.toString(),
		released:
			title.releaseDate?.year &&
			title.releaseDate.month &&
			title.releaseDate.day
				? new Date(
						Date.UTC(
							title.releaseDate.year,
							title.releaseDate.month,
							title.releaseDate.day,
						),
					)
				: undefined,
		runtime: title.runtime?.displayableProperty.value.plainText || undefined,
		language: title.spokenLanguages?.spokenLanguages
			.flatMap((l) => l?.text || [])
			.join(", "),
		country: title.countriesOfOrigin?.countries
			?.flatMap((c) => c?.text || [])
			.join(", "),
		awards: title.awardNominations?.edges.length
			? (() => {
					const wins = title.awardNominations?.edges.filter(
						(a) => a?.node.isWinner,
					).length;
					const noms = title.awardNominations.edges.length - wins;

					const winStr = (() => {
						if (!wins) {
							return "";
						} else if (wins === 1) {
							return "1 win";
						} else {
							return `${wins} wins`;
						}
					})();

					const nomStr = (() => {
						if (!noms) {
							return "";
						}
						if (noms === 1) {
							return "1 nomination";
						} else {
							return `${noms} nominations`;
						}
					})();

					if (winStr && nomStr) {
						return `${winStr} & ${nomStr} total`;
					}
					return `${winStr || nomStr} total`;
				})()
			: undefined,
		videos: videos,
		website:
			title.externalLinks?.edges.find((w) => w?.node.label === "Official site")
				?.node.url || title.externalLinks?.edges.find((w) => w)?.node.url,
		behaviorHints: !title.titleType?.canHaveEpisodes
			? { defaultVideoId: title.id }
			: undefined,
	});

	if (tmdbResults) {
		meta.setTmdbImages(
			tmdbResults.backdrops.find((r) => r),
			tmdbResults.logos.find((r) => r),
		);
	}

	return meta;
}

const Query = graphql(`
	query Query($search: MainSearchOptions!) {
		mainSearch(first: 20, options: $search) {
			edges {
				node {
					entity {
						... on Title {
							id
							titleText {
								text
							}
							primaryImage {
								url
							}
							connections(first: 1, filter: { categories: ["follows"] }) {
								edges {
									node {
										associatedTitle {
											id
										}
									}
								}
							}
						}
					}
				}
			}
		}
	}
`);

export async function search(
	settings: UserSettings,
	text: string,
	type: string,
): Promise<StremioMeta[]> {
	const client = createClient(settings.languageCode);
	const result = await client.query(Query, {
		search: {
			type: [MainSearchType.Title],
			searchTerm: text,
			titleSearchOptions: {
				type: [
					type === "series"
						? MainSearchTitleType.Tv
						: MainSearchTitleType.Movie,
				],
			},
		},
	});

	if (!result.data?.mainSearch?.edges.length) {
		return [];
	}

	const searchResults = await Promise.all(
		result.data.mainSearch.edges.map(async (r) => {
			const title = r?.node.entity;
			if (title?.__typename !== "Title" || !title.titleText?.text) {
				return [];
			}

			if (settings.hideLowQuality) {
				const connectionId = title.connections?.edges.find((c) => c)?.node
					.associatedTitle.id;

				let match = await matchId(title.id, connectionId === undefined);
				if (!match.find((m) => m) && connectionId) {
					match = await matchId(connectionId, true);
				}

				if (!match.find((m) => m)) {
					return [];
				}
			}

			return new StremioMeta({
				id: title.id,
				type: type,
				name: title.titleText?.text,
				poster: title.primaryImage?.url || undefined,
			});
		}),
	);

	return searchResults.flat();
}
