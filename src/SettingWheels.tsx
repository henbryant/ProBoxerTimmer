import { useMemo, useRef, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from './colors';
import { maxRestSeconds, maxRounds, maxWorkSeconds, type Settings } from './timer';

const rowHeight = 40;
function NumberWheel({ label, unit, value, min = 0, max, onChange }: {
  label: string;
  unit: string;
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
}) {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const options = useMemo(() => Array.from({ length: max - min + 1 }, (_, index) => min + index), [min, max]);
  const offset = useRef({ x: 0, y: (value - min) * rowHeight }).current;
  const adjustable = min < max;

  function select(next: number) {
    scroll.current?.scrollTo({ y: (next - min) * rowHeight, animated: false });
    onChange(next);
  }

  return (
    <View accessible accessibilityRole={adjustable ? 'adjustable' : 'text'} accessibilityLabel={label}
      accessibilityValue={{ min, max, now: value, text: value + unit }}
      accessibilityActions={adjustable ? [{ name: 'increment' }, { name: 'decrement' }] : []}
      onAccessibilityAction={({ nativeEvent: { actionName } }) => {
        if (actionName === 'increment' && value < max) select(value + 1);
        if (actionName === 'decrement' && value > min) select(value - 1);
      }}
      style={s.column}>
      <Text style={s.unit}>{unit}</Text>
      <View style={s.track}>
        <View pointerEvents="none" style={s.selection} />
        <ScrollView ref={scroll} style={s.wheel} contentOffset={offset}
          contentContainerStyle={s.wheelContent} nestedScrollEnabled
          accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          showsVerticalScrollIndicator={false} scrollEnabled={adjustable} bounces={false} overScrollMode="never"
          snapToInterval={rowHeight} decelerationRate="fast" scrollEventThrottle={16}
          onScroll={({ nativeEvent: { contentOffset } }) => {
            const next = Math.min(max, Math.max(min, min + Math.round(contentOffset.y / rowHeight)));
            onChange(next);
          }}>
          {options.map(option => (
            <Pressable key={option} style={s.option} onPress={() => select(option)} accessible={false}>
              <Text style={[s.number, option === value && s.selectedNumber]}>
                {String(option).padStart(2, '0')}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

type UpdateNumber = (previous: number) => number;

function DurationWheels({ title, value, maximum, wide, onChange }: {
  title: string; value: number; maximum: number; wide: boolean; onChange: (update: UpdateNumber) => void;
}) {
  const wholeMinutes = Math.floor(value / 60);
  const remainingSeconds = value % 60;
  const maxMinutes = Math.floor(maximum / 60);
  const maxSeconds = Math.min(59, maximum - wholeMinutes * 60);
  return (
    <View style={[s.group, wide && s.duration]}>
      <Text style={s.label}>{title}</Text>
      <View style={s.wheels}>
        <NumberWheel label={title + '（分）'} unit="分" value={wholeMinutes} max={maxMinutes}
          onChange={next => onChange(previous => Math.min(maximum, next * 60 + previous % 60))} />
        <NumberWheel key={maxSeconds} label={title + '（秒）'} unit="秒" value={remainingSeconds} max={maxSeconds}
          onChange={next => onChange(previous => Math.min(maximum, Math.floor(previous / 60) * 60 + next))} />
      </View>
    </View>
  );
}

export function SettingWheels({ settings, wide, onChange }: {
  settings: Settings; wide: boolean; onChange: (key: keyof Settings, update: UpdateNumber) => void;
}) {
  return (
    <View style={[s.groups, wide && s.wideGroups]}>
      <DurationWheels title="ラウンド時間" value={settings.work} maximum={maxWorkSeconds} wide={wide}
        onChange={update => onChange('work', update)} />
      <DurationWheels title="インターバル" value={settings.rest} maximum={maxRestSeconds} wide={wide}
        onChange={update => onChange('rest', update)} />
      <View style={[s.group, wide && s.roundsGroup]}>
        <Text style={s.label}>ラウンド数</Text>
        <NumberWheel label="ラウンド数" unit="回" value={settings.rounds} min={1} max={maxRounds}
          onChange={value => onChange('rounds', () => value)} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  groups: { gap: 12 },
  wideGroups: { flexDirection: 'row' },
  group: { gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.panel },
  duration: { flexGrow: 2, flexBasis: 0 },
  roundsGroup: { flexGrow: 1, flexBasis: 0 },
  label: { color: colors.white, fontSize: 17, fontWeight: '600' },
  wheels: { flexDirection: 'row', gap: 8 },
  column: { flexGrow: 1, flexShrink: 1, gap: 3 },
  unit: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  track: { backgroundColor: colors.background, borderRadius: 8, overflow: 'hidden' },
  wheel: { height: rowHeight * 3, flexGrow: 0 },
  wheelContent: { paddingVertical: rowHeight },
  selection: { position: 'absolute', left: 4, right: 4, top: rowHeight, height: rowHeight,
    backgroundColor: '#392B1F', borderColor: '#755637', borderWidth: 1, borderRadius: 6 },
  option: { height: rowHeight, alignItems: 'center', justifyContent: 'center' },
  number: { color: colors.muted, fontVariant: ['tabular-nums'], fontSize: 20, fontWeight: '600' },
  selectedNumber: { color: colors.amber, fontSize: 24, fontWeight: '700' },
});
