# Architecture

How the project is organised, how navigation works, and how state is managed. All paths are
relative to the project root.

---

## Folder structure

```
src/
├── app/                    # Expo Router routes — every file here IS a screen/URL
│   ├── _layout.tsx         # Root layout: Splash → Onboarding → Auth vs. signed-in app
│   ├── onboarding.tsx      # First-launch onboarding route
│   ├── (auth)/             # Route group: signed-out screens
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── (app)/              # Route group: signed-in screens
│       ├── _layout.tsx     # Wraps signed-in routes in CartCount/Favourites providers
│       ├── checkout.tsx
│       ├── order-success.tsx
│       ├── product/[id].tsx        # Dynamic route: /product/<any-id>
│       └── (tabs)/                 # Route group: the 5 bottom tabs
│           ├── _layout.tsx         # Tab bar definition (re-exports BottomTabNavigator)
│           ├── index.tsx           # Home tab
│           ├── shop.tsx
│           ├── cart.tsx
│           ├── card.tsx            # Advantage Card — currently a placeholder
│           └── profile.tsx
│
├── screens/                # Actual screen implementations (imported by src/app files)
│   ├── SplashScreen.tsx, OnboardingScreen.tsx, ProfileScreen.tsx, AdvantageCardScreen.tsx
│   ├── auth/                       # Login, Register
│   ├── home/                       # Home screen + its sub-sections (hero banner, categories…)
│   ├── shop/                       # Product list, filters, sort sheet
│   ├── product/                    # Product detail screen + its sub-parts
│   ├── cart/                       # Basket screen + its sub-parts
│   └── checkout/                   # Delivery → Payment → Review → Success steps
│
├── components/              # Small reusable UI pieces shared across screens
│   (PrimaryButton, ProductCard, Toast, Skeleton, ErrorState, IconButton, SearchBar, …)
│
├── context/                 # App-wide state, see "State management" below
│   (SessionContext, CartCountContext, FavouritesContext, OnboardingContext)
│
├── hooks/                   # Reusable logic shared by multiple screens
│   (useFetch, useAddToCart, useCartCount, useHomeData, useProductActions, …)
│
├── services/                 # ALL Supabase reads/writes live here — screens never call
│   (supabase, catalog, cart, favourites, profile, orders, onboarding)   supabase directly
│
├── constants/                # Fixed values shared across the app
│   (colors.ts — the Boots brand palette, catalog.ts, checkout.ts)
│
├── types/                    # Shared TypeScript types (Product, Category, UserProfile, …)
│
├── utils/                    # Pure helper functions (formatting, validation, dialogs, payment)
│
└── navigation/
    └── BottomTabNavigator.tsx  # The 5-tab bottom bar (Home/Shop/Cart/Card/Profile)
```

**Rule of thumb used throughout the codebase:** `src/app/*` files are thin — each one just
re-exports a screen from `src/screens/`. This keeps routing (URLs/params) separate from the actual
UI implementation, and means a screen's logic can be unit-tested or reused without pulling in the
router.

---

## Navigation flow (Expo Router)

```
src/app/_layout.tsx  (root)
│
├─ Splash shown while: session loading OR onboarding-flag loading OR < 2s elapsed
│
├─ Not signed in:
│   ├─ Onboarding NOT completed → /onboarding  (3 swipeable slides)
│   └─ Onboarding completed     → /(auth)/login  or  /(auth)/register
│
└─ Signed in → /(app)/...
    ├─ (tabs): Home · Shop · Cart · My Card · Profile   (bottom tab bar)
    ├─ /product/[id]          (pushed on top of tabs)
    ├─ /checkout              (pushed from Cart)
    └─ /order-success         (pushed after a successful checkout; back-swipe disabled)
```

This is implemented with `Stack.Protected` guards in
[src/app/_layout.tsx](../src/app/_layout.tsx) — Expo Router automatically redirects to whichever
guarded route group is currently allowed, so there's no manual `if (!session) navigate(...)`
imperative logic scattered around the app.

The 5-tab bottom bar is defined once in
[src/navigation/BottomTabNavigator.tsx](../src/navigation/BottomTabNavigator.tsx) using
`Tabs` from `expo-router/js-tabs`, and shows a live badge count on the Cart tab (see
[src/context/CartCountContext.tsx](../src/context/CartCountContext.tsx)).

---

## State management

