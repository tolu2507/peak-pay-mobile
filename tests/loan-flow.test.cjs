const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require(path.resolve('node_modules/typescript'));
const root = process.cwd();
function load(file, imports) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, { module, exports: module.exports, console, setTimeout, clearTimeout, process,
    require: name => imports[name] || require(require.resolve(name, { paths: [root] })) });
  return module.exports;
}
const memory = new Map();
const AsyncStorage = { getItem: async k => memory.get(k) ?? null, setItem: async (k, v) => { memory.set(k, v); }, removeItem: async k => { memory.delete(k); } };
const loadStore = (svc = {}) => load('src/store/useLoanStore.ts', {
  '../api/services/loan.service': { __esModule: true, default: svc },
  '@react-native-async-storage/async-storage': { __esModule: true, default: AsyncStorage },
});
const plain = v => JSON.parse(JSON.stringify(v));
const flush = () => new Promise(r => setTimeout(r, 10));

test('the draft is saved on the phone', async () => {
  memory.clear();
  const { useLoanStore } = loadStore();
  useLoanStore.getState().setLoanField('amount', '50000');
  useLoanStore.getState().setAddressField('city', 'Ikeja');
  await flush();
  const saved = JSON.parse(memory.get('peakpay-loan-draft')).state;
  assert.equal(saved.loanDetails.amount, '50000');
  assert.equal(saved.address.city, 'Ikeja');
  assert.equal(saved.quote, undefined);
});

test('a different user starts with an empty draft', async () => {
  const { useLoanStore } = loadStore();
  useLoanStore.getState().prepareDraft('user-a');
  useLoanStore.getState().setLoanField('amount', '50000');
  useLoanStore.getState().prepareDraft('user-a');
  assert.equal(useLoanStore.getState().loanDetails.amount, '50000');
  useLoanStore.getState().prepareDraft('user-b');
  assert.equal(useLoanStore.getState().loanDetails.amount, '');
});

test('a quote for values since changed is ignored', async () => {
  let reply;
  const { useLoanStore } = loadStore({ getQuote: () => new Promise(r => { reply = r; }) });
  useLoanStore.getState().setLoanField('amount', '100000');
  const pending = useLoanStore.getState().getQuote();
  useLoanStore.getState().setLoanField('amount', '200000');
  reply({ monthly_repayment: '1' });
  await pending;
  assert.equal(useLoanStore.getState().quote, null);
  assert.equal(useLoanStore.getState().isQuoting, false);
});

test('the address omits the bill type only when none is chosen', async () => {
  const calls = [];
  const { useLoanStore } = loadStore({ submitAddress: async (d) => { calls.push(d); return {}; } });
  await useLoanStore.getState().submitAddress({ uri: 'x' });
  useLoanStore.getState().setAddressField('billType', 'water');
  await useLoanStore.getState().submitAddress({ uri: 'x' });
  assert.equal('utility_bill_type' in calls[0], false);
  assert.equal(calls[1].utility_bill_type, 'water');
});

test('each eligibility state opens the right screen', () => {
  const { loanRouteFor } = load('src/constants/loan.ts', {});
  const base = { application_status: null, eligibility_status: null, can_apply: false, assessment_status: 'not_started' };
  const recent = { status: 'verified', needs_new_address: false, created_date: new Date(Date.now() - 86400000).toISOString() };
  assert.equal(loanRouteFor({ ...base, application_status: 'open', eligibility_status: 'eligible' }, null), '/loans/offer');
  assert.equal(loanRouteFor({ ...base, application_status: 'open' }, null), '/loans/status');
  assert.equal(loanRouteFor({ ...base, can_apply: true }, null), '/loans/apply');
  assert.equal(loanRouteFor({ ...base, assessment_status: 'pending_review' }, null), '/loans/status');
  assert.equal(loanRouteFor(base, recent), '/loans/statement');
  assert.equal(loanRouteFor(base, { ...recent, created_date: '2020-01-01T00:00:00Z' }), '/loans/address');
  assert.equal(loanRouteFor({ ...base, assessment_status: 'expired' }, null), '/loans/address');
  assert.equal(loanRouteFor({ ...base, assessment_status: 'statement_outdated' }, null), '/loans/statement');
  assert.equal(loanRouteFor({ ...base, application_status: 'open', assessment_status: 'statement_outdated' }, null), '/loans/statement');
});

test('repayment history reads the same as the web', () => {
  const { describeRepayment } = load('src/api/services/repayment.service.ts', { '../client': { __esModule: true, default: {} } });
  const base = { channel: 'virtual_account', status: 'confirmed', allocations: [], unapplied_amount: '0', repayment_bank_account: null, rejection_reason: '' };
  assert.deepEqual(plain(describeRepayment({ ...base, allocations: [{ installment_number: 1, reversed_at: null }] })),
    { title: 'Transfer to your PeakPay account', status: 'Paid installment 1', tone: 'success' });
  assert.equal(describeRepayment({ ...base, status: 'pending_confirmation' }).status, 'Awaiting confirmation');
  assert.equal(describeRepayment({ ...base, status: 'rejected', rejection_reason: 'No match' }).status, 'Not confirmed: No match');
  assert.equal(describeRepayment({ ...base, unapplied_amount: '500' }).status, 'Held as credit on your account');
  assert.equal(describeRepayment({ ...base, channel: 'bank_transfer', repayment_bank_account: { repayment_bank: 'GTBank' } }).title, 'Transfer to GTBank');
});
