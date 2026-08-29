export type ArtPlayerEmbedData = {
	src: string;
	title: string;
	poster: string;
};

export function getArtPlayerEmbedData(
	attributes?: Record<string, unknown>,
): ArtPlayerEmbedData | null;
