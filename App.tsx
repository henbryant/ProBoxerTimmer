import { useEffect, useEffectEvent, useState } from 'react';
import {
  Alert, BackHandler, Image, Linking, Modal, Pressable, StatusBar, StyleSheet,
  Text, useWindowDimensions, View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { useKeepAwake } from 'expo-keep-awake';
import { clockLayout } from './src/clockLayout';
import { colors } from './src/colors';
import { SettingWheels } from './src/SettingWheels';
import { defaults, formatTime, type Settings } from './src/timer';
import { useLastWorkoutSettings } from './src/useLastWorkoutSettings';
import { useWorkout } from './src/useWorkout';
import { useGong } from './src/useGong';

const clockFonts = { DSEG: require('./assets/DSEG7Classic-Bold.ttf') };
// This font includes the glyphs used in the settings motto.
const mottoFonts = { KouzanBrush: require('./assets/KouzanBrush-Motto.otf') };
const helpSite = 'https://henbryant.github.io/ProBoxerTimmer';

function HelpLinksDialog({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  async function selectPage(page: 'privacy-policy' | 'support') {
    onClose();
    try {
      await Linking.openURL(`${helpSite}/${page}.html`);
    } catch {
      Alert.alert('ページを開けませんでした', 'しばらくしてからもう一度お試しください。');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape']}>
      <SafeAreaView style={s.dialogOverlay}>
        <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={onClose} />
        <View accessibilityViewIsModal onAccessibilityEscape={onClose} style={s.helpDialog}>
          <View style={s.dialogHeader}>
            <Text accessibilityRole="header" maxFontSizeMultiplier={1.6} style={s.dialogTitle}>
              プライバシーとサポート
            </Text>
            <Pressable accessibilityRole="button" accessibilityLabel="閉じる" onPress={onClose}
              style={({ pressed }) => [s.dialogClose, pressed && s.pressed]}>
              <Text allowFontScaling={false} style={s.dialogCloseIcon}>×</Text>
            </Pressable>
          </View>
          <View style={s.dialogLinks}>
            <Pressable accessibilityRole="link" accessibilityLabel="プライバシーポリシー"
              onPress={() => selectPage('privacy-policy')}
              style={({ pressed }) => [s.dialogAction, pressed && s.pressed]}>
              <Text maxFontSizeMultiplier={1.6} style={s.dialogLink}>プライバシーポリシー</Text>
              <Text allowFontScaling={false} style={s.dialogLinkIcon}>↗</Text>
            </Pressable>
            <Pressable accessibilityRole="link" accessibilityLabel="サポート・お問い合わせ"
              onPress={() => selectPage('support')}
              style={({ pressed }) => [s.dialogAction, pressed && s.pressed]}>
              <Text maxFontSizeMultiplier={1.6} style={s.dialogLink}>サポート・お問い合わせ</Text>
              <Text allowFontScaling={false} style={s.dialogLinkIcon}>↗</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function KeepScreenOn() {
  useKeepAwake('boxing-timer');
  return null;
}

type TimerIcon = 'pause' | 'play' | 'stop' | 'gear' | 'back' | 'restart' | 'info';

function IconButton({ icon, label, onPress, disabled = false }: {
  icon: TimerIcon; label: string; onPress: () => void; disabled?: boolean;
}) {
  const icons = {
    pause: <View style={s.pauseIcon}><View style={s.pauseBar} /><View style={s.pauseBar} /></View>,
    play: <View style={s.playIcon} />,
    stop: <View style={s.stopIcon} />,
    gear: <Image source={require('./assets/icons/settings.png')} style={s.iconImage} accessible={false} />,
    back: <Image source={require('./assets/icons/back.png')} style={s.iconImage} accessible={false} />,
    restart: <Image source={require('./assets/icons/reset.png')} style={s.iconImage} accessible={false} />,
    info: <View style={s.infoIcon}><Text allowFontScaling={false} style={s.infoIconLabel}>i</Text></View>,
  };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      disabled={disabled} accessibilityState={{ disabled }}
      style={({ pressed }) => [s.iconButton, disabled && s.disabled, pressed && s.pressed]}>
      {icons[icon]}
    </Pressable>
  );
}

function Clock({ seconds, landscape }: { seconds: number; landscape: boolean }) {
  const [loaded] = useFonts(clockFonts);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const time = formatTime(seconds);
  const { fontSize, scaleY } = clockLayout(bounds, landscape && loaded, time.length === 4);

  return (
    <View style={[s.center, landscape ? s.landscapeClockArea : s.clockArea]}
      onLayout={({ nativeEvent: { layout } }) => {
        setBounds({ width: layout.width, height: layout.height });
      }}>
      {fontSize > 0 && (
        <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit
          style={[s.clock, loaded && s.digital, { fontSize, transform: [{ scaleY }] }]}>
          {time}
        </Text>
      )}
    </View>
  );
}

function TimerApp() {
  const [mottoFontLoaded] = useFonts(mottoFonts);
  const gong = useGong();
  const { session, start, togglePause, rewind, stop, clear } = useWorkout(gong.ring);
  const { settings, setSettings, save, error: storageError } = useLastWorkoutSettings();
  const [draft, setDraft] = useState<Settings | null>(null);
  const [helpVisible, setHelpVisible] = useState(false);
  const [wheelVersion, setWheelVersion] = useState(0);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const wideSettings = landscape && width >= 620;
  const compactSettings = height < (landscape ? 360 : 700);
  const settingsFontScaleLimit = compactSettings ? 1.2 : 1.6;
  const ready = !session || session.ready;
  const finished = session?.frame.phase === 'finished';
  const stopped = session?.frame.phase === 'stopped';
  const terminal = finished || stopped;
  const inProgress = !ready && !terminal;

  function changeSetting(key: keyof Settings, update: (value: number) => number) {
    setDraft(previous => {
      if (!previous) return previous;
      const value = update(previous[key]);
      return previous[key] === value ? previous : { ...previous, [key]: value };
    });
  }

  function openSettings() {
    if (!settings) return;
    if (!inProgress) {
      setDraft(settings);
      return;
    }
    Alert.alert('練習を終了して設定を開きますか？', '現在の計時を終了します。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '設定を開く', style: 'destructive', onPress: () => {
        stop();
        setDraft(settings);
      } },
    ]);
  }

  function applySettings() {
    if (!draft || !settings || draft.work === 0) return;
    if (draft.work !== settings.work || draft.rest !== settings.rest || draft.rounds !== settings.rounds) {
      setSettings(draft);
      clear();
    }
    setDraft(null);
  }

  function resetSettings() {
    setDraft(defaults);
    // Remount the wheels so their scroll offsets match the restored values.
    setWheelVersion(version => version + 1);
  }

  function confirmStop() {
    Alert.alert('練習を終了しますか？', '現在の計時を終了します。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '終了する', style: 'destructive', onPress: stop },
    ]);
  }

  function confirmReset() {
    Alert.alert('タイマーをリセットしますか？', '同じ設定で第1ラウンドの開始前に戻ります。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'リセット', style: 'destructive', onPress: rewind },
    ]);
  }

  const handleBack = useEffectEvent(() => {
    if (draft) {
      setDraft(null);
      return true;
    }
    if (inProgress) {
      confirmStop();
      return true;
    }
    return false;
  });

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => handleBack());
    return () => sub.remove();
  }, []);

  const errorFontScaleLimit = draft ? settingsFontScaleLimit : undefined;
  const soundError = gong.error && (
    <Text maxFontSizeMultiplier={errorFontScaleLimit} style={s.error}>ゴング音を再生できませんでした。</Text>
  );
  const settingsError = storageError && (
    <Text accessibilityLiveRegion="polite" maxFontSizeMultiplier={errorFontScaleLimit} style={s.error}>{storageError}</Text>
  );

  if (draft) {
    const headingSize = landscape ? s.landscapeHeadingSize : s.headingSize;
    const motto = landscape && (
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        maxFontSizeMultiplier={settingsFontScaleLimit}
        style={[
          s.settingsMotto, wideSettings && s.wideSettingsMotto,
          mottoFontLoaded && s.settingsMottoBrush,
        ]}>
        夢は必ず実現する事
      </Text>
    );

    return (
      <View style={[s.settings, landscape && s.landscapeSettings]}>
        <StatusBar barStyle="light-content" hidden={landscape} />
        <View style={[s.form, landscape && s.wideForm]}>
          <View style={s.settingsHeading}>
            <View style={s.settingsHeadingRow}>
              <View style={[s.settingsTitle, wideSettings ? s.settingsHeadingSide : s.settingsTitleFill]}>
                <IconButton icon="back" label="設定をキャンセル" onPress={() => setDraft(null)} />
                <Text accessibilityRole="header" maxFontSizeMultiplier={settingsFontScaleLimit}
                  style={[s.title, headingSize]}>設定</Text>
              </View>
              {wideSettings && motto}
              <View style={[s.settingsHelp, wideSettings && s.settingsHeadingSide]}>
                <IconButton icon="info" label="プライバシーとサポート" onPress={() => setHelpVisible(true)} />
              </View>
            </View>
            {!wideSettings && motto}
          </View>
          <View style={s.settingsBody}>
            <SettingWheels key={wheelVersion} settings={draft} wide={landscape} compact={compactSettings}
              fontScaleLimit={settingsFontScaleLimit} onChange={changeSetting} />
            {draft.work === 0 && (
              <Text maxFontSizeMultiplier={settingsFontScaleLimit} style={s.error}>ラウンド時間は1秒以上に設定してください。</Text>
            )}
            {settingsError}
            {soundError}
          </View>
          <View style={s.settingsActions}>
            <Pressable accessibilityRole="button" onPress={resetSettings}
              style={({ pressed }) => [s.settingsButton, s.resetSettingsButton, pressed && s.pressed]}>
              <Text maxFontSizeMultiplier={settingsFontScaleLimit}
                style={[s.settingsButtonLabel, s.resetSettingsLabel]}>初期値にリセット</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={draft.work === 0}
              accessibilityState={{ disabled: draft.work === 0 }} onPress={applySettings}
              style={({ pressed }) => [s.settingsButton, s.apply, draft.work === 0 && s.disabled, pressed && s.pressed]}>
              <Text maxFontSizeMultiplier={settingsFontScaleLimit} style={s.settingsButtonLabel}>確定</Text>
            </Pressable>
          </View>
        </View>
        <HelpLinksDialog visible={helpVisible} onClose={() => setHelpVisible(false)} />
      </View>
    );
  }

  if (!settings) {
    return (
      <View style={s.center}>
        <StatusBar barStyle="light-content" hidden />
        <Text style={s.loading}>設定を読み込み中…</Text>
      </View>
    );
  }

  const rest = session?.frame.phase === 'rest';
  const paused = inProgress && session?.startedAt === null;
  const phase = finished ? '練習終了' : stopped ? '停止' : rest ? '休憩' : 'Round';
  const round = session?.frame.round ?? 1;
  const clockSeconds = session?.frame.seconds ?? settings.work;

  return (
    <View style={s.timer}>
      <StatusBar barStyle="light-content" hidden />
      {session && !terminal && <KeepScreenOn />}
      <View style={s.top}>
        <IconButton icon="gear" label="設定" onPress={openSettings} />
        <View style={s.status}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}
            style={[s.phase, { color: rest ? colors.rest : colors.amber }]}>
            {phase}{!terminal && ' ' + round + '/' + settings.rounds}
          </Text>
          {paused && <Text style={s.detail}>一時停止</Text>}
          {soundError}
          {settingsError}
        </View>
        <View style={s.controls}>
          {!terminal && (
            <>
              <IconButton icon="stop" label="終了" onPress={confirmStop} disabled={ready} />
              <IconButton icon="restart" label="リセット" onPress={confirmReset} disabled={ready} />
            </>
          )}
          <IconButton icon={paused || ready || terminal ? 'play' : 'pause'}
            label={terminal ? 'もう一度開始' : ready ? '開始' : paused ? '再開' : '一時停止'}
            onPress={inProgress ? togglePause : () => {
              save(settings);
              start(settings);
            }} />
        </View>
      </View>
      <Clock seconds={clockSeconds} landscape={landscape} />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.safe}>
        <TimerApp />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  settings: { flex: 1, paddingHorizontal: 18, paddingVertical: 8 },
  landscapeSettings: { paddingVertical: 6 },
  form: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', gap: 10 },
  wideForm: { maxWidth: 820 },
  settingsHeading: { minHeight: 52, gap: 4 },
  settingsHeadingRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  settingsTitle: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  settingsTitleFill: { flex: 1 },
  settingsHeadingSide: { width: 130 },
  settingsHelp: { alignItems: 'flex-end' },
  dialogOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.65)' },
  helpDialog: { width: '90%', maxWidth: 400, borderRadius: 24, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.panel, padding: 16, gap: 20 },
  dialogHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dialogTitle: { flex: 1, color: colors.white, fontSize: 19, fontWeight: '700' },
  dialogClose: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center' },
  dialogCloseIcon: { color: colors.white, fontSize: 24 },
  dialogLinks: { gap: 10 },
  dialogAction: { flexDirection: 'row', minHeight: 56, paddingVertical: 12, paddingHorizontal: 14, gap: 12,
    alignItems: 'center', borderRadius: 14, backgroundColor: colors.background },
  dialogLink: { flex: 1, color: colors.white, fontSize: 16, fontWeight: '600' },
  dialogLinkIcon: { color: colors.amber, fontSize: 19 },
  settingsMotto: { color: colors.amber, fontSize: 44, lineHeight: 50, fontWeight: '700', textAlign: 'center' },
  settingsMottoBrush: { fontFamily: 'KouzanBrush', fontWeight: '400' },
  wideSettingsMotto: { flex: 1 },
  settingsBody: { flex: 1, justifyContent: 'center' },
  title: { color: colors.white, fontWeight: '700', flexShrink: 1 },
  headingSize: { fontSize: 34, lineHeight: 40 },
  landscapeHeadingSize: { fontSize: 26, lineHeight: 32 },
  error: { color: colors.error, marginTop: 4 },
  loading: { color: colors.muted, fontSize: 16 },
  timer: { flex: 1, paddingVertical: 4 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12 },
  status: { flex: 1 },
  phase: { fontSize: 20, fontWeight: '700' },
  detail: { color: colors.muted, fontSize: 13 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  clockArea: { marginHorizontal: 12 },
  landscapeClockArea: { marginHorizontal: 4 },
  clock: { width: '100%', textAlign: 'center', color: colors.led, includeFontPadding: false },
  digital: { fontFamily: 'DSEG' },
  controls: { flexDirection: 'row', gap: 14 },
  iconButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.panel,
    borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  pauseIcon: { flexDirection: 'row', gap: 4 },
  pauseBar: { width: 4, height: 16, borderRadius: 1, backgroundColor: colors.white },
  playIcon: { borderLeftWidth: 13, borderTopWidth: 8, borderBottomWidth: 8,
    borderLeftColor: colors.white, borderTopColor: 'transparent', borderBottomColor: 'transparent',
    marginLeft: 2 },
  stopIcon: { width: 14, height: 14, borderRadius: 2, backgroundColor: colors.white },
  iconImage: { width: 24, height: 24, tintColor: colors.white },
  infoIcon: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5,
    borderColor: colors.white, justifyContent: 'center', alignItems: 'center' },
  infoIconLabel: { color: colors.white, fontSize: 14, lineHeight: 17, fontWeight: '700' },
  settingsActions: { flexDirection: 'row', gap: 12 },
  settingsButton: { flex: 1, minHeight: 52, paddingHorizontal: 8, paddingVertical: 8,
    borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  apply: { backgroundColor: colors.amber },
  resetSettingsButton: { backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1 },
  settingsButtonLabel: { color: colors.background, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  resetSettingsLabel: { color: colors.white },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.74 },
});
