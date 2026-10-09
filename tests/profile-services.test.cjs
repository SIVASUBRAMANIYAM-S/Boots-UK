/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');

function load(relativePath, dependencies = {}) {
  const file = path.join(__dirname, '..', relativePath);
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: false,
    },
  }).outputText;
  const module = { exports: {} };
  const sandbox = {
    module,
    exports: module.exports,
    require: (name) => {
      if (!(name in dependencies))
        throw new Error(`Unexpected import: ${name}`);
      return dependencies[name];
    },
  };
  vm.runInNewContext(code, sandbox, { filename: file });
  return module.exports;
}

function database(responses) {
  const calls = [];
  let request = 0;
  return {
    calls,
    client: {
      from(table) {
        const call = { table, operations: [] };
        calls.push(call);
        const query = {};
        for (const method of [
          'select',
          'eq',
          'single',
          'limit',
          'order',
          'range',
          'update',
        ]) {
          query[method] = (...args) => {
            call.operations.push([method, ...args]);
            return query;
          };
        }
        const response = () => Promise.resolve(responses[request++]);
        query.overrideTypes = response;
        query.then = (resolve, reject) => response().then(resolve, reject);
        return query;
      },
    },
  };
}

function service(db) {
  return load('src/services/profileService.ts', {
    '@/services/supabase': { supabase: db.client },
  });
}

test('profile helpers: initials, stored order number, legacy reference, status and UK date', () => {
  const utils = load('src/utils/profileUtils.ts');
  assert.equal(utils.getInitials(' Jane Mary Smith '), 'JS');
  assert.equal(utils.getInitials('Boots'), 'B');
  assert.equal(utils.getInitials(null), '?');
  assert.equal(
    utils.orderReference({ id: 'abcdef123', order_number: 'BOOTS123456' }),
    'BOOTS123456',
  );
  assert.equal(
    utils.orderReference({ id: 'abcdef123', order_number: null }),
    'BOOTSABCDEF',
  );
  assert.equal(utils.orderStatus('cancelled').label, 'Cancelled');
  assert.equal(utils.orderStatus(null).label, 'Unknown');
  assert.equal(utils.formatOrderDate('2026-01-12T12:00:00Z'), '12 Jan 2026');
});

test('optional phone numbers require actual digits, not just punctuation', () => {
  const { isValidProfilePhone } = load('src/utils/profileUtils.ts');
  assert.equal(isValidProfilePhone(''), true);
  assert.equal(isValidProfilePhone('+44 7123 456789'), true);
  assert.equal(isValidProfilePhone('07123456789'), true);
  assert.equal(isValidProfilePhone('-------'), false);
  assert.equal(isValidProfilePhone('123456'), false);
  assert.equal(isValidProfilePhone('phone1234567'), false);
  assert.equal(isValidProfilePhone('1234567890123456'), false);
});

test('profile updates send only editable fields and propagate Supabase failures', async () => {
  const db = database([
    { data: { id: 'user' }, error: null },
    { data: null, error: new Error('denied') },
  ]);
  const api = service(db);
  await api.updateUserProfile('user', { full_name: 'Jane Smith', phone: null });
  assert.deepEqual(
    db.calls[0].operations.find(([name]) => name === 'update'),
    ['update', { full_name: 'Jane Smith', phone: null }],
  );
  assert.deepEqual(
    db.calls[0].operations.find(([name]) => name === 'eq'),
    ['eq', 'id', 'user'],
  );
  await assert.rejects(api.getUserProfile('user'), /denied/);
});

test('latest orders are owner-scoped, limited, and preserve stored points', async () => {
  const db = database([
    {
      data: [{ id: 'order', points_earned: 72, order_items: [{ count: 2 }] }],
      error: null,
    },
  ]);
  const orders = await service(db).getOrderHistory('user', 3);
  assert.equal(orders[0].item_count, 2);
  assert.equal(orders[0].points_earned, 72);
  assert.deepEqual(
    db.calls[0].operations.find(([name]) => name === 'eq'),
    ['eq', 'user_id', 'user'],
  );
  assert.deepEqual(
    db.calls[0].operations.find(([name]) => name === 'limit'),
    ['limit', 3],
  );
});

test('View All paginates beyond a response cap and propagates a later-page failure', async () => {
  const first = Array.from({ length: 100 }, (_, i) => ({
    id: String(i),
    order_items: [{ count: 1 }],
  }));
  const db = database([
    { data: first, error: null },
    { data: [{ id: 'last', order_items: [] }], error: null },
  ]);
  const orders = await service(db).getOrderHistory('user');
  assert.equal(orders.length, 101);
  assert.equal(orders[100].item_count, 0);
  assert.deepEqual(
    db.calls[0].operations.filter(([name]) => name === 'range'),
    [
      ['range', 0, 99],
      ['range', 100, 199],
    ],
  );
  const failing = database([
    { data: first, error: null },
    { data: null, error: new Error('network') },
  ]);
  await assert.rejects(service(failing).getOrderHistory('user'), /network/);
});

