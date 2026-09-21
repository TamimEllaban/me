// Static placeholder content used until the Neon database has been seeded.
// The site prefers the database (see db.ts + world-data.server.ts) and only
// falls back to this bundled data when DATABASE_URL is missing or unreachable.

import mediaCatalog from "./media-catalog.json";

function mediaUrl(name: string): string {
  const found = (mediaCatalog as { items: { sourceName: string; url: string }[] }).items.find(
    (item) => item.sourceName === name,
  );
  if (!found) throw new Error(`Media not found in catalog: ${name}`);
  return found.url.replace(/\/v\d+\//, "/");
}

export const placeholderChild = {
  name: "Tamim",
  birthdate: "2024-01-23",
  welcome: "A little corner of the world where we keep the moments that make our hearts feel full.",
  hero_image: mediaUrl("تميم مع ماما وبابا.jpg"),
};

export const placeholderMemories = [
  {
    id: "arrived",
    title: "The day you arrived",
    date: "January 23, 2024",
    category: "Milestones",
    image: mediaUrl("The day of birth 1.jpg"),
    excerpt: "The whole room grew quiet, and then there you were.",
    story:
      "We counted every tiny finger and toe. You opened your eyes, held one of our fingers, and made the world feel completely new.",
    sort_order: 1,
  },
  {
    id: "seboua",
    title: "Your sebou'a celebration",
    date: "February 8, 2024",
    category: "Celebrations",
    image: mediaUrl("السبوع بتاع تميم.jpg"),
    excerpt: "The whole family came to celebrate you.",
    story:
      "السبوع بتاعك: كل الناس فرحانة بيك، والكل شاف إنيّك وأنت شكلك أجمل واحد. صحيح السبوع هو أول احتفال كبير بيك.",
    sort_order: 2,
  },
  {
    id: "growing",
    title: "Our little one, already growing",
    date: "March 17, 2024",
    category: "Everyday moments",
    image: mediaUrl("تميم وهو صغير (4).jpg"),
    excerpt: "Two months old and already stealing every heart.",
    story:
      "كل يوم بيكبر والضحكة بتكبر معاه. أول ما ابتدينا نعرف طبعك الحلو وابتسامتك اللي بتزيح تعب اليوم.",
    sort_order: 3,
  },
  {
    id: "first-sea",
    title: "First taste of the sea",
    date: "June 16, 2024",
    category: "Adventures",
    image: mediaUrl("تميم فى البحر وهو صغير (1).jpg"),
    excerpt: "The ocean met you, and you loved it.",
    story:
      "أول جولة بحر لتميم: الرمل والموج والضحك. فضلت تشوف المياه من بعيد الأول، وبعدين ما خلعتش من الحضن. أجمل يوم.",
    sort_order: 4,
  },
  {
    id: "kaftan",
    title: "Qaftan day — moon-light handsome",
    date: "February 21, 2025",
    category: "Celebrations",
    image: mediaUrl("تميم لابس قفطان.jpg"),
    excerpt: "لبست القفطان وصرت أحلى عريس صغير.",
    story:
      "في المناسبة دي لبست القفطان البيج الجميل، وكل حد سأل 'مين التلميذ ده؟'. عيونك كانت بتضحك من الفرحة.",
    sort_order: 5,
  },
  {
    id: "zoo",
    title: "Our day at the zoo",
    date: "January 21, 2026",
    category: "Adventures",
    image: mediaUrl("تميم فى جنينه الحيوانات  (1).jpeg"),
    excerpt: "The animals, the walking, and your endless questions.",
    story:
      "جولة جنينة الحيوانات: قربت من كل حيوان بحذر، وسألت عن كل صوت. قولناها إحنا كبار بس إنت كنت أجرأ البشر في اليوم ده.",
    sort_order: 6,
  },
];

const birth = "https://res.cloudinary.com/djseokhow/image/upload/tamims-world/memory-birth.jpg";
const smile = "https://res.cloudinary.com/djseokhow/image/upload/tamims-world/memory-smile.jpg";
const steps = "https://res.cloudinary.com/djseokhow/image/upload/tamims-world/memory-steps.jpg";
const birthday =
  "https://res.cloudinary.com/djseokhow/image/upload/tamims-world/memory-birthday.jpg";

export type PlaceholderRelative = {
  id: string;
  name: string;
  relationship: string;
  group: string;
  image: string;
  fact: string;
  bio: string;
  sort_order: number;
  parentId: string | null;
  spouseId: string | null;
};

function rel(
  id: string,
  name: string,
  relationship: string,
  group: string,
  image: string,
  fact: string,
  bio: string,
  sort_order: number,
  parentId: string | null = null,
  spouseId: string | null = null,
): PlaceholderRelative {
  return { id, name, relationship, group, image, fact, bio, sort_order, parentId, spouseId };
}

export const placeholderRelatives: PlaceholderRelative[] = [
  // ---- Parents ----
  rel(
    "momen",
    "مؤمن",
    "بابا",
    "Parents",
    steps,
    "بيحب الضحك مع تميم كل يوم.",
    "بابا تميم ورفيقه الأول في كل مغامرة وعند لعب.",
    1,
    "geddo-ahmed",
    "nagham",
  ),
  rel(
    "nagham",
    "نغم",
    "ماما",
    "Parents",
    smile,
    "بتغني له أجمل أغاني النوم.",
    "ماما تميم، وحضنها هو المكان الأأمن في الدنيا.",
    2,
    "geddo-ishaq",
    "momen",
  ),
  // ---- Grandparents ----
  rel(
    "geddo-ahmed",
    "أحمد اللبان",
    "الجد (والد بابا)",
    "Grandparents",
    birth,
    "بيحب كل مناسبة مع الأحفاد.",
    "جد تميم من ناحية بابا، صاحب القلب الكبير.",
    3,
    null,
    "teta-nadia",
  ),
  rel(
    "teta-nadia",
    "ناديه نايل",
    "الجدة (والدة بابا)",
    "Grandparents",
    birthday,
    "دائمًا بتفتكر كلام حلو يقوله لتميم.",
    "جدة تميم من ناحية بابا، وحكاياتها أحلى حكاية.",
    4,
    null,
    "geddo-ahmed",
  ),
  rel(
    "geddo-ishaq",
    "أحمد اسحاق",
    "الجد (والد ماما)",
    "Grandparents",
    smile,
    "دائمًا بيسأل عن تميم.",
    "جد تميم من ناحية ماما.",
    5,
    null,
    "teta-magda",
  ),
  rel(
    "teta-magda",
    "ماجده بدر",
    "الجدة (والدة ماما)",
    "Grandparents",
    steps,
    "بتعمل أحلى حلويات.",
    "جدة تميم من ناحية ماما، وضحكتها بتحلّي الدنيا.",
    6,
    null,
    "geddo-ishaq",
  ),
  // ---- Aunts & Uncles (direct) ----
  rel(
    "uncle-mody",
    "محمد «مودى»",
    "العم (شقيق بابا)",
    "Aunts & Uncles",
    birth,
    "عنده مودى وزين.",
    "عم تميم، ودايمًا بيجيبه هدية.",
    7,
    "geddo-ahmed",
    "aunt-aya",
  ),
  rel(
    "aunt-aya",
    "ايه",
    "زوجة العم",
    "Aunts & Uncles",
    steps,
    "أم مودى وزين.",
    "زوجة العم مودى، وبيتها دايماً مليان ضحك.",
    8,
    null,
    "uncle-mody",
  ),
  rel(
    "uncle-marwan",
    "مروان",
    "الخال (شقيق ماما)",
    "Aunts & Uncles",
    smile,
    "بيحب يلعب مع تميم.",
    "خال تميم، رفيق اللعب والمقالب.",
    9,
    "geddo-ishaq",
    null,
  ),
  rel(
    "uncle-mohamed",
    "محمد",
    "الخال (شقيق ماما)",
    "Aunts & Uncles",
    birthday,
    "خال تميم من ناحية ماما.",
    "شقيق ماما، ودايمًا فاكر تميم.",
    10,
    "geddo-ishaq",
    null,
  ),
  rel(
    "khala-tagrid",
    "تغريد",
    "الخالة (شقيقة ماما)",
    "Aunts & Uncles",
    birth,
    "عندها بنت اسمها لمار.",
    "شقيقة ماما، وضحكتهما مش بتخلص.",
    11,
    "geddo-ishaq",
    "uncle-maki",
  ),
  rel(
    "uncle-maki",
    "أحمد مكى",
    "زوج الخالة",
    "Aunts & Uncles",
    steps,
    "زوج الخالة تغريد.",
    "أحمد مكى، زوج الخالة تغريد وأبو لمار.",
    12,
    null,
    "khala-tagrid",
  ),
  // ---- Cousins ----
  rel(
    "cousin-ahmed",
    "أحمد «مودى»",
    "ابن العم",
    "Cousins",
    smile,
    "دلعه مودى.",
    "ابن العم، من أولاد عم بابا مودى.",
    13,
    "uncle-mody",
    null,
  ),
  rel(
    "cousin-zain",
    "زين",
    "ابن العم",
    "Cousins",
    birthday,
    "ابن العم.",
    "زين، أصغر أبناء العم مودى.",
    14,
    "uncle-mody",
    null,
  ),
  rel(
    "cousin-lamar",
    "لمار",
    "بنت الخالة",
    "Cousins",
    birth,
    "بنت الخالة تغريد.",
    "لمار، بنت الخالة تغريد وأحمد مكى.",
    15,
    "khala-tagrid",
    null,
  ),
  // ---- Great aunts & uncles (used on the Relatives page only) ----
  rel(
    "khala-saad",
    "سعاد",
    "خالة بابا",
    "Great aunts & uncles",
    birthday,
    "شقيقة الجدة ناديه.",
    "من عائلة تميم الكبيرة الحبيبة.",
    16,
  ),
  rel(
    "khal-saeed",
    "سعيد",
    "خال بابا",
    "Great aunts & uncles",
    birth,
    "شقيق الجدة ناديه.",
    "من عائلة تميم الكبيرة الحبيبة.",
    17,
  ),
  rel(
    "khal-ali",
    "على",
    "خال بابا",
    "Great aunts & uncles",
    steps,
    "شقيق الجدة ناديه.",
    "من عائلة تميم الكبيرة الحبيبة.",
    18,
  ),
  rel(
    "khal-kamal",
    "كمال",
    "خال بابا",
    "Great aunts & uncles",
    smile,
    "شقيق الجدة ناديه.",
    "من عائلة تميم الكبيرة الحبيبة.",
    19,
  ),
  rel(
    "khal-hassan",
    "حسن",
    "خال بابا",
    "Great aunts & uncles",
    birthday,
    "شقيق الجدة ناديه.",
    "من عائلة تميم الكبيرة الحبيبة.",
    20,
  ),
  rel(
    "khala-anissa",
    "انيسه",
    "خالة بابا",
    "Great aunts & uncles",
    birth,
    "شقيقة الجدة ناديه.",
    "من عائلة تميم الكبيرة الحبيبة.",
    21,
  ),
  rel(
    "amt-hoda",
    "هدى",
    "عمة بابا",
    "Great aunts & uncles",
    steps,
    "شقيقة الجد أحمد اللبان.",
    "من عائلة تميم الكبيرة الحبيبة.",
    22,
  ),
  rel(
    "amt-nora",
    "نورا",
    "عمة بابا",
    "Great aunts & uncles",
    smile,
    "شقيقة الجد أحمد اللبان.",
    "من عائلة تميم الكبيرة الحبيبة.",
    23,
  ),
  rel(
    "am-hassan",
    "حسن",
    "عم بابا",
    "Great aunts & uncles",
    birthday,
    "شقيق الجد أحمد اللبان.",
    "من عائلة تميم الكبيرة الحبيبة.",
    24,
  ),
  rel(
    "am-gamal",
    "جمال",
    "عم بابا",
    "Great aunts & uncles",
    birth,
    "شقيق الجد أحمد اللبان.",
    "من عائلة تميم الكبيرة الحبيبة.",
    25,
  ),
  rel(
    "am-hamdy",
    "حمدى",
    "عم بابا",
    "Great aunts & uncles",
    steps,
    "شقيق الجد أحمد اللبان.",
    "من عائلة تميم الكبيرة الحبيبة.",
    26,
  ),
  rel(
    "khala-wafa",
    "وفاء",
    "خالة ماما",
    "Great aunts & uncles",
    smile,
    "شقيقة الجدة ماجده.",
    "من عائلة تميم الكبيرة الحبيبة.",
    27,
  ),
  rel(
    "khala-hoda",
    "هدى",
    "خالة ماما",
    "Great aunts & uncles",
    birthday,
    "شقيقة الجدة ماجده.",
    "من عائلة تميم الكبيرة الحبيبة.",
    28,
  ),
  rel(
    "khala-maha",
    "مها",
    "خالة ماما",
    "Great aunts & uncles",
    birth,
    "شقيقة الجدة ماجده.",
    "من عائلة تميم الكبيرة الحبيبة.",
    29,
  ),
  rel(
    "am-mohamed",
    "محمد",
    "عم ماما",
    "Great aunts & uncles",
    steps,
    "شقيق الجد أحمد اسحاق.",
    "من عائلة تميم الكبيرة الحبيبة.",
    30,
  ),
  rel(
    "am-hassan2",
    "حسن",
    "عم ماما",
    "Great aunts & uncles",
    birthday,
    "شقيق الجد أحمد اسحاق.",
    "من عائلة تميم الكبيرة الحبيبة.",
    31,
  ),
];

export const placeholderLetters = [
  {
    id: "kind",
    title: "When the world asks you to be brave",
    author: "ماما",
    date: "For your 10th birthday",
    message:
      "My darling, courage is not about never feeling afraid. It is choosing kindness and taking one small step even when you are. You have carried that quiet courage since your very first steps.",
  },
  {
    id: "home",
    title: "Whenever you feel far from home",
    author: "بابا",
    date: "Open when you miss us",
    message:
      "Home is not only a place. It is every story we share, every laugh at the dinner table, and every person who knows the shape of your heart. You can always find your way back.",
  },
  {
    id: "dream",
    title: "On following a dream",
    author: "الجدة",
    date: "For the day you choose your path",
    message:
      "Take the path that leaves room for wonder. Work hard, stay gentle, and remember that becoming yourself is the most beautiful adventure of all.",
  },
];

export const placeholderProfiles = [
  { id: "family", name: "عائلة تميم", initials: "ت" },
  { id: "mama", name: "ماما نغم", initials: "ن" },
  { id: "baba", name: "بابا مؤمن", initials: "م" },
];
