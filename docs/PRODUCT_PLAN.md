# WaterMart (working name) — App & Website Plan
### 20L drinking-water marketplace, Mumbai · Customer orders → partner delivers

Built on *Mumbai_Water_Delivery_Marketplace_Plan.docx*. The original is a good **ops and go-to-market** playbook. What it doesn't have is a **product plan**: what the app and website actually do, who uses them, what gets built when, and how the anti-poaching rules are enforced in software. This document fills that gap and fixes a few numbers that don't add up.

---

## 1. What changes from the original plan

| Original plan says | Problem | This plan |
|---|---|---|
| Don't build apps for 90 days; run on WhatsApp + Airtable + Tookan | Reasonable for validation, but you want an app + website, and stitching 4 SaaS tools together creates data mess that is painful to migrate | **Run both tracks in parallel.** Ops launches on WhatsApp in Week 1. A lean custom product is built at the same time and replaces the tool stack by Week 10–12. |
| 10-jar pass = ₹600 (₹60/jar) and single jar also ₹60 | The pass gives the customer **no reason** to prepay. Prepaid is your main anti-poaching lock. | Single jar ₹65, 10-pass ₹600 (₹60), 20-pass ₹1,140 (₹57). The pass must always be the cheapest option. |
| 250 customers ≈ 50 deliveries/day; scale gate = 100+/day | 100/day needs roughly **500 active customers**, double what the P&L assumes | Gate rewritten in §9 with numbers that match. |
| Society app ads: ₹3–5k per society × 15 societies | That is **₹45–75k/month**, not in the P&L or the ₹40k marketing budget | Test 2–3 societies only. Scale only the ones with CAC under ₹300. |
| ₹87,500 deposit float shown as "cash reserve" | It is **customer money you owe back**. It is a liability, not profit. | Keep it in a separate current account. Never use it for operating costs. |
| FSSAI basic registration (₹100) | E-commerce food businesses generally need a **Central licence** under FSSAI e-commerce rules | Confirm with a FoSCoS consultant before launch. Budget ₹7.5k plus consultant fees. |
| "70%+ free-trial conversion" | Unvalidated | Treat it as a hypothesis and measure it from Week 2. |
| Net ₹18k/month per zone | No founder salary and no support staff. That is a side income, not a company. | Plan for 3–4 zones before the business supports one full-time founder (§8). |

---

## 2. Who uses the product (4 users, 4 surfaces)

| User | Surface | Core job |
|---|---|---|
| **Customer** (households, bachelors, tenants) | WhatsApp bot → **PWA web app** → Android/iOS app later | Buy a pass, 1-tap refill, track delivery, return jars, get deposit back |
| **B2B customer** (clinics, salons, gyms, offices) | Same web app with business login | Scheduled deliveries, monthly GST invoice, multiple locations |
| **Partner + rider** (RO plant / water agency + its delivery boys) | **Android app** (Hindi/Marathi/English, big buttons, works on cheap phones) | Accept orders, deliver with OTP + photo, log empty jars, see earnings |
| **You / ops team** | **Admin dashboard** (web) | Live orders, reassignment, zone setup, partner settlements, refunds, reports |
| **Public / new leads** | **Marketing website** | Explain the service, check pincode, start on WhatsApp, B2B enquiry form |

**Key decision:** the first customer app is a **PWA (mobile website that installs like an app)**, not a Play Store app. Your target users mostly find you through a guard, a flyer QR code or WhatsApp. A link that opens instantly beats "download our app". Build native apps only after the scale gate in §9.

---

## 3. Feature scope by release

### Release 1 — MVP (build weeks 1–8, live by week 10)

