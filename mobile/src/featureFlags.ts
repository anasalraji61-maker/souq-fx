/**
 * Build flags for panels that stay hidden in the store build until they have a licensed source
 * (`docs/DECISIONS-ANAS.md`). The code stays; only the entry points check these.
 * Flip to `true` for a dev build. Any screen that opens one of these panels checks the flag.
 */

/** Decision 5: «المحلّلون» (`AnalystsPanel`) and «إجماع التواصل» (`SocialConsensusPanel`). */
export const SHOW_UNLICENSED_SIGNAL_PANELS = false;

/** Decision 6: text news feed (`NewsPanel`). The economic calendar and `NewsRiskBanner` stay. */
export const SHOW_NEWS_FEED = false;

/**
 * Decision 10: subscription plans, commissions and the referral network (`SubscriptionPlansPanel`,
 * `CommissionPlanPanel`, `NetworkTreePanel`, the role/referral box and the sponsor-code sign-up fields
 * in `AccountScreen`) — multi-level referral schemes draw extra store review. Hidden in the first release.
 */
export const SHOW_REFERRAL_AND_PLANS = false;
