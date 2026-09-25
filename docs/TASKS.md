# Tasks and incident log

## 2026-09-25 — Video thumbnail regression

### Root cause (confirmed)

The regression was introduced by commit `fc46d8a` (`feat: improve media uploads and TV experience`). That commit changed the gallery data mapper so raw video URLs were converted to a playback URL containing `f_mp4,q_auto`. Catalog items did not have a `thumb` value, so the later fallback transformed the already-transformed playback URL again.

The resulting `<img src>` was:

```text
/video/upload/so_1,f_jpg,q_auto,w_800/f_mp4,q_auto/v.../video.mp4
```

A production browser/network trace showed that this URL returned HTTP 200 with `Content-Type: video/mp4`, not an image. The `<img>` elements therefore had `naturalWidth=0`, producing the grey card and only the play button. This was not a 403/CORS error.

The correct thumbnail URL without the accidental `f_mp4` transformation returned HTTP 200, `Content-Type: image/jpeg`, and decoded successfully.

### History and data checks

- `git blame` shows the original working thumbnail transformation was introduced in `4fdf5ea` and remained unchanged until `fc46d8a`.
- The Gallery card has always rendered `item.thumb`; the frontend binding itself was not removed.
- `git log -S thumbnailUrl` found no removed thumbnail field or cleanup migration.
- Before this fix, the `gallery_items` schema had never included `thumbnail_url`; diagnosis confirmed the columns were `id`, `kind`, `source_name`, `category`, `date`, `url`, and `created_at`. The new idempotent migration adds `thumbnail_url` for future DB-backed videos.
- The live database currently contains 5 uploaded image rows and 0 uploaded video rows. The 81 legacy videos come from `src/lib/media-catalog.json` and are transformed on demand.
- Current Cloudinary credentials successfully read the account and public media. Local and Vercel production values were compared by hash and match for cloud name, API key, API secret, and database URL. The failure is not caused by removed secrets, changed permissions, CORS, or missing source videos.
- The accidental database reseed run during diagnosis did not touch `gallery_items` or `gallery_overrides`; it restored the baseline `child`, `memories`, `relatives`, `letters`, and `profiles` seed data. It occurred on branch `br-holy-glitter-b4pum75s` at approximately `2026-09-25 09:55 UTC`. Any manual edits made to those five tables before diagnosis require Neon Time Travel recovery to a timestamp before that operation.

### Backfill result

A thumbnail column backfill is not required for the existing catalog because it never stored thumbnail URLs and all 81 source videos are present. The implemented fix makes thumbnail URL generation explicit and idempotent, persists thumbnails for newly uploaded DB-backed videos, and adds a safe migration/backfill script for future rows.

### Fix plan

1. Build thumbnail and playback URLs from the original Cloudinary resource URL, stripping any existing transformation chain.
2. Ensure raw catalog videos receive an explicit thumbnail before replacing their playback URL.
3. Persist `thumbnail_url` for new gallery videos and add an idempotent migration/backfill.

### Implemented fix and verification

- Added idempotent Cloudinary URL builders in `src/lib/media-urls.ts`; every transformation is rebuilt from the original resource path, so `f_mp4` can no longer be chained into a JPEG thumbnail transformation.
- Raw catalog videos now receive an explicit JPEG thumbnail before their playback URL is replaced.
- New video uploads return and persist a `thumbnail_url`; `gallery_items.thumbnail_url` was added through an idempotent migration.
- Added `scripts/backfill-video-thumbnails.mjs`. Live result: `scanned: 0`, `fixed: 0`, `alreadyPresent: 0`, `manualActionRequired: 0` because all legacy videos are catalog-backed rather than DB-backed.
- Added a designed "Thumbnail غير متاح" fallback for genuinely missing source/thumbnail media.
- Added regression tests proving thumbnail generation never contains `f_mp4` and is idempotent.
- Public legacy media checks confirmed the corrected URL returns `image/jpeg` and decodes as an image. Existing image delivery also returned HTTP 200 with valid image MIME types, confirming the shared Cloudinary configuration was not broken.
- Production browser test uploaded a new 1.2 MB MP4 through Manage, displayed the blocking progress overlay, created a Cloudinary video resource, and returned its generated thumbnail as HTTP 206 `image/jpeg`. The temporary test resource was destroyed immediately afterward, so no test album row was added.

## 2026-09-25 — Cloudinary storage usage settings

### Live plan inspection

The live `cloudinary.api.usage()` response reports:

- Plan: `Free`
- Credits: `20.78 / 25` (`83.12%`) at the latest inspection
- Storage: `2,039,766,586` bytes and `1.90` credits
- Bandwidth: `1,852,720,853` bytes and `1.73` credits
- Objects: `471`
- Resources / derived resources: `246 / 225`
- Requests: `2,885`
- Transformations: `17,151` (`17.15` credits)

The Free-plan response has no separate `storage.limit` or `bandwidth.limit`. The implementation therefore uses the real monthly credits limit as the primary progress bar and displays actual storage/bandwidth values as usage metrics. It does not fabricate a storage quota.

### Backend

- Added `GET /api/admin/settings/storage-usage`.
- Added `?refresh=1` to bypass the 30-minute in-memory server cache.
- Added a protected server function for the settings loader and refresh button.
- The API and page both require a `SUPER_ADMIN` profile role.
- Authorization is configured with `SUPER_ADMIN_PROFILE_IDS` (comma-separated; compatibility default `baba`).
- Cloudinary errors return safe user-facing messages without exposing secrets.

### Frontend

- Added `/admin/settings/storage` and `src/components/admin-navigation.tsx`.
- Added the page to the WorldShell settings shortcut.
- Displays plan/usage model, credit progress, actual storage, bandwidth, objects, transformations, resources, derived resources, requests, cache timestamp, and Cloudinary Dashboard link.
- Shows a warning at 80% or higher and uses a red critical state at 90% or higher.
- The repository currently has no `/admin/notifications` implementation, so the 80% warning is rendered on the storage page. That existing future notification route can consume the same normalized usage response when added.

### Environment

Existing Cloudinary variables remain required:

- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

New non-secret authorization setting:

- `SUPER_ADMIN_PROFILE_IDS="baba"`
