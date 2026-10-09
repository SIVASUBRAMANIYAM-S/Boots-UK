/* global __dirname, setImmediate */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const test = require('node:test');

function load(file, imports) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require(name) {
      assert.ok(name in imports, `Unexpected import ${name}`);
      return imports[name];
    },
  });
  return module.exports;
}

const address = {
  fullName: 'Alex Customer', line1: '10 High Street', line2: '',
  city: 'London', postcode: 'SW1A 1AA', phone: '07123456789',
};
const row = (id, isDefault = false) => ({
  id, shipping_address: { ...address }, is_default: isDefault,
});
const plain = (value) => JSON.parse(JSON.stringify(value));

function service(responses = []) {
  const calls = [];
  const client = {
    from(table) {
      const call = { table, operations: [] };
      calls.push(call);
      const query = {};
      for (const name of ['select', 'eq', 'order', 'range']) {
        query[name] = (...args) => {
          call.operations.push([name, ...plain(args)]);
          return query;
        };
      }
      query.then = (resolve, reject) => Promise.resolve(responses.shift()).then(resolve, reject);
      return query;
    },
    rpc(name, args) {
      calls.push({ rpc: name, args: plain(args) });
      return Promise.resolve(responses.shift());
    },
  };
  const validation = load('src/utils/validation.ts', {});
  const api = load('src/services/deliveryAddresses.ts', {
    '@/services/supabase': { supabase: client },
    '@/utils/validation': validation,
  });
  return { api, calls };
}

test('loads every saved address with an explicit owner filter and stable default-first order', async () => {
  const { api, calls } = service([
    { data: Array.from({ length: 100 }, (_, i) => row(String(i), i === 0)), error: null },
    { data: [row('last')], error: null },
  ]);
  const result = await api.getDeliveryAddresses('owner');
  assert.equal(result.length, 101);
  assert.equal(result[0].isDefault, true);
  assert.deepEqual(plain(result[0].address), address);
  assert.equal(calls[0].table, 'delivery_addresses');
  assert.deepEqual(calls[0].operations, [
    ['select', 'id, shipping_address, is_default'], ['eq', 'user_id', 'owner'],
    ['order', 'is_default', { ascending: false }], ['order', 'created_at', { ascending: true }],
    ['order', 'id', { ascending: true }], ['range', 0, 99],
  ]);
  assert.deepEqual(calls[1].operations.at(-1), ['range', 100, 199]);
});

test('failed pages never return a partial or empty-success address list', async () => {
  const { api } = service([
    { data: Array.from({ length: 100 }, (_, i) => row(String(i))), error: null },
    { data: null, error: { code: '42P01', message: 'Missing schema' } },
    { data: null, error: null },
  ]);
  await assert.rejects(api.getDeliveryAddresses('owner'), (error) => error.code === '42P01');
  await assert.rejects(api.getDeliveryAddresses('owner'), /Missing saved addresses response/);
});

test('save normalises values, preserves optional fields and passes no caller-supplied owner', async () => {
  const { api, calls } = service([{ data: row('saved', true), error: null }]);
  const result = await api.saveDeliveryAddress({
    ...address, fullName: ' Alex Customer ', line1: ' 10 High Street ',
    postcode: 'sw1a1aa', phone: '(07123) 456-789',
  }, true);
  assert.equal(result.id, 'saved');
  assert.deepEqual(calls, [{
    rpc: 'save_delivery_address',
    args: { p_shipping_address: address, p_make_default: true },
  }]);
});

test('validates required values, UK postcode/phone and database field limits before saving', async () => {
  const { api, calls } = service();
  assert.deepEqual(plain(api.validateDeliveryAddress(address)), {});
  const errors = api.validateDeliveryAddress({
    ...address, fullName: ' ', line1: '', city: ' ', postcode: 'bad', phone: '123', line2: 'x'.repeat(161),
  });
  assert.deepEqual(Object.keys(errors).sort(), ['city', 'fullName', 'line1', 'line2', 'phone', 'postcode']);
  await assert.rejects(api.saveDeliveryAddress({ ...address, postcode: 'bad' }, false), /Invalid delivery address/);
  assert.equal(calls.length, 0);
});

