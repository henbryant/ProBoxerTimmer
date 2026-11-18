import { useEffect, useState } from 'react';
import {
  Alert, BackHandler, Keyboard, Pressable, ScrollView, StatusBar, StyleSheet,
  Text, TextInput, useWindowDimensions, View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import { useKeepAwake } from 'expo-keep-awake';
import { clockLayout } from './src/clockLayout';
import { defaults, formatTime, parseSetting, type Settings } from './src/timer';
import { useWorkout } from './src/useWorkout';
import { useGong } from './src/useGong';

const colors = {
  background: '#151715', panel: '#222522', border: '#454B45', white: '#F8F8EF',
  muted: '#B8BDB3', amber: '#FFBD70', rest: '#9ED9C1', error: '#FFAB9E', led: '#FF4036',
};

const clockFonts = { DSEG: require('./assets/DSEG7Classic-Bold.ttf') };

function KeepScreenOn() {
  useKeepAwake('boxing-timer');
  return null;
}

type TimerIcon = 'pause' | 'play' | 'stop' | 'back' | 'restart';

function IconButton({ icon, label, onPress }: {
  icon: TimerIcon; label: string; onPress: () => void;
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
      style={({ pressed }) => [s.iconButton, pressed && s.pressed]}>
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

const fields = [
  { key: 'work', label: 'ラウンド時間', unit: '秒', min: 1, max: 5999 },
  { key: 'rest', label: 'インターバル', unit: '秒', min: 0, max: 5999 },
  { key: 'rounds', label: 'ラウンド数', unit: '回', min: 1, max: 99 },
] as const;

function TimerApp() {
  const gong = useGong();
  const { session, start, togglePause, reset } = useWorkout(gong.ring);
  const [values, setValues] = useState({
    work: String(defaults.work), rest: String(defaults.rest), rounds: String(defaults.rounds),
  });
  const [submitted, setSubmitted] = useState(false);
  const { width, height } = useWindowDimensions();
  const landscape = width > height;

  function begin() {
    setSubmitted(true);
    const settings: Settings = { ...defaults };
    for (const field of fields) {
      const parsed = parseSetting(values[field.key], field.min, field.max);
      if (parsed === null) return;
      settings[field.key] = parsed;
    }
    Keyboard.dismiss();
    setSubmitted(false);
    start(settings);
  }

  function leave() {
    if (!session || session.frame.phase === 'finished') return reset();
    Alert.alert('練習を終了しますか？', '現在の計時を終了して設定に戻ります。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '終了する', style: 'destructive', onPress: reset },
    ]);
  }

  useEffect(() => {
    if (!session) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      leave();
      return true;
    });
    return () => sub.remove();
  }, [session?.frame.phase]);

  const soundError = gong.error && <Text style={s.error}>ゴング音を再生できませんでした。</Text>;

  if (!session) {
    return (
      <ScrollView contentContainerStyle={[s.settings, landscape && s.landscapeSettings]} keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <StatusBar barStyle="light-content" hidden={false} />
        <View style={[s.form, landscape && s.landscapeForm]}>
          <Text accessibilityRole="header" style={[s.title, landscape && s.landscapeTitle]}>練習設定</Text>
          {fields.map(({ key, label, unit, min, max }) => {
            const parsed = parseSetting(values[key], min, max);
            return (
              <View key={key} style={[s.field, landscape && s.landscapeField]}>
                <View style={s.row}>
                  <View style={s.fieldName}>
                    <Text style={s.label}>{label}</Text>
                    {key !== 'rounds' && <Text style={s.preview}>{parsed === null ? '—' : formatTime(parsed)}</Text>}
                  </View>
                  <TextInput accessibilityLabel={label + '（' + unit + '）'} style={s.input}
                    keyboardType="number-pad" value={values[key]} selectTextOnFocus
                    onChangeText={value => setValues(old => ({ ...old, [key]: value }))} />
                  <Text style={s.unit}>{unit}</Text>
                </View>
                {submitted && parsed === null &&
                  <Text style={s.error}>{min}〜{max}の整数で入力してください。</Text>}
              </View>
            );
          })}
          {soundError}
          <Pressable accessibilityRole="button" onPress={begin}
            style={({ pressed }) => [s.start, pressed && s.pressed]}>
            <Text style={s.startLabel}>練習を開始</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  const { frame, settings } = session;
  const finished = frame.phase === 'finished';
  const rest = frame.phase === 'rest';
  const paused = session.startedAt === null && !finished;
  const phase = finished ? '練習終了' : rest ? '休憩' : 'ラウンド';

  return (
    <View style={s.timer}>
      <StatusBar barStyle="light-content" hidden />
      {!finished && <KeepScreenOn />}
      <View style={s.top}>
        <View style={s.status}>
          <Text style={[s.phase, { color: rest ? colors.rest : colors.amber }]}>
            {phase}{!finished && ' ' + frame.round + '/' + settings.rounds}{paused && ' · 一時停止'}
          </Text>
          {soundError}
        </View>
        <View style={s.controls}>
          <IconButton icon={finished ? 'restart' : paused ? 'play' : 'pause'}
            label={finished ? 'もう一度開始' : paused ? '再開' : '一時停止'}
            onPress={finished ? () => start(settings) : togglePause} />
          <IconButton icon={finished ? 'back' : 'stop'}
            label={finished ? '設定に戻る' : '終了'} onPress={leave} />
        </View>
      </View>
      {finished ? (
        <View style={s.center}><Text style={s.summary}>全{settings.rounds}ラウンド完了</Text></View>
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
  settings: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  landscapeSettings: { paddingVertical: 8 },
  form: { width: '100%', maxWidth: 520, alignSelf: 'center', gap: 16 },
  landscapeForm: { gap: 8 },
  title: { color: colors.white, fontSize: 34, fontWeight: '700', marginBottom: 8 },
  landscapeTitle: { fontSize: 26, marginBottom: 0 },
  field: { borderBottomColor: colors.border, borderBottomWidth: 1, paddingBottom: 14 },
  landscapeField: { paddingBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fieldName: { flex: 1 },
  label: { color: colors.white, fontSize: 16, fontWeight: '600' },
  preview: { color: colors.muted, fontSize: 15, fontVariant: ['tabular-nums'], marginTop: 4 },
  input: { color: colors.white, backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1,
    borderRadius: 8, minWidth: 84, minHeight: 48, paddingHorizontal: 12, textAlign: 'right', fontSize: 21 },
  unit: { color: colors.muted, fontSize: 16 },
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
  controls: { flexDirection: 'row', gap: 6 },
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
  pressed: { opacity: 0.74 },
});
