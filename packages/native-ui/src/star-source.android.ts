import { type StarTakeName, starFiles } from "./star-source-files";

/** Android plays the VP9 alpha .webm; the .mov is never bundled (see star-source-files.android.ts). */
export const starSource = (take: StarTakeName): number => starFiles[take].webm;