test('default assignment is an ID-only RPC and schema failures are actionable', async () => {
  const { api, calls } = service([
    { data: row('saved', true), error: null },
    { data: null, error: { code: '42501', message: 'Denied' } },
  ]);
  assert.equal((await api.setDefaultDeliveryAddress('saved')).isDefault, true);
  assert.deepEqual(calls[0], { rpc: 'set_default_delivery_address', args: { p_address_id: 'saved' } });
  await assert.rejects(api.setDefaultDeliveryAddress('other'), (error) => error.code === '42501');
  for (const code of ['42P01', '42703', '42883', 'PGRST202', 'PGRST204', 'PGRST205']) {
    assert.match(api.deliveryAddressError({ code }), /database migration needs to be applied/);
  }
  assert.match(api.deliveryAddressError(new Error('Offline')), /Check your connection/);
});

test('rejects malformed saved snapshots instead of continuing with incomplete delivery details', async () => {
  const { api } = service([{ data: { ...row('id'), shipping_address: { fullName: 'Only name' } }, error: null }]);
  await assert.rejects(api.saveDeliveryAddress(address, false), /Invalid saved address response/);
});

function hookHarness(api) {
  const slots = [];
  let cursor = 0;
  let effects = [];
  let state;
  const equalDeps = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: initial };
      return [slots[index].value, (next) => {
        slots[index].value = typeof next === 'function' ? next(slots[index].value) : next;
      }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { current: initial };
      return slots[index];
    },
    useCallback(callback, deps) {
      const index = cursor++;
      if (!equalDeps(slots[index]?.deps, deps)) slots[index] = { value: callback, deps };
      return slots[index].value;
    },
    useEffect(effect, deps) {
      const index = cursor++;
      if (!equalDeps(slots[index]?.deps, deps)) {
        slots[index]?.cleanup?.();
        slots[index] = { deps };
        effects.push(() => { slots[index].cleanup = effect(); });
      }
    },
  };
  const { useDeliveryAddresses } = load('src/hooks/useDeliveryAddresses.ts', {
    react, '@/services/deliveryAddresses': api,
  });
  function render() {
    cursor = 0;
    state = useDeliveryAddresses('owner', 'Profile Name');
    const next = effects;
    effects = [];
    next.forEach((effect) => effect());
    return state;
  }
  return {
    render,
    async flush() { await new Promise((resolve) => setImmediate(resolve)); return render(); },
    unmount() { slots.forEach((slot) => slot?.cleanup?.()); },
  };
}

function hookApi(overrides = {}) {
  const { api } = service();
  return {
    ...api,
    getDeliveryAddresses: async () => [],
    saveDeliveryAddress: async (value, isDefault) => ({ id: 'new', address: api.normaliseDeliveryAddress(value), isDefault }),
    setDefaultDeliveryAddress: async (id) => ({ id, address: { ...address }, isDefault: true }),
    ...overrides,
  };
}

test('checkout selects default automatically; choosing an existing snapshot never inserts', async () => {
  let saves = 0;
  const first = { id: 'first', address: { ...address, line1: 'First address' }, isDefault: false };
  const preferred = { id: 'default', address: { ...address }, isDefault: true };
  const harness = hookHarness(hookApi({
    getDeliveryAddresses: async () => [first, preferred],
    saveDeliveryAddress: async () => { saves++; throw new Error('Must not insert'); },
  }));
  harness.render();
  let state = await harness.flush();
  assert.equal(state.selectedId, 'default');
  state.selectAddress(first);
  state = harness.render();
  assert.equal(await state.ensureSaved(), true);
  assert.equal(saves, 0);
  assert.equal(state.address.line1, 'First address');
  assert.notEqual(state.address, first.address, 'Shipping snapshot is a copy, not a mutable saved row');
});

