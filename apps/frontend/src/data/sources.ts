import { SUPPORTED_NEWS_SOURCES } from "@cryptowire/types/sources";

export const sources = SUPPORTED_NEWS_SOURCES;

export type SourceId = (typeof SUPPORTED_NEWS_SOURCES)[number]["id"];
export type SourceName = (typeof SUPPORTED_NEWS_SOURCES)[number]["name"];
