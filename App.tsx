import { useEffect, useState } from 'react';
import {
  Alert, BackHandler, Keyboard, Pressable, ScrollView, StatusBar, StyleSheet,
  Switch, Text, TextInput, useWindowDimensions, View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { defaults, formatTime, parseSetting, type Settings } from './src/timer';
import { useWorkout } from './src/useWorkout';
import { useGong } from './src/useGong';

const colors = {
  background: '#151715', panel: '#222522', border: '#454B45', white: '#F8F8EF',
  muted: '#B8BDB3', amber: '#FFBD70', rest: '#9ED9C1', error: '#FFAB9E',
};

function KeepScreenOn() {
  useKeepAwake('boxing-timer');
  return null;
}

function Action({ label, onPress, secondary = false }: {
  label: string; onPress: () => void; secondary?: boolean;
}) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => [s.action, secondary ? s.secondary : s.primary, pressed && s.pressed]}>
      <Text style={[s.actionLabel, secondary && s.secondaryLabel]}>{label}</Text>
    </Pressable>
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

  const soundControl = (
    <View style={s.sound}>
      <Text style={s.label}>ゴング音</Text>
      <Switch accessibilityLabel="ゴング音" value={gong.enabled} onValueChange={gong.toggle}
        trackColor={{ false: colors.border, true: '#936634' }} thumbColor={gong.enabled ? colors.amber : colors.muted} />
    </View>
  );
  const soundError = gong.enabled && gong.error && <Text style={s.error}>ゴング音を再生できませんでした。</Text>;

  if (!session) {
    return (
      <ScrollView contentContainerStyle={s.settings} keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets>
        <View style={s.form}>
          <Text accessibilityRole="header" style={s.title}>練習設定</Text>
          {fields.map(({ key, label, unit, min, max }) => {
            const parsed = parseSetting(values[key], min, max);
            return (
              <View key={key} style={s.field}>
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
          {soundControl}
          {soundError}
          <Action label="練習を開始" onPress={begin} />
        </View>
      </ScrollView>
    );
  }

  const { frame, settings } = session;
  const finished = frame.phase === 'finished';
  const rest = frame.phase === 'rest';
  const paused = session.startedAt === null && !finished;
  const lastRound = frame.round === settings.rounds;
  const next = lastRound ? '次は練習終了'
    : rest || settings.rest === 0 ? '次はラウンド ' + (frame.round + 1) + '/' + settings.rounds
    : '次は休憩 ' + formatTime(settings.rest);
  const compact = height < 470;

  return (
    <View style={[s.timer, compact && s.compact]}>
      {!finished && <KeepScreenOn />}
      <View style={s.top}>
        <Text style={[s.phase, { color: rest ? colors.rest : colors.amber }]}>
          {finished ? '練習終了' : rest ? '休憩' : 'ラウンド'}{paused ? ' · 一時停止' : ''}
        </Text>
        {soundControl}
      </View>
      <View style={s.center}>
        {finished ? (
          <Text style={s.summary}>全{settings.rounds}ラウンド完了</Text>
        ) : (
          <>
            <Text style={s.progress}>{'ラウンド ' + frame.round + ' / ' + settings.rounds + (rest ? ' 完了' : '')}</Text>
            <Text numberOfLines={1} adjustsFontSizeToFit
              style={[s.clock, { fontSize: Math.min(width * 0.30, height * 0.36, 300) }]}>
              {formatTime(frame.seconds)}
            </Text>
            <Text style={s.next}>{next}</Text>
          </>
        )}
      </View>
      {soundError}
      <View style={s.actions}>
        <Action label={finished ? '設定に戻る' : '終了'} onPress={leave} secondary />
        <Action label={finished ? 'もう一度開始' : paused ? '再開' : '一時停止'}
          onPress={finished ? () => start(settings) : togglePause} />
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content" />
        <TimerApp />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  settings: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  form: { width: '100%', maxWidth: 520, alignSelf: 'center', gap: 16 },
  title: { color: colors.white, fontSize: 34, fontWeight: '700', marginBottom: 8 },
  field: { borderBottomColor: colors.border, borderBottomWidth: 1, paddingBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fieldName: { flex: 1 },
  label: { color: colors.white, fontSize: 16, fontWeight: '600' },
  preview: { color: colors.muted, fontSize: 15, fontVariant: ['tabular-nums'], marginTop: 4 },
  input: { color: colors.white, backgroundColor: colors.panel, borderColor: colors.border, borderWidth: 1,
    borderRadius: 8, minWidth: 84, minHeight: 48, paddingHorizontal: 12, textAlign: 'right', fontSize: 21 },
  unit: { color: colors.muted, fontSize: 16 },
  sound: { flexDirection: 'row', alignItems: 'center', gap: 12, justifyContent: 'space-between' },
  error: { color: colors.error, marginTop: 4 },
  timer: { flex: 1, padding: 22 },
  compact: { paddingVertical: 4 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' },
  phase: { fontSize: 20, fontWeight: '700' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  progress: { fontSize: 20, color: colors.muted, fontVariant: ['tabular-nums'] },
  clock: { width: '100%', textAlign: 'center', fontWeight: '700', fontVariant: ['tabular-nums'],
    color: colors.white, includeFontPadding: false },
  next: { color: colors.muted, fontSize: 19 },
  summary: { color: colors.white, fontSize: 32, fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'center', gap: 12 },
  action: { minHeight: 52, paddingHorizontal: 20, borderRadius: 10, justifyContent: 'center',
    alignItems: 'center', flexGrow: 1 },
  primary: { backgroundColor: colors.amber },
  secondary: { backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border },
  actionLabel: { color: colors.background, fontSize: 17, fontWeight: '700' },
  secondaryLabel: { color: colors.white },
  pressed: { opacity: 0.74 },
});
