export interface SourceMarkdownFeatures {
	expressiveCode: boolean;
}

export declare function getSourceMarkdownFeatures(
	source?: string,
): SourceMarkdownFeatures;
