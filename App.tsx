import { useEffect, useState } from 'react';
import {
  Alert, BackHandler, Pressable, ScrollView, StatusBar, StyleSheet,
  Text, useWindowDimensions, View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { useKeepAwake } from 'expo-keep-awake';
import { clockLayout } from './src/clockLayout';
import { colors } from './src/colors';
import { SettingWheels } from './src/SettingWheels';
import { defaults, formatTime, type Settings } from './src/timer';
import { useWorkout } from './src/useWorkout';
import { useGong } from './src/useGong';

const clockFonts = { DSEG: require('./assets/DSEG7Classic-Bold.ttf') };

function KeepScreenOn() {
  useKeepAwake('boxing-timer');
  return null;
}

type TimerIcon = 'pause' | 'play' | 'stop' | 'back' | 'restart';

function IconButton({ icon, label, onPress, disabled = false }: {
  icon: TimerIcon; label: string; onPress: () => void; disabled?: boolean;
}) {
  const icons = {
    pause: <View style={s.pauseIcon}><View style={s.pauseBar} /><View style={s.pauseBar} /></View>,
    play: <View style={s.playIcon} />,
    stop: <View style={s.stopIcon} />,
    back: <Text style={s.symbol}>←</Text>,
    restart: <Text style={s.symbol}>↻</Text>,
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
  const { fontSize, scaleY } = clockLayout(bounds, landscape && loaded);

  return (
    <View style={[s.center, landscape ? s.landscapeClockArea : s.clockArea]}
      onLayout={({ nativeEvent: { layout } }) => {
        setBounds({ width: layout.width, height: layout.height });
      }}>
      {fontSize > 0 && (
        <Text allowFontScaling={false} numberOfLines={1} adjustsFontSizeToFit
          style={[s.clock, loaded && s.digital, { fontSize, transform: [{ scaleY }] }]}>
          {formatTime(seconds)}
        </Text>
      )}
    </View>
  );
}

function TimerApp() {
  const gong = useGong();
  const { session, start, togglePause, rewind, end } = useWorkout(gong.ring);
  const [settings, setSettings] = useState(defaults);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const wideSettings = landscape && width >= 620;

  function changeSetting(key: keyof Settings, update: (value: number) => number) {
    setSettings(previous => {
      const value = update(previous[key]);
      return previous[key] === value ? previous : { ...previous, [key]: value };
    });
  }

  function leave() {
    if (!session || session.ready || session.frame.phase === 'finished') return end();
    Alert.alert('練習を終了しますか？', '現在の計時を終了して設定に戻ります。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '終了する', style: 'destructive', onPress: end },
    ]);
  }

  function confirmReset() {
    Alert.alert('タイマーをリセットしますか？', '同じ設定で第1ラウンドの開始前に戻ります。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: 'リセット', style: 'destructive', onPress: rewind },
    ]);
  }

  useEffect(() => {
    if (!session) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      leave();
      return true;
    });
    return () => sub.remove();
  }, [session?.frame.phase, session?.ready]);

  const soundError = gong.error && <Text style={s.error}>ゴング音を再生できませんでした。</Text>;

  if (!session) {
    const invalidDuration = settings.work === 0;
    return (
      <ScrollView nestedScrollEnabled contentContainerStyle={[s.settings, landscape && s.landscapeSettings]}>
        <StatusBar barStyle="light-content" hidden={false} />
        <View style={[s.form, wideSettings && s.wideForm]}>
          <Text accessibilityRole="header" style={[s.title, landscape && s.landscapeTitle]}>練習設定</Text>
          <SettingWheels settings={settings} wide={wideSettings} onChange={changeSetting} />
          {invalidDuration && <Text style={s.error}>ラウンド時間は1秒以上に設定してください。</Text>}
          {soundError}
          <Pressable accessibilityRole="button" disabled={invalidDuration}
            accessibilityState={{ disabled: invalidDuration }} onPress={() => start(settings)}
            style={({ pressed }) => [s.start, invalidDuration && s.disabled, pressed && s.pressed]}>
            <Text style={s.startLabel}>練習を開始</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  const { frame, ready } = session;
  const sessionSettings = session.settings;
  const finished = frame.phase === 'finished';
  const rest = frame.phase === 'rest';
  const paused = session.startedAt === null && !finished && !ready;
  const phase = finished ? '練習終了' : rest ? '休憩' : 'ラウンド';

  return (
    <View style={s.timer}>
      <StatusBar barStyle="light-content" hidden />
      {!finished && <KeepScreenOn />}
      <View style={s.top}>
        <View style={s.status}>
          <Text style={[s.phase, { color: rest ? colors.rest : colors.amber }]}>
            {phase}{!finished && ' ' + frame.round + '/' + sessionSettings.rounds}
            {ready && ' · 開始前'}{paused && ' · 一時停止'}
          </Text>
          {soundError}
        </View>
        <View style={s.controls}>
          <IconButton icon={finished ? 'restart' : paused || ready ? 'play' : 'pause'}
            label={finished ? 'もう一度開始' : ready ? '開始' : paused ? '再開' : '一時停止'}
            onPress={finished ? () => start(sessionSettings) : togglePause} />
          {!finished && <IconButton icon="restart" label="リセット" onPress={confirmReset} disabled={ready} />}
          <IconButton icon={finished ? 'back' : 'stop'}
            label={finished ? '設定に戻る' : '終了'} onPress={leave} />
        </View>
      </View>
      {finished ? (
        <View style={s.center}><Text style={s.summary}>全{sessionSettings.rounds}ラウンド完了</Text></View>
      ) : <Clock seconds={frame.seconds} landscape={landscape} />}
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
  settings: { flexGrow: 1, justifyContent: 'center', padding: 18 },
  landscapeSettings: { paddingVertical: 8 },
  form: { width: '100%', maxWidth: 520, alignSelf: 'center', gap: 16 },
  wideForm: { maxWidth: 820, gap: 10 },
  title: { color: colors.white, fontSize: 34, fontWeight: '700' },
  landscapeTitle: { fontSize: 26 },
  error: { color: colors.error, marginTop: 4 },
  timer: { flex: 1, paddingVertical: 4 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12 },
  status: { flex: 1 },
  phase: { fontSize: 16, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  clockArea: { marginHorizontal: 12 },
  landscapeClockArea: { marginHorizontal: 4 },
  clock: { width: '100%', textAlign: 'center', color: colors.led, includeFontPadding: false },
  digital: { fontFamily: 'DSEG' },
  summary: { color: colors.white, fontSize: 32, fontWeight: '700', marginHorizontal: 12 },
  controls: { flexDirection: 'row', gap: 14 },
  iconButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.panel,
    borderWidth: 1, borderColor: colors.border, justifyContent: 'center', alignItems: 'center' },
  pauseIcon: { flexDirection: 'row', gap: 4 },
  pauseBar: { width: 4, height: 16, borderRadius: 1, backgroundColor: colors.white },
  playIcon: { borderLeftWidth: 13, borderTopWidth: 8, borderBottomWidth: 8,
    borderLeftColor: colors.white, borderTopColor: 'transparent', borderBottomColor: 'transparent',
    marginLeft: 2 },
  stopIcon: { width: 14, height: 14, borderRadius: 2, backgroundColor: colors.white },
  symbol: { fontSize: 22, color: colors.white, includeFontPadding: false },
  start: { minHeight: 52, paddingHorizontal: 20, borderRadius: 10, justifyContent: 'center',
    alignItems: 'center', backgroundColor: colors.amber },
  startLabel: { color: colors.background, fontSize: 17, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.74 },
});
