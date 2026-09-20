# Little Moments Keeper

Build a mobile-first, emotionally warm personal website for my son called "[CHILD'S NAME]'s World" (use a placeholder name I can edit later). This is a digital memory capsule for a child, meant to be viewed primarily on smartphones by close family members.

TECH REQUIREMENTS:

- Next.js (App Router), fully responsive, mobile-first design (design for 375px width first, then scale up)

- Structure the code so it can later connect to Cloudinary for image storage and Neon (Postgres) for the database — use a clean data layer/API routes pattern so I can plug in real data sources later

- Use placeholder/AI-generated stock images for babies, families, and family trees for now (soft, warm, realistic style — not cartoonish) so I can see the full design before adding real photos

- Add a simple password-gate/login screen before entering the site (family-only access)

OVERALL DESIGN DIRECTION:

- Warm, soft, nostalgic, "keepsake" feeling — think baby book meets modern app

- Soft rounded corners, gentle shadows, warm color palette (creams, soft blush, sage green, or muted gold — avoid harsh primary colors)

- Beautiful typography: a warm serif or rounded font for headings, clean sans-serif for body text

- Smooth micro-animations and transitions (fade-ins, gentle scale on tap, page transitions) — should feel premium and delightful, not childish or cheap

- Generous white space, photo-first layouts

- Support both light mode and a soft dark mode

PAGES/SECTIONS NEEDED:

1. HOME PAGE

- Large hero photo of the child, his name, birthdate

- A live-updating counter: "X years, X months, X days old"

- Quick navigation cards to Memories, Family Tree, and Relatives sections

- A short warm intro text (placeholder text is fine)

2. MEMORIES TIMELINE PAGE

- A vertical, chronological timeline (mobile-friendly — NOT horizontal scroll)

- Each memory/milestone is a card with: photo(s), title, date, short story/caption

- Include placeholder milestones like: Birth, First Smile, First Steps, First Word, First Birthday, etc.

- Ability to tap a card to expand and see more photos/details in a modal or expanded view

- Include a filter or category tag system (e.g., "Milestones", "Trips", "Everyday moments")

3. FAMILY TREE PAGE

- An interactive, VERTICAL family tree optimized for mobile (not a wide horizontal chart that requires side-scrolling)

- Each family member is a small card/node with a circular photo and name

- Tapping a node smoothly opens a detail panel/modal with their photo, name, relationship to the child, and a short bio

- Support pinch-to-zoom and pan gestures

- Populate with placeholder family members (grandparents, parents, aunts/uncles, etc.) in a realistic tree structure

4. RELATIVES GALLERY PAGE

- A responsive grid of relative "cards" (2 columns on mobile)

- Each card: circular or rounded photo, name, relationship label (e.g., "Grandma", "Uncle"), and a one-line fun fact

- Tapping a card opens more detail (bio, more photos)

- Include a search/filter by relationship type

5. "LETTERS FOR WHEN YOU GROW UP" PAGE

- A special, distinct-feeling section (different visual treatment — like an envelope/letter aesthetic)

- A list of "letters" written by family members, shown as sealed envelope cards that "open" on tap to reveal the letter text with a nice reveal animation

- Include a placeholder form UI for adding a new letter (title, author, message, optional photo)

NAVIGATION:

- Bottom tab bar navigation for mobile (Home, Memories, Family Tree, Relatives, Letters) with icons

- Sticky/persistent, thumb-friendly (icons + labels, adequately sized tap targets)

EXTRA DETAILS TO INCLUDE:

- A subtle loading/splash screen with a warm illustration when the site first loads

- Empty states designed thoughtfully (in case a section has no content yet) — not just plain "no data" text

- Share button UI (e.g., "Share with family") — placeholder functionality is fine

- Make sure all touch targets, font sizes, and spacing follow mobile accessibility best practices

Please generate a polished, production-quality UI with realistic placeholder content and images throughout, so the site feels complete and ready to show family members, even before real photos and data are added.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/727025b9-70a1-4916-96d7-7804fc74e567).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
