import { Images, TMDB } from "tmdb-ts";

let tmdb: TMDB;

export function instantiateTmdb(token: string) {
  tmdb = new TMDB(token);
}

export async function matchId(
  imdbId: string,
  connectionId?: string
): Promise<Images | undefined> {
  const results = await tmdb.find.byExternalId(imdbId, {
    external_source: "imdb_id",
  });
  const movieMatch = results.movie_results.find((r) => r);
  const tvMatch = results.tv_results.find((r) => r);

  if (!movieMatch && !tvMatch) {
    return connectionId ? await matchId(connectionId) : undefined;
  }

  let images: Images | undefined = undefined;
  const searchLanguages = {
    include_image_language: ["en-US", "en-GB", "en-AU", "en-NZ", "null"],
  };

  if (movieMatch) {
    images = await tmdb.movies.images(movieMatch.id, searchLanguages);
  } else if (tvMatch) {
    images = await tmdb.tvShows.images(tvMatch.id, searchLanguages);
  }

  return images;
}
