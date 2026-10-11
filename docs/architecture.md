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
│       ├── _layout.tsx     # Wraps signed-in routes in CartCount/Favourites/Loyalty providers
│       ├── checkout.tsx
│       ├── order-success.tsx
│       ├── product/[id].tsx        # Dynamic route: /product/<any-id>
│       └── (tabs)/                 # Route group: the 5 bottom tabs
│           ├── _layout.tsx         # Tab bar definition (re-exports BottomTabNavigator)
│           ├── index.tsx           # Home tab
│           ├── (shopping)/        # Shop tab's nested stack; URLs stay /shop and /wishlist
│           │   ├── _layout.tsx
│           │   ├── shop.tsx
│           │   └── wishlist.tsx
│           ├── cart.tsx
│           ├── card.tsx            # Advantage Card
│           └── profile.tsx
│
├── screens/                # Actual screen implementations (imported by src/app files)
│   ├── SplashScreen.tsx, OnboardingScreen.tsx, ProfileScreen.tsx, AdvantageCardScreen.tsx
│   ├── auth/                       # Login, Register
│   ├── home/                       # Home screen + its sub-sections (hero banner, categories…)
│   ├── shop/                       # Product list, filters, sort sheet
│   ├── product/                    # Product detail screen + its sub-parts
│   ├── cart/                       # Basket screen + its sub-parts
│   ├── profile/                    # Orders, personal details, preferences, animated stats
│   └── checkout/                   # Delivery → Payment → Review → Success steps
│
├── components/              # Small reusable UI pieces shared across screens
│   (PrimaryButton, ProductCard, Toast, Skeleton, ErrorState, IconButton, SearchBar, …)
│
├── context/                 # App-wide state, see "State management" below
│   (SessionContext, CartCountContext, FavouritesContext, OnboardingContext, LoyaltyContext)
│
├── hooks/                   # Reusable logic shared by multiple screens
│   (useFetch, useAddToCart, useCartCount, useHomeData, useProductActions, …)
│
├── services/                 # Database access modules; auth also used by screens/context
│   (supabase, catalog, cart, favourites, profile, profileService, orders, preferences, …)
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

### Context providers

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

5. **`LoyaltyContext`** ([src/context/LoyaltyContext.tsx](../src/context/LoyaltyContext.tsx)) —
   shares points across Profile, Advantage Card, and the redeemable-points tab badge. Profile loads
   and successful profile updates publish the current total. In-flight requests are invalidated
   when the signed-in account changes or the provider unmounts.

### Profile and order history

The [profile route](../src/app/(app)/(tabs)/profile.tsx) stays a thin re-export of
[ProfileScreen](../src/screens/ProfileScreen.tsx). Its focused components live in
[src/screens/profile/](../src/screens/profile/).

- [useProfileData](../src/hooks/useProfileData.ts) fetches the profile, statistics, and latest three
  orders in parallel on focus, with pull-to-refresh and stale-request protection. View All queries
  all orders in pages of 100 to avoid the PostgREST response cap. Failed refreshes display an
  explicit retry banner while retaining existing data.
- [profileService](../src/services/profileService.ts) reads owner-scoped users/orders/favourites
  through Supabase RLS. Profile updates contain only `full_name` and `phone`; the email remains
  the auth email. Nested `order_items(count)` supplies the number of order line items.
- [OrderDetailSheet](../src/components/OrderDetailSheet.tsx) loads items/products and stored delivery
  address/totals on demand. The handle supports downward swipe dismissal; backdrop and close button
  also dismiss. Points earned come from the server's `points_earned` field, not total including
  delivery. Only `created_at` is available for the timeline: other step dates are not fabricated.
  Checkout is a demo, so a confirmed order is not evidence of a real payment-gateway transaction.
- [preferences](../src/services/preferences.ts) persists user-scoped device preferences in
  AsyncStorage. Writes are serialized so sign-out cleanup cannot be overtaken by an in-flight save.
  Sign out removes only this user's profile preferences, not onboarding or other storage keys.
  Failed storage operations are surfaced. These toggles do not request OS notification permission
  or subscribe to email/birthday campaigns. Dark Mode, photo editing, legal links, and support
  actions explicitly show Coming soon.

Statistics animate on load (respecting reduced motion), and edit mode uses native LayoutAnimation.
All Profile content uses a mixed-content ScrollView with tab-bar clearance, skeletons, retry
states, and accessible input/button labels.

Run the dependency-free service/helper regression tests with
`node --test tests/profile-services.test.cjs`. They cover query scope, pagination, stored totals,
editable columns, storage errors, and sign-out/write ordering using mocked Supabase/AsyncStorage.
They do not replace native-device or live-backend validation.

### Wishlist and shared search

[SearchWishlistBar](../src/components/SearchWishlistBar.tsx) is shared by Home, Shop, and Product
Detail. It now renders a full-width search field only. The wishlist heart lives in the top header
beside Cart, without a separate raised tile. [WishlistButton](../src/components/WishlistButton.tsx)
and [CartButton](../src/components/CartButton.tsx) share
[CountIconButton](../src/components/CountIconButton.tsx) for consistent size, pressed state, and
red count badges (hidden at zero, capped visually at `99+`). The heart uses Boots blue.
Shop filters while typing. Home/Product Detail
submit searches to Shop and clear prior category parameters, avoiding navigation mid-typing.

