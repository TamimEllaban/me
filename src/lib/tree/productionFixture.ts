import type { RelativeLike } from "@/components/relative-editor";

/**
 * A faithful mirror of the production `relatives` table (see `scripts/seed.mjs`)
 * so layout tests exercise the same 31-relative dataset that ships in prod.
 */
export const PRODUCTION_RELATIVES: RelativeLike[] = [
  rel("momen", "مؤمن", "بابا", "Parents", "geddo-ahmed", "nagham"),
  rel("nagham", "نغم", "ماما", "Parents", "geddo-ishaq", "momen"),
  rel("geddo-ahmed", "أحمد اللبان", "الجد (والد بابا)", "Grandparents", null, "teta-nadia"),
  rel("teta-nadia", "ناديه نايل", "الجدة (والدة بابا)", "Grandparents", null, "geddo-ahmed"),
  rel("geddo-ishaq", "أحمد اسحاق", "الجد (والد ماما)", "Grandparents", null, "teta-magda"),
  rel("teta-magda", "ماجده بدر", "الجدة (والدة ماما)", "Grandparents", null, "geddo-ishaq"),
  rel("uncle-mody", "محمد «مودى»", "العم (شقيق بابا)", "Aunts & Uncles", "geddo-ahmed", "aunt-aya"),
  rel("aunt-aya", "ايه", "زوجة العم", "Aunts & Uncles", null, "uncle-mody"),
  rel("uncle-marwan", "مروان", "الخال (شقيق ماما)", "Aunts & Uncles", "geddo-ishaq", null),
  rel("uncle-mohamed", "محمد", "الخال (شقيق ماما)", "Aunts & Uncles", "geddo-ishaq", null),
  rel(
    "khala-tagrid",
    "تغريد",
    "الخالة (شقيقة ماما)",
    "Aunts & Uncles",
    "geddo-ishaq",
    "uncle-maki",
  ),
  rel("uncle-maki", "أحمد مكى", "زوج الخالة", "Aunts & Uncles", null, "khala-tagrid"),
  rel("cousin-ahmed", "أحمد «مودى»", "ابن العم", "Cousins", "uncle-mody", null),
  rel("cousin-zain", "زين", "ابن العم", "Cousins", "uncle-mody", null),
  rel("cousin-lamar", "لمار", "بنت الخالة", "Cousins", "khala-tagrid", null),
  rel("khala-saad", "سعاد", "خالة بابا", "Great aunts & uncles"),
  rel("khal-saeed", "سعيد", "خال بابا", "Great aunts & uncles"),
  rel("khal-ali", "على", "خال بابا", "Great aunts & uncles"),
  rel("khal-kamal", "كمال", "خال بابا", "Great aunts & uncles"),
  rel("khal-hassan", "حسن", "خال بابا", "Great aunts & uncles"),
  rel("khala-anissa", "انيسه", "خالة بابا", "Great aunts & uncles"),
  rel("amt-hoda", "هدى", "عمة بابا", "Great aunts & uncles"),
  rel("amt-nora", "نورا", "عمة بابا", "Great aunts & uncles"),
  rel("am-hassan", "حسن", "عم بابا", "Great aunts & uncles"),
  rel("am-gamal", "جمال", "عم بابا", "Great aunts & uncles"),
  rel("am-hamdy", "حمدى", "عم بابا", "Great aunts & uncles"),
  rel("khala-wafa", "وفاء", "خالة ماما", "Great aunts & uncles"),
  rel("khala-hoda", "هدى", "خالة ماما", "Great aunts & uncles"),
  rel("khala-maha", "مها", "خالة ماما", "Great aunts & uncles"),
  rel("am-mohamed", "محمد", "عم ماما", "Great aunts & uncles"),
  rel("am-hassan2", "حسن", "عم ماما", "Great aunts & uncles"),
];

function rel(
  id: string,
  name: string,
  relationship: string,
  group: string,
  parentId: string | null = null,
  spouseId: string | null = null,
): RelativeLike {
  return {
    id,
    name,
    relationship,
    group,
    image: "https://res.cloudinary.com/tamims-world/memory.jpg",
    fact: "من عائلة تميم الكبيرة.",
    bio: "من عائلة تميم الكبيرة الحبيبة.",
    parentId,
    spouseId,
  };
}
