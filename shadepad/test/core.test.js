const test = require('node:test');
const assert = require('node:assert/strict');
const SP = require('../app/core.js');

const kinds = (text) => SP.findAll(text).map((f) => f.kind);

test('API keys and tokens of common providers are found', () => {
  const text = [
    'openai sk-' + 'A1b2C3d4E5f6G7h8I9j0K1l2',
    'anthropic sk-ant-api03-' + 'x'.repeat(30),
    'github ghp_' + 'a'.repeat(36),
    'aws AKIA' + 'ABCDEFGHIJKLMNOP',
    'google AIza' + 'a'.repeat(35),
    'slack xoxb-1234567890-abcdefghij',
    'stripe sk_live_' + 'a'.repeat(20),
    'jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.abcdefghijklmnop'
  ].join('\n');
  const found = SP.findAll(text);
  assert.equal(found.filter((f) => f.kind === 'API_KEY').length, 7);
  assert.equal(found.filter((f) => f.kind === 'TOKEN').length, 1);
});

test('private key blocks are found across lines', () => {
  const block = '-----BEGIN RSA PRIVATE KEY-----\nMIIBOgIBAAJBAK\nabc123\n-----END RSA PRIVATE KEY-----';
  const r = SP.redact('before\n' + block + '\nafter');
  assert.equal(r.text, 'before\n[PRIVATE_KEY_1]\nafter');
});

test('password and secret assignments hide only the value', () => {
  const r = SP.redact('DB_PASSWORD=hunter2hunter2 and api_key: "abcdef123456"');
  assert.equal(r.text, 'DB_PASSWORD=[SECRET_1] and api_key: "[SECRET_2]"');
  assert.equal(r.map['[SECRET_1]'], 'hunter2hunter2');
});

test('emails, Korean and international phone numbers, IPv4 and resident IDs are found', () => {
  assert.deepEqual(kinds('mail kim.minsu+test@example.co.kr'), ['EMAIL']);
  assert.deepEqual(kinds('call 010-1234-5678 now'), ['PHONE']);
  assert.deepEqual(kinds('call +82 10 1234 5678'), ['PHONE']);
  assert.deepEqual(kinds('host 192.168.0.12 is up'), ['IP']);
  assert.deepEqual(kinds('id 900101-1234567'), ['ID_NUMBER']);
});

test('card numbers need a valid Luhn check and are not also reported as phones', () => {
  assert.equal(SP.luhn('4111111111111111'), true);
  assert.deepEqual(kinds('card 4111 1111 1111 1111'), ['CARD']);
  assert.deepEqual(kinds('card 4111 1111 1111 1112'), []);
});

test('ordinary dates, times, versions and short numbers are not flagged', () => {
  assert.deepEqual(SP.findAll('Build at 2026-11-03 13:04:05, took 1234 ms, version 1.2.3, order 1699999999'), []);
});

test('the same value gets the same tag; different values get numbered tags', () => {
  const r = SP.redact('a@x.io, b@x.io, a@x.io');
  assert.equal(r.text, '[EMAIL_1], [EMAIL_2], [EMAIL_1]');
  assert.deepEqual(r.counts, { EMAIL: 2 });
  assert.equal(r.occurrences, 3);
  assert.equal(r.map['[EMAIL_2]'], 'b@x.io');
});

test('redact then restore gives back the original text, including after an AI reply', () => {
  const original = 'Mail kim@example.com or call 010-1234-5678. Card 4111 1111 1111 1111.';
  const r = SP.redact(original);
  assert.equal(r.text, 'Mail [EMAIL_1] or call [PHONE_1]. Card [CARD_1].');
  const reply = 'Reply to [EMAIL_1] and call [PHONE_1]. [EMAIL_1] again.';
  const back = SP.restore(reply, r.map);
  assert.equal(back.text, 'Reply to kim@example.com and call 010-1234-5678. kim@example.com again.');
  assert.equal(back.replaced, 3);
  assert.equal(SP.restore(r.text, r.map).text, original);
});

test('restore leaves unknown tags and plain text alone', () => {
  const back = SP.restore('See [EMAIL_9] and nothing else', { '[EMAIL_1]': 'a@b.co' });
  assert.equal(back.text, 'See [EMAIL_9] and nothing else');
  assert.equal(back.replaced, 0);
});

test('preview masks the middle of a value and hides short ones', () => {
  assert.equal(SP.preview('kim@example.com'), 'kim•••om');
  assert.equal(SP.preview('abc'), '•••');
  assert.equal(SP.preview('a\nb'), '(multi-line)');
});

test('empty and missing input are safe', () => {
  assert.equal(SP.redact(null).text, '');
  assert.equal(SP.redact(undefined).occurrences, 0);
  assert.equal(SP.restore(null, null).text, '');
});