The [wishlist route](../src/app/(app)/(tabs)/(shopping)/wishlist.tsx) re-exports
[WishlistScreen](../src/screens/WishlistScreen.tsx). It uses a two-column FlatList and the shared
ProductCard with a wishlist presentation (category and earned points). Adding to the basket keeps
the favourite saved; unavailable/out-of-stock products cannot be added. Deleted products remain
removable.

Shop and Wishlist share a [nested stack](../src/app/(app)/(tabs)/(shopping)/_layout.tsx) inside the
Shop tab, so My Wishlist keeps the actual Home, Shop, Cart, My Card, and Profile bottom navigation
visible without duplicating it or adding a sixth tab. Public URLs remain `/shop` and `/wishlist`.
The stack anchors to Shop; wishlist navigation uses `withAnchor` so Back works even when entered
from Home or Product Detail. Leaving the Shop tab pops its nested stack back to Shop.

[FavouritesContext](../src/context/FavouritesContext.tsx) is the single wishlist/count source of
truth; no duplicate count provider is needed. Removal and confirmed Clear All are optimistic,
with rollback and explicit failure messages. Focus/pull refresh reloads joined product data and
shared favourites. Reads paginate to avoid truncated badges/lists; all writes are scoped to the
current user through [favourites services](../src/services/favourites.ts) and Supabase RLS.
Failed initial count reads show an unavailable-count indicator rather than a misleading zero.
Run `node --test tests/wishlist-services.test.cjs` for wishlist query scope, pagination, removal,
duplicate-safe saving, and error propagation tests. Browser interaction checks use fixture data
to avoid modifying real saved products or baskets; native gesture/animation checks still require
an iOS/Android device.

### Basket quantities and compact summary

[CartCountContext](../src/context/CartCountContext.tsx) now shares per-product quantities and
pending writes as well as the basket total. [BasketQuantityControl](../src/components/BasketQuantityControl.tsx)
shows Add to Cart at zero and a compact Boots-blue `− / quantity / +` control after adding. It is
used by product cards on Home, Shop, and Wishlist and by Product Detail's fixed bottom action.
Decreasing from one removes that product; increasing respects stock and the 99-item UI ceiling.
Writes lock per product, update optimistically, and reconcile on failure. Failed loads expose
Retry instead of pretending the basket is empty. Basket edits publish back into the same context,
so returning to a product does not lose its added quantity. Home no longer shows time-of-day greetings.

[CartAnimationProvider](../src/context/CartAnimationContext.tsx) animates a product thumbnail in a
jumping arc toward the active header cart (or the Cart tab on Wishlist) after a successful add
or quantity increase. Failed writes and decreases never animate. The overlay cannot intercept
touches and respects reduced-motion preferences; an offscreen product image uses the visible
quantity control as its starting point.

[OrderSummary](../src/screens/cart/OrderSummary.tsx) starts collapsed. Tap its header or swipe up
on the handle to reveal subtotal, delivery, discount, total, and promo entry; swipe down or tap to
close. The detail area scrolls on short screens. Proceed to Checkout stays anchored underneath,
with writes/refresh failures blocking checkout until resolved. Quantity writes are awaited, not
left in a debounce timer when navigating away.

The signed-in [app layout](../src/app/(app)/_layout.tsx) registers `(tabs)` before Checkout and
anchors there. This fixes auth guards choosing Checkout as the first available signed-in screen.
Fresh sign-in goes to Home; an already authenticated deep link can still open Checkout intentionally.

### Saved delivery addresses

Checkout loads [delivery addresses](../src/services/deliveryAddresses.ts) scoped to the signed-in
customer. A default address is selected automatically; users can choose another saved address,
add a new address, and optionally make it the default. The first address becomes default.
Save Address stays on Delivery; Continue to Payment saves a validated new address before moving
forward, while existing selections do not insert again. Requests are guarded against duplicate
taps and stale-account/unmounted results. Address load/save errors retain the customer's form and
offer retry; they never silently bypass persistence.

[useDeliveryAddresses](../src/hooks/useDeliveryAddresses.ts) and
[SavedAddressPicker](../src/screens/checkout/SavedAddressPicker.tsx) implement this flow. The selected
shipping data is still snapshotted into the order, so future default-address changes do not alter
historical orders.

**Database deployment required:** apply
[20261009000000_saved_delivery_addresses.sql](../supabase/migrations/20261009000000_saved_delivery_addresses.sql)
in the correct Supabase project's SQL Editor before using saved addresses. This migration has not
been applied by the coding session. The app explicitly reports missing schema rather than
presenting an empty-success address list. See [database.md](./database.md#saved-delivery-address-setup).

Run `node --test tests/*.test.cjs` for service/component regression checks. Browser checks use
mocked addresses and baskets; actual Supabase migration/RLS and native-device validation remain
separate deployment checks.

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