test('new-address validation, double-tap locking and back/continue reuse prevent duplicate saves', async () => {
  let saves = 0;
  let completeSave;
  const api = hookApi({
    saveDeliveryAddress: () => {
      saves++;
      return new Promise((resolve) => { completeSave = resolve; });
    },
  });
  const harness = hookHarness(api);
  harness.render();
  let state = await harness.flush();
  assert.equal(state.isAdding, true);
  assert.equal(await state.ensureSaved(), false);
  assert.equal(saves, 0);
  state = harness.render();
  assert.ok(state.errors.line1);
  for (const [field, value] of Object.entries(address)) state.changeAddress(field, value);
  state = harness.render();
  const pending = state.ensureSaved();
  assert.equal(await state.ensureSaved(), false);
  assert.equal(saves, 1);
  state = harness.render();
  assert.equal(state.isSaving, true);
  state.addAddress();
  state.changeAddress('line1', 'Must not change while saving');
  completeSave({ id: 'new', address: { ...address }, isDefault: true });
  assert.equal(await pending, true);
  state = harness.render();
  assert.equal(state.isAdding, false);
  assert.equal(state.selectedId, 'new');
  assert.equal(state.address.line1, address.line1);
  assert.equal(await state.ensureSaved(), true);
  assert.equal(saves, 1);
});

test('load errors disable continue until retry; save failures retain fields for retry', async () => {
  let loads = 0;
  let saves = 0;
  const harness = hookHarness(hookApi({
    getDeliveryAddresses: async () => {
      if (++loads === 1) throw { code: 'PGRST205' };
      return [];
    },
    saveDeliveryAddress: async () => {
      if (++saves === 1) throw new Error('Offline');
      return { id: 'retry', address: { ...address }, isDefault: true };
    },
  }));
  harness.render();
  let state = await harness.flush();
  assert.match(state.loadError, /migration/);
  assert.equal(await state.ensureSaved(), false);
  await state.retry();
  state = harness.render();
  assert.equal(state.loadError, null);
  for (const [field, value] of Object.entries(address)) state.changeAddress(field, value);
  state = harness.render();
  assert.equal(await state.ensureSaved(), false);
  state = harness.render();
  assert.match(state.saveError, /Check your connection/);
  assert.equal(state.address.line1, address.line1);
  assert.equal(await state.ensureSaved(), true);
  state = harness.render();
  assert.equal(state.saveError, null);
  assert.equal(state.selectedId, 'retry');
});

test('adding another address defaults to opt-out; set-default updates badges without changing the order snapshot', async () => {
  const calls = [];
  const harness = hookHarness(hookApi({
    getDeliveryAddresses: async () => [
      { id: 'one', address: { ...address }, isDefault: true },
      { id: 'two', address: { ...address, line1: '20 High Street' }, isDefault: false },
    ],
    setDefaultDeliveryAddress: async (id) => {
      calls.push(id);
      return { id, address: { ...address, line1: '20 High Street' }, isDefault: true };
    },
  }));
  harness.render();
  let state = await harness.flush();
  await state.setDefault('two');
  state = harness.render();
  assert.deepEqual(calls, ['two']);
  assert.equal(state.selectedId, 'one');
  assert.equal(state.address.line1, '10 High Street');
  assert.equal(state.addresses.filter((item) => item.isDefault).length, 1);
  assert.equal(state.addresses.find((item) => item.isDefault).id, 'two');
  state.addAddress();
  state = harness.render();
  assert.equal(state.makeDefault, false);
  assert.equal(state.address.fullName, 'Profile Name');
  assert.equal(state.address.line1, '');
  state.changeMakeDefault(true);
  state = harness.render();
  assert.equal(state.makeDefault, true);
});

