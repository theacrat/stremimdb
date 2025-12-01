import { Images, TMDB } from "tmdb-ts";
import { getPrisma } from "./prisma";
import { TmdbType } from "./generated/prisma/enums";

let tmdb: TMDB;

export function instantiateTmdb(token: string) {
  if (!tmdb) {
    tmdb = new TMDB(token);
  }
}

export async function matchId(imdbId: string, saveOnFail: boolean) {
  const prisma = getPrisma();
  const dbMatch = await prisma.imdbTmdb.findFirst({
    where: { imdb: { equals: imdbId } },
  });

  if (dbMatch) {
    switch (dbMatch.type) {
      case TmdbType.M: {
        return [dbMatch.tmdb, undefined];
      }
      case TmdbType.T: {
        return [undefined, dbMatch.tmdb];
      }
      case TmdbType.N: {
        return [undefined, undefined];
      }
    }
  }

  const results = await tmdb.find.byExternalId(imdbId, {
    external_source: "imdb_id",
  });
  const movieMatch = results.movie_results.find((r) => r)?.id;
  const tvMatch = results.tv_results.find((r) => r)?.id;

  if (movieMatch) {
    await prisma.imdbTmdb.create({
      data: {
        imdb: imdbId,
        tmdb: movieMatch,
        type: TmdbType.M,
      },
    });
  } else if (tvMatch) {
    await prisma.imdbTmdb.create({
      data: {
        imdb: imdbId,
        tmdb: tvMatch,
        type: TmdbType.T,
      },
    });
  } else if (saveOnFail) {
    await prisma.imdbTmdb.create({
      data: { imdb: imdbId, tmdb: 0, type: TmdbType.N },
    });
  }

  return [movieMatch, tvMatch];
}

export async function getImages(imdbId: string, saveOnFail: boolean = false) {
  const [movieMatch, tvMatch] = await matchId(imdbId, saveOnFail);

  if (!movieMatch && !tvMatch) {
    return undefined;
  }

  let images: Images | undefined = undefined;
  const searchLanguages = {
    include_image_language: ["en-US", "en-GB", "en-AU", "en-NZ", "null"],
  };

  if (movieMatch) {
    images = await tmdb.movies.images(movieMatch, searchLanguages);
  } else if (tvMatch) {
    images = await tmdb.tvShows.images(tvMatch, searchLanguages);
  }

  return images;
}
