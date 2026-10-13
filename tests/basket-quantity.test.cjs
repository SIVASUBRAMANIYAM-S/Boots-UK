/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const { setImmediate } = require('node:timers');
const ts = require('typescript');

function load(file, dependencies) {
  const source = path.join(__dirname, '..', file);
  const code = ts.transpileModule(fs.readFileSync(source, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require(name) {
      if (!(name in dependencies))
        throw new Error(`Unexpected import: ${name}`);
      return dependencies[name];
    },
  });
  return module.exports;
}

function cart(responses = []) {
  const calls = [];
  const supabase = {
    from(table) {
      const operations = [];
      calls.push({ table, operations });
      const query = {};
      for (const method of [
        'select',
        'eq',
        'order',
        'range',
        'delete',
        'update',
        'insert',
        'in',
      ]) {
        query[method] = (...args) => {
          operations.push([method, ...JSON.parse(JSON.stringify(args))]);
          return query;
        };
      }
      query.overrideTypes = () => Promise.resolve(responses.shift());
      query.then = (resolve, reject) =>
        Promise.resolve(responses.shift()).then(resolve, reject);
      return query;
    },
  };
  const api = load('src/services/cart.ts', {
    '@/services/supabase': { supabase },
    '@/constants/checkout': {
      EXPRESS_DELIVERY_FEE: 4.99,
      FREE_DELIVERY_THRESHOLD: 25,
      STANDARD_DELIVERY_FEE: 2.99,
      getPromoDiscountRate: (code) => (code === 'BOOTS10' ? 0.1 : null),
    },
  });
  return { api, calls };
}

test('quantity reads are owner-scoped, aggregate duplicate lines and paginate', async () => {
  const first = Array.from({ length: 100 }, () => ({
    product_id: 'cream',
    quantity: 1,
  }));
  const { api, calls } = cart([
    { data: first, error: null },
    { data: [{ product_id: 'vitamins', quantity: 3 }], error: null },
  ]);
  const quantities = await api.getCartQuantities('owner');
  assert.equal(quantities.cream, 100);
  assert.equal(quantities.vitamins, 3);
  assert.deepEqual(
    calls[0].operations.find(([method]) => method === 'eq'),
    ['eq', 'user_id', 'owner'],
  );
  assert.deepEqual(
    calls.map((call) => call.operations.find(([method]) => method === 'range')),
    [
      ['range', 0, 99],
      ['range', 100, 199],
    ],
  );
});

test('setting zero removes the product rather than leaving a zero-quantity line', async () => {
  const { api, calls } = cart([{ error: null }]);
  await api.setProductCartQuantity('owner', 'cream', 0);
  assert.deepEqual(calls[0].operations, [
    ['delete'],
    ['eq', 'user_id', 'owner'],
    ['eq', 'product_id', 'cream'],
  ]);
});

test('new products insert once; existing products update their exact quantity', async () => {
  const { api, calls } = cart([
    { data: [], error: null },
    { error: null },
    { data: [{ id: 'line' }], error: null },
    { error: null },
  ]);
  await api.setProductCartQuantity('owner', 'cream', 1);
  await api.setProductCartQuantity('owner', 'cream', 2);
  assert.deepEqual(calls[1].operations, [
    ['insert', { user_id: 'owner', product_id: 'cream', quantity: 1 }],
  ]);
  assert.deepEqual(calls[3].operations, [
    ['update', { quantity: 2 }],
    ['eq', 'user_id', 'owner'],
    ['eq', 'id', 'line'],
  ]);
});

test('duplicate lines are consolidated and failures propagate for UI reconciliation', async () => {
  const { api, calls } = cart([
    { data: [{ id: 'first' }, { id: 'duplicate' }], error: null },
    { error: null },
    { error: new Error('Delete failed') },
  ]);
  await assert.rejects(
    api.setProductCartQuantity('owner', 'cream', 4),
    /Delete failed/,
  );
  assert.deepEqual(calls[2].operations, [
    ['delete'],
    ['eq', 'user_id', 'owner'],
    ['in', 'id', ['duplicate']],
  ]);
});

test('invalid quantities never reach the database', async () => {
  const { api, calls } = cart();
  for (const value of [-1, 0.5, 100, NaN]) {
    await assert.rejects(
      api.setProductCartQuantity('owner', 'cream', value),
      /Invalid basket quantity/,
    );
  }
  assert.equal(calls.length, 0);
});

test('basket totals remain correct with discount and delivery', () => {
  const { api } = cart();
  const totals = api.calculateTotal(
    [{ quantity: 2, product: { price: 12.5 } }],
    { promoCode: 'BOOTS10' },
  );
  assert.equal(totals.itemCount, 2);
  assert.equal(totals.subtotal, 25);
  assert.equal(totals.delivery, 0);
  assert.equal(totals.discount, 2.5);
  assert.equal(totals.total, 22.5);
});