test('unmounting during save cannot continue checkout or publish stale results', async () => {
  let resolve;
  const harness = hookHarness(hookApi({
    saveDeliveryAddress: () => new Promise((done) => { resolve = done; }),
  }));
  harness.render();
  let state = await harness.flush();
  for (const [field, value] of Object.entries(address)) state.changeAddress(field, value);
  state = harness.render();
  const pending = state.ensureSaved();
  harness.unmount();
  resolve({ id: 'saved', address: { ...address }, isDefault: true });
  assert.equal(await pending, false);
});

test('migration restricts reads/writes, deduplicates addresses and serializes both default mutations', () => {
  const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/20261009000000_saved_delivery_addresses.sql'), 'utf8');
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /FOR SELECT TO authenticated USING \(\(SELECT auth\.uid\(\)\) = user_id\)/);
  assert.match(sql, /REVOKE ALL ON TABLE public\.delivery_addresses FROM PUBLIC, anon, authenticated/);
  assert.match(sql, /UNIQUE \(user_id, shipping_address\)/);
  assert.match(sql, /CREATE UNIQUE INDEX[\s\S]*ON public\.delivery_addresses\(user_id\) WHERE is_default/);
  assert.equal((sql.match(/pg_advisory_xact_lock/g) || []).length, 2);
  assert.equal((sql.match(/SECURITY DEFINER SET search_path = ''/g) || []).length, 2);
  assert.match(sql, /WHERE id = p_address_id AND user_id = v_user/);
  assert.match(sql, /ON CONFLICT \(user_id, shipping_address\) DO NOTHING/);
  assert.match(sql, /IF COALESCE\(p_make_default, false\) OR v_first THEN/);
  assert.equal((sql.match(/FROM PUBLIC, anon, authenticated;/g) || []).length, 3);
  assert.match(sql, /BEGIN;[\s\S]*COMMIT;/);
});

function checkoutHarness() {
  const slots = [];
  let cursor = 0;
  let saves = 0;
  const elements = {
    jsx: (type, props, key) => ({ type, props, key }),
    jsxs: (type, props, key) => ({ type, props, key }),
  };
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { value: initial };
      return [slots[index].value, (value) => {
        slots[index].value = typeof value === 'function' ? value(slots[index].value) : value;
      }];
    },
    useRef: () => ({ current: null }),
    useCallback: (fn) => fn,
    useMemo: (fn) => fn(),
    useEffect: () => {},
  };
  const native = {
    ...Object.fromEntries(['ActivityIndicator', 'KeyboardAvoidingView', 'Pressable', 'ScrollView', 'Text', 'View'].map((name) => [name, name])),
    StyleSheet: { create: (styles) => styles },
    Platform: { OS: 'web' },
    LayoutAnimation: { configureNext() {}, Presets: { easeInEaseOut: {} } },
  };
  const state = {
    address: { ...address },
    errors: {}, addresses: [{ id: 'saved', address: { ...address }, isDefault: true }],
    selectedId: 'saved', isAdding: false, isLoading: false, isSaving: false,
    loadError: null, saveError: null,
    async ensureSaved() { if (state.isAdding) saves++; state.isAdding = false; return true; },
    changeAddress() {},
  };
  const screen = load('src/screens/checkout/CheckoutScreen.tsx', {
    react, 'react/jsx-runtime': elements, 'react-native': native,
    'expo-status-bar': { StatusBar: 'StatusBar' },
    'expo-router': {
      router: { canGoBack: () => true, back() {}, navigate() {} },
      useFocusEffect() {}, useLocalSearchParams: () => ({}),
    },
    'react-native-safe-area-context': { useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) },
    '@/components/ErrorState': { ErrorState: 'ErrorState' },
    '@/components/IconButton': { IconButton: 'IconButton' },
    '@/components/Toast': { Toast: 'Toast', useToast: () => ({ showToast() {}, hideToast() {} }) },
    '@/constants/checkout': { getPromoDiscountRate: () => null },
    '@/constants/colors': { Colors: {} },
    '@/context/CartCountContext': { useCartCountContext: () => ({ setCartCount() {} }) },
    '@/context/SessionContext': { useSession: () => ({ session: { user: { id: 'owner' } } }) },
    '@/hooks/useFetch': { useFetch: () => ({ data: { items: [{}], profile: {} }, isLoading: false }) },
    '@/hooks/useDeliveryAddresses': { useDeliveryAddresses: () => state },
    '@/services/cart': { calculateTotal: () => ({ subtotal: 20 }) },
    '@/services/orders': {},
    '@/services/profile': {},
    '@/utils/orderUtils': {},
    '@/utils/payment': load('src/utils/payment.ts', {}),
    './DeliveryStep': { DeliveryStep: 'DeliveryStep' },
    './PaymentStep': { PaymentStep: 'PaymentStep' },
    './ReviewStep': { ReviewStep: 'ReviewStep' },
    './StepIndicator': { StepIndicator: 'StepIndicator', CHECKOUT_STEPS: ['Delivery', 'Payment', 'Confirm'] },
  });
  function render() {
    cursor = 0;
    const entry = screen.default();
    return entry.type(entry.props);
  }
  function find(tree, predicate) {
    if (!tree || typeof tree !== 'object') return null;
    if (Array.isArray(tree)) {
      for (const child of tree) { const result = find(child, predicate); if (result) return result; }
      return null;
    }
    if (predicate(tree)) return tree;
    return find(tree.props?.children, predicate);
  }
  return { render, find, state, get saves() { return saves; }, elements, react, native };
}

