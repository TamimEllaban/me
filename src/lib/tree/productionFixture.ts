import type { RelativeLike } from "@/components/relative-editor";

/**
 * A faithful mirror of the production `relatives` table (see `scripts/seed.mjs`)
 * so layout tests exercise the same 69-relative dataset that ships in prod.
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
  // Great aunts & uncles (paternal grandmother's side)
  rel("khala-saad", "سعاد", "خالة بابا", "Great aunts & uncles"),
  rel("khal-saeed", "سعيد", "خال بابا", "Great aunts & uncles"),
  rel("khal-ali", "على", "خال بابا", "Great aunts & uncles"),
  rel("khal-kamal", "كمال", "خال بابا", "Great aunts & uncles"),
  rel("khal-hassan", "حسن", "خال بابا", "Great aunts & uncles"),
  // Great aunts & uncles (paternal grandfather's side)
  rel("amt-hoda", "هدى", "عمة بابا", "Great aunts & uncles"),
  rel("amt-nora", "نورا", "عمة بابا", "Great aunts & uncles"),
  rel("am-hassan", "حسن", "عم بابا", "Great aunts & uncles"),
  rel("am-gamal", "جمال", "عم بابا", "Great aunts & uncles"),
  rel("am-hamdy", "حمدى", "عم بابا", "Great aunts & uncles"),
  rel("am-mohamed-ahmed", "محمد", "عم بابا", "Great aunts & uncles"),
  // Great aunts & uncles (maternal grandmother's side)
  rel("khala-wafa", "وفاء", "خالة ماما", "Great aunts & uncles"),
  rel("khala-hoda", "هدى", "خالة ماما", "Great aunts & uncles"),
  rel("khala-maha", "مها", "خالة ماما", "Great aunts & uncles"),
  // Great aunts & uncles (maternal grandfather's side)
  rel("am-mohamed", "محمد", "عم ماما", "Great aunts & uncles"),
  rel("am-hassan2", "حسن", "عم ماما", "Great aunts & uncles"),
  // Children of the great aunts & uncles — paternal grandmother's side
  rel("saad-sherif", "شريف", "ابن خالة بابا", "Cousins", "khala-saad"),
  rel("saad-mohamed", "محمد", "ابن خالة بابا", "Cousins", "khala-saad"),
  rel("saad-tamer", "تامر", "ابن خالة بابا", "Cousins", "khala-saad"),
  rel("saad-ahmed", "احمد", "ابن خالة بابا", "Cousins", "khala-saad"),
  rel("saad-darwish", "درويش", "ابن خالة بابا", "Cousins", "khala-saad"),
  rel("saeed-aya", "ايه", "بنت خال بابا", "Cousins", "khal-saeed"),
  rel("saeed-maryam", "مريم", "بنت خال بابا", "Cousins", "khal-saeed"),
  rel("saeed-mohamed", "محمد", "ابن خال بابا", "Cousins", "khal-saeed"),
  rel("hassan-bilal", "بلال", "ابن خال بابا", "Cousins", "khal-hassan"),
  rel("hassan-basma", "بسمه", "بنت خال بابا", "Cousins", "khal-hassan"),
  rel("hassan-bassant", "بسنت", "بنت خال بابا", "Cousins", "khal-hassan"),
  rel("ali-karim", "كريم", "ابن خال بابا", "Cousins", "khal-ali"),
  rel("ali-rana", "رنا", "بنت خال بابا", "Cousins", "khal-ali"),
  // Children of the great aunts & uncles — paternal grandfather's side
  rel("hamdy-eman", "ايمان", "بنت عم بابا", "Cousins", "am-hamdy"),
  rel("gamal-fatma", "فاطمه", "بنت عم بابا", "Cousins", "am-gamal"),
  rel("gamal-salma", "سلمى", "بنت عم بابا", "Cousins", "am-gamal"),
  rel("gamal-ahmed", "احمد", "ابن عم بابا", "Cousins", "am-gamal"),
  rel("hoda-mohamed", "محمد", "ابن عمة بابا", "Cousins", "amt-hoda"),
  rel("hoda-mahmoud", "محمود", "ابن عمة بابا", "Cousins", "amt-hoda"),
  rel("hoda-enas", "ايناس", "بنت عمة بابا", "Cousins", "amt-hoda"),
  rel("hoda-amira", "اميره", "بنت عمة بابا", "Cousins", "amt-hoda"),
  rel("nora-ahmed", "احمد", "ابن عمة بابا", "Cousins", "amt-nora"),
  rel("nora-mohamed", "محمد", "ابن عمة بابا", "Cousins", "amt-nora"),
  rel("mohamed-ahmed-m", "محمد", "ابن عم بابا", "Cousins", "am-mohamed-ahmed"),
  rel("mohamed-ahmed-islam", "اسلام", "ابن عم بابا", "Cousins", "am-mohamed-ahmed"),
  rel("mohamed-ahmed-rehab", "رحاب", "بنت عم بابا", "Cousins", "am-mohamed-ahmed"),
  // Children of the great aunts & uncles — maternal grandmother's side
  rel("hoda-hager", "هاجر", "بنت خالة ماما", "Cousins", "khala-hoda"),
  rel("maha-ahmed", "احمد", "ابن خالة ماما", "Cousins", "khala-maha"),
  rel("wafa-rawan", "روان", "بنت خالة ماما", "Cousins", "khala-wafa"),
  rel("wafa-alaa", "الاء", "بنت خالة ماما", "Cousins", "khala-wafa"),
  rel("wafa-abdelrahman", "عبد الرحمن", "ابن خالة ماما", "Cousins", "khala-wafa"),
  rel("wafa-abdelatif", "عبد اللطيف", "ابن خالة ماما", "Cousins", "khala-wafa"),
  rel("rawan-dana", "دانه", "بنت بنت الخالة", "Cousins", "wafa-rawan"),
  // Children of the great aunts & uncles — maternal grandfather's side
  rel("mama-hassan-rim", "ريم", "بنت عم ماما", "Cousins", "am-hassan2"),
  rel("mama-hassan-sara", "سارة", "بنت عم ماما", "Cousins", "am-hassan2"),
  rel("mama-mohamed-karim", "كريم", "ابن عم ماما", "Cousins", "am-mohamed"),
  rel("mama-mohamed-omar", "عمر", "ابن عم ماما", "Cousins", "am-mohamed"),
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
