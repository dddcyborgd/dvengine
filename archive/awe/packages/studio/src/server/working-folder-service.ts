import path from "path";

const DEFAULT_WORKING_FOLDER = path.join(process.cwd(), "public");

/**
 * Resolves the current working folder.
 * Always returns the embedding app's own public/ directory.
 */
export async function resolveWorkingFolder(): Promise<string> {
  return DEFAULT_WORKING_FOLDER;
}

/**
 * Returns the default working folder path.
 */
export function getDefaultWorkingFolder(): string {
  return DEFAULT_WORKING_FOLDER;
}