test('one Continue press transitions only Delivery → Payment with empty card; CTA identity changes across steps', async () => {
  const harness = checkoutHarness();
  let tree = harness.render();
  const continueButton = harness.find(tree, (node) => node.props?.accessibilityLabel === 'Continue to Payment →');
  assert.ok(continueButton);
  await continueButton.props.onPress();
  tree = harness.render();
  const payment = harness.find(tree, (node) => node.type === 'PaymentStep');
  assert.ok(payment, 'Single Continue must show Payment, never Confirm');
  assert.equal(payment.props.card.number, '');
  assert.equal(payment.props.card.cvv, '');
  assert.equal(harness.find(tree, (node) => node.type === 'ReviewStep'), null);
  assert.equal(harness.find(tree, (node) => node.type === 'StepIndicator').props.currentStep, 1);
  const reviewButton = harness.find(tree, (node) => node.props?.accessibilityLabel === 'Review Order →');
  assert.notEqual(continueButton.key, reviewButton.key, 'Do not recycle a delivery Pressable into the payment action');
  reviewButton.props.onPress();
  tree = harness.render();
  assert.ok(harness.find(tree, (node) => node.type === 'PaymentStep'), 'Empty card cannot skip payment validation');
  await continueButton.props.onPress();
  tree = harness.render();
  assert.equal(harness.find(tree, (node) => node.type === 'StepIndicator').props.currentStep, 1);
  assert.equal(harness.saves, 0, 'Existing saved address does not insert');
});

