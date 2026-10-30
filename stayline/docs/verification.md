# Calculation check against the official Schengen rules (2026-10-30)

Sources read: European Commission "Short-stay calculator" user manual
(`home-affairs.ec.europa.eu/system/files/2020-09/short_stay_schengen_calculator_user_manual_en.pdf`, full text),
the EC calculator page (partly cut off when fetched), and the Czech MFA page "New rules for calculating short stays".

## Rules confirmed from the text
- Moving window looking **backwards from each day of stay** (the 180 days preceding that day). Matches `usedOn()` in `app/core.js`.
- Date of entry = first day, date of exit = last day, both count as full days. Matches inclusive counting.
- "Planning" mode answers "maximum length of stay which may be allowed on a particular day in the future". Matches `maxStay()`.

## Worked examples reproduced (tests in `test/core.test.js`)
| Case | Manual says | Stayline |
|---|---|---|
| A: stay 1.1.2014, enter 1.6.2014 | last authorised day 29.8.2014 (90 days, window 3.3.–29.8.) | 90 days, window starts 2014-03-03, left 0; day 30.8 is 1 over |
| B: stays 1–10.1, 1–30.3, 1.5–9.6.2015, planning 20.6.2015 | 20 days | 20 |
| B: planning 7.8.2015 | 20 days, leave on 26.8.2015 | 20, ends 2015-08-26 |
| B: planning 8.8.2015 | 50 days | 50 |
| B: planning 8.9.2015 | 90 days | 90 |

## Not verified
- Manual example A prints "15 days" on 15.6.2014, but 1.1.2014 plus 1.–15.6. is 16 days inside the window 18.12.2013–15.6.2014. The PDF text has a missing symbol there, so I did not copy that number into a test. Stayline counts 16.
- Which states are in the Schengen area changes over time (the manual's list is from 2013–2015). Stayline does not know countries; the user decides what counts as "inside".
- Stays under residence permits or long-stay (D) visas are not counted by the rule. Stayline does not ask which type of stay a trip is. Say so in support answers.
- EES (Entry/Exit System) border records are what officers see. Stayline cannot match them and says so on every page.
- The licence call to Lemon Squeezy (`api/license.js`) is tested only with a mocked response. Its request and response shape follow my knowledge of Lemon Squeezy's public licence API and are **not tested against a real store**.