test('a bare 32+ char hex string (hash, token, ID) is hidden', () => {
  const r = SP.redact('e8fbc690d9c26810ae8cc1ee9f83c814');
  assert.equal(r.text, '[TOKEN_1]');
  assert.equal(r.map['[TOKEN_1]'], 'e8fbc690d9c26810ae8cc1ee9f83c814');
});

test('a random mixed-case token of 32+ chars is hidden; ordinary identifiers and digit runs are not', () => {
  assert.deepEqual(kinds('xK9bQ2mZ7vLp4RtY8wNc3HsE6uJd1FgA'), ['TOKEN']);
  assert.deepEqual(kinds('internationalizationConfigurationManagerFactory2024'), []);
  assert.deepEqual(kinds('12345678901234567890123456789012'), []);
});

test('key=value and key: value assignments with generic values are hidden', () => {
  assert.equal(SP.redact('password=abc1').text, 'password=[SECRET_1]');
  assert.equal(SP.redact('secret: xK9bQ2mZ7vLp4RtY8wNc3HsE6uJd1FgA').text, 'secret: [SECRET_1]');
  assert.equal(SP.redact('access_key=AKIDEXAMPLE1').text, 'access_key=[SECRET_1]');
});

test('JSON keys with quotes around the key are hidden', () => {
  const r = SP.redact('{"password": "hunter2hunter2", "apiKey": "abcd1234efgh"}');
  assert.equal(r.text, '{"password": "[SECRET_1]", "apiKey": "[SECRET_2]"}');
  assert.equal(SP.redact('{"api_key":"abcd1234efgh"}').text, '{"api_key":"[SECRET_1]"}');
});

test('quoted secret values that contain spaces are hidden whole', () => {
  const r = SP.redact('password="correct horse battery"');
  assert.equal(r.text, 'password="[SECRET_1]"');
  assert.equal(r.map['[SECRET_1]'], 'correct horse battery');
  assert.equal(SP.redact("token='abc def ghi'").text, "token='[SECRET_1]'");
});

test('Bearer and Basic credentials are hidden', () => {
  const r = SP.redact('Authorization: Bearer abcdefghijklmnopqrstuvwxyz0123456789');
  assert.equal(r.text, 'Authorization: Bearer [TOKEN_1]');
  assert.equal(r.map['[TOKEN_1]'], 'abcdefghijklmnopqrstuvwxyz0123456789');
  assert.equal(SP.redact('curl -H "Authorization: Basic dXNlcjpwYXNzd29yZA=="').text.includes('dXNlcjpwYXNzd29yZA'), false);
});

test('the password in a URL with credentials is hidden, the host is kept', () => {
  const r = SP.redact('DATABASE_URL=postgres://user:s3cretpass@db.example.com:5432/app');
  assert.equal(r.text, 'DATABASE_URL=postgres://user:[SECRET_1]@db.example.com:5432/app');
  assert.equal(r.map['[SECRET_1]'], 's3cretpass');
});

test('restore brings back values from quoted and JSON secrets', () => {
  const r = SP.redact('{"password": "hunter2hunter2"}');
  assert.equal(SP.restore('Use the value [SECRET_1] in the config.', r.map).text, 'Use the value hunter2hunter2 in the config.');
});

test('IBAN, US SSN, Slack webhooks and npm tokens are hidden; invalid look-alikes are not', () => {
  assert.deepEqual(kinds('IBAN DE89 3704 0044 0532 0130 00'), ['BANK_ACCOUNT']);
  assert.deepEqual(kinds('IBAN DE00 3704 0044 0532 0130 00'), []);
  assert.deepEqual(kinds('ssn 123-45-6789'), ['SSN']);
  assert.deepEqual(kinds('ssn 000-12-3456 or 666-12-3456 or 123-00-4567'), []);
  assert.deepEqual(kinds('https://hooks.slack.com/services/T0ABC123/B0ABC123/abcdEFGH1234'), ['API_KEY']);
  assert.deepEqual(kinds('npm_' + 'a'.repeat(36)), ['API_KEY']);
});

test('keep leaves a value visible and does not let another rule hide it instead', () => {
  const text = 'card 4111 1111 1111 1111 and mail kim@example.com';
  const r = SP.redact(text, { keep: ['4111 1111 1111 1111'] });
  assert.equal(r.text, 'card 4111 1111 1111 1111 and mail [EMAIL_1]');
  assert.deepEqual(r.counts, { EMAIL: 1 });
});

test('restore accepts a tag the AI escaped, spaced or wrapped differently', () => {
  const map = { '[EMAIL_1]': 'kim@example.com', '[SECRET_10]': 'hunter2hunter2' };
  assert.equal(SP.restore('\\[EMAIL_1\\]', map).text, 'kim@example.com');
  assert.equal(SP.restore('[ EMAIL_1 ] or EMAIL_1', map).text, 'kim@example.com or kim@example.com');
  assert.equal(SP.restore('**[SECRET_10]**', map).text, '**hunter2hunter2**');
  assert.equal(SP.restore('MY_EMAIL_1 and [EMAIL_19]', map).replaced, 0);
});
