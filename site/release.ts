/** Where the installer lives: the workflow uploads it to every release under this stable name. */
export const REPO = 'seifsg/mochi';
export const ASSET = 'Mochi-setup.exe';
export const RELEASES_URL = `https://github.com/${REPO}/releases`;

/** Latest release state for the download button. */
export type Release =
  | { readonly kind: 'ready'; readonly url: string; readonly version: string; readonly sizeMb: number }
  | { readonly kind: 'none' }
  | { readonly kind: 'unknown'; readonly reason: string };

interface ApiAsset {
  readonly name: string;
  readonly size: number;
  readonly browser_download_url: string;
}

/** Narrows GitHub's release JSON to what the button needs; anything else counts as no installer. */
function toRelease(body: unknown): Release {
  if (typeof body !== 'object' || body === null) return { kind: 'unknown', reason: 'unexpected response' };
  const { tag_name: tag, assets } = body as { tag_name?: unknown; assets?: unknown };
  const asset = Array.isArray(assets)
    ? (assets as ApiAsset[]).find((a) => a?.name === ASSET && typeof a.browser_download_url === 'string')
    : undefined;
  if (typeof tag !== 'string' || !asset) return { kind: 'none' };
  return { kind: 'ready', url: asset.browser_download_url, version: tag, sizeMb: asset.size / 1_048_576 };
}

/** Asks GitHub for the latest release; 404 means none yet, other failures are "unknown" (button falls back to the releases page). */
export async function latestRelease(fetcher: typeof fetch = fetch): Promise<Release> {
  try {
    const res = await fetcher(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (res.status === 404) return { kind: 'none' };
    if (!res.ok) return { kind: 'unknown', reason: `GitHub answered ${res.status}` };
    return toRelease(await res.json());
  } catch (error) {
    return { kind: 'unknown', reason: String(error) };
  }
}
