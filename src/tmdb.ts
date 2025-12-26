// import { getPrisma } from "./prisma";
import { Images, TMDB } from "tmdb-ts";

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

export async function getImages(imdbId: string, saveOnFail: boolean = false) {
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

	images.backdrops.sort((a, b) => {
		if (a.iso_639_1 === "en" && b.iso_639_1 !== "en") return -1;
		if (a.iso_639_1 !== "en" && b.iso_639_1 === "en") return 1;
		return 0;
	});

	images.logos.sort((a, b) => {
		if (a.iso_639_1 === "en" && b.iso_639_1 !== "en") return -1;
		if (a.iso_639_1 !== "en" && b.iso_639_1 === "en") return 1;
		return 0;
	});

	images.posters.sort((a, b) => {
		if (a.iso_639_1 === "en" && b.iso_639_1 !== "en") return -1;
		if (a.iso_639_1 !== "en" && b.iso_639_1 === "en") return 1;
		return 0;
	});

	return images;
}
