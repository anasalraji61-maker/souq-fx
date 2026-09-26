/**
 * Self-test for forecastText (pure).
 * Run: npx --yes tsx src/chart/forecastText.selftest.ts
 */
import assert from 'node:assert/strict';
import { DICTS } from '../i18n/locales';
import { forecastDisclaimer, forecastVoteDetail, forecastVoteName, forecastVoteNameKey } from './forecastText';

const ku = DICTS.ku;
const en = DICTS['en-US'];

// اسم الصوت: ma ⇒ تقاطع/اتجاه حسب الرمز
assert.equal(forecastVoteNameKey({ id: 'ma', detail_code: 'ma_cross_up' }), 'ma_cross');
assert.equal(forecastVoteNameKey({ id: 'ma', detail_code: 'ma_above' }), 'ma_trend');
assert.equal(forecastVoteNameKey({ id: 'rsi' }), 'rsi');
assert.equal(forecastVoteName({ id: 'bb', name: 'بولنجر', detail: '' }, en), 'Bollinger');
assert.equal(forecastVoteName({ id: 'zz', name: 'Server name', detail: '' }, en), 'Server name');

// التفاصيل: القالب بالقيم؛ الكردي من المفتاح لا من عربي الخادم
const rsi = { id: 'rsi', name: 'RSI 14', detail: 'تشبع شراء (72.4)', detail_code: 'rsi_overbought', detail_values: { rsi: 72.4 } };
assert.equal(forecastVoteDetail(rsi, en), en.forecastDetail.rsi_overbought.replace('{rsi}', '72.4'));
assert.ok(forecastVoteDetail(rsi, ku).includes('72.4'));
assert.notEqual(forecastVoteDetail(rsi, ku), rsi.detail);
// رمز مجهول أو قيمة ناقصة ⇒ نصّ الخادم
assert.equal(forecastVoteDetail({ ...rsi, detail_code: 'new_code' }, en), rsi.detail);
assert.equal(forecastVoteDetail({ ...rsi, detail_values: {} }, en), rsi.detail);
assert.equal(forecastVoteDetail({ id: 'rsi', name: '', detail: 'x' }, en), 'x');
// لا صيغة أُسّية لقيمة MACD صغيرة
const macd = { id: 'macd', name: '', detail: '', detail_code: 'macd_above', detail_values: { macd: 1.2e-7, signal: -0.00003 } };
const md = forecastVoteDetail(macd, en);
assert.ok(md.includes('0.00000012') && md.includes('-0.00003') && !/e-/.test(md), md);

// التنبيه
assert.equal(forecastDisclaimer('indicator_consensus', 'عربي', ku), ku.forecastDisclaimerConsensus);
assert.equal(forecastDisclaimer('not_enough_data', 'عربي', en), en.forecastDisclaimerNoData);
assert.equal(forecastDisclaimer('no_movement', 'عربي', ku), ku.forecastDisclaimerNoMovement);
assert.equal(forecastDisclaimer(undefined, 'server', en), 'server');
assert.equal(forecastDisclaimer('other', null, en), '');

console.log(JSON.stringify({ ok: true }));
// صوت برقمين: منازل واحدة (الخادم يقرّب لمنازل السعر و`String` يُسقط الصفر الأخير).
const maJpy = { id: 'ma', name: '', detail: 'x', detail_code: 'ma_above', detail_values: { fast: 157.42, slow: 157.418 } };
assert.equal(forecastVoteDetail(maJpy, en), en.forecastDetail.ma_above.replace('{fast}', '157.420').replace('{slow}', '157.418'));
const macdTiny = { id: 'macd', name: '', detail: 'x', detail_code: 'macd_above', detail_values: { macd: 0.0002, signal: 0.00015 } };
assert.equal(forecastVoteDetail(macdTiny, en), en.forecastDetail.macd_above.replace('{macd}', '0.00020').replace('{signal}', '0.00015'));
const macdE = { ...macdTiny, detail_values: { macd: 1.2e-7, signal: 1e-7 } };
assert.equal(forecastVoteDetail(macdE, en), en.forecastDetail.macd_above.replace('{macd}', '0.00000012').replace('{signal}', '0.00000010'));
console.log('forecastText selftest PASS (vote places)');
