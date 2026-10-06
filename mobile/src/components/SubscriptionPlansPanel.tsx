import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Linking, Platform, useWindowDimensions } from 'react-native';
import { colors, radii, spacing, numeric, buttons } from '../theme';
import { useI18n } from '../i18n/I18nContext';
import { useAuth } from '../context/AuthContext';
import { api, API_URL, type PlanInfo } from '../api';
import { buy, getPackages, initIap, restore, type IapPlan, type MobileBillingConfig, type StorePackage } from '../iap';

/**
 * Subscription plans inside the app. Plans, limits and the account's current plan come from the server
 * (`/api/plan`); purchases go through the App Store / Google Play (RevenueCat, `iap.ts`) and the server
 * webhook activates the plan. The panel renders nothing when in-app billing is not configured on the server
 * or not available on this build — no price is shown without a way to buy it.
 */

const PAID: IapPlan[] = ['basic', 'pro', 'vip'];

function limitText(v: number | null | undefined, unlimited: string): string {
  return v === null || v === undefined ? unlimited : String(v);
}

export function SubscriptionPlansPanel() {
  const { t, rtl } = useI18n();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const stacked = width < 760;
  const align = rtl ? ('right' as const) : ('left' as const);
  const [cfg, setCfg] = useState<MobileBillingConfig | null>(null);
  const [ready, setReady] = useState(false);
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [packages, setPackages] = useState<StorePackage[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadPlan = useCallback(async () => {
    try {
      const p = await api.plan();
      setPlan(p);
      return p;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      let c: MobileBillingConfig | null = null;
      try {
        c = await api.mobileBillingConfig();
      } catch {
        c = null;
      }
      if (!alive) return;
      setCfg(c);
      await loadPlan();
      const ok = await initIap(c, user?.user_id);
      if (ok && c) {
        const pk = await getPackages(c);
        if (alive) setPackages(pk);
      }
      if (alive) setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, [user?.user_id, loadPlan]);

  if (!ready) return null;
  // Nothing to sell here: keep the account screen clean (web users subscribe on the website).
  if (!cfg?.enabled || (Platform.OS !== 'ios' && Platform.OS !== 'android')) return null;

  const waitForPlan = async (target: IapPlan) => {
    for (let i = 0; i < 10; i++) {
      const p = await loadPlan();
      if (p && p.plan === target) return true;
      await new Promise((r) => setTimeout(r, 2000));
    }
    return false;
  };

  const onBuy = async (sp: StorePackage) => {
    if (!user) {
      setNotice(t.iapLoginFirst);
      return;
    }
    setBusy(sp.plan);
    setNotice(null);
    const r = await buy(sp.pkg);
    if (r.ok) {
      setNotice(t.iapActivating);
      const done = await waitForPlan(sp.plan);
      setNotice(done ? t.iapActivated : t.iapActivatingSlow);
    } else if (!r.cancelled) {
      setNotice(t.iapFailed);
    }
    setBusy(null);
  };

  const onRestore = async () => {
    setBusy('restore');
    setNotice(null);
    const ok = await restore();
    await new Promise((r) => setTimeout(r, 1500));
    await loadPlan();
    setNotice(ok ? t.iapRestored : t.iapRestoreFailed);
    setBusy(null);
  };

  const current = plan?.plan ?? 'free';
  const limits = plan?.plan_limits ?? {};
  const legal = (path: string) => () => void Linking.openURL(`${API_URL.replace(/\/$/, '')}${path}`);

  return (
    <View style={styles.section} testID="plans-panel">
      <Text style={[styles.title, { textAlign: align }]}>{t.iapTitle}</Text>
      <Text style={[styles.subtitle, { textAlign: align }]}>
        {t.iapCurrent.replace('{plan}', plan?.label ?? '—')}
        {plan?.days_left !== null && plan?.days_left !== undefined && current !== 'free'
          ? ` · ${t.iapDaysLeft.replace('{n}', String(plan.days_left))}`
          : ''}
      </Text>

      <View style={[styles.cards, stacked && styles.cardsStacked, rtl && !stacked && styles.rowRtl]}>
        {PAID.map((p) => {
          const sp = packages.find((x) => x.plan === p);
          const l = limits[p] ?? {};
          const isCurrent = current === p;
          return (
            <View key={p} style={[styles.card, stacked && styles.cardStacked, p === 'pro' && styles.cardPro]}>
              <Text style={[styles.planName, { textAlign: align }]}>{plan?.labels?.[p] ?? p}</Text>
              <Text style={[styles.price, { textAlign: align }]}>
                {sp ? sp.priceString : '—'} <Text style={styles.perMonth}>{t.iapPerMonth}</Text>
              </Text>
              <View style={styles.divider} />
              {[
                t.iapCharts.replace('{n}', limitText(l.charts, t.iapUnlimited)),
                t.iapIndicators.replace('{n}', limitText(l.indicators_per_chart, t.iapUnlimited)),
                t.iapAlerts.replace('{n}', limitText(l.alerts, t.iapUnlimited)),
                t.iapAi.replace('{n}', limitText(l.ai_daily, t.iapUnlimited)),
              ].map((f) => (
                <Text key={f} style={[styles.feature, { textAlign: align }]}>
                  • {f}
                </Text>
              ))}
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !sp || isCurrent || busy !== null }}
                disabled={!sp || isCurrent || busy !== null}
                onPress={() => sp && void onBuy(sp)}
                style={({ pressed }) => [
                  styles.buyBtn,
                  (!sp || isCurrent) && styles.buyBtnOff,
                  pressed && { opacity: buttons.pressedOpacity },
                ]}
              >
                {busy === p ? (
                  <ActivityIndicator color={colors.onAccent} />
                ) : (
                  <Text style={[styles.buyText, (!sp || isCurrent) && styles.buyTextOff]}>
                    {isCurrent ? t.iapCurrentBtn : sp ? t.iapSubscribe : t.iapUnavailable}
                  </Text>
                )}
              </Pressable>
            </View>
          );
        })}
      </View>

      {notice ? <Text style={[styles.notice, { textAlign: align }]}>{notice}</Text> : null}

      <Pressable accessibilityRole="button" onPress={() => void onRestore()} disabled={busy !== null} style={styles.restore} hitSlop={6}>
        {busy === 'restore' ? <ActivityIndicator color={colors.accent} /> : <Text style={styles.restoreText}>{t.iapRestore}</Text>}
      </Pressable>

      <Text style={[styles.disclosure, { textAlign: align }]}>
        {Platform.OS === 'ios' ? t.iapDisclosureIos : t.iapDisclosureAndroid}
      </Text>
      <View style={[styles.links, rtl && styles.rowRtl]}>
        <Pressable accessibilityRole="link" onPress={legal('/legal/terms.html')} hitSlop={6}>
          <Text style={styles.link}>{t.iapTerms}</Text>
        </Pressable>
        <Pressable accessibilityRole="link" onPress={legal('/legal/privacy.html')} hitSlop={6}>
          <Text style={styles.link}>{t.iapPrivacy}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
    gap: spacing.sm,
  },
  title: { color: colors.text, fontSize: 15, fontWeight: '600' },
  subtitle: { color: colors.textMuted, fontSize: 12 },
  cards: { flexDirection: 'row', gap: spacing.sm },
  cardsStacked: { flexDirection: 'column' },
  rowRtl: { flexDirection: 'row-reverse' },
  card: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgElevated,
    padding: spacing.md,
    gap: 4,
  },
  cardStacked: { flex: 0 },
  cardPro: { borderColor: colors.accent },
  planName: { color: colors.text, fontSize: 14, fontWeight: '600' },
  price: { ...numeric, color: colors.text, fontSize: 20, fontWeight: '700' },
  perMonth: { color: colors.textMuted, fontSize: 12, fontWeight: '400' },
  divider: { height: 1, backgroundColor: colors.borderSoft, marginVertical: spacing.xs },
  feature: { color: colors.textMuted, fontSize: 12, lineHeight: 18 },
  buyBtn: {
    marginTop: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyBtnOff: { backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  buyText: { color: colors.onAccent, fontWeight: '600', fontSize: 13 },
  buyTextOff: { color: colors.textMuted },
  notice: { color: colors.warn, fontSize: 12 },
  restore: { alignSelf: 'center', paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  restoreText: { color: colors.accent, fontSize: 13, fontWeight: '500' },
  disclosure: { color: colors.textDim, fontSize: 11, lineHeight: 16 },
  links: { flexDirection: 'row', gap: spacing.md, justifyContent: 'center' },
  link: { color: colors.accent, fontSize: 12, textDecorationLine: 'underline' },
});
