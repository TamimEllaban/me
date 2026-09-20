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

const relatives = [
  [
    1,
    "mama",
    "Layla",
    "Mama",
    "Parents",
    imgBirth,
    "Sings the best bedtime songs.",
    "Your safe place, storyteller, and champion of kitchen dance parties.",
  ],
  [
    2,
    "baba",
    "Omar",
    "Baba",
    "Parents",
    imgSteps,
    "Makes pancakes shaped like moons.",
    "Your adventure partner and the person most likely to build a blanket fort.",
  ],
  [
    3,
    "nana",
    "Mariam",
    "Grandma",
    "Grandparents",
    imgSmile,
    "Always has a warm hug ready.",
    "Keeper of family recipes, stories, and an endless supply of cuddles.",
  ],
  [
    4,
    "geddo",
    "Youssef",
    "Grandpa",
    "Grandparents",
    imgBirthday,
    "Knows the names of every bird.",
    "Patient teacher, garden guide, and expert maker of silly sounds.",
  ],
  [
    5,
    "teta",
    "Salma",
    "Grandma",
    "Grandparents",
    imgBirth,
    "Never forgets a birthday.",
    "The family historian who remembers every lovely detail.",
  ],
  [
    6,
    "ammo",
    "Karim",
    "Uncle",
    "Aunts & Uncles",
    imgSteps,
    "Lets you stay up ten minutes late.",
    "Your funny uncle, future football coach, and loyal partner in mischief.",
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
    "Mama",
    "For your 10th birthday",
    "My darling, courage is not about never feeling afraid. It is choosing kindness and taking one small step even when you are. You have carried that quiet courage since your very first steps.",
  ],
  [
    "home",
    "Whenever you feel far from home",
    "Baba",
    "Open when you miss us",
    "Home is not only a place. It is every story we share, every laugh at the dinner table, and every person who knows the shape of your heart. You can always find your way back.",
  ],
  [
    "dream",
    "On following a dream",
    "Grandma Mariam",
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
  ["family", "Our Family", "OF"],
  ["mama", "Mama", "M"],
  ["baba", "Baba", "B"],
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
