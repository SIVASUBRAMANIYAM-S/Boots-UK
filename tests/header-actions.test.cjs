/* global __dirname */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const ts = require('typescript');

function loadButton() {
  const file = path.join(__dirname, '../src/components/CountIconButton.tsx');
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const element = (type, props) => ({ type, props });
  const dependencies = {
    'react/jsx-runtime': { jsx: element, jsxs: element },
    'react-native': {
      ActivityIndicator: 'ActivityIndicator',
      Pressable: 'Pressable',
      Text: 'Text',
      View: 'View',
      StyleSheet: { create: (styles) => styles },
    },
    '@/constants/colors': {
      Colors: { primary: '#005eb8', error: '#d0021b', white: '#ffffff' },
    },
  };
  const module = { exports: {} };
  vm.runInNewContext(code, {
    module,
    exports: module.exports,
    require: (name) => {
      if (!(name in dependencies)) throw new Error(`Unexpected import ${name}`);
      return dependencies[name];
    },
  });
  return module.exports.CountIconButton;
}

test('wishlist and cart use a matching unboxed 40px header action', () => {
  const Button = loadButton();
  for (const [icon, label] of [
    ['♥', 'Open wishlist'],
    ['🛒', 'Cart'],
  ]) {
    let pressed = false;
    const node = Button({
      icon,
      label,
      count: 0,
      onPress: () => {
        pressed = true;
      },
    });
    const style = node.props.style({ pressed: false })[0];
    assert.equal(style.width, 40);
    assert.equal(style.height, 40);
    assert.equal(style.backgroundColor, undefined);
    assert.equal(style.boxShadow, undefined);
    assert.equal(node.props.children[0].props.style.color, '#005eb8');
    assert.equal(node.props.accessibilityLabel, `${label}, 0 items`);
    assert.equal(node.props.children[1], false);
    node.props.onPress();
    assert.equal(pressed, true);
  }
});

test('header badges show a single count, cap at 99+, and use the cart badge colour', () => {
  const Button = loadButton();
  for (const [count, expected] of [
    [1, '1'],
    [99, '99'],
    [100, '99+'],
  ]) {
    const node = Button({
      icon: '♥',
      label: 'Open wishlist',
      count,
      onPress: () => {},
    });
    const badge = node.props.children[1];
    assert.equal(badge.props.children.props.children, expected);
    assert.equal(badge.props.style.backgroundColor, '#d0021b');
    assert.equal(
      node.props.accessibilityLabel,
      `Open wishlist, ${count} ${count === 1 ? 'item' : 'items'}`,
    );
  }
});

test('loading and unavailable counts are announced honestly', () => {
  const Button = loadButton();
  const loading = Button({
    icon: '♥',
    label: 'Open wishlist',
    count: 0,
    loading: true,
    onPress: () => {},
  });
  assert.equal(
    loading.props.accessibilityLabel,
    'Open wishlist, loading count',
  );
  assert.equal(loading.props.children[1].type, 'ActivityIndicator');
  const failed = Button({
    icon: '♥',
    label: 'Open wishlist',
    count: 0,
    unavailable: true,
    onPress: () => {},
  });
  assert.equal(
    failed.props.accessibilityLabel,
    'Open wishlist, count unavailable',
  );
  assert.equal(failed.props.children[1].props.children.props.children, '!');
});