No Redux/MobX/Zustand is used. State is split by how widely it needs to be shared:

| Layer | Used for | Example |
|---|---|---|
| **Local component state** (`useState`) | State only one screen cares about | Quantity selector on the product page |
| **Custom hooks** | Reusable *logic* (not shared *data*) — one hook instance per screen that uses it | `useFetch` (loading/error/refresh pattern), `useAddToCart`, `useProductActions` |
| **React Context** | State genuinely shared across multiple, unrelated screens | Session, cart item count, favourited product IDs, onboarding-complete flag |

### The four context providers

1. **`SessionContext`** ([src/context/SessionContext.tsx](../src/context/SessionContext.tsx)) —
   wraps `supabase.auth`, exposes `{ session, isLoading }` via `useSession()`. Mounted at the very
   top of the app (`src/app/_layout.tsx`) since almost everything depends on knowing if a user is
   signed in.

2. **`CartCountContext`**
   ([src/context/CartCountContext.tsx](../src/context/CartCountContext.tsx)) — one live basket
   item count shared by the tab bar badge *and* every "Add to Cart" button, so they never go out
   of sync. Mounted inside the signed-in route group
   ([src/app/(app)/_layout.tsx](../src/app/(app)/_layout.tsx)).

3. **`FavouritesContext`**
   ([src/context/FavouritesContext.tsx](../src/context/FavouritesContext.tsx)) — the set of
   favourited product IDs, with optimistic updates (the heart icon flips instantly, then rolls
   back if the save fails). Mounted alongside `CartCountContext`.

4. **`OnboardingContext`**
   ([src/context/OnboardingContext.tsx](../src/context/OnboardingContext.tsx)) — whether the
   user has completed the first-launch onboarding slides, persisted with AsyncStorage.

### Why not a data-fetching library (React Query/SWR)?

Data fetching needs here are simple: fetch on mount, support pull-to-refresh, show a loading
skeleton, and roll back on error. This is handled by one small shared hook,
[src/hooks/useFetch.ts](../src/hooks/useFetch.ts), used by every screen that loads data
(`useHomeData`, `useProductDetail`, etc.) instead of pulling in a full caching library for a
pattern that's only a few dozen lines of code.

---

## How a typical screen is built (example: Home)

```
src/app/(app)/(tabs)/index.tsx        →  re-exports src/screens/home/HomeScreen.tsx
src/screens/home/HomeScreen.tsx       →  orchestrates the screen:
                                          - reads session (useSession)
                                          - fetches data (useHomeData → services/catalog.ts, services/profile.ts)
                                          - reads/updates shared cart count (useCartCount)
                                          - composes sub-components below
   ├─ HomeHeader.tsx                  →  greeting, search bar, cart button
   ├─ HeroBanner.tsx                  →  promotional banner carousel
   ├─ CategoryList.tsx                →  horizontal category chips
   ├─ HomeSkeleton.tsx                →  shimmer placeholder shown while loading
   └─ AdvantageCardBanner.tsx         →  loyalty points teaser → links to /card
```

Every other screen (Shop, Cart, Checkout, Product Detail) follows the same shape: a screen file
under `src/screens/<name>/` that composes small, focused sub-components from the same folder, all
data access going through `src/services/*.ts`.

---

## Cross-platform behaviour (iOS / Android / Web)

Because this is Expo + React Native + `react-native-web`, the same components render on all three
targets, but a few things are platform-aware where the platforms genuinely differ:

- `Platform.OS === 'web'` checks in [src/utils/dialogs.ts](../src/utils/dialogs.ts) — native
  `Alert.alert()` doesn't exist as a blocking dialog on web, so `confirmAsync`/`showMessage` fall
  back to the browser's `confirm()`/`alert()`.
- `Platform.OS === 'web'` check in
  [src/context/SessionContext.tsx](../src/context/SessionContext.tsx) — Supabase's
  `startAutoRefresh()`/`stopAutoRefresh()` on app foreground/background only makes sense on native
  (there's no `AppState` concept on web).
- `KeyboardAvoidingView` with `behavior={Platform.OS === 'ios' ? 'padding' : undefined}` in
  [src/screens/cart/CartScreen.tsx](../src/screens/cart/CartScreen.tsx) — iOS and Android handle
  the keyboard covering content differently.

Everything else — layout, navigation, styling, data fetching — is identical code across all three
platforms.
