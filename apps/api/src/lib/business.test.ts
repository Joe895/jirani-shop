import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deliveryFee, normalizeKenyanPhone, makeSlug } from './business.js';

test('normalizes both Kenyan 07 and 01 numbers', () => {
  assert.equal(normalizeKenyanPhone('0712 345 678'), '254712345678');
  assert.equal(normalizeKenyanPhone('+254 112 345 678'), '254112345678');
  assert.throws(() => normalizeKenyanPhone('1234'));
});
test('calculates server shipping fee', () => {
  assert.equal(deliveryFee(2000, 'Nairobi', 'delivery'), 250);
  assert.equal(deliveryFee(2000, 'Kisumu', 'delivery'), 450);
  assert.equal(deliveryFee(5000, 'Kisumu', 'delivery'), 0);
  assert.equal(deliveryFee(800, 'Nairobi', 'pickup'), 0);
});
test('slugifies product names', () => assert.equal(makeSlug('The Jirani Everyday Bag'), 'the-jirani-everyday-bag'));