**Customer (PWA + WhatsApp)**
- Phone OTP login. No passwords.
- Address with **society → wing/tower → flat** (structured, not free text). Auto-checks if the pincode/society is served.
- Buy a pass or a single jar via **Razorpay UPI**. Pay the jar deposit at onboarding.
- **1-tap "Refill"** on the home screen and on WhatsApp (button reply). One credit is deducted automatically.
- Delivery slot: "ASAP (within 2 hrs)" or "Tomorrow morning/evening".
- Live order status: Placed → Assigned → Out for delivery → Delivered (WhatsApp notifications at each step).
- **4-digit delivery OTP** shown to the customer. The rider must enter it to complete the order.
- Wallet view: credits left, jars at home, deposit held.
- Low-balance nudge at 2 credits left, with a 1-tap renew.
- "Return jars & refund deposit" request.
- Masked "Call rider" button (Exotel).

**Partner/rider app (Android)**
- Login by phone OTP. Partner owner can add riders.
- New order alert (sound + push). Accept within 5 min, or it is auto-reassigned to the backup partner.
- Order card: society, tower, flat, slot, jars to deliver, empties to collect. **No customer phone number shown.**
- Masked call button.
- Complete delivery = **customer OTP + photo** of the sealed jar at the door + count of empties collected.
- Daily summary and weekly earnings statement.
- Language: Hindi / Marathi / English, icon-heavy UI.

**Admin dashboard**
- Live order board with filters (zone, status, late orders in red).
- Manual assign/reassign. Auto-assign rule: zone → primary partner → backup.
- Customers: wallet, jars held, deposit, order history, refunds.
- Partners: verified docs (FSSAI, BIS/ISI), service zones, wholesale rate, performance (acceptance %, on-time %, complaints).
- **Weekly settlement report** (Monday): verified deliveries × rate, minus penalties. Export for UPI payout.
- **Jar ledger:** jars issued, at customers, returned, lost, per partner.
- Guard/referral codes and payouts.
- Basic reports: orders/day, active customers, pass renewal %, CAC by channel, jar loss %.

**Marketing website**
- Home: "20L water at your door in 2 hours. ISI-certified. No cash, no haggling."
- Pincode/society checker.
- Pricing (passes, deposit, single jar).
- How it works (3 steps), trust (FSSAI/BIS, sealed jars, verified partners).
- B2B page with an enquiry form (GST invoice, SLA).
- "Become a partner" form.
- Area landing pages for local SEO ("20 litre water delivery Powai", "Bisleri can delivery Andheri West").
- FAQ, policies (refund, deposit, privacy, terms). **Razorpay requires these pages to be live.**

### Release 2 — Retention & B2B (weeks 11–18)
- **Auto-refill subscription** (e.g. every 3 days) with UPI AutoPay mandate.
- B2B accounts: multiple locations, standing orders, monthly GST invoice, pay-later with credit limit.
- Ratings after each delivery. Low rating opens a support ticket.
- Referral program: customer gives ₹50, gets 1 free jar.
- Smart partner assignment by load and rider location.
- In-app support chat (or WhatsApp handoff).
- Building-level batching: group orders in the same society for the rider.

### Release 3 — Scale (after the §9 gate)
- Native Android + iOS customer app (same backend).
- Multi-zone, multi-partner marketplace with zone-level pricing.
- Voice-first partner app (tap-and-speak in Hindi/Marathi).
- Demand forecasting per society. Partner stock planning.
- Add-on products: 1L/500ml cases, dispensers, dispenser cleaning.

---

## 4. Anti-poaching, built into the product

The original plan's three locks were business rules. Here they are as software:

| Lock | How the product enforces it |
|---|---|
| **Prepaid only** | No COD option exists in the app. Rider app has no "collect cash" field. Pass is always cheaper than a single jar. |
| **Deposit held by platform** | Deposit is paid only via the app. Refund only via an in-app jar-return request, verified by the rider scanning/counting the jars. |
| **No phone numbers exchanged** | Rider sees flat + society, never the customer's number. All calls go through Exotel masking. Customer support number is the platform's. |
| **Delivery must be logged** | Partner is only paid for deliveries completed with a customer OTP. Off-platform deliveries earn the partner nothing from you. |
| **Detect leakage** | Alert when an active customer stops ordering but still holds jars (likely buying directly). Ops calls them within 7 days. |
| **Branded jars** | Neck tags/seals with a QR code per jar, linked to the jar ledger. |
| **Contract** | Non-solicit clause in the partner agreement with a per-customer penalty and deduction from settlements. |

