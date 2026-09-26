/**
 * Self-test for resolveApiHost (pure).
 * Run: npx --yes tsx src/apiHost.selftest.ts
 */
import assert from 'node:assert/strict';
import { hostFromHostUri, resolveApiHost } from './apiHost';

// 1. المتغيّر الصريح يتقدّم على كل شيء، بلا «/» أخيرة
assert.equal(
  resolveApiHost({ envUrl: 'https://api.example.com/', webHostname: '192.168.8.5', hostUri: '10.0.0.2:8081', extraApiUrl: 'http://x:8110' }),
  'https://api.example.com'
);
assert.equal(resolveApiHost({ envUrl: '   ', hostUri: '10.0.0.2:8081' }), 'http://10.0.0.2:8110');

// 2. الويب: مضيف الصفحة أيّاً كان؛ localhost ⇒ 127.0.0.1
assert.equal(resolveApiHost({ webHostname: 'localhost', extraApiUrl: 'http://192.168.8.104:8110' }), 'http://127.0.0.1:8110');
assert.equal(resolveApiHost({ webHostname: '127.0.0.1' }), 'http://127.0.0.1:8110');
assert.equal(resolveApiHost({ webHostname: '192.168.8.244', extraApiUrl: 'http://192.168.8.104:8110' }), 'http://192.168.8.244:8110');
assert.equal(resolveApiHost({ webHostname: '[::1]' }), 'http://[::1]:8110');

// 3. الهاتف: العنوان يتبع hostUri (طلب أنس: «غيّر hostUri وتأكّد أن العنوان يتبعه»)
for (const ip of ['192.168.8.104', '192.168.8.244', '192.168.8.102']) {
  assert.equal(resolveApiHost({ hostUri: `${ip}:8081`, extraApiUrl: 'http://192.168.8.104:8110' }), `http://${ip}:8110`);
}
assert.equal(resolveApiHost({ hostUri: '192.168.8.102:8081/--/path' }), 'http://192.168.8.102:8110');
assert.equal(resolveApiHost({ hostUri: 'localhost:8081' }), 'http://127.0.0.1:8110');
assert.equal(resolveApiHost({ hostUri: '[fe80::1]:8081' }), 'http://[fe80::1]:8110');
// نفق Expo لا يمرّر :8110 ⇒ يُتخطّى إلى الاحتياط
assert.equal(resolveApiHost({ hostUri: 'abc-anonymous-8081.exp.direct', extraApiUrl: 'http://x.lan:8110' }), 'http://x.lan:8110');
assert.equal(hostFromHostUri(''), null);
assert.equal(hostFromHostUri(':8081'), null);

// 4. البناء المستقلّ (لا hostUri): extra.apiUrl ثم 127.0.0.1
assert.equal(resolveApiHost({ extraApiUrl: 'http://srv.lan:8110/' }), 'http://srv.lan:8110');
assert.equal(resolveApiHost({}), 'http://127.0.0.1:8110');

console.log('apiHost selftest: OK');
