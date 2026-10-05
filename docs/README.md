# Boots UK App — Project Documentation

This `docs/` folder is the single source of truth for what this project is built with, how it's
structured, and how the database is designed. It's split into three focused documents so you can
jump straight to what you need:

| Document | What's in it |
|---|---|
| [tech-stack.md](./tech-stack.md) | Every framework/library used, **why** it was chosen, and **where** in the code it's actually used |
| [architecture.md](./architecture.md) | Folder structure, navigation/routing, state management, and how a screen is put together |
| [database.md](./database.md) | Supabase schema, tables, Row Level Security policies, and what each migration did |

---

## Executive summary (for non-technical readers)

**What it is:** A shopping app for Boots UK, built for both mobile phones (iOS/Android) and web
browsers **from one single codebase**. Customers can browse products, add them to a basket, check
out, and collect loyalty points on a digital Advantage Card.

**Why one codebase for phone + web:** Instead of building and maintaining three separate apps (an
iOS app, an Android app, and a website), this project uses a single technology (**Expo / React
Native**) that produces all three from the same source code. That means new features, bug fixes,
and design changes only need to be written once, and they show up everywhere — which is
significantly cheaper and faster to maintain than three separate teams/codebases.

**Where the data lives:** All product information, customer accounts, shopping baskets, and orders
are stored in **Supabase**, a hosted database service. The app doesn't run its own server — it
talks directly and securely to this database, with rules in the database itself (not just the app)
deciding who is allowed to see or change what. That's a deliberate security choice: even if
someone bypassed the app entirely, the database would still refuse to let them see another
customer's basket or orders.

**Current state of the build:** Splash screen, onboarding, sign up / sign in, home page, product
browsing and search, product detail pages, shopping basket, and a full checkout flow (delivery →
payment → confirmation) are built and working end-to-end against the live database. The
**Advantage Card / loyalty points tab is still a placeholder** ("Coming soon") and is the next
screen to be built out.

**How customers will reach it:** Because it's an Expo app, it can be:
- Installed as a native app on iOS and Android (via the App Store / Play Store, through a service
  called EAS Build), **and**
- Opened directly in a web browser at a normal URL, with no install needed (see the note on
  [web deployment](#can-it-run-as-a-website) below).

### Can it run as a website?

Yes — this was already tested and confirmed working. Running one command (`npx expo export -p
web`) produces a standard static website (HTML/CSS/JS) that can be hosted anywhere (Expo's own
hosting, Vercel, Netlify, etc.) and opened at a normal `https://...` URL like any other website.

---

## Quick facts

| | |
|---|---|
| **Primary language** | TypeScript (strict mode) |
| **App framework** | Expo (React Native) — targets iOS, Android, and Web from one codebase |
| **Navigation** | Expo Router (file-based, like Next.js) |
| **Backend / database** | Supabase (PostgreSQL + Auth + Row Level Security) |
| **State management** | React Context + custom hooks (no Redux/MobX) |
| **Styling** | React Native `StyleSheet` (no styling library) |
| **Package manager** | npm |

For the full breakdown with reasoning, see [tech-stack.md](./tech-stack.md).
