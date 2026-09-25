import { createServerFn } from "@tanstack/react-start";
import { hasSuperAdminAccess, requireSuperAdmin } from "./auth.server";
import { getCloudinaryStorageUsage, type CloudinaryStorageUsage } from "./cloudinary-usage.server";

export type CloudinaryStorageUsageResponse =
  { ok: true; data: CloudinaryStorageUsage } | { ok: false; status: 403 | 502; error: string };

function safeUsageError(error: unknown): { status: 502; error: string } {
  if (error instanceof Error && error.message === "CLOUDINARY_NOT_CONFIGURED") {
    return {
      status: 502,
      error: "إعدادات Cloudinary غير مكتملة على السيرفر. راجع متغيرات البيئة الخاصة بالـ API.",
    };
  }
  const httpCode =
    typeof error === "object" && error && "http_code" in error
      ? Number(error.http_code)
      : Number.NaN;
  if (httpCode === 401 || httpCode === 403) {
    return {
      status: 502,
      error: "تعذر تسجيل الدخول إلى Cloudinary. راجع الصلاحيات ومفاتيح الـ API.",
    };
  }
  if (httpCode === 429) {
    return { status: 502, error: "تم تجاوز حد طلبات Cloudinary مؤقتًا. حاول مرة أخرى بعد قليل." };
  }
  return {
    status: 502,
    error: "تعذر جلب استهلاك Cloudinary الآن. تحقق من الاتصال ثم اضغط تحديث الآن.",
  };
}

export const getAdminPageAccess = createServerFn({ method: "GET" }).handler(async () => {
  await requireSuperAdmin();
  return { ok: true as const };
});

export const getCloudinaryStorageUsageData = createServerFn({ method: "GET" })
  .validator((data: { refresh?: boolean }) => ({ refresh: data.refresh ?? false }))
  .handler(async ({ data }): CloudinaryStorageUsageResponse => {
    const allowed = await hasSuperAdminAccess();
    if (!allowed) {
      return { ok: false, status: 403, error: "هذه الصفحة متاحة لـ SUPER_ADMIN فقط." };
    }
    try {
      return { ok: true, data: await getCloudinaryStorageUsage(data.refresh) };
    } catch (error) {
      return { ok: false, ...safeUsageError(error) };
    }
  });
