/**
 * In-app subscriptions (App Store / Google Play) through RevenueCat — store rules require their billing for
 * digital subscriptions bought inside the app. The SDK is a native module: it works in an EAS / dev build,
 * not in Expo Go or on the web; every call is guarded so those keep working (the panel then shows no buy button).
 * The server webhook (`/api/billing/revenuecat/webhook`) is what actually gives the account its plan.
 */
import { Platform } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';

export type IapPlan = 'basic' | 'pro' | 'vip';
export type MobileBillingConfig = {
  enabled: boolean;
  ios_key: string | null;
  android_key: string | null;
  products: Record<IapPlan, string>;
};
export type StorePackage = { plan: IapPlan; priceString: string; pkg: PurchasesPackage };

type PurchasesModule = typeof import('react-native-purchases').default;

let configuredFor: string | null = null;

function sdk(): PurchasesModule | null {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-purchases') as { default?: PurchasesModule };
    return mod?.default ?? null;
  } catch {
    return null;
  }
}

/** Configure the SDK for this account. Returns false when purchases cannot work on this build/platform. */
export async function initIap(cfg: MobileBillingConfig | null, userId: number | null | undefined): Promise<boolean> {
  const P = sdk();
  if (!P || !cfg?.enabled || !userId) return false;
  const key = Platform.OS === 'ios' ? cfg.ios_key : cfg.android_key;
  if (!key) return false;
  try {
    const appUserID = String(userId);
    if (configuredFor === null) {
      P.configure({ apiKey: key, appUserID });
      configuredFor = appUserID;
    } else if (configuredFor !== appUserID) {
      await P.logIn(appUserID);
      configuredFor = appUserID;
    }
    return true;
  } catch {
    return false;
  }
}

export function planForProduct(productId: string, products: Record<IapPlan, string>): IapPlan | null {
  const id = productId.toLowerCase();
  for (const plan of ['vip', 'pro', 'basic'] as IapPlan[]) {
    if (id.includes(products[plan].toLowerCase())) return plan;
  }
  return null;
}

/** Store packages of the current offering, with the store's own localized price. */
export async function getPackages(cfg: MobileBillingConfig): Promise<StorePackage[]> {
  const P = sdk();
  if (!P || configuredFor === null) return [];
  try {
    const offerings = await P.getOfferings();
    const pkgs = offerings.current?.availablePackages ?? [];
    const out: StorePackage[] = [];
    for (const pkg of pkgs) {
      const plan = planForProduct(pkg.product.identifier, cfg.products);
      if (plan && !out.some((o) => o.plan === plan)) out.push({ plan, priceString: pkg.product.priceString, pkg });
    }
    return out;
  } catch {
    return [];
  }
}

export type BuyResult = { ok: true } | { ok: false; cancelled: boolean; message?: string };

export async function buy(pkg: PurchasesPackage): Promise<BuyResult> {
  const P = sdk();
  if (!P) return { ok: false, cancelled: false };
  try {
    await P.purchasePackage(pkg);
    return { ok: true };
  } catch (e) {
    const err = e as { userCancelled?: boolean | null; message?: string };
    return { ok: false, cancelled: !!err?.userCancelled, message: err?.message };
  }
}

export async function restore(): Promise<boolean> {
  const P = sdk();
  if (!P || configuredFor === null) return false;
  try {
    await P.restorePurchases();
    return true;
  } catch {
    return false;
  }
}
