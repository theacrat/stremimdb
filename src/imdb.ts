import { Client, cacheExchange, fetchExchange, gql } from "@urql/core";
import { graphql } from "./generated/graphql/gql";
import { StremioMeta, Video } from "./classes/StremioMeta";
import {
  MainSearchTitleType,
  MainSearchType,
} from "./generated/graphql/graphql";
import { getImages, matchId } from "./tmdb";

const client = new Client({
  url: "https://api.graphql.imdb.com/",
  exchanges: [cacheExchange, fetchExchange],
  preferGetMethod: false,
  fetchOptions: () => {
    return {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.3",
        "Content-Type": "application/json",
      },
    };
  },
});

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
        episodes(first: 500) {
          edges {
            node {
              id
              series {
                displayableEpisodeNumber {
                  displayableSeason {
                    season
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
            hasPreviousPage
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

export async function getFullTitle(
  id: string
): Promise<StremioMeta | Record<string, never>> {
  let [result, tmdbResults] = await Promise.all([
    client.query(TitleFull, { id: id }),
    getImages(id),
  ]);

  const title = result.data?.title;

  if (!title?.titleText?.text) {
    return {};
  }

  if (!tmdbResults) {
    const connection = title.connections?.edges.find((c) => c)?.node
      .associatedTitle.id;
    if (connection) {
      tmdbResults = await getImages(connection, true);
    }
  }

  let videos;

  if (title.titleType?.canHaveEpisodes) {
    videos = title.episodes?.episodes?.edges?.flatMap((e) => {
      if (!e?.node.titleText || !e?.node.releaseDate?.year) {
        return [];
      }

      const season =
        e.node.series?.displayableEpisodeNumber?.displayableSeason?.season &&
        e.node.series?.displayableEpisodeNumber?.displayableSeason?.season !==
          "unknown"
          ? e.node.series?.displayableEpisodeNumber?.displayableSeason?.season
          : "0";
      const episode =
        e.node.series?.displayableEpisodeNumber?.episodeNumber?.text &&
        e.node.series?.displayableEpisodeNumber?.episodeNumber?.text !==
          "unknown"
          ? e.node.series?.displayableEpisodeNumber?.episodeNumber?.text
          : (
              title.episodes?.episodes?.edges
                ?.filter(
                  (e2) =>
                    e2?.node.series?.displayableEpisodeNumber.displayableSeason
                      .season ===
                    e.node.series?.displayableEpisodeNumber.displayableSeason
                      .season
                )
                .findIndex((e2) => e2?.node.id === e.node.id)! + 1
            ).toString();

      const video: Video = {
        id: [title.id, season, episode].join(":"),
        title: e.node.titleText.text,
        released: new Date(
          Date.UTC(
            e.node.releaseDate.year,
            e.node.releaseDate.month || 11,
            e.node.releaseDate.day || 31
          )
        ),
        thumbnail: e.node.primaryImage?.url || undefined,
        episode: e.node.series?.displayableEpisodeNumber?.episodeNumber?.text
          ? parseInt(episode)
          : undefined,
        season: e.node.series?.displayableEpisodeNumber?.displayableSeason
          ?.season
          ? parseInt(season)
          : undefined,
        overview: e.node.plot?.plotText?.plainText || undefined,
      };
      return video;
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
              title.releaseDate.day
            )
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
            (a) => a?.node.isWinner
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
          return winStr || nomStr;
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
      tmdbResults.logos.find((r) => r)
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
  text: string,
  type: string
): Promise<StremioMeta[]> {
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

      const connectionId = title.connections?.edges.find((c) => c)?.node
        .associatedTitle.id;

      let match = await matchId(title.id, connectionId === undefined);
      if (!match.find((m) => m) && connectionId) {
        match = await matchId(connectionId, true);
      }

      if (!match.find((m) => m)) {
        return [];
      }

      return new StremioMeta({
        id: title.id,
        type: type,
        name: title.titleText?.text!,
        poster: title.primaryImage?.url || undefined,
      });
    })
  );

  return searchResults.flat();
}