function control(context, flyToCart = () => {}) {
  const element = (type, props) => ({ type, props });
  return load('src/components/BasketQuantityControl.tsx', {
    react: {
      useState: (initial) => [initial, () => {}],
      useRef: (initial) => ({ current: initial }),
    },
    'react/jsx-runtime': { jsx: element, jsxs: element },
    'react-native': {
      ActivityIndicator: 'ActivityIndicator',
      Pressable: 'Pressable',
      Text: 'Text',
      View: 'View',
      StyleSheet: { create: (styles) => styles },
    },
    '@/constants/colors': { Colors: { primary: '#005eb8', white: '#ffffff' } },
    '@/context/CartCountContext': { useCartCountContext: () => context },
    '@/context/CartAnimationContext': {
      useCartAnimation: () => ({ flyToCart }),
    },
  }).BasketQuantityControl;
}

test('added products show their shared quantity and +/- actions', async () => {
  const changes = [];
  const Control = control({
    quantities: { cream: 2 },
    pendingProductIds: new Set(),
    cartLoading: false,
    cartError: false,
    changeProductQuantity: async (id, value) => {
      changes.push([id, value]);
    },
  });
  const node = Control({
    productId: 'cream',
    productName: 'Cream',
    stockQuantity: 3,
    active: true,
    onAdd: () => {},
  });
  const stepper = node.props.children[0];
  assert.equal(stepper.props.children[1].props.children.props.children, 2);
  assert.equal(stepper.props.style.backgroundColor, '#005eb8');
  assert.equal(
    stepper.props.children[1].props.children.props.style.color,
    '#ffffff',
  );
  assert.equal(JSON.stringify(stepper).includes('in basket'), false);
  assert.equal(
    stepper.props.children[0].props.accessibilityLabel,
    'Decrease Cream quantity',
  );
  await stepper.props.children[0].props.onPress();
  await stepper.props.children[2].props.onPress();
  assert.deepEqual(changes, [
    ['cream', 1],
    ['cream', 3],
  ]);
});

test('product jump runs only after a successful add or increase, never on failure or decrease', async () => {
  const flights = [];
  const base = {
    quantities: {},
    pendingProductIds: new Set(),
    cartLoading: false,
    cartError: false,
  };
  const props = {
    productId: 'cream',
    productName: 'Cream',
    stockQuantity: 10,
    active: true,
    imageUrl: 'https://example.test/cream.jpg',
    imageRef: { current: 'image-view' },
    onAdd: async () => true,
  };
  const fly = (...args) => flights.push(args);
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  control(base, fly)(props).props.children[0].props.onPress();
  await flush();
  assert.equal(flights.length, 1);
  assert.equal(flights[0][0], 'image-view');
  assert.equal(flights[0][1].imageUrl, props.imageUrl);
  control(
    base,
    fly,
  )({ ...props, onAdd: async () => false }).props.children[0].props.onPress();
  await flush();
  assert.equal(flights.length, 1);
  const added = control(
    {
      ...base,
      quantities: { cream: 2 },
      changeProductQuantity: async () => {},
    },
    fly,
  )(props).props.children[0];
  added.props.children[2].props.onPress();
  await flush();
  assert.equal(flights.length, 2);
  added.props.children[0].props.onPress();
  await flush();
  assert.equal(flights.length, 2);
  control(
    {
      ...base,
      quantities: { cream: 2 },
      changeProductQuantity: async () => {
        throw new Error('Denied');
      },
    },
    fly,
  )(props).props.children[0].props.children[2].props.onPress();
  await flush();
  assert.equal(flights.length, 2);
});

test('quantity one can remove, stock cap disables plus, and loading blocks double adds', () => {
  const base = {
    quantities: { cream: 1 },
    pendingProductIds: new Set(),
    cartLoading: false,
    cartError: false,
  };
  const props = {
    productId: 'cream',
    productName: 'Cream',
    stockQuantity: 1,
    active: true,
    onAdd: () => {},
  };
  const node = control(base)(props);
  assert.equal(node.props.children[0].props.children[0].props.disabled, false);
  assert.equal(node.props.children[0].props.children[2].props.disabled, true);
  const loading = control({ ...base, quantities: {}, cartLoading: true })(
    props,
  );
  assert.equal(loading.props.children[0].props.disabled, true);
  const pending = control({
    ...base,
    quantities: {},
    pendingProductIds: new Set(['cream']),
  })(props);
  assert.equal(pending.props.children[0].props.disabled, true);
});

test('adding one product does not load or disable other product controls', () => {
  const context = {
    quantities: { cream: 1 },
    pendingProductIds: new Set(['cream']),
    cartLoading: false,
    cartError: false,
  };
  const props = {
    productId: 'vitamins',
    productName: 'Vitamins',
    stockQuantity: 10,
    active: true,
    onAdd: async () => true,
  };
  const other = control(context)(props).props.children[0];
  assert.equal(other.props.disabled, false);
  assert.equal(other.props.children.type, 'Text');
  assert.equal(other.props.children.props.children, 'Add to Cart');
  const updating = control(context)({ ...props, productId: 'cream' });
  assert.equal(
    updating.props.children[0].props.children[0].props.disabled,
    true,
  );
  assert.equal(
    updating.props.children[0].props.children[1].props.children.type,
    'ActivityIndicator',
  );
});

