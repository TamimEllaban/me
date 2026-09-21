// Creates the family-site schema on Neon (Postgres) and seeds it with the
// family content, using Cloudinary URLs for images.
// Run: node --env-file=.env scripts/seed.mjs
import { readFileSync } from "node:fs";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = neon(url);

const CLOUD = "https://res.cloudinary.com/djseokhow/image/upload";

function mediaUrl(catalogName) {
  const catalog = JSON.parse(
    readFileSync(new URL("../src/lib/media-catalog.json", import.meta.url), "utf8"),
  );
  const found = catalog.items.find((item) => item.sourceName === catalogName);
  if (!found) throw new Error(`Media not found in catalog: ${catalogName}`);
  return found.url.replace(/\/v\d+\//, "/");
}

const imgHero = mediaUrl("تميم مع ماما وبابا.jpg");
const imgBirth = mediaUrl("The day of birth 1.jpg");
const imgSeboua = mediaUrl("السبوع بتاع تميم.jpg");
const imgGrowing = mediaUrl("تميم وهو صغير (4).jpg");
const imgSea = mediaUrl("تميم فى البحر وهو صغير (1).jpg");
const imgKaftan = mediaUrl("تميم لابس قفطان.jpg");
const imgZoo = mediaUrl("تميم فى جنينه الحيوانات  (1).jpeg");

await sql`
  CREATE TABLE IF NOT EXISTS child (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    name TEXT NOT NULL,
    birthdate DATE NOT NULL,
    welcome TEXT NOT NULL DEFAULT '',
    hero_image TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;

await sql`
  CREATE TABLE IF NOT EXISTS memories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    category TEXT NOT NULL,
    image TEXT NOT NULL,
    excerpt TEXT NOT NULL DEFAULT '',
    story TEXT NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;

await sql`
  CREATE TABLE IF NOT EXISTS relatives (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    "group" TEXT NOT NULL,
    image TEXT NOT NULL,
    fact TEXT NOT NULL DEFAULT '',
    bio TEXT NOT NULL DEFAULT '',
    parent_id TEXT REFERENCES relatives(id) ON DELETE SET NULL,
    spouse_id TEXT REFERENCES relatives(id) ON DELETE SET NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;

// Upgrade schema on databases created before the tree columns existed.
await sql`ALTER TABLE relatives ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES relatives(id) ON DELETE SET NULL`;
await sql`ALTER TABLE relatives ADD COLUMN IF NOT EXISTS spouse_id TEXT REFERENCES relatives(id) ON DELETE SET NULL`;

await sql`
  CREATE TABLE IF NOT EXISTS letters (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    date TEXT NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;

await sql`
  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    initials TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;

// Upsert the child content.
await sql`
  INSERT INTO child (id, name, birthdate, welcome, hero_image)
  VALUES (1, 'Tamim', '2024-01-23',
    'A little corner of the world where we keep the moments that make our hearts feel full.',
    ${imgHero})
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, birthdate = EXCLUDED.birthdate,
    welcome = EXCLUDED.welcome, hero_image = EXCLUDED.hero_image`;

// Drop the old placeholder memories; the seeded rows below are the real ones.
await sql`DELETE FROM memories`;
await sql`DELETE FROM relatives`;
await sql`DELETE FROM letters`;
await sql`DELETE FROM profiles`;

const memories = [
  [
    "arrived",
    "The day you arrived",
    "January 23, 2024",
    "Milestones",
    imgBirth,
    1,
    "The whole room grew quiet, and then there you were.",
    "We counted every tiny finger and toe. You opened your eyes, held one of our fingers, and made the world feel completely new.",
  ],
  [
    "seboua",
    "Your sebou'a celebration",
    "February 8, 2024",
    "Celebrations",
    imgSeboua,
    2,
    "The whole family came to celebrate you.",
    "السبوع بتاعك: كل الناس فرحانة بيك، والكل شاف إنيّك وأنت شكلك أجمل واحد. صحيح السبوع هو أول احتفال كبير بيك.",
  ],
  [
    "growing",
    "Our little one, already growing",
    "March 17, 2024",
    "Everyday moments",
    imgGrowing,
    3,
    "Two months old and already stealing every heart.",
    "كل يوم بيكبر والضحكة بتكبر معاه. أول ما ابتدينا نعرف طبعك الحلو وابتسامتك اللي بتزيح تعب اليوم.",
  ],
  [
    "first-sea",
    "First taste of the sea",
    "June 16, 2024",
    "Adventures",
    imgSea,
    4,
    "The ocean met you, and you loved it.",
    "أول جولة بحر لتميم: الرمل والموج والضحك. فضلت تشوف المياه من بعيد الأول، وبعدين ما خلعتش من الحضن. أجمل يوم.",
  ],
  [
    "kaftan",
    "Qaftan day — moon-light handsome",
    "February 21, 2025",
    "Celebrations",
    imgKaftan,
    5,
    "لبست القفطان وصرت أحلى عريس صغير.",
    "في المناسبة دي لبست القفطان البيج الجميل، وكل حد سأل 'مين التلميذ ده؟'. عيونك كانت بتضحك من الفرحة.",
  ],
  [
    "zoo",
    "Our day at the zoo",
    "January 21, 2026",
    "Adventures",
    imgZoo,
    6,
    "The animals, the walking, and your endless questions.",
    "جولة جنينة الحيوانات: قربت من كل حيوان بحذر، وسألت عن كل صوت. قولناها إحنا كبار بس إنت كنت أجرأ البشر في اليوم ده.",
  ],
];
for (const [id, title, date, category, image, order, excerpt, story] of memories) {
  await sql`
    INSERT INTO memories (id, title, date, category, image, excerpt, story, sort_order)
    VALUES (${id}, ${title}, ${date}, ${category}, ${image}, ${excerpt}, ${story}, ${order})
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title, date = EXCLUDED.date, category = EXCLUDED.category,
      image = EXCLUDED.image, excerpt = EXCLUDED.excerpt, story = EXCLUDED.story,
      sort_order = EXCLUDED.sort_order`;
}

const imgPlaceholders = {
  birth: `${CLOUD}/tamims-world/memory-birth.jpg`,
  smile: `${CLOUD}/tamims-world/memory-smile.jpg`,
  steps: `${CLOUD}/tamims-world/memory-steps.jpg`,
  birthday: `${CLOUD}/tamims-world/memory-birthday.jpg`,
};

// [order, id, name, relationship, group, image, fact, bio, parent, spouse]
const relatives = [
  // ---- Parents ----
  [
    1,
    "momen",
    "مؤمن",
    "بابا",
    "Parents",
    imgPlaceholders.steps,
    "بيحب الضحك مع تميم كل يوم.",
    "بابا تميم ورفيقه الأول في كل مغامرة وعند لعب.",
    "geddo-ahmed",
    "nagham",
  ],
  [
    2,
    "nagham",
    "نغم",
    "ماما",
    "Parents",
    imgPlaceholders.smile,
    "بتغني له أجمل أغاني النوم.",
    "ماما تميم، وحضنها هو المكان الأأمن في الدنيا.",
    "geddo-ishaq",
    "momen",
  ],
  // ---- Grandparents ----
  [
    3,
    "geddo-ahmed",
    "أحمد اللبان",
    "الجد (والد بابا)",
    "Grandparents",
    imgPlaceholders.birth,
    "بيحب كل مناسبة مع الأحفاد.",
    "جد تميم من ناحية بابا، صاحب القلب الكبير.",
    null,
    "teta-nadia",
  ],
  [
    4,
    "teta-nadia",
    "ناديه نايل",
    "الجدة (والدة بابا)",
    "Grandparents",
    imgPlaceholders.birthday,
    "دائمًا بتفتكر كلام حلو يقوله لتميم.",
    "جدة تميم من ناحية بابا، وحكاياتها أحلى حكاية.",
    null,
    "geddo-ahmed",
  ],
  [
    5,
    "geddo-ishaq",
    "أحمد اسحاق",
    "الجد (والد ماما)",
    "Grandparents",
    imgPlaceholders.smile,
    "دائمًا بيسأل عن تميم.",
    "جد تميم من ناحية ماما.",
    null,
    "teta-magda",
  ],
  [
    6,
    "teta-magda",
    "ماجده بدر",
    "الجدة (والدة ماما)",
    "Grandparents",
    imgPlaceholders.steps,
    "بتعمل أحلى حلويات.",
    "جدة تميم من ناحية ماما، وضحكتها بتحلّي الدنيا.",
    null,
    "geddo-ishaq",
  ],
  // ---- Aunts & Uncles (direct) ----
  [
    7,
    "uncle-mody",
    "محمد «مودى»",
    "العم (شقيق بابا)",
    "Aunts & Uncles",
    imgPlaceholders.birth,
    "عنده مودى وزين.",
    "عم تميم، ودايمًا بيجيبه هدية.",
    "geddo-ahmed",
    "aunt-aya",
  ],
  [
    8,
    "aunt-aya",
    "ايه",
    "زوجة العم",
    "Aunts & Uncles",
    imgPlaceholders.steps,
    "أم مودى وزين.",
    "زوجة العم مودى، وبيتها دايماً مليان ضحك.",
    null,
    "uncle-mody",
  ],
  [
    9,
    "uncle-marwan",
    "مروان",
    "الخال (شقيق ماما)",
    "Aunts & Uncles",
    imgPlaceholders.smile,
    "بيحب يلعب مع تميم.",
    "خال تميم، رفيق اللعب والمقالب.",
    "geddo-ishaq",
    null,
  ],
  [
    10,
    "uncle-mohamed",
    "محمد",
    "الخال (شقيق ماما)",
    "Aunts & Uncles",
    imgPlaceholders.birthday,
    "خال تميم من ناحية ماما.",
    "شقيق ماما، ودايمًا فاكر تميم.",
    "geddo-ishaq",
    null,
  ],
  [
    11,
    "khala-tagrid",
    "تغريد",
    "الخالة (شقيقة ماما)",
    "Aunts & Uncles",
    imgPlaceholders.birth,
    "عندها بنت اسمها لمار.",
    "شقيقة ماما، وضحكتهما مش بتخلص.",
    "geddo-ishaq",
    "uncle-maki",
  ],
  [
    12,
    "uncle-maki",
    "أحمد مكى",
    "زوج الخالة",
    "Aunts & Uncles",
    imgPlaceholders.steps,
    "زوج الخالة تغريد.",
    "أحمد مكى، زوج الخالة تغريد وأبو لمار.",
    null,
    "khala-tagrid",
  ],
  // ---- Cousins ----
  [
    13,
    "cousin-ahmed",
    "أحمد «مودى»",
    "ابن العم",
    "Cousins",
    imgPlaceholders.smile,
    "دلعه مودى.",
    "ابن العم، من أولاد عم بابا مودى.",
    "uncle-mody",
    null,
  ],
  [
    14,
    "cousin-zain",
    "زين",
    "ابن العم",
    "Cousins",
    imgPlaceholders.birthday,
    "ابن العم.",
    "زين، أصغر أبناء العم مودى.",
    "uncle-mody",
    null,
  ],
  [
    15,
    "cousin-lamar",
    "لمار",
    "بنت الخالة",
    "Cousins",
    imgPlaceholders.birth,
    "بنت الخالة تغريد.",
    "لمار، بنت الخالة تغريد وأحمد مكى.",
    "khala-tagrid",
    null,
  ],
  // ---- Great aunts & uncles (paternal grandmother's side) ----
  [
    16,
    "khala-saad",
    "سعاد",
    "خالة بابا",
    "Great aunts & uncles",
    imgPlaceholders.birthday,
    "شقيقة الجدة ناديه.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
  [
    17,
    "khal-saeed",
    "سعيد",
    "خال بابا",
    "Great aunts & uncles",
    imgPlaceholders.birth,
    "شقيق الجدة ناديه.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
  [
    18,
    "khal-ali",
    "على",
    "خال بابا",
    "Great aunts & uncles",
    imgPlaceholders.steps,
    "شقيق الجدة ناديه.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
  [
    19,
    "khal-kamal",
    "كمال",
    "خال بابا",
    "Great aunts & uncles",
    imgPlaceholders.smile,
    "شقيق الجدة ناديه.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
  [
    20,
    "khal-hassan",
    "حسن",
    "خال بابا",
    "Great aunts & uncles",
    imgPlaceholders.birthday,
    "شقيق الجدة ناديه.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
  [
    21,
    "khala-anissa",
    "انيسه",
    "خالة بابا",
    "Great aunts & uncles",
    imgPlaceholders.birth,
    "شقيقة الجدة ناديه.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
  // ---- Great aunts & uncles (paternal grandfather's side) ----
  [
    22,
    "amt-hoda",
    "هدى",
    "عمة بابا",
    "Great aunts & uncles",
    imgPlaceholders.steps,
    "شقيقة الجد أحمد اللبان.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
  [
    23,
    "amt-nora",
    "نورا",
    "عمة بابا",
    "Great aunts & uncles",
    imgPlaceholders.smile,
    "شقيقة الجد أحمد اللبان.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
  [
    24,
    "am-hassan",
    "حسن",
    "عم بابا",
    "Great aunts & uncles",
    imgPlaceholders.birthday,
    "شقيق الجد أحمد اللبان.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
  [
    25,
    "am-gamal",
    "جمال",
    "عم بابا",
    "Great aunts & uncles",
    imgPlaceholders.birth,
    "شقيق الجد أحمد اللبان.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
  [
    26,
    "am-hamdy",
    "حمدى",
    "عم بابا",
    "Great aunts & uncles",
    imgPlaceholders.steps,
    "شقيق الجد أحمد اللبان.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
  // ---- Great aunts & uncles (maternal grandmother's side) ----
  [
    27,
    "khala-wafa",
    "وفاء",
    "خالة ماما",
    "Great aunts & uncles",
    imgPlaceholders.smile,
    "شقيقة الجدة ماجده.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
  [
    28,
    "khala-hoda",
    "هدى",
    "خالة ماما",
    "Great aunts & uncles",
    imgPlaceholders.birthday,
    "شقيقة الجدة ماجده.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
  [
    29,
    "khala-maha",
    "مها",
    "خالة ماما",
    "Great aunts & uncles",
    imgPlaceholders.birth,
    "شقيقة الجدة ماجده.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
  // ---- Great aunts & uncles (maternal grandfather's side) ----
  [
    30,
    "am-mohamed",
    "محمد",
    "عم ماما",
    "Great aunts & uncles",
    imgPlaceholders.steps,
    "شقيق الجد أحمد اسحاق.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
  [
    31,
    "am-hassan2",
    "حسن",
    "عم ماما",
    "Great aunts & uncles",
    imgPlaceholders.birthday,
    "شقيق الجد أحمد اسحاق.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
];
for (const rel of relatives) {
  const [order, id, name, relationship, group, image, fact, bio] = rel;
  await sql`
    INSERT INTO relatives (id, name, relationship, "group", image, fact, bio, sort_order)
    VALUES (${id}, ${name}, ${relationship}, ${group}, ${image}, ${fact}, ${bio}, ${order})
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, relationship = EXCLUDED.relationship, "group" = EXCLUDED."group",
      image = EXCLUDED.image, fact = EXCLUDED.fact, bio = EXCLUDED.bio,
      sort_order = EXCLUDED.sort_order`;
}

// Second pass: wire up tree links after all rows exist (FK-safe order).
for (const rel of relatives) {
  const [, id, , , , , , , parentId, spouseId] = rel;
  if (parentId || spouseId) {
    await sql`
      UPDATE relatives SET parent_id = ${parentId ?? null}, spouse_id = ${spouseId ?? null} WHERE id = ${id}`;
  }
}

const letters = [
  [
    "kind",
    "When the world asks you to be brave",
    "ماما",
    "For your 10th birthday",
    "My darling, courage is not about never feeling afraid. It is choosing kindness and taking one small step even when you are. You have carried that quiet courage since your very first steps.",
  ],
  [
    "home",
    "Whenever you feel far from home",
    "بابا",
    "Open when you miss us",
    "Home is not only a place. It is every story we share, every laugh at the dinner table, and every person who knows the shape of your heart. You can always find your way back.",
  ],
  [
    "dream",
    "On following a dream",
    "الجدة",
    "For the day you choose your path",
    "Take the path that leaves room for wonder. Work hard, stay gentle, and remember that becoming yourself is the most beautiful adventure of all.",
  ],
];
for (const [id, title, author, date, message] of letters) {
  await sql`
    INSERT INTO letters (id, title, author, date, message)
    VALUES (${id}, ${title}, ${author}, ${date}, ${message})
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title, author = EXCLUDED.author,
      date = EXCLUDED.date, message = EXCLUDED.message`;
}

const profiles = [
  ["family", "عائلة تميم", "ت"],
  ["mama", "ماما نغم", "ن"],
  ["baba", "بابا مؤمن", "م"],
];
for (const [id, name, initials] of profiles) {
  await sql`
    INSERT INTO profiles (id, name, initials)
    VALUES (${id}, ${name}, ${initials})
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, initials = EXCLUDED.initials`;
}

console.log("Neon schema created and seeded:");
for (const table of ["child", "memories", "relatives", "letters", "profiles"]) {
  const rows = await sql.query(`SELECT count(*)::int AS count FROM "${table}"`);
  console.log(`  ${table}: ${rows[0].count}`);
}
