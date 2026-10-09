/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const test = require('node:test');

function service(responses) {
  const calls = [];
  const client = {
    from(table) {
      const call = { table, operations: [] };
      calls.push(call);
      const query = {};
      for (const method of [
        'select',
        'eq',
        'order',
        'range',
        'delete',
        'upsert',
      ]) {
        query[method] = (...args) => {
          call.operations.push([method, ...JSON.parse(JSON.stringify(args))]);
          return query;
        };
      }
      query.overrideTypes = () => Promise.resolve(responses.shift());
      query.then = (resolve, reject) =>
        Promise.resolve(responses.shift()).then(resolve, reject);
      return query;
    },
  };
  const file = path.join(__dirname, '../src/services/favourites.ts');
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require(name) {
      assert.equal(name, '@/services/supabase');
      return { supabase: client };
    },
  });
  return { api: module.exports, calls };
}

test('wishlist paginates and retains unavailable products for removal', async () => {
  const first = Array.from({ length: 100 }, (_, i) => ({
    product_id: String(i),
    product: null,
  }));
  const { api, calls } = service([
    { data: first, error: null },
    {
      data: [{ product_id: 'last', product: { name: 'Cream', price: 12.5 } }],
      error: null,
    },
  ]);
  const rows = await api.getWishlist('user');
  assert.equal(rows.length, 101);
  assert.equal(rows[0].product, null);
  assert.equal(rows[100].product.name, 'Cream');
  assert.deepEqual(
    calls[0].operations.find(([name]) => name === 'eq'),
    ['eq', 'user_id', 'user'],
  );
  assert.deepEqual(
    calls[0].operations.find(([name]) => name === 'order'),
    ['order', 'created_at', { ascending: false }],
  );
  assert.deepEqual(
    calls.map((call) => call.operations.find(([name]) => name === 'range')),
    [
      ['range', 0, 99],
      ['range', 100, 199],
    ],
  );
});

test('badge count includes every saved product beyond response cap', async () => {
  const { api } = service([
    {
      data: Array.from({ length: 100 }, (_, i) => ({ product_id: String(i) })),
      error: null,
    },
    { data: [{ product_id: 'last' }], error: null },
  ]);
  const ids = await api.getFavourites('user');
  assert.equal(ids.size, 101);
  assert.equal(ids.has('last'), true);
});

test('clear all is user-scoped and errors propagate for rollback', async () => {
  const { api, calls } = service([
    { error: null },
    { error: new Error('Denied') },
  ]);
  await api.clearFavourites('user');
  assert.deepEqual(calls[0].operations, [
    ['delete'],
    ['eq', 'user_id', 'user'],
  ]);
  await assert.rejects(api.clearFavourites('user'), /Denied/);
});

test('instant removal targets one favourite; saving is duplicate-safe', async () => {
  const { api, calls } = service([{ error: null }, { error: null }]);
  assert.equal(await api.toggleFavourite('user', 'product', true), false);
  assert.deepEqual(calls[0].operations, [
    ['delete'],
    ['eq', 'user_id', 'user'],
    ['eq', 'product_id', 'product'],
  ]);
  assert.equal(await api.toggleFavourite('user', 'product', false), true);
  const insert = calls[1].operations[0];
  assert.equal(insert[0], 'upsert');
  assert.equal(insert[1].user_id, 'user');
  assert.equal(insert[1].product_id, 'product');
  assert.equal(insert[2].ignoreDuplicates, true);
});

test('a failed page does not return a partial wishlist or badge', async () => {
  const { api } = service([
    { data: null, error: new Error('Offline') },
    { data: null, error: new Error('Offline') },
  ]);
  await assert.rejects(api.getWishlist('user'), /Offline/);
  await assert.rejects(api.getFavourites('user'), /Offline/);
});