---

## 5. Order lifecycle (state machine)

```
PLACED ──auto-assign──▶ ASSIGNED ──partner accepts──▶ ACCEPTED ──▶ OUT_FOR_DELIVERY ──OTP+photo──▶ DELIVERED
   │                       │ no accept in 5 min                                     │
   │                       └──▶ REASSIGNED (backup partner)                         └──▶ FAILED (customer not home / gate denied)
   └──customer cancels──▶ CANCELLED (credit refunded)                                     → credit refunded, reschedule
```

Every transition is timestamped. That gives you SLA reports (time to deliver, late %) for free.

---

## 6. Data model (core tables)

`zones` · `societies` (zone, name, geo, gate instructions) · `customers` · `addresses` (society, tower, flat) · `partners` (docs, rate, zones) · `riders` · `products` (local 20L, branded 20L) · `passes` (credits bought/left, expiry) · `orders` · `deliveries` (OTP, photo URL, empties collected, timestamps) · `jars` / `jar_ledger` (issued, returned, lost per customer and partner) · `deposits` · `payments` (Razorpay) · `settlements` (weekly per partner) · `referrals` (guard codes, customer codes) · `b2b_accounts` · `invoices` (GST) · `tickets` (support)

---

## 7. Tech stack (lean, one small team can run it)

| Layer | Choice | Why |
|---|---|---|
| Website + customer PWA + admin | **Next.js** (one codebase, three areas) | SEO for the website, installable PWA, cheap to host on Vercel |
| Partner/rider app | **React Native (Expo)** or **Flutter**, Android first | Offline-tolerant, camera, push, works on low-end phones |
| Backend + database | **Supabase** (Postgres + auth + storage + realtime) or Node/NestJS + Postgres | Realtime order board, POD photo storage, row-level security |
| Payments | **Razorpay** (UPI, payment links, UPI AutoPay subscriptions, refunds) | Deposit refunds and subscriptions in one gateway |
| WhatsApp | **Interakt / Wati / Gupshup** WhatsApp Business API | Order by WhatsApp, notifications, renewal nudges |
| Call masking | **Exotel** or MyOperator | Proxy numbers for rider ↔ customer |
| OTP SMS | MSG91 | Login OTP |
| Maps | Google Maps / Places (only for society geo-pins) | Keep usage low to control cost |
| Push | Firebase Cloud Messaging | Partner new-order alerts |
| Invoices | Generated PDF with GST fields (or Zoho Books integration) | B2B monthly invoices |
| Analytics | PostHog (free tier) | Funnels: visit → signup → first jar → pass |

**Rough build cost (India, freelancers or small agency):** MVP ₹3–6 lakh, or 2 full-stack developers × 8–10 weeks. Running cost about ₹15–20k/month (WhatsApp API, Exotel, hosting, SMS). Get 2–3 quotes; agency prices vary a lot.

---

## 8. Corrected unit economics

**Per jar (local ISI, pass price):** retail ₹60 − partner ₹42 − gateway ~₹1.2 − masking/SMS ~₹1 = **~₹15.8 contribution**

**Zone 1 at 250 customers (as in the original):** ₹18k/month net. Still valid, *excluding* society-app ads and team salaries.

**What it takes to be a real business:**

| | 1 zone | 3 zones | 5 zones |
|---|---|---|---|
| Active customers | 250 | 900 | 1,600 |
| Jars/month (incl. B2B) | 2,000 | 7,000 | 13,000 |
| Gross profit (~₹17/jar) | ₹34k | ₹1.19L | ₹2.2L |
| Tech + tools | ₹18k | ₹22k | ₹28k |
| Ops/support staff | — | ₹25k (1 person) | ₹50k (2 people) |
| Marketing (steady state) | ₹10k | ₹30k | ₹50k |
| **Net before founder pay** | **~₹6k** | **~₹42k** | **~₹92k** |

