# QuickBill review rubric (strict)

Used by the review AI (Claude Haiku) that gates every QuickBill change. A change passes only if every
category scores 8 or more out of 10 and there is no open blocker. Any bug that loses or mis-states money is a blocker.

Categories: 1 Features and value, 2 Correctness (money maths, status, rounding, edge cases), 3 Bugs and regressions,
4 UX (clarity, mobile, empty states), 5 Differentiation (is it clearly better or different than Invoice Ninja, Wave,
Zoho Invoice, Bonsai, FreshBooks?), 6 Accessibility (labels, keyboard, contrast, focus), 7 Error handling and safety
(bad input, escaping, link/CSV safety, old data), 8 Translations (all five languages, natural wording, same placeholders),
9 Tests (do tests cover the new maths and the old behaviour).
