# Tech Stack

Every framework and library in this project, why it was chosen, and where it's actually used in
the code (with real file paths, not guesses). Versions are pinned as of the last dependency
install — see [package.json](../package.json) for the exact numbers in use right now.

---

## 1. Core framework

### Expo (`expo` ~57.0.24)

**What it is:** A framework and toolchain built on top of React Native. It provides the dev
server, build tooling (EAS Build/Update), and a large set of pre-built native modules (camera,
storage, fonts, etc.) so you rarely need to write native iOS/Android code by hand.

**Why it was chosen:** It's the fastest way to ship a production-quality app to iOS, Android,
*and* web from a single TypeScript codebase, with a mature ecosystem and first-class file-based
routing (Expo Router). Bare React Native would require manually configuring native build tooling,
web support, and most of the modules Expo provides out of the box.

**Where it's used:** Every screen in the app; entry point is configured in
[package.json](../package.json) (`"main": "expo-router/entry"`) and [app.json](../app.json)
(app name, icons, splash, plugins).

### React & React DOM (`react` 19.2.3, `react-dom` 19.2.3)

**What it is:** The UI library React Native itself is built on. `react-dom` is only needed for the
web target.

**Why:** Required by React Native/Expo — not an independent choice, but the version is kept in
sync with what Expo SDK 57 expects.

**Where:** Every component in `src/`.

### React Native (`react-native` 0.86.3)

**What it is:** The engine that renders React components as native iOS/Android views (and, via
`react-native-web`, as DOM elements on web) instead of a browser DOM.

**Why:** This is what makes "write once, run on iOS/Android/Web" possible at all.

**Where:** Every screen uses its primitives (`View`, `Text`, `Pressable`, `ScrollView`, `FlatList`,
`Image`, `Animated`, `Modal`, `Share`, etc.) — see any file under `src/screens/`.

### React Native Web (`react-native-web` ^0.21.2)

**What it is:** A compatibility layer that translates React Native's `View`/`Text`/`StyleSheet`
components into real DOM elements and CSS, so the exact same components render correctly in a
browser.

**Why:** This is the piece that turns a "mobile app" into something that can also be deployed as a
normal website with zero code changes — confirmed working with `npx expo export -p web`.

**Where:** Not imported directly anywhere in app code; it's wired in automatically by Expo's web
bundler whenever the app is run/exported for the `web` platform.

---

## 2. Navigation

### Expo Router (`expo-router` ~57.0.22)

**What it is:** File-based routing for React Native/Expo — every file under `src/app/` becomes a
route, the same mental model as Next.js's `pages`/`app` router. Also provides the tab bar
(`expo-router/js-tabs`), stack navigation, typed routes, and deep linking.

**Why:** Removes the need to hand-write a navigation tree (React Navigation's older imperative
config style); routes, screen params, and even the URLs on web are derived directly from the file
structure, and `typedRoutes` (enabled in [app.json](../app.json)) gives compile-time-checked
`router.push()` calls.

**Where:**
- `src/app/_layout.tsx` — root layout; decides Splash → Onboarding → Auth vs. signed-in app via
  `Stack.Protected` guards
- `src/app/(auth)/` — login/register routes
- `src/app/(app)/(tabs)/` — the 5 bottom tabs (Home, Shop, Cart, Card, Profile), tab bar defined in
  `src/navigation/BottomTabNavigator.tsx` using `Tabs` from `expo-router/js-tabs`
- `src/app/(app)/product/[id].tsx` — dynamic route for product detail pages
- `src/app/(app)/checkout.tsx`, `src/app/(app)/order-success.tsx` — pushed stack screens outside
  the tab bar
- Used throughout screens via `router.push()` / `router.navigate()` / `useLocalSearchParams()`
  (e.g. `src/screens/home/HomeScreen.tsx`, `src/hooks/useProductActions.ts`)

### `expo-linking` (~57.0.10)

**What it is:** Handles deep links / URL schemes (the app's custom `bootsuk://` scheme, set in
[app.json](../app.json)).

**Why:** Required by Expo Router under the hood for linking and web URL handling.

**Where:** Not called directly in app code — used internally by Expo Router.

### `react-native-screens` (~4.26.0)

**What it is:** Native screen container primitives that React Navigation/Expo Router build on top
of, for smoother native transitions and better memory behaviour than plain Views.

**Why:** A required peer dependency of Expo Router's stack/tab navigators.

**Where:** Not imported directly; used internally by `expo-router`.

---

## 3. Backend & data

### Supabase (`@supabase/supabase-js` ^2.117.1)

**What it is:** A hosted backend built on PostgreSQL, providing a database, authentication, and
auto-generated REST/RPC APIs — this project uses it instead of hand-building a custom server.

**Why:** For an app like this (catalog, cart, orders, auth, loyalty points), Supabase gives a real
relational database with row-level security, built-in email/password auth, and a JS client with no
backend code to write or host. Business rules that must never be trusted to the client (prices,
loyalty points, stock) are enforced with SQL functions and Row Level Security *inside* the
database — see [database.md](./database.md).

**Where:**
- `src/services/supabase.ts` — the single `createClient()` instance every service imports
- `src/services/catalog.ts`, `cart.ts`, `favourites.ts`, `profile.ts`, `orders.ts` — all data
  reads/writes go through these service modules, never directly from screens
- `src/context/SessionContext.tsx` — wraps `supabase.auth` to expose the current session app-wide
- Auth screens: `src/screens/auth/LoginScreen.tsx`, `src/screens/auth/RegisterScreen.tsx`

### `@react-native-async-storage/async-storage` (2.2.0)

**What it is:** A simple persistent key-value store (the React Native equivalent of browser
`localStorage`).

