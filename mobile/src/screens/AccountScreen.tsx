import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Linking,
} from 'react-native';
import { colors, radii, spacing, buttons, numeric } from '../theme';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../i18n/I18nContext';
import {
  registerPushToken,
  ensureAlertNotifications,
  getNotificationPermissionState,
  type NotificationPermissionState,
} from '../notifications';
import { CommissionPlanPanel, isRoleId } from '../components/CommissionPlanPanel';
import { NetworkTreePanel } from '../components/NetworkTreePanel';
import { SubscriptionPlansPanel } from '../components/SubscriptionPlansPanel';
import { OnboardingOverlay } from '../components/OnboardingOverlay';
import { markOnboardingSeen } from '../onboarding';
import { api } from '../api';
import { confirmDestructive } from '../chart/confirmDestructive';

type RoleId = 'trader' | 'trainer' | 'broker' | 'agent' | 'company';

type SideId = 'left' | 'right';

export function AccountScreen() {
  const { user, loading, login, register, logout, deleteAccount } = useAuth();
  const { t, lang, setLang, langs, rtl } = useI18n();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<RoleId>('trader');
  const [sponsorCode, setSponsorCode] = useState('');
  const [side, setSide] = useState<SideId>('left');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [netError, setNetError] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [notifState, setNotifState] = useState<NotificationPermissionState>('undetermined');
  const [notifBusy, setNotifBusy] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [net, setNet] = useState<{
    referral_code: string;
    role: string;
    left_count: number;
    right_count: number;
    rates?: {
      effective_rate: number;
      balanced: boolean;
      unlocked_levels: number[];
      next_level: number | null;
      role_label: string;
    };
    directs?: { username: string; side: string; role: string }[];
  } | null>(null);

  const roles = useMemo(
    () =>
      [
        { id: 'trader' as const, label: t.trader },
        { id: 'trainer' as const, label: t.trainer },
        { id: 'broker' as const, label: t.broker },
        { id: 'agent' as const, label: t.agent },
        { id: 'company' as const, label: t.company },
      ] as const,
    [t]
  );

  const align = rtl ? ('right' as const) : ('left' as const);

  const loadNetwork = useCallback(async () => {
    if (!user) {
      setNet(null);
      setNetError(false);
      return;
    }
    try {
      const res = await api.commissionsMe();
      setNet({
        referral_code: res.network.referral_code,
        role: res.network.role,
        left_count: res.network.left_count,
        right_count: res.network.right_count,
        rates: {
          effective_rate: res.rates.effective_rate,
          balanced: res.rates.balanced,
          unlocked_levels: res.rates.unlocked_levels,
          next_level: res.rates.next_level,
          role_label: res.rates.role_label,
        },
        directs: res.network.directs,
      });
      setNetError(false);
    } catch {
      setNet(null);
      setNetError(true);
    }
  }, [user]);

  useEffect(() => {
    void loadNetwork();
  }, [loadNetwork]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    void getNotificationPermissionState().then((s) => {
      if (alive) setNotifState(s);
    });
    return () => {
      alive = false;
    };
  }, [user]);

  const enableNotifications = useCallback(async () => {
    setNotifBusy(true);
    try {
      if (notifState === 'denied') {
        await Linking.openSettings();
      } else {
        const ok = await ensureAlertNotifications();
        if (ok) await registerPushToken();
      }
    } finally {
      const s = await getNotificationPermissionState();
      setNotifState(s);
      setNotifBusy(false);
    }
  }, [notifState]);

  const submit = async () => {
    setBusy(true);
    setErr(null);
    try {
      if (mode === 'login') {
        const ident = username.trim() || email.trim();
        if (!ident) throw new Error('missing identity');
        await login(ident, password);
      } else {
        if (!username.trim() || !email.trim()) throw new Error('missing fields');
        await register(username.trim(), password, {
          email: email.trim(),
          role,
          sponsor_code: sponsorCode.trim() || undefined,
          side: sponsorCode.trim() ? side : undefined,
        });
      }
      await registerPushToken();
      setPassword('');
    } catch {
      setErr(mode === 'login' ? t.loginError : t.registerError);
    } finally {
      setBusy(false);
    }
  };

  const confirmDeleteAccount = useCallback(() => {
    // `confirmDestructive` لا `Alert.alert`: الأخيرة دالّة فارغة على الويب ⇒ «حذف الحساب» لم يكن يفعل شيئاً هناك.
    confirmDestructive({
      title: t.deleteAccountConfirmTitle,
      body: t.deleteAccountConfirmBody,
      cancelText: t.cancel,
      confirmText: t.deleteAccountConfirmBtn,
      onConfirm: () => {
        setDeleteBusy(true);
        setErr(null);
        deleteAccount()
          .catch(() => setErr(t.deleteAccountError))
          .finally(() => setDeleteBusy(false));
      },
    });
  }, [t, deleteAccount]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
      <Text style={[styles.title, { textAlign: align }]}>{t.accountTitle}</Text>
      <Text style={[styles.sub, { textAlign: align }]}>{t.accountSub}</Text>

      <View style={styles.langBox}>
        <Text style={[styles.fieldLabel, { textAlign: align }]}>{t.language}</Text>
        <View style={[styles.langRow, rtl && styles.langRowRtl]}>
          {langs.map((l) => (
            <Pressable
              accessibilityState={{ selected: lang === l.id }}
              accessibilityRole="button"
              key={l.id}
              style={({ pressed }) => [
                styles.langChip,
                lang === l.id && styles.langChipOn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => void setLang(l.id)}
            >
              <Text style={[styles.langText, lang === l.id && styles.langTextOn]}>{l.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.accReplayTourA11y}
        style={({ pressed }) => [
          styles.langChip,
          styles.tourBtn,
          rtl && styles.tourBtnRtl,
          pressed && {
            opacity: buttons.pressedOpacity,
            transform: [{ scale: buttons.pressedScale }],
          },
        ]}
        onPress={() => setTourOpen(true)}
      >
        <Text style={styles.langText}>{t.accReplayTour}</Text>
      </Pressable>
      <OnboardingOverlay
        visible={tourOpen}
        onDone={() => {
          setTourOpen(false);
          void markOnboardingSeen();
        }}
      />

      <SubscriptionPlansPanel />
      <CommissionPlanPanel />
      <NetworkTreePanel
        enabled={!!user}
        previewName={user?.username}
        onChanged={() => void loadNetwork()}
      />

      {user ? (
        <View style={styles.card}>
          <Text style={[styles.label, { textAlign: align }]}>{t.hello}</Text>
          <Text style={[styles.user, { textAlign: align }]}>{user.username}</Text>
          {user.email ? (
            <Text style={[styles.emailLine, { textAlign: align }]}>{user.email}</Text>
          ) : null}

          {net ? (
            <View style={styles.netBox}>
              <Text style={[styles.netLine, { textAlign: align }]}>
                {/* `role_label` عربي ثابت من الخادم (`ROLE_LABELS_AR`) ⇒ الاسم من القاموس بمعرّف الدور. */}
                {isRoleId(net.role) ? t[net.role] : (net.rates?.role_label ?? net.role)} · {net.referral_code}
              </Text>
              <View style={[styles.legs, rtl && styles.legsRtl]}>
                <View style={styles.leg}>
                  <Text style={styles.legTitle}>{t.left}</Text>
                  <Text style={styles.legNum}>{net.left_count}</Text>
                </View>
                <View style={styles.leg}>
                  <Text style={styles.legTitle}>{t.right}</Text>
                  <Text style={styles.legNum}>{net.right_count}</Text>
                </View>
              </View>
            </View>
          ) : netError ? (
            <Text style={[styles.err, { textAlign: align }]}>{t.accNetLoadError}</Text>
          ) : null}

          <View style={styles.netBox}>
            <Text style={[styles.netLine, { textAlign: align }]}>
              {t.notifications}:{' '}
              {notifState === 'granted'
                ? t.notifStatusGranted
                : notifState === 'denied'
                  ? t.notifStatusDenied
                  : notifState === 'unsupported'
                    ? t.notifStatusUnsupported
                    : t.notifStatusUndetermined}
            </Text>
            {notifState !== 'granted' && notifState !== 'unsupported' ? (
              <Pressable
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.notifBtn,
                  pressed && {
                    opacity: buttons.pressedOpacity,
                    transform: [{ scale: buttons.pressedScale }],
                  },
                ]}
                onPress={() => void enableNotifications()}
                disabled={notifBusy}
                accessibilityState={{ disabled: notifBusy, busy: notifBusy }}
              >
                <Text style={styles.notifBtnText}>
                  {notifBusy
                    ? '...'
                    : notifState === 'denied'
                      ? t.notifOpenSettingsBtn
                      : t.notifEnableBtn}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.btn,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={() => logout()}
          >
            <Text style={styles.btnText}>{t.logout}</Text>
          </Pressable>

          {err ? <Text style={[styles.err, { textAlign: align }]}>{err}</Text> : null}
          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.dangerBtn,
              pressed && {
                opacity: buttons.pressedOpacity,
                transform: [{ scale: buttons.pressedScale }],
              },
            ]}
            onPress={confirmDeleteAccount}
            disabled={deleteBusy}
            accessibilityState={{ disabled: deleteBusy, busy: deleteBusy }}
          >
            <Text style={styles.dangerBtnText}>{deleteBusy ? '...' : t.deleteAccount}</Text>
          </Pressable>
        </View>
      ) : null}

      {!user ? (
        <View style={styles.card}>
          <View style={[styles.tabs, rtl && styles.tabsRtl]}>
            <Pressable
              accessibilityState={{ selected: mode === 'login' }}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.tab,
                mode === 'login' && styles.tabOn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => setMode('login')}
            >
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextOn]}>{t.login}</Text>
            </Pressable>
            <Pressable
              accessibilityState={{ selected: mode === 'register' }}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.tab,
                mode === 'register' && styles.tabOn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={() => setMode('register')}
            >
              <Text style={[styles.tabText, mode === 'register' && styles.tabTextOn]}>
                {t.register}
              </Text>
            </Pressable>
          </View>

          <View style={styles.fieldBox}>
            <Text style={[styles.fieldLabel, { textAlign: align }]}>{t.name}</Text>
            <TextInput
              style={[styles.inputInBox, { textAlign: align }]}
              value={username}
              onChangeText={setUsername}
              placeholder={t.namePlaceholder}
              maxLength={32}
              placeholderTextColor={colors.textDim}
              autoCapitalize="none"
              returnKeyType="done"
              underlineColorAndroid="transparent"
              clearButtonMode="while-editing"
              keyboardAppearance="dark"
              textContentType="name"
              autoComplete="name"
              selectionColor={colors.accent}
              accessibilityLabel={t.name}
            />
          </View>

          <View style={styles.fieldBox}>
            <Text style={[styles.fieldLabel, { textAlign: align }]}>{t.email}</Text>
            <TextInput
              style={[styles.inputInBox, { textAlign: align }]}
              value={email}
              onChangeText={setEmail}
              placeholder={t.emailPlaceholder}
              placeholderTextColor={colors.textDim}
              autoCapitalize="none"
              keyboardType="email-address"
              returnKeyType="done"
              underlineColorAndroid="transparent"
              clearButtonMode="while-editing"
              keyboardAppearance="dark"
              textContentType="emailAddress"
              autoComplete="email"
              selectionColor={colors.accent}
              accessibilityLabel={t.email}
            />
          </View>

          <View style={styles.fieldBox}>
            <Text style={[styles.fieldLabel, { textAlign: align }]}>{t.password}</Text>
            <TextInput
              style={[styles.inputInBox, { textAlign: align }]}
              value={password}
              onChangeText={setPassword}
              placeholder={t.passwordPlaceholder}
              placeholderTextColor={colors.textDim}
              secureTextEntry
              returnKeyType="done"
              underlineColorAndroid="transparent"
              keyboardAppearance="dark"
              textContentType="password"
              autoComplete="password"
              selectionColor={colors.accent}
              accessibilityLabel={t.password}
            />
            {err ? <Text style={[styles.err, { textAlign: align }]}>{err}</Text> : null}
            <Pressable
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.btn,
                pressed && {
                  opacity: buttons.pressedOpacity,
                  transform: [{ scale: buttons.pressedScale }],
                },
              ]}
              onPress={submit}
              disabled={busy}
              accessibilityState={{ disabled: busy, busy }}
            >
              <Text style={styles.btnText}>
                {busy ? '...' : mode === 'login' ? t.enter : t.createAccount}
              </Text>
            </Pressable>
          </View>

          {mode === 'register' ? (
            <>
              <Text style={[styles.label, { textAlign: align }]}>{t.accountType}</Text>
              <View style={[styles.roleRow, rtl && styles.roleRowRtl]}>
                {roles.map((r) => (
                  <Pressable
                    accessibilityState={{ selected: role === r.id }}
                    accessibilityRole="button"
                    key={r.id}
                    style={({ pressed }) => [
                      styles.roleChip,
                      role === r.id && styles.roleChipOn,
                      pressed && {
                        opacity: buttons.pressedOpacity,
                        transform: [{ scale: buttons.pressedScale }],
                      },
                    ]}
                    onPress={() => setRole(r.id)}
                  >
                    <Text style={[styles.roleText, role === r.id && styles.roleTextOn]}>
                      {r.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <TextInput
                style={[styles.input, { textAlign: align }]}
                value={sponsorCode}
                onChangeText={setSponsorCode}
                placeholder={t.sponsorCode}
                placeholderTextColor={colors.textDim}
                autoCapitalize="characters"
                autoCorrect={false}
                returnKeyType="done"
                underlineColorAndroid="transparent"
                clearButtonMode="while-editing"
                keyboardAppearance="dark"
                selectionColor={colors.accent}
                accessibilityLabel={t.sponsorCode}
              />
              {sponsorCode.trim() ? (
                <>
                  <Text style={[styles.label, { textAlign: align }]}>{t.underSponsor}</Text>
                  <View style={[styles.tabs, rtl && styles.tabsRtl]}>
                    <Pressable
                      accessibilityState={{ selected: side === 'left' }}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.tab,
                        side === 'left' && styles.tabOn,
                        pressed && {
                          opacity: buttons.pressedOpacity,
                          transform: [{ scale: buttons.pressedScale }],
                        },
                      ]}
                      onPress={() => setSide('left')}
                    >
                      <Text style={[styles.tabText, side === 'left' && styles.tabTextOn]}>
                        {t.left}
                      </Text>
                    </Pressable>
                    <Pressable
                      accessibilityState={{ selected: side === 'right' }}
                      accessibilityRole="button"
                      style={({ pressed }) => [
                        styles.tab,
                        side === 'right' && styles.tabOn,
                        pressed && {
                          opacity: buttons.pressedOpacity,
                          transform: [{ scale: buttons.pressedScale }],
                        },
                      ]}
                      onPress={() => setSide('right')}
                    >
                      <Text style={[styles.tabText, side === 'right' && styles.tabTextOn]}>
                        {t.right}
                      </Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  wrap: { padding: spacing.lg, gap: spacing.md, backgroundColor: colors.bg, minHeight: '100%' },
  title: { color: colors.text, fontSize: 22, fontWeight: '500' },
  sub: { color: colors.textDim, fontSize: 12 },
  langBox: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  langRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  langRowRtl: { flexDirection: 'row-reverse' },
  langChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
  },
  langChipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  langText: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  langTextOn: { color: colors.accent },
  tourBtn: { alignSelf: 'flex-start' },
  tourBtnRtl: { alignSelf: 'flex-end' },
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 10,
  },
  label: { color: colors.textMuted, fontSize: 12, fontWeight: '500' },
  user: { color: colors.accent, fontWeight: '500', fontSize: 18 },
  emailLine: { color: colors.textMuted, fontSize: 12, marginTop: -4 },
  tabs: { flexDirection: 'row', gap: spacing.sm },
  tabsRtl: { flexDirection: 'row-reverse' },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  tabOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  tabText: { color: colors.textMuted, fontWeight: '500' },
  tabTextOn: { color: colors.accent },
  input: {
    backgroundColor: colors.bgPanel,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    padding: 10,
  },
  fieldBox: {
    backgroundColor: colors.bgPanel,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  fieldLabel: {
    color: colors.accent,
    fontWeight: '500',
    fontSize: 12,
  },
  inputInBox: {
    backgroundColor: colors.bgElevated,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    color: colors.text,
    padding: spacing.md,
    minHeight: 44,
  },
  err: { color: colors.bear, fontSize: 12 },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: radii.sm,
    paddingVertical: spacing.md,
    alignItems: 'center',
    shadowColor: buttons.shadowColor,
    shadowOpacity: buttons.shadowOpacity,
    shadowRadius: buttons.shadowRadius,
    shadowOffset: { width: 0, height: buttons.shadowOffsetY },
    elevation: buttons.elevation,
  },
  btnText: { color: colors.onAccent, fontWeight: '500' },
  dangerBtn: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.bear,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  dangerBtnText: { color: colors.bear, fontWeight: '500' },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  roleRowRtl: { flexDirection: 'row-reverse' },
  roleChip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgPanel,
  },
  roleChipOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  roleText: { color: colors.textMuted, fontSize: 11, fontWeight: '500' },
  roleTextOn: { color: colors.accent },
  netBox: {
    backgroundColor: colors.bgPanel,
    borderRadius: radii.sm,
    padding: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  netLine: { color: colors.textMuted, fontSize: 12 },
  notifBtn: {
    alignSelf: 'flex-start',
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: 'transparent',
  },
  notifBtnText: { color: colors.accent, fontWeight: '500', fontSize: 12 },
  legs: { flexDirection: 'row', gap: spacing.sm },
  legsRtl: { flexDirection: 'row-reverse' },
  leg: {
    flex: 1,
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  legTitle: { color: colors.textDim, fontSize: 11, fontWeight: '500' },
  legNum: { ...numeric, color: colors.accent, fontSize: 22, fontWeight: '500' },
});
