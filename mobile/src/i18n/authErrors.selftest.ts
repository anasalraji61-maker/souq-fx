/**
 * Self-test for registerErrorText (pure).
 * Run: npx --yes tsx src/i18n/authErrors.selftest.ts
 */
import { loginErrorText, registerErrorText } from './authErrors';
import { DICTS } from './locales';

let fails = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    fails += 1;
    console.error('FAIL', name);
  } else console.log('ok', name);
}

const err = (status: number | undefined, detail: unknown) => Object.assign(new Error(`HTTP ${status}`), { status, detail });

for (const lang of ['ar', 'en-US', 'en-GB', 'ku'] as const) {
  const t = DICTS[lang];
  check(`${lang} reserved`, registerErrorText(t, err(400, 'username reserved')) === t.regErrReserved);
  check(`${lang} invisible`, registerErrorText(t, err(400, 'username has invisible or look-alike characters')) === t.regErrInvisible);
  check(`${lang} link or @`, registerErrorText(t, err(400, 'username has a link or @')) === t.regErrLink);
  check(`${lang} taken`, registerErrorText(t, err(400, 'username or email taken')) === t.regErrUsernameTaken);
  const emailTaken = registerErrorText(t, err(400, 'email taken'));
  check(`${lang} email taken fills {login}`, emailTaken.includes(t.login) && !emailTaken.includes('{login}'));
  check(`${lang} sponsor`, registerErrorText(t, err(400, 'sponsor code not found')) === t.regErrSponsorNotFound);
  const role = registerErrorText(t, err(422, [{ loc: ['body', 'role'], msg: 'Input should be trader' }]));
  check(`${lang} role 422 fills {trader}`, role.includes(t.trader) && !role.includes('{trader}'));
  check(`${lang} username 422`, registerErrorText(t, err(422, [{ loc: ['body', 'username'] }])) === t.regErrUsernameLength);
  check(`${lang} password 422`, registerErrorText(t, err(422, [{ loc: ['body', 'password'] }])) === t.regErrPasswordLength);
  check(`${lang} missing fields (client) → not generic`, registerErrorText(t, new Error('missing fields')) === t.regErrMissingFields);
  check(`${lang} login 401 → credentials`, loginErrorText(t, err(401, 'invalid credentials')) === t.loginErrCredentials);
  check(`${lang} login missing (client)`, loginErrorText(t, new Error('missing identity')) === t.loginErrMissing);
  check(`${lang} login 400 missing`, loginErrorText(t, err(400, 'email or username required')) === t.loginErrMissing);
  check(`${lang} login network → generic`, loginErrorText(t, new Error('Network request failed')) === t.loginError);
  check(`${lang} login 500 → generic`, loginErrorText(t, err(500, undefined)) === t.loginError);
  check(`${lang} unknown 400 → generic`, registerErrorText(t, err(400, 'side required when sponsor is set')) === t.registerError);
  check(`${lang} network → generic`, registerErrorText(t, new Error('timeout')) === t.registerError);
  check(`${lang} null → generic`, registerErrorText(t, null) === t.registerError);
}

if (fails) {
  console.error(`${fails} failed`);
  process.exit(1);
}
console.log('all ok');
