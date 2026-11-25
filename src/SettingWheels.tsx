import { useMemo, useRef, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors } from './colors';
import { maxRestSeconds, maxRounds, maxWorkSeconds, type Settings } from './timer';

const rowHeight = 40;
const wheelHeight = rowHeight * 3;
function NumberWheel({ label, unit, value, min = 0, max, fontScaleLimit, onChange }: {
  label: string;
  unit: string;
  value: number;
  min?: number;
  max: number;
  fontScaleLimit: number;
  onChange: (value: number) => void;
}) {
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const options = useMemo(() => Array.from({ length: max - min + 1 }, (_, index) => min + index), [min, max]);
  const offset = useRef({ x: 0, y: (value - min) * rowHeight }).current;
  const selected = useRef(value);
  const dragging = useRef(false);
  const settling = useRef(false);
  const adjustable = min < max;

  function updateSelection(next: number) {
    if (selected.current === next) return;
    selected.current = next;
    onChange(next);
  }

  function updateFromOffset(y: number) {
    updateSelection(Math.min(max, Math.max(min, min + Math.round(y / rowHeight))));
  }

  function restoreOffset(y: number) {
    const expected = (selected.current - min) * rowHeight;
    if (Math.abs(y - expected) > 1) {
      scroll.current?.scrollTo({ y: expected, animated: false });
    }
  }

  function select(next: number) {
    dragging.current = false;
    settling.current = false;
    updateSelection(next);
    scroll.current?.scrollTo({ y: (next - min) * rowHeight, animated: false });
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
      <Text maxFontSizeMultiplier={fontScaleLimit} style={s.unit}>{unit}</Text>
      <View style={s.track}>
        <View pointerEvents="none" style={s.selection} />
        <ScrollView ref={scroll} style={s.wheel} contentOffset={offset}
          contentContainerStyle={s.wheelContent}
          accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          showsVerticalScrollIndicator={false} scrollEnabled={adjustable} bounces={false} overScrollMode="never"
          scrollsToTop={false}
          snapToInterval={rowHeight} decelerationRate="fast" scrollEventThrottle={16}
          onScrollBeginDrag={() => {
            dragging.current = true;
            settling.current = false;
          }}
          onScroll={({ nativeEvent: { contentOffset } }) => {
            if (dragging.current) {
              updateFromOffset(contentOffset.y);
            } else if (!settling.current) {
              // A modal transition can move the scroll view without a user gesture.
              restoreOffset(contentOffset.y);
            }
          }}
          onScrollEndDrag={({ nativeEvent: { contentOffset, targetContentOffset } }) => {
            if (!dragging.current) return;
            dragging.current = false;
            const target = targetContentOffset?.y ?? contentOffset.y;
            settling.current = Math.abs(target - contentOffset.y) > 1;
            updateFromOffset(target);
          }}
          onMomentumScrollEnd={({ nativeEvent: { contentOffset } }) => {
            if (dragging.current) return;
            settling.current = false;
            restoreOffset(contentOffset.y);
          }}>
          {options.map(option => (
            <Pressable key={option} style={s.option} onPress={() => select(option)} accessible={false}>
              <Text maxFontSizeMultiplier={fontScaleLimit} style={[s.number, option === value && s.selectedNumber]}>
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

function DurationWheels({ title, value, maximum, wide, compact, fontScaleLimit, onChange }: {
  title: string;
  value: number;
  maximum: number;
  wide: boolean;
  compact: boolean;
  fontScaleLimit: number;
  onChange: (update: UpdateNumber) => void;
}) {
  const wholeMinutes = Math.floor(value / 60);
  const remainingSeconds = value % 60;
  const maxMinutes = Math.floor(maximum / 60);
  const maxSeconds = Math.min(59, maximum - wholeMinutes * 60);
  return (
    <View style={[s.group, compact && s.compactGroup, wide && s.duration]}>
      <Text maxFontSizeMultiplier={fontScaleLimit} style={s.label}>{title}</Text>
      <View style={s.wheels}>
        <NumberWheel label={title + '（分）'} unit="分" value={wholeMinutes} max={maxMinutes}
          fontScaleLimit={fontScaleLimit}
          onChange={next => onChange(previous => Math.min(maximum, next * 60 + previous % 60))} />
        <NumberWheel key={maxSeconds} label={title + '（秒）'} unit="秒" value={remainingSeconds} max={maxSeconds}
          fontScaleLimit={fontScaleLimit}
          onChange={next => onChange(previous => Math.min(maximum, Math.floor(previous / 60) * 60 + next))} />
      </View>
    </View>
  );
}

export function SettingWheels({ settings, wide, compact, fontScaleLimit, onChange }: {
  settings: Settings;
  wide: boolean;
  compact: boolean;
  fontScaleLimit: number;
  onChange: (key: keyof Settings, update: UpdateNumber) => void;
}) {
  return (
    <View style={[s.groups, compact && s.compactGroups, wide && s.wideGroups]}>
      <DurationWheels title="ラウンド時間" value={settings.work} maximum={maxWorkSeconds} wide={wide}
        compact={compact} fontScaleLimit={fontScaleLimit}
        onChange={update => onChange('work', update)} />
      <DurationWheels title="インターバル" value={settings.rest} maximum={maxRestSeconds} wide={wide}
        compact={compact} fontScaleLimit={fontScaleLimit}
        onChange={update => onChange('rest', update)} />
      <View style={[s.group, compact && s.compactGroup, wide && s.roundsGroup]}>
        <Text maxFontSizeMultiplier={fontScaleLimit} style={s.label}>ラウンド数</Text>
        <NumberWheel label="ラウンド数" unit="回" value={settings.rounds} min={1} max={maxRounds}
          fontScaleLimit={fontScaleLimit}
          onChange={value => onChange('rounds', () => value)} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  groups: { flexShrink: 1, gap: 12 },
  compactGroups: { gap: 8 },
  wideGroups: { flexDirection: 'row' },
  group: { flexShrink: 1, gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.panel },
  compactGroup: { gap: 4, padding: 8 },
  duration: { flexGrow: 2, flexBasis: 0 },
  roundsGroup: { flexGrow: 1, flexBasis: 0 },
  label: { color: colors.white, fontSize: 17, fontWeight: '600' },
  wheels: { flexDirection: 'row', flexShrink: 1, gap: 8 },
  column: { flexGrow: 1, flexShrink: 1, gap: 3 },
  unit: { color: colors.muted, fontSize: 13, textAlign: 'center' },
  // Clip the neighboring rows as space runs out, while keeping the scroll offsets fixed.
  track: { height: wheelHeight, minHeight: rowHeight, flexShrink: 1,
    backgroundColor: colors.background, borderRadius: 8, overflow: 'hidden' },
  wheel: { position: 'absolute', top: '50%', left: 0, right: 0, marginTop: -wheelHeight / 2, height: wheelHeight },
  wheelContent: { paddingVertical: rowHeight },
  selection: { position: 'absolute', left: 4, right: 4, top: '50%', marginTop: -rowHeight / 2, height: rowHeight,
    backgroundColor: '#392B1F', borderColor: '#755637', borderWidth: 1, borderRadius: 6 },
  option: { height: rowHeight, alignItems: 'center', justifyContent: 'center' },
  number: { color: colors.muted, fontVariant: ['tabular-nums'], fontSize: 20, fontWeight: '600' },
  selectedNumber: { color: colors.amber, fontSize: 24, fontWeight: '700' },
});
