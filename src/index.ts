import { renderHomePage } from "./homePage";
import { getFullTitle, search } from "./imdb";
import { manifestJson } from "./manifest";
// import { instantiatePrisma } from "./prisma";
import { instantiateTmdb } from "./tmdb";
import {
	type UserSettings,
	DEFAULT_SETTINGS,
	decodeSettings,
} from "./userSettings";
import { type Context, Hono } from "hono";
import { env } from "hono/adapter";
import { cors } from "hono/cors";

type AppContext = {
	Bindings: CloudflareBindings;
	Variables: {
		settings: UserSettings;
	};
};

const app = new Hono<AppContext>();
const cache = caches.default;

function daysToCacheTime(days: number) {
	return days * 24 * 60 * 60;
}

async function withCache(
	request: Request,
	fetchFn: () => Promise<{
		response: Response;
		shouldCache: boolean;
		ttlDays: number;
	}>,
): Promise<Response> {
	const cachedResponse = await cache.match(request);
	if (cachedResponse) {
		return cachedResponse;
	}

	const { response: data, shouldCache, ttlDays } = await fetchFn();

	if (shouldCache) {
		data.headers.append(
			"Cache-Control",
			`public, max-age=${daysToCacheTime(ttlDays)}`,
		);
		cache.put(request, data.clone());
	}

	return data;
}

app.use("*", cors({ origin: "*" }));
app.use("*", async (c, next) => {
	const {
		TMDB_API,
		// IMDB_TMDB_DB
	} = env(c);
	const apiKey = await c.text(TMDB_API).text();
	instantiateTmdb(apiKey);
	// instantiatePrisma(IMDB_TMDB_DB);
	return await next();
});

const handleHome = (c: Context<AppContext>) => {
	return c.html(renderHomePage(DEFAULT_SETTINGS));
};

const handleManifest = (c: Context<AppContext>) => {
	return c.json(manifestJson);
};

const handleMeta = async (c: Context<AppContext>) => {
	const { id } = c.req.param();
	const settings = c.get("settings");
	const result = await getFullTitle(settings, id);

	return withCache(c.req.raw, async () => {
		return {
			response: await (result ? c.json({ meta: result }) : c.notFound()),
			shouldCache: !!result,
			ttlDays: 7,
		};
	});
};

const handleCatalog = async (c: Context<AppContext>) => {
	const { type, query } = c.req.param();
	const settings = c.get("settings");
	const result = await search(settings, query, type);

	return withCache(c.req.raw, async () => {
		return {
			response: c.json({ metas: result }),
			shouldCache: !!result,
			ttlDays: 7,
		};
	});
};

app.get("/", handleHome);

app.get("/manifest.json", handleManifest);
app.get("/:settings/manifest.json", handleManifest);

app.get("/meta/:type{(movie|series)}/:id", (c) => {
	c.set("settings", DEFAULT_SETTINGS);
	return handleMeta(c);
});
app.get("/:settings/meta/:type{(movie|series)}/:id", (c) => {
	c.set("settings", decodeSettings(c.req.param("settings")));
	return handleMeta(c);
});

app.get("/catalog/:type{(movie|series)}/search/:query", (c) => {
	c.set("settings", DEFAULT_SETTINGS);
	return handleCatalog(c);
});
app.get("/:settings/catalog/:type{(movie|series)}/search/:query", (c) => {
	c.set("settings", decodeSettings(c.req.param("settings")));
	return handleCatalog(c);
});

export default app;
