import { open } from "@tauri-apps/plugin-dialog";
import { readTextFile } from "@tauri-apps/plugin-fs";

const PACK_FILTER = [{ name: "Haunt Pack", extensions: ["json"] }];

export interface OpenedPackFile {
  /** Where it came from, so the person can see they picked the right file. */
  path: string;
  text: string;
}

/**
 * Asks for a Haunt Pack file and reads it. Returns `null` if the dialog was
 * dismissed.
 *
 * Reading is all this does. Whether the file is a pack at all is decided
 * later, by the validator, against the text — a file that opens is not a
 * file that imports.
 */
export async function openHauntPackFile(): Promise<OpenedPackFile | null> {
  const selected = await open({ multiple: false, directory: false, filters: PACK_FILTER });
  if (typeof selected !== "string") {
    return null;
  }
  return { path: selected, text: await readTextFile(selected) };
}