test('stats request orders, favourites and points together; a count failure rejects', async () => {
  const db = database([
    { data: { loyalty_points: 600 }, error: null },
    { count: 8, error: null },
    { count: 3, error: null },
  ]);
  const stats = await service(db).getProfileStats('user');
  assert.equal(db.calls.length, 3);
  assert.equal(stats.orders, 8);
  assert.equal(stats.favourites, 3);
  assert.equal(stats.points, 600);
  const failing = database([
    { data: { loyalty_points: 0 }, error: null },
    { count: null, error: new Error('offline') },
    { count: 0, error: null },
  ]);
  await assert.rejects(service(failing).getProfileStats('user'), /offline/);
});

test('missing exact counts are not silently shown as zero', async () => {
  const db = database([
    { data: { loyalty_points: 154 }, error: null },
    { count: null, error: null },
    { count: 3, error: null },
  ]);
  await assert.rejects(
    service(db).getProfileStats('user'),
    /counts are unavailable/,
  );
});

test('order details retain stored totals, address and historical item prices', async () => {
  const expected = {
    id: 'order',
    total_amount: 20.99,
    subtotal: 20,
    delivery_fee: 2.99,
    discount_amount: 2,
    shipping_address: { fullName: 'Jane' },
    items: [{ id: 'item', quantity: 2, price: 10, product: null }],
  };
  const db = database([{ data: expected, error: null }]);
  const details = await service(db).getOrderDetails('order');
  assert.equal(details.item_count, 1);
  assert.equal(details.total_amount, 20.99);
  assert.equal(details.items[0].price, 10);
  assert.equal(details.shipping_address.fullName, 'Jane');
  assert.deepEqual(
    db.calls[0].operations.find(([name]) => name === 'eq'),
    ['eq', 'id', 'order'],
  );
});

test('preferences are user-scoped and invalid persisted data is rejected', async () => {
  const store = new Map();
  const storage = {
    getItem: async (key) => store.get(key) ?? null,
    setItem: async (key, value) => {
      store.set(key, value);
    },
    removeItem: async (key) => {
      store.delete(key);
    },
  };
  const api = load('src/services/preferences.ts', {
    '@react-native-async-storage/async-storage': { default: storage },
  });
  assert.equal(
    (await api.getProfilePreferences('one')).pushNotifications,
    true,
  );
  await api.saveProfilePreferences('one', {
    pushNotifications: false,
    emailOffers: false,
    birthdayRewards: true,
  });
  assert.equal((await api.getProfilePreferences('one')).emailOffers, false);
  assert.equal((await api.getProfilePreferences('two')).emailOffers, true);
  store.set('@boots/profile-preferences/two', '{"emailOffers":"false"}');
  await assert.rejects(
    api.getProfilePreferences('two'),
    /Invalid saved preferences/,
  );
  store.set('onboarding', 'yes');
  await api.clearProfilePreferences('one');
  assert.equal(store.has('@boots/profile-preferences/one'), false);
  assert.equal(store.get('onboarding'), 'yes');
});

test('sign-out cleanup waits for an in-flight preference save', async () => {
  const calls = [];
  let finish;
  const storage = {
    setItem: () =>
      new Promise((resolve) => {
        finish = () => {
          calls.push('save');
          resolve();
        };
      }),
    removeItem: async () => {
      calls.push('clear');
    },
  };
  const api = load('src/services/preferences.ts', {
    '@react-native-async-storage/async-storage': { default: storage },
  });
  const save = api.saveProfilePreferences('user', api.DEFAULT_PREFERENCES);
  const clear = api.clearProfilePreferences('user');
  assert.deepEqual(calls, []);
  finish();
  await Promise.all([save, clear]);
  assert.deepEqual(calls, ['save', 'clear']);
});

test('failed preference writes report failure without blocking subsequent cleanup', async () => {
  let cleared = false;
  const api = load('src/services/preferences.ts', {
    '@react-native-async-storage/async-storage': {
      default: {
        setItem: async () => {
          throw new Error('storage full');
        },
        removeItem: async () => {
          cleared = true;
        },
      },
    },
  });
  const saving = api.saveProfilePreferences('user', api.DEFAULT_PREFERENCES);
  const clearing = api.clearProfilePreferences('user');
  await assert.rejects(saving, /storage full/);
  await clearing;
  assert.equal(cleared, true);
});