The product build cost (₹3–6L) only pays back across **multiple zones**. So build the system so a new zone is a config change, not new code.

**Levers to improve margin:** B2B accounts (higher volume per stop), branded jars (bigger absolute spread), auto-refill subscriptions (less marketing per order), and society batching (better partner rate negotiation).

---

## 9. 12-week timeline

| Weeks | Ops / business track | Product track |
|---|---|---|
| **1–2** | Entity, GST, FSSAI (confirm licence type). Pick one zone. Sign 2 partners + 1 backup. Order neck tags. | Finalise scope. Wireframes for 4 surfaces. Set up Supabase, Razorpay, WhatsApp API, Exotel accounts (approvals take 1–3 weeks, start now). |
| **3–4** | **Soft launch on WhatsApp + Google Sheets** with 20–30 friendly customers. Guard referral program in 5 societies. | Backend + data model. Customer PWA: login, address, buy pass, refill. |
| **5–6** | Expand to 15 societies. Start B2B walk-ins. Measure trial→pass conversion and CAC per channel. | Partner app: accept, OTP + photo delivery, masked call. Admin: order board, assignment. |
| **7–8** | Target 100 active customers. | Settlements, jar ledger, deposit refunds, referrals. Marketing website + SEO pages. |
| **9–10** | Move WhatsApp customers onto the PWA (WhatsApp stays as an ordering channel connected to the new backend). | Testing with real partners. Bug fixes. **Go live.** Turn off Sheets/Tookan. |
| **11–12** | Target 250 active customers, 50+ deliveries/day. | Release 2 starts: auto-refill, B2B invoicing, ratings. |

### Scale gate (before Zone 2 and native apps)
Hold all of these for 30 consecutive days:
- **50+ deliveries/day** in Zone 1 (100/day is the gate for native apps, about 500 customers)
- **≥75% pass renewal**
- **≤2% monthly jar loss**
- **≥90% on-time delivery** (within promised slot)
- **CAC payback within 2 months**

---

## 10. KPIs to show on the admin dashboard from day one

North star: **paid jars delivered per week.**
Supporting: active customers (ordered in the last 30 days) · pass renewal % · orders per customer per month · on-time % · partner acceptance % · trial → paid conversion · CAC by channel (guard, society app, B2B, flyer) · jar loss % · deposit refunds pending · leakage alerts (stopped ordering but still holding jars).

---

## 11. Key risks

| Risk | Mitigation |
|---|---|
| Partner plant not genuinely BIS-certified (common with local RO jars) | Verify the BIS licence number on the BIS portal. Visit the plant. Run a quarterly water test, with the report shown in the app. |
| Partner takes customers offline anyway | §4 locks plus diversified partners per zone, so no single partner owns the customer base |
| Lift/gate access denied for riders | Store gate instructions per society. Rider pre-registration in MyGate. |
| Jar loss | Deposit ≥ jar cost. QR jar ledger. Monthly reconciliation per partner. |
| Monsoon/peak demand spikes | Backup partner per zone. Surge slot limits in the app. |
| Deposit money misused | Separate bank account. Shown as a liability in the books. |
| WhatsApp / Exotel / Razorpay approval delays | Apply in Week 1. Have the website policy pages live before the Razorpay KYC. |

---

## 12. Decisions you need to make

1. **Brand name** and domain (needed for the website, WhatsApp display name, jar tags).
2. **Zone 1** — pick one of Lokhandwala, Hiranandani Powai, Malad West or Ghodbunder Road.
3. **Build team** — freelancers, an agency, or a technical co-founder.
4. **Product mix at launch** — local ISI only, or local + branded (Bisleri/Bailley)?
5. **Own branded jars vs partner's jars** — affects deposit size, jar ledger and switching cost.
