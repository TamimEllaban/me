// Static placeholder content used until the Neon database has been seeded.
// The site prefers the database (see db.ts + world-data.server.ts) and only
// falls back to this bundled data when DATABASE_URL is missing or unreachable.

import birth from "@/assets/memory-birth.jpg";
import birthday from "@/assets/memory-birthday.jpg";
import smile from "@/assets/memory-smile.jpg";
import steps from "@/assets/memory-steps.jpg";

export const placeholderChild = {
  name: "Tamim",
  birthdate: "2024-03-18",
  welcome: "A little corner of the world where we keep the moments that make our hearts feel full.",
};

export const placeholderMemories = [
  {
    id: "birth",
    title: "The day you arrived",
    date: "March 18, 2024",
    category: "Milestones",
    image: birth,
    excerpt: "The whole room grew quiet, and then there you were.",
    story:
      "We counted every tiny finger and toe. You opened your eyes, held one of our fingers, and made the world feel completely new.",
    sort_order: 1,
  },
  {
    id: "smile",
    title: "Your first big smile",
    date: "May 27, 2024",
    category: "Everyday moments",
    image: smile,
    excerpt: "A sleepy morning suddenly became unforgettable.",
    story:
      "Sunlight came through the nursery window and you gave us the widest, happiest smile. We laughed, then you laughed too.",
    sort_order: 2,
  },
  {
    id: "steps",
    title: "Three brave little steps",
    date: "February 2, 2025",
    category: "Milestones",
    image: steps,
    excerpt: "You let go, wobbled, and walked right into our arms.",
    story:
      "Nobody breathed for those few seconds. You looked so proud when you reached us, and immediately turned around to try again.",
    sort_order: 3,
  },
  {
    id: "birthday",
    title: "One whole year of you",
    date: "March 18, 2025",
    category: "Celebrations",
    image: birthday,
    excerpt: "One candle, many happy tears, and cake everywhere.",
    story:
      "The people who love you filled the room. You were far more interested in the cake than the candle—and we wouldn't have it any other way.",
    sort_order: 4,
  },
];

export const placeholderRelatives = [
  {
    id: "mama",
    name: "Layla",
    relationship: "Mama",
    group: "Parents",
    image: birth,
    fact: "Sings the best bedtime songs.",
    bio: "Your safe place, storyteller, and champion of kitchen dance parties.",
    sort_order: 1,
  },
  {
    id: "baba",
    name: "Omar",
    relationship: "Baba",
    group: "Parents",
    image: steps,
    fact: "Makes pancakes shaped like moons.",
    bio: "Your adventure partner and the person most likely to build a blanket fort.",
    sort_order: 2,
  },
  {
    id: "nana",
    name: "Mariam",
    relationship: "Grandma",
    group: "Grandparents",
    image: smile,
    fact: "Always has a warm hug ready.",
    bio: "Keeper of family recipes, stories, and an endless supply of cuddles.",
    sort_order: 3,
  },
  {
    id: "geddo",
    name: "Youssef",
    relationship: "Grandpa",
    group: "Grandparents",
    image: birthday,
    fact: "Knows the names of every bird.",
    bio: "Patient teacher, garden guide, and expert maker of silly sounds.",
    sort_order: 4,
  },
  {
    id: "teta",
    name: "Salma",
    relationship: "Grandma",
    group: "Grandparents",
    image: birth,
    fact: "Never forgets a birthday.",
    bio: "The family historian who remembers every lovely detail.",
    sort_order: 5,
  },
  {
    id: "ammo",
    name: "Karim",
    relationship: "Uncle",
    group: "Aunts & Uncles",
    image: steps,
    fact: "Lets you stay up ten minutes late.",
    bio: "Your funny uncle, future football coach, and loyal partner in mischief.",
    sort_order: 6,
  },
];

export const placeholderLetters = [
  {
    id: "kind",
    title: "When the world asks you to be brave",
    author: "Mama",
    date: "For your 10th birthday",
    message:
      "My darling, courage is not about never feeling afraid. It is choosing kindness and taking one small step even when you are. You have carried that quiet courage since your very first steps.",
  },
  {
    id: "home",
    title: "Whenever you feel far from home",
    author: "Baba",
    date: "Open when you miss us",
    message:
      "Home is not only a place. It is every story we share, every laugh at the dinner table, and every person who knows the shape of your heart. You can always find your way back.",
  },
  {
    id: "dream",
    title: "On following a dream",
    author: "Grandma Mariam",
    date: "For the day you choose your path",
    message:
      "Take the path that leaves room for wonder. Work hard, stay gentle, and remember that becoming yourself is the most beautiful adventure of all.",
  },
];

export const placeholderProfiles = [
  { id: "family", name: "Our Family", initials: "OF" },
  { id: "mama", name: "Mama", initials: "M" },
  { id: "baba", name: "Baba", initials: "B" },
];
