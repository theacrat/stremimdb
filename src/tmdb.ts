// import { getPrisma } from "./prisma";
import { type UserSettings } from "./userSettings";
import { Image, Images, TMDB } from "tmdb-ts";

let tmdb: TMDB;

export function instantiateTmdb(token: string) {
	if (!tmdb) {
		tmdb = new TMDB(token);
	}
}

export async function matchId(imdbId: string, saveOnFail: boolean) {
	// const prisma = getPrisma();
	// const dbMatch = await prisma.imdbTmdb.findFirst({
	// 	where: { imdb: { equals: imdbId } },
	// });

	// if (dbMatch) {
	// switch (dbMatch.type) {
	// 	case "M": {
	// 		return [dbMatch.tmdb, undefined];
	// 	}
	// 	case "T": {
	// 		return [undefined, dbMatch.tmdb];
	// 	}
	// 	case "N": {
	// 		return [undefined, undefined];
	// 	}
	// }
	// }

	const results = await tmdb.find.byExternalId(imdbId, {
		external_source: "imdb_id",
	});
	const movieMatch = results.movie_results.find((r) => r)?.id;
	const tvMatch = results.tv_results.find((r) => r)?.id;

	if (movieMatch) {
		// await prisma.imdbTmdb.create({
		// 	data: {
		// 		imdb: imdbId,
		// 		tmdb: movieMatch,
		// 		type: "M",
		// 	},
		// });
	} else if (tvMatch) {
		// await prisma.imdbTmdb.create({
		// 	data: {
		// 		imdb: imdbId,
		// 		tmdb: tvMatch,
		// 		type: "T",
		// 	},
		// });
	} else if (saveOnFail) {
		// await prisma.imdbTmdb.create({
		// 	data: { imdb: imdbId, tmdb: 0, type: "N" },
		// });
	}

	return [movieMatch, tvMatch];
}

function imageLanguageSorter(languageCode: string) {
	const primaryLang = languageCode;
	const fallbackLang = languageCode.split("-")[0];
	const finalFallback = "en";

	return (a: Image, b: Image) => {
		const aLang = a.iso_639_1;
		const bLang = b.iso_639_1;

		if (aLang === bLang) return 0;

		if (aLang === primaryLang) return -1;
		if (bLang === primaryLang) return 1;

		if (aLang === fallbackLang) return -1;
		if (bLang === fallbackLang) return 1;

		if (aLang === finalFallback) return -1;
		if (bLang === finalFallback) return 1;

		return 0;
	};
}

export async function getImages(
	settings: UserSettings,
	imdbId: string,
	saveOnFail: boolean = false,
) {
	const [movieMatch, tvMatch] = await matchId(imdbId, saveOnFail);

	if (!movieMatch && !tvMatch) {
		return;
	}

	let images: Images | undefined = undefined;

	if (movieMatch) {
		images = await tmdb.movies.images(movieMatch);
	} else if (tvMatch) {
		images = await tmdb.tvShows.images(tvMatch);
	}

	if (!images) {
		return;
	}

	const sorter = imageLanguageSorter(settings.languageCode);
	images.backdrops.sort(sorter);
	images.logos.sort(sorter);
	images.posters.sort(sorter);

	return images;
}
