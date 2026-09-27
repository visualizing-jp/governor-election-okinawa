/**
 * 目録（src/lib/data/sources.ts）のファイルを data/raw/ に落とす。
 * 既にあるファイルは取り直さない。
 *
 *   npm run fetch
 */

import { mkdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { SOURCES, type Source } from "../src/lib/data/sources.ts";

const RAW_DIR = resolve(import.meta.dirname, "../data/raw");

export function rawPath(pref: string, id: string): string {
  const source = SOURCES[pref]?.find((s) => s.id === id);
  if (source === undefined) throw new Error(`目録にない: ${pref}/${id}`);
  return resolve(RAW_DIR, pref, `${source.id}.${source.format}`);
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function download(pref: string, source: Source): Promise<void> {
  const path = rawPath(pref, source.id);
  if (await exists(path)) return;
  const res = await fetch(source.url);
  if (!res.ok) throw new Error(`${pref}/${source.id}: ${res.status} ${source.url}`);
  await mkdir(resolve(RAW_DIR, pref), { recursive: true });
  await writeFile(path, Buffer.from(await res.arrayBuffer()));
  console.log(`  ${pref}/${source.id}.${source.format}`);
}

async function main(): Promise<void> {
  for (const [pref, sources] of Object.entries(SOURCES)) {
    for (const source of sources) await download(pref, source);
  }
}

if (import.meta.main) await main();
