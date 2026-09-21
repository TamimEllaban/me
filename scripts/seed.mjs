// Creates the family-site schema on Neon (Postgres) and seeds it with the
// placeholder content, using Cloudinary URLs for images.
// Run: node --env-file=.env scripts/seed.mjs
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

const sql = neon(url);

const CLOUD = "https://res.cloudinary.com/djseokhow/image/upload";
const heroImage = `${CLOUD}/tamims-world/hero-child.jpg`;
const imgBirth = `${CLOUD}/tamims-world/memory-birth.jpg`;
const imgSmile = `${CLOUD}/tamims-world/memory-smile.jpg`;
const imgSteps = `${CLOUD}/tamims-world/memory-steps.jpg`;
const imgBirthday = `${CLOUD}/tamims-world/memory-birthday.jpg`;

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
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;

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

// Upsert the placeholder content.
await sql`
  INSERT INTO child (id, name, birthdate, welcome, hero_image)
  VALUES (1, 'Tamim', '2024-03-18',
    'A little corner of the world where we keep the moments that make our hearts feel full.',
    ${heroImage})
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name, birthdate = EXCLUDED.birthdate,
    welcome = EXCLUDED.welcome, hero_image = EXCLUDED.hero_image`;

const memories = [
  [
    1,
    "birth",
    "The day you arrived",
    "March 18, 2024",
    "Milestones",
    imgBirth,
    "The whole room grew quiet, and then there you were.",
    "We counted every tiny finger and toe. You opened your eyes, held one of our fingers, and made the world feel completely new.",
  ],
  [
    2,
    "smile",
    "Your first big smile",
    "May 27, 2024",
    "Everyday moments",
    imgSmile,
    "A sleepy morning suddenly became unforgettable.",
    "Sunlight came through the nursery window and you gave us the widest, happiest smile. We laughed, then you laughed too.",
  ],
  [
    3,
    "steps",
    "Three brave little steps",
    "February 2, 2025",
    "Milestones",
    imgSteps,
    "You let go, wobbled, and walked right into our arms.",
    "Nobody breathed for those few seconds. You looked so proud when you reached us, and immediately turned around to try again.",
  ],
  [
    4,
    "birthday",
    "One whole year of you",
    "March 18, 2025",
    "Celebrations",
    imgBirthday,
    "One candle, many happy tears, and cake everywhere.",
    "The people who love you filled the room. You were far more interested in the cake than the candle—and we wouldn't have it any other way.",
  ],
];
for (const [order, id, title, date, category, image, excerpt, story] of memories) {
  await sql`
    INSERT INTO memories (id, title, date, category, image, excerpt, story, sort_order)
    VALUES (${id}, ${title}, ${date}, ${category}, ${image}, ${excerpt}, ${story}, ${order})
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title, date = EXCLUDED.date, category = EXCLUDED.category,
      image = EXCLUDED.image, excerpt = EXCLUDED.excerpt, story = EXCLUDED.story,
      sort_order = EXCLUDED.sort_order`;
}

// Replace placeholder rows for the family tables so no stale content lingers.
await sql`DELETE FROM relatives`;
await sql`DELETE FROM letters`;
await sql`DELETE FROM profiles`;

