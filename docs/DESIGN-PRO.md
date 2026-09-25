# MATRIX — معيار الواجهة الاحترافية

**ساري من:** 2026-09-25 بأمر أنس. **ملزم** لوكلاء `ui` و `chart` و `tools` و `launch`.
**يفحصه:** وكيل الجودة في كل دورة عبر قائمة القبول في آخر هذا الملف.

> **القاعدة الأولى، وكل ما تحتها يخدمها:**
> **الشارت هو أعلى عنصر صوتاً على الشاشة. كل ما عداه يخفت.**
> إن نظرت إلى الشاشة وأول ما لفت عينك زرٌّ أو لافتة أو نص، فالتصميم فشل.

We are not copying any competitor's interface. We are adopting the craft standards that
professional terminals share: restraint, hierarchy, and numeric stability. Obey
`.cursor/rules/ip-legal-caution.mdc` — never replicate another product's layout, icon set,
wordmark, or distinctive visual identity.

---

## 1. Color — exactly ONE accent

```
bg.base        #0B1220   app background
bg.panel       #0F172A   panels, rails, watchlist
bg.elevated    #111C33   menus, popovers, modals
border.subtle  rgba(255,255,255,0.06)
border.strong  rgba(255,255,255,0.12)
text.primary   #E6EDF7   values, active labels
text.secondary #94A3B8   control labels, headers
text.muted     #64748B   units, hints, disabled
accent         #2DD4BF   THE ONLY accent
up             #22C55E   price direction only
down           #EF4444   price direction only
warn           #F59E0B   degraded/stale data only
```

**Accent budget:** at most **ONE** accent-colored element visible per screen region at rest.
The selected symbol OR the active timeframe — not both. Everything else is
`text.secondary` until the user touches it.

**Forbidden:** accent on borders of inactive controls · accent on badges · accent on more
than one control in the same toolbar · green/red used for anything that is not price
direction · a third hue introduced for a single feature.

## 2. Typography — numbers must not move

**Every** price, quantity, percentage, pip value, lot size, countdown and timestamp:

```css
font-variant-numeric: tabular-nums;
font-feature-settings: "tnum" 1;
```

This is not cosmetic. Without it every digit change shifts the layout, and the product
reads as amateur no matter how good the chart engine is. Apply it globally to any
`<Text>` that can contain a number that updates.

```
11px  micro labels, axis ticks
12px  secondary labels, watchlist symbol
13px  controls, body, menu items
15px  price readouts in watchlist and chart header
18px  last price / crosshair value
```

Weights: `400` body · `500` emphasis and active state · `600` prices only.
**Never `700` anywhere in chrome.** Never ALL-CAPS except 2–4 letter unit labels.

## 3. Spacing — 4px grid, no exceptions

```
4   inside a control
8   between related controls
12  between control groups
16  panel padding, screen gutter
24  between major sections
```

Control heights: **28px** in side rails · **32px** in the top bar · **44px** minimum touch
target on phone (use padding, not height, to reach 44).

## 4. Icons

20×20, **1.5px stroke**, one family throughout the app, no filled and outlined mixed.
**Side rails are icon-only.** The tool name appears in a tooltip after 400ms hover on web,
and on long-press on phone. Labels under every icon double the rail width and are the single
biggest source of visual noise in the current build.

Every interactive icon carries an `accessibilityLabel`. Selection is **never** signalled by
colour alone — pair it with a background fill or a 2px inset marker.

## 5. Structural rules

**5.1 — No control appears in two places.** Each action has exactly one home. The layout
selector currently exists in both the top bar and the right rail: keep the top bar, delete
it from the rail.

**5.2 — Destructive actions hide until intent.** `Delete` must not be visible on every
watchlist row at rest. Reveal on hover (web) or swipe / long-press (phone).

**5.3 — Data status is shown once, not per row.** A single indicator in the watchlist header
states the feed state. A per-row badge appears **only** when that row is degraded (stale or
demo), in `warn`, never in accent or green.

**5.4 — Bottom bar: at most 5 entries.** Everything else moves behind a single `More`.
Fourteen equally-weighted buttons communicate no hierarchy at all.

**5.5 — One separator per element.** Border **or** background **or** shadow — never two,
never three. Panels use `border.subtle`; they do not also carry a shadow.

**5.6 — Chrome recedes when the chart is touched.** While the user is drawing, dragging or
scrubbing a crosshair, non-essential chrome drops to 40% opacity and returns on release.

## 6. Motion

One animation is permitted: a **180ms** background flash on a price cell when its value
changes (`up`/`down` at 12% opacity, fading out). Nothing else in chrome animates —
no sliding panels, no fading toolbars, no spinners longer than 400ms.

## 7. Density targets

| Surface | Max controls visible at rest |
|---|---|
| Top bar | 8 |
| Left rail | 12 (icon-only) |
| Right panel header | 3 |
| Bottom bar | 5 |

Above the target: group, collapse behind a menu, or delete. Do not shrink the font.

---

## قائمة القبول — يفحصها وكيل الجودة كل دورة

كل بند يُجاب بنعم/لا مع اسم الملف والسطر عند الفشل:

1. هل يوجد أي رقم متغيّر بلا `tabular-nums`؟
2. هل يظهر أكثر من عنصر واحد بلون التأكيد في منطقة واحدة وقت السكون؟
3. هل يوجد زرّ واحد له مكانان؟
4. هل يظهر إجراء حذف بلا تفاعل من المستخدم؟
5. هل يتجاوز الشريط السفلي 5 مداخل؟
6. هل توجد تسميات نصية تحت أيقونات شريط الرسم؟
7. هل يوجد عنصر يحمل حداً وخلفية وظلاً معاً؟
8. هل توجد لافتة حالة بيانات على كل صف بدل واحدة في الرأس؟
9. هل يوجد زرّ تفاعلي بلا `accessibilityLabel`؟
10. هل يوجد اختيار يُعبَّر عنه باللون وحده؟
11. هل توجد قيمة مسافة خارج مضاعفات 4؟
12. هل يوجد وزن خط 700 في الواجهة؟

**أي إجابة بنعم = بند في `docs/COORDINATION.md` موجَّه لمالك الملف.**

---

## للوكلاء — كيف تطبّق هذا

لا تعِد بناء الشاشات. طبّق البنود **واحداً واحداً**، كل بند بكوميت مستقل، بادئاً بالأعلى أثراً:

1. `tabular-nums` على كل الأرقام (بند واحد، أثر هائل)
2. حذف التكرار في أدوات التخطيط
3. شريط الرسم أيقونات فقط
4. إخفاء `Delete` حتى التفاعل
5. الشريط السفلي إلى 5 + More
6. ضبط ميزانية لون التأكيد

بعد كل بند: `bash scripts/qa-build-check.sh` ثم كوميت ورفع.