test('Save address button persists without navigating; subsequent Continue goes to Payment', async () => {
  const harness = checkoutHarness();
  harness.state.isAdding = true;
  const tree = harness.render();
  const deliveryProps = harness.find(tree, (node) => node.type === 'DeliveryStep').props;
  const { DeliveryStep } = load('src/screens/checkout/DeliveryStep.tsx', {
    react: harness.react, 'react/jsx-runtime': harness.elements, 'react-native': harness.native,
    '@/constants/checkout': {},
    '@/constants/colors': { Colors: {} },
    '@/utils/orderUtils': { formatUKPrice: (price) => String(price) },
    '@/utils/validation': load('src/utils/validation.ts', {}),
    './CheckoutField': { CheckoutCard: 'CheckoutCard', CheckoutField: 'CheckoutField', SectionTitle: 'SectionTitle' },
    './SavedAddressPicker': { SavedAddressPicker: 'SavedAddressPicker' },
  });
  const form = DeliveryStep(deliveryProps);
  const save = harness.find(form, (node) => node.type === 'Pressable' && node.props?.children?.props?.children === 'Save address');
  assert.ok(save);
  save.props.onPress();
  await Promise.resolve();
  let next = harness.render();
  assert.equal(harness.saves, 1);
  assert.equal(harness.find(next, (node) => node.type === 'StepIndicator').props.currentStep, 0);
  assert.ok(harness.find(next, (node) => node.type === 'DeliveryStep'));
  const continueButton = harness.find(next, (node) => node.props?.accessibilityLabel === 'Continue to Payment →');
  await continueButton.props.onPress();
  next = harness.render();
  assert.ok(harness.find(next, (node) => node.type === 'PaymentStep'));
  assert.equal(harness.saves, 1);
});

test('saved-address and delivery radios expose explicit checked semantics on web and native', () => {
  const harness = checkoutHarness();
  const { SavedAddressPicker } = load('src/screens/checkout/SavedAddressPicker.tsx', {
    'react/jsx-runtime': harness.elements,
    'react-native': harness.native,
    '@/constants/colors': { Colors: {} },
  });
  harness.state.addresses = [
    { id: 'old', address: { ...address }, isDefault: false },
    { id: 'new', address: { ...address, line1: '20 High Street' }, isDefault: true },
  ];
  harness.state.selectedId = 'new';
  let picker = SavedAddressPicker({ state: harness.state });
  const selected = harness.find(picker, (node) => node.props?.accessibilityRole === 'radio' && node.props?.['aria-checked'] === true);
  const other = harness.find(picker, (node) => node.props?.accessibilityRole === 'radio' && node.props?.['aria-checked'] === false);
  assert.match(selected.props.accessibilityLabel, /20 High Street.*Default address/);
  assert.equal(selected.props.accessibilityState.checked, true);
  assert.equal(other.props.accessibilityState.checked, false);
  harness.state.isAdding = true;
  picker = SavedAddressPicker({ state: harness.state });
  assert.equal(harness.find(picker, (node) => node.props?.accessibilityRole === 'radio' && node.props?.['aria-checked'] === true), null);

  const { DeliveryStep } = load('src/screens/checkout/DeliveryStep.tsx', {
    react: harness.react, 'react/jsx-runtime': harness.elements, 'react-native': harness.native,
    '@/constants/checkout': { FREE_DELIVERY_THRESHOLD: 25 },
    '@/constants/colors': { Colors: {} },
    '@/utils/orderUtils': { formatUKPrice: (price) => String(price) },
    '@/utils/validation': load('src/utils/validation.ts', {}),
    './CheckoutField': { CheckoutCard: 'CheckoutCard', CheckoutField: 'CheckoutField', SectionTitle: 'SectionTitle' },
    './SavedAddressPicker': { SavedAddressPicker: 'SavedAddressPicker' },
  });
  const form = DeliveryStep({
    savedAddresses: harness.state,
    address: { ...address }, errors: {}, onChangeAddress() {},
    deliveryMethod: 'express', onChangeDeliveryMethod() {}, subtotal: 20,
  });
  const expressComponent = harness.find(form, (node) => node.props?.title === 'Express Delivery');
  const standardComponent = harness.find(form, (node) => node.props?.title === 'Standard Delivery');
  const express = expressComponent.type(expressComponent.props);
  const standard = standardComponent.type(standardComponent.props);
  assert.equal(express.props['aria-checked'], true);
  assert.equal(express.props.accessibilityState.checked, true);
  assert.equal(standard.props['aria-checked'], false);
  assert.equal(standard.props.accessibilityState.checked, false);
  const checkbox = harness.find(form, (node) => node.props?.accessibilityRole === 'checkbox');
  assert.equal(checkbox.props['aria-checked'], harness.state.makeDefault);
});