test('successful quantity writes reconcile in background without global loading', async () => {
  const slots = [];
  let cursor = 0;
  const effects = [];
  let reads = 0;
  let resolveReconcile;
  const reconciliation = new Promise((resolve) => {
    resolveReconcile = resolve;
  });
  let resolveLatest;
  const latest = new Promise((resolve) => {
    resolveLatest = resolve;
  });
  let failWrite = false;
  const context = {};
  const React = {
    createContext: () => context,
    useContext: () => context.value,
    useState: (initial) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [
        slots[index],
        (value) => {
          slots[index] = value;
        },
      ];
    },
    useRef: (initial) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useCallback: (callback) => callback,
    useMemo: (callback) => callback(),
    useEffect: (callback) => {
      effects.push(callback);
    },
  };
  const api = load('src/context/CartCountContext.tsx', {
    react: React,
    'react/jsx-runtime': {
      jsx: (type, props) => {
        context.value = props.value;
        return { type, props };
      },
    },
    '@/context/SessionContext': {
      useSession: () => ({ session: { user: { id: 'owner' } } }),
    },
    '@/services/cart': {
      getCartQuantities: async () => {
        reads++;
        if (reads === 1) return {};
        if (reads === 2) return reconciliation;
        if (reads === 3) return latest;
        throw new Error('Refresh failed');
      },
      setProductCartQuantity: async () => {
        if (failWrite) throw new Error('Write failed');
      },
    },
  });
  const render = () => {
    cursor = 0;
    api.CartCountProvider({ children: null });
  };
  const flush = () => new Promise((resolve) => setImmediate(resolve));
  render();
  effects[0]();
  await flush();
  render();
  assert.equal(context.value.cartLoading, false);
  await context.value.addProduct('cream', 1);
  render();
  assert.equal(reads, 2);
  assert.equal(context.value.cartLoading, false);
  assert.equal(context.value.quantities.cream, 1);
  // A second product remains usable while the first reconciliation is pending.
  await context.value.addProduct('vitamins', 1);
  render();
  assert.equal(context.value.cartLoading, false);
  resolveReconcile({ cream: 1 });
  await flush();
  render();
  assert.equal(context.value.quantities.vitamins, 1);
  resolveLatest({ cream: 1, vitamins: 1 });
  await flush();
  render();
  assert.equal(context.value.cartCount, 2);
  assert.equal(context.value.cartLoading, false);
  failWrite = true;
  await assert.rejects(context.value.addProduct('cream', 1), /Write failed/);
  await flush();
  render();
  assert.equal(context.value.quantities.cream, 1);
  assert.equal(context.value.cartError, true);
  assert.equal(context.value.cartLoading, false);
});

test('failed basket loads show retry instead of pretending a product is not added', () => {
  const node = control({
    quantities: {},
    pendingProductIds: new Set(),
    cartError: true,
  })({
    productId: 'cream',
    productName: 'Cream',
    stockQuantity: 1,
    active: true,
    onAdd: () => {},
  });

  assert.equal(
    node.props.children[0].props.children.props.children,
    'Basket unavailable · Retry',
  );
});

test('Cart tab remains an animation destination on Wishlist; headers register only while focused', () => {
  const registrations = [];
  let effect;
  let focusedEffect;
  const targetView = {};
  const api = load('src/context/CartAnimationContext.tsx', {
    react: {
      createContext: () => ({}),
      useContext: () => ({
        registerTarget: (target) => {
          registrations.push(target);
          return () => registrations.splice(registrations.indexOf(target), 1);
        },
      }),
      useRef: () => ({ current: targetView }),
      useCallback: (callback) => callback,
      useEffect: (callback) => {
        effect = callback;
      },
    },
    'react/jsx-runtime': {
      jsx: (type, props) => ({ type, props }),
      jsxs: (type, props) => ({ type, props }),
    },
    'react-native': {
      View: 'View',
      StyleSheet: { create: (styles) => styles },
    },
    'expo-router': {
      useFocusEffect: (callback) => {
        focusedEffect = callback;
      },
    },
    '@/constants/colors': { Colors: {} },
  });
  api.CartAnimationTarget({ children: 'cart', header: false });
  const unmountTab = effect();
  assert.equal(registrations.length, 1);
  assert.equal(registrations[0].priority, 0);
  assert.equal(focusedEffect(), undefined);
  api.CartAnimationTarget({ children: 'cart', header: true });
  assert.equal(effect(), undefined);
  const blurHeader = focusedEffect();
  assert.equal(registrations.length, 2);
  assert.equal(registrations[1].priority, 1);
  blurHeader();
  assert.equal(registrations.length, 1);
  unmountTab();
  assert.equal(registrations.length, 0);
});