const relatives = [
  // ---- Parents ----
  [
    1,
    "momen",
    "مؤمن",
    "بابا",
    "Parents",
    imgSteps,
    "بيحب الضحك مع تميم كل يوم.",
    "بابا تميم ورفيقه الأول في كل مغامرة وعند لعب.",
  ],
  [
    2,
    "nagham",
    "نغم",
    "ماما",
    "Parents",
    imgSmile,
    "بتغني له أجمل أغاني النوم.",
    "ماما تميم، وحضنها هو المكان الأأمن في الدنيا.",
  ],
  // ---- Grandparents ----
  [
    3,
    "geddo-ahmed",
    "أحمد اللبان",
    "الجد (والد بابا)",
    "Grandparents",
    imgBirth,
    "بيحب كل مناسبة مع الأحفاد.",
    "جد تميم من ناحية بابا، صاحب القلب الكبير.",
  ],
  [
    4,
    "teta-nadia",
    "ناديه نايل",
    "الجدة (والدة بابا)",
    "Grandparents",
    imgBirthday,
    "دائمًا بتفتكر كلام حلو يقوله لتميم.",
    "جدة تميم من ناحية بابا، وحكاياتها أحلى حكاية.",
  ],
  [
    5,
    "geddo-ishaq",
    "أحمد اسحاق",
    "الجد (والد ماما)",
    "Grandparents",
    imgSmile,
    "دائمًا بيسأل عن تميم.",
    "جد تميم من ناحية ماما.",
  ],
  [
    6,
    "teta-magda",
    "ماجده بدر",
    "الجدة (والدة ماما)",
    "Grandparents",
    imgSteps,
    "بتعمل أحلى حلويات.",
    "جدة تميم من ناحية ماما، وضحكتها بتحلّي الدنيا.",
  ],
  // ---- Aunts & Uncles (direct) ----
  [
    7,
    "uncle-mody",
    "محمد «مودى»",
    "العم (شقيق بابا)",
    "Aunts & Uncles",
    imgBirth,
    "عنده مودى وزين.",
    "عم تميم، ودايمًا بيجيبه هدية.",
  ],
  [
    8,
    "aunt-aya",
    "ايه",
    "زوجة العم",
    "Aunts & Uncles",
    imgSteps,
    "أم مودى وزين.",
    "زوجة العم مودى، وبيتها دايماً مليان ضحك.",
  ],
  [
    9,
    "uncle-marwan",
    "مروان",
    "الخال (شقيق ماما)",
    "Aunts & Uncles",
    imgSmile,
    "بيحب يلعب مع تميم.",
    "خال تميم، رفيق اللعب والمقالب.",
  ],
  [
    10,
    "uncle-mohamed",
    "محمد",
    "الخال (شقيق ماما)",
    "Aunts & Uncles",
    imgBirthday,
    "خال تميم من ناحية ماما.",
    "شقيق ماما، ودايمًا فاكر تميم.",
  ],
  [
    11,
    "khala-tagrid",
    "تغريد",
    "الخالة (شقيقة ماما)",
    "Aunts & Uncles",
    imgBirth,
    "عندها بنت اسمها لمار.",
    "شقيقة ماما، وضحكتهما مش بتخلص.",
  ],
  [
    12,
    "uncle-maki",
    "أحمد مكى",
    "زوج الخالة",
    "Aunts & Uncles",
    imgSteps,
    "زوج الخالة تغريد.",
    "أحمد مكى، زوج الخالة تغريد وأبو لمار.",
  ],
  // ---- Cousins ----
  [
    13,
    "cousin-ahmed",
    "أحمد «مودى»",
    "ابن العم",
    "Cousins",
    imgSmile,
    "دلعه مودى.",
    "ابن العم، من أولاد عم بابا مودى.",
  ],
  [
    14,
    "cousin-zain",
    "زين",
    "ابن العم",
    "Cousins",
    imgBirthday,
    "ابن العم.",
    "زين، أصغر أبناء العم مودى.",
  ],
  [
    15,
    "cousin-lamar",
    "لمار",
    "بنت الخالة",
    "Cousins",
    imgBirth,
    "بنت الخالة تغريد.",
    "لمار، بنت الخالة تغريد وأحمد مكى.",
  ],
  // ---- Great aunts & uncles (paternal grandmother's side) ----
  [
    16,
    "khala-saad",
    "سعاد",
    "خالة بابا",
    "Great aunts & uncles",
    imgBirthday,
    "شقيقة الجدة ناديه.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
  [
    17,
    "khal-saeed",
    "سعيد",
    "خال بابا",
    "Great aunts & uncles",
    imgBirth,
    "شقيق الجدة ناديه.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
  [
    18,
    "khal-ali",
    "على",
    "خال بابا",
    "Great aunts & uncles",
    imgSteps,
    "شقيق الجدة ناديه.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
  [
    19,
    "khal-kamal",
    "كمال",
    "خال بابا",
    "Great aunts & uncles",
    imgSmile,
    "شقيق الجدة ناديه.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
  [
    20,
    "khal-hassan",
    "حسن",
    "خال بابا",
    "Great aunts & uncles",
    imgBirthday,
    "شقيق الجدة ناديه.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
  [
    21,
    "khala-anissa",
    "انيسه",
    "خالة بابا",
    "Great aunts & uncles",
    imgBirth,
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
    imgSteps,
    "شقيقة الجد أحمد اللبان.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
  [
    23,
    "amt-nora",
    "نورا",
    "عمة بابا",
    "Great aunts & uncles",
    imgSmile,
    "شقيقة الجد أحمد اللبان.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
  [
    24,
    "am-hassan",
    "حسن",
    "عم بابا",
    "Great aunts & uncles",
    imgBirthday,
    "شقيق الجد أحمد اللبان.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
  [
    25,
    "am-gamal",
    "جمال",
    "عم بابا",
    "Great aunts & uncles",
    imgBirth,
    "شقيق الجد أحمد اللبان.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
  [
    26,
    "am-hamdy",
    "حمدى",
    "عم بابا",
    "Great aunts & uncles",
    imgSteps,
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
    imgSmile,
    "شقيقة الجدة ماجده.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
  [
    28,
    "khala-hoda",
    "هدى",
    "خالة ماما",
    "Great aunts & uncles",
    imgBirthday,
    "شقيقة الجدة ماجده.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
  [
    29,
    "khala-maha",
    "مها",
    "خالة ماما",
    "Great aunts & uncles",
    imgBirth,
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
    imgSteps,
    "شقيق الجد أحمد اسحاق.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
  [
    31,
    "am-hassan2",
    "حسن",
    "عم ماما",
    "Great aunts & uncles",
    imgBirthday,
    "شقيق الجد أحمد اسحاق.",
    "من عائلة تميم الكبيرة الحبيبة.",
  ],
];
for (const [order, id, name, relationship, group, image, fact, bio] of relatives) {
  await sql`
    INSERT INTO relatives (id, name, relationship, "group", image, fact, bio, sort_order)
    VALUES (${id}, ${name}, ${relationship}, ${group}, ${image}, ${fact}, ${bio}, ${order})
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name, relationship = EXCLUDED.relationship, "group" = EXCLUDED."group",
      image = EXCLUDED.image, fact = EXCLUDED.fact, bio = EXCLUDED.bio, sort_order = EXCLUDED.sort_order`;
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
