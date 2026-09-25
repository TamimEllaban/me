# System report

## Admin sidebar map

The admin area is protected by the `SUPER_ADMIN` session role and uses the main family `WorldShell`.

```text
Admin
└── Settings
    └── Cloudinary Storage — /admin/settings/storage
```

### Admin navigation source

- Component: `src/components/admin-navigation.tsx`
- Admin layout: `src/routes/admin.tsx`
- Settings layout: `src/routes/admin/settings.tsx`
- Storage settings page: `src/routes/admin/settings/storage.tsx`

The main `WorldShell` header includes a settings shortcut to `/admin/settings/storage`. Non-SUPER_ADMIN sessions are redirected by the admin layout loader, and the API endpoint independently returns HTTP 403.

## Cloudinary storage endpoint

- Method: `GET`
- Path: `/api/admin/settings/storage-usage`
- Forced refresh: `GET /api/admin/settings/storage-usage?refresh=1`
- Authentication: family session plus `SUPER_ADMIN` profile role
- Responses:
  - `401` when the family session is locked
  - `403` for non-SUPER_ADMIN profiles
  - `502` with a safe message when Cloudinary is unavailable/misconfigured
- The API secret is never sent to the browser or included in error responses/log output.

## Cache and environment

- Cache: in-memory server cache in `src/lib/cloudinary-usage.server.ts`
- TTL: 30 minutes
- Refresh button: bypasses the cache and updates the cached snapshot
- Existing required variables:
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
- Authorization variable:
  - `SUPER_ADMIN_PROFILE_IDS` (comma-separated; defaults to `baba` for compatibility)

The live Cloudinary account reports plan `Free`. Its current Admin API response is credit-based and does not include separate `storage.limit` or `bandwidth.limit` values, so the UI shows the real credits limit and actual storage/bandwidth usage without inventing a storage cap.