**Why:** Two things need to survive an app restart without hitting the network: the Supabase auth
session (so users stay logged in) and the "has completed onboarding" flag.

**Where:**
- `src/services/supabase.ts` — passed as the `auth.storage` option so Supabase persists the login
  session
- `src/services/onboarding.ts` — stores the one-time "onboarding complete" flag read by
  `src/screens/SplashScreen.tsx`

### `expo-constants` (~57.0.19)

**What it is:** Exposes app config (from `app.json`) and device/runtime info to JS at runtime.

**Why:** Standard Expo dependency, pulled in as part of the SDK; available for reading app version
or config values at runtime if needed.

**Where:** Not directly imported in app code today.

---

## 4. UI & visuals

### `expo-linear-gradient` (~57.0.2)

**What it is:** Renders smooth colour gradients (native `CAGradientLayer`/`LinearGradient` under
the hood, CSS gradients on web).

**Why:** Used for the premium/branded visual touches — gradient banners, buttons, and card
previews — that a flat `backgroundColor` can't achieve.

**Where:** e.g. `src/screens/cart/DeliveryProgressBanner.tsx`, `src/screens/cart/OrderSummary.tsx`
(checkout button), `src/screens/checkout/PaymentStep.tsx` (card preview).

### `expo-status-bar` (~57.0.1)

**What it is:** A cross-platform component to control the phone's status bar (light/dark icons)
per screen.

**Why:** Different screens have different background colours (e.g. dark Splash vs. light Home),
so the status bar style needs to switch per screen; this is Expo's standard cross-platform way to
do it instead of separate iOS/Android APIs.

**Where:** `<StatusBar style="dark" />` / `"light"` at the top of most screen components, e.g.
`src/screens/home/HomeScreen.tsx`, `src/screens/SplashScreen.tsx`.

### `react-native-safe-area-context` (~5.7.0)

**What it is:** Reports the safe-area insets (notches, home indicators, status bar height) per
device so content isn't drawn under them.

**Why:** Needed on every screen with a custom header, since Expo Router's default screens don't
automatically pad for notches/status bars the way a native nav bar would.

**Where:** `useSafeAreaInsets()` in headers like `src/screens/home/HomeHeader.tsx`,
`src/screens/cart/CartScreen.tsx`, and bottom sheets like `src/screens/shop/SortSheet.tsx`.

### Plain `StyleSheet` (no styling library)

**What it is:** React Native's built-in `StyleSheet.create()` API — no Tailwind, styled-components,
or NativeWind is used.

**Why:** Keeps styles colocated with each component, fully type-checked, and with zero extra
runtime/library — appropriate for a project this size where a utility-class or CSS-in-JS library
would add complexity without a clear win.

**Where:** Every component; brand colours are centralised in one file,
[src/constants/colors.ts](../src/constants/colors.ts) (Boots blue, gold, greys, etc.), so the
palette stays consistent without a design-system library.

---

## 5. Language & tooling

### TypeScript (`typescript` ~6.0.3, strict mode)

**What it is:** A typed superset of JavaScript.

**Why:** Strict typing catches mistakes (wrong prop shapes, null/undefined bugs, mismatched
Supabase query results) at compile time rather than at runtime in a shopping app where bugs cost
real money. `strict: true` is set in [tsconfig.json](../tsconfig.json).

**Where:** Every `.ts`/`.tsx` file in the project — there is no plain JavaScript source.

### ESLint (`eslint` ^9.39.5) + plugins

**What it is:** Static code linter. Configured in [eslint.config.js](../eslint.config.js) with:
- `@typescript-eslint` — TypeScript-aware lint rules
- `eslint-plugin-react` — React best practices (including the modern JSX runtime, no need to
  `import React`)
- `eslint-plugin-react-native` — catches React-Native-specific issues, notably unused
  `StyleSheet` styles and single-element style arrays
- `eslint-config-prettier` — turns off any ESLint formatting rules that would conflict with
  Prettier

**Why:** Enforces a single consistent code style and catches an entire class of bugs (unused
styles, wrong hook usage) automatically, run via `npm run lint` (`expo lint`).

**Where:** Project-wide; CI/local check before every change.

### Prettier (`prettier` ^3.9.9)

**What it is:** An opinionated code formatter.

**Why:** Removes all debate over formatting (semicolons, quotes, line width) so diffs stay focused
on actual logic changes.

**Where:** Project-wide, paired with `eslint-config-prettier` so ESLint and Prettier never fight
over the same rule.

---

## 6. Package manager

**npm** is used (see the `package-lock.json` in the repo root). Dependencies that touch native code
should always be installed with `npx expo install <package>` rather than plain `npm install`, so
Expo can resolve a version that's actually compatible with the current SDK (57) instead of
whatever npm's default resolver picks.

---

## 7. What is *not* used (and why that's a deliberate choice)

| Not used | Why it wasn't needed here |
|---|---|
| Redux / MobX / Zustand | The app's shared state (session, cart count, favourites, onboarding flag) is small and fits cleanly into a few React Context providers + custom hooks — see [architecture.md](./architecture.md#state-management) |
| React Navigation (manual setup) | Expo Router provides this out of the box, file-based, with less boilerplate |
| Tailwind / NativeWind / styled-components | Plain `StyleSheet` + one shared colour constants file was enough for the current design system size |
| A custom backend (Node/Express/etc.) | Supabase's database-level security (RLS) and Postgres functions cover every business rule needed so far, without hosting/maintaining a separate server |
| Redux-Saga / React Query / SWR | Data fetching is simple enough that a small shared `useFetch` hook (`src/hooks/useFetch.ts`) covers loading/error/refresh state without an extra dependency |
