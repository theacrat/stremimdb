export interface UserSettings {
	languageCode: string;
	hideLowQuality: boolean;
}

// Shortened keys for base64 encoding to minimize URL length
interface EncodedSettings {
	l: string; // languageCode
	h: boolean; // hideLowQuality
}

export const DEFAULT_SETTINGS: UserSettings = {
	languageCode: "en-US",
	hideLowQuality: false,
};

export function encodeSettings(settings: UserSettings): string {
	const encoded: EncodedSettings = {
		l: settings.languageCode,
		h: settings.hideLowQuality,
	};
	const json = JSON.stringify(encoded);
	return btoa(json);
}

export function decodeSettings(base64: string): UserSettings {
	try {
		const json = atob(base64);
		const encoded: EncodedSettings = JSON.parse(json);
		return {
			languageCode: encoded.l || DEFAULT_SETTINGS.languageCode,
			hideLowQuality: encoded.h ?? DEFAULT_SETTINGS.hideLowQuality,
		};
	} catch {
		return DEFAULT_SETTINGS;
	}
}
