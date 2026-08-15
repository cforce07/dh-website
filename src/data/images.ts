/**
 * The image provenance registry.
 *
 * Every image on this site is either DirectHired's own, or it is not — and
 * at production DirectHired has to decide, image by image, whether to keep
 * what is there or replace it with their own photograph. That decision needs
 * two things this file supplies: what each image currently *is*, and every
 * place in the code that consumes it.
 *
 * It is code rather than a document for the same reason
 * `docs/INFORMATION-REQUIRED-BEFORE-PRODUCTION.md` is generated rather than
 * hand-written: a hand-maintained list of where images are used drifts the
 * first time someone moves one. `tests/image-registry.test.ts` asserts the
 * registry is a superset of the assets actually referenced under `src/`, so
 * adding an image without registering it fails the suite, and
 * `scripts/generate-info-required.mjs` renders the outstanding entries into
 * the production checklist so the client reads one file, not two.
 *
 * The data lives in `images.json` beside this file, and this module is the
 * typed view of it. The split is not stylistic: `generate-info-required.mjs`
 * is plain Node (CI runs Node 20, which cannot strip types), so the
 * generator reads the JSON directly while everything inside the Astro
 * project imports the typed module. One source of truth, two readers.
 */
import raw from './images.json'

/**
 * What an image currently is — NOT what it ought to be.
 *
 *   `hand-svg`      Vector drawn by hand in this repo. Deliberately abstract;
 *                   a placeholder that is honest about being one.
 *   `ai-generated`  Produced by an image model from a prompt in
 *                   `docs/design/image-prompts-2026-08-16.md`. Depicts a
 *                   situation, never a claimed person.
 *   `real-photo`    DirectHired's own verified asset — a photograph they
 *                   supplied and hold a release for, or official brand
 *                   artwork extracted from their vector master. This is the
 *                   only value that means "nothing outstanding"; it is what
 *                   `outstandingImages()` filters on, so the logo files carry
 *                   it too. They are DirectHired's, they are not pending, and
 *                   listing them on a production checklist would be noise.
 *   `none-yet`      No asset exists. The block either renders nothing or the
 *                   slot is registered ahead of a consumer.
 */
export type Provenance = 'hand-svg' | 'ai-generated' | 'real-photo' | 'none-yet'

/** One place in the codebase that consumes (or would consume) the image. */
export type UsageSite = {
  readonly file: string
  readonly line: number
  readonly what: string
}

export type ImageSlot = {
  readonly id: string
  readonly title: string
  /** Repo-relative path, or `null` when nothing is shipped for this slot. */
  readonly assetPath: string | null
  readonly usedBy: readonly UsageSite[]
  readonly provenance: Provenance
  /** The real rendered size, read off the CSS — not a guess. */
  readonly renderedAt: string
  readonly depicts: string
  /** The real photograph (or asset) that should eventually stand here. */
  readonly replaceWith: string
  /**
   * `false` marks the slot **real-photo-only**. An AI image here would not be
   * a placeholder, it would be a fabricated person or a false claim about a
   * licensed business. `aiForbiddenReason` is then mandatory and
   * `promptSection` must be `null` — no prompt may exist for such a slot.
   */
  readonly aiPermitted: boolean
  readonly aiForbiddenReason: string | null
  /** Heading in `docs/design/image-prompts-2026-08-16.md`, when one exists. */
  readonly promptSection: string | null
  readonly notes: string
}

export const images: readonly ImageSlot[] = raw as readonly ImageSlot[]

/**
 * Everything that is not yet DirectHired's own — the production checklist's
 * image section is exactly this list. Sorted so the generated document has a
 * stable diff.
 */
export function outstandingImages(): readonly ImageSlot[] {
  return images
    .filter((slot) => slot.provenance !== 'real-photo')
    .slice()
    .sort((a, b) => a.id.localeCompare(b.id))
}

/** Slots where AI provenance is not permitted, whatever the reason. */
export function realPhotoOnlyImages(): readonly ImageSlot[] {
  return images.filter((slot) => !slot.aiPermitted)
}

/** Every asset path the registry claims to cover. */
export function registeredAssetPaths(): readonly string[] {
  return images
    .map((slot) => slot.assetPath)
    .filter((path): path is string => path !== null)
}
