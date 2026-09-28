import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, Text, View } from 'react-native';
import { tw } from '@/tw';

const SWIPE = 110;
/** 드래그 직후에 카드의 탭이 함께 발생하는 것(웹 click)을 막기 위한 공유 상태 */
export const dragState = { moved: false, endedAt: 0 };
export const justDragged = () => dragState.moved || Date.now() - dragState.endedAt < 350;

/**
 * 카드 덱 — 한 장만 보이고, 오른쪽으로 밀면 Connect, 왼쪽으로 밀면 Later (Stitch people_pure_minimal 과 동일).
 * 뒤 카드는 살짝 작게 깔려 있다가 앞 카드가 날아가면 올라온다.
 */
export function Deck<T>({ items, index, width, renderCard, onSwipe, labels, tapEnabled = true, controlRef }: {
  items: T[]; index: number; width: number;
  renderCard: (item: T, isTop: boolean) => ReactNode;
  onSwipe: (item: T, dir: 'right' | 'left') => void | Promise<void>;
  labels: { right: string; left: string };
  tapEnabled?: boolean;
  /** 버튼에서 프로그램적으로 스와이프 */
  controlRef?: React.MutableRefObject<((dir: 'right' | 'left') => void) | null>;
}) {
  const pos = useRef(new Animated.ValueXY()).current;
  const [busy, setBusy] = useState(false);
  const top = items[index];
  const next = items[index + 1];

  const flyOut = (dir: 'right' | 'left') => {
    if (!top || busy) return;
    setBusy(true);
    Animated.timing(pos, { toValue: { x: (dir === 'right' ? 1 : -1) * width * 1.4, y: 0 }, duration: 260, useNativeDriver: false }).start(() => {
      pos.setValue({ x: 0, y: 0 }); setBusy(false); onSwipe(top, dir);
    });
  };
  useEffect(() => { if (controlRef) controlRef.current = flyOut; });

  const pan = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderGrant: () => { dragState.moved = true; },
    onPanResponderMove: Animated.event([null, { dx: pos.x, dy: pos.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_, g) => {
      dragState.moved = false; dragState.endedAt = Date.now();
      if (g.dx > SWIPE) flyOut('right');
      else if (g.dx < -SWIPE) flyOut('left');
      else Animated.spring(pos, { toValue: { x: 0, y: 0 }, friction: 6, useNativeDriver: false }).start();
    },
    onPanResponderTerminate: () => { dragState.moved = false; dragState.endedAt = Date.now(); Animated.spring(pos, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start(); },
  })).current;

  const rotate = pos.x.interpolate({ inputRange: [-width, 0, width], outputRange: ['-14deg', '0deg', '14deg'] });
  const likeOp = pos.x.interpolate({ inputRange: [20, 110], outputRange: [0, 1], extrapolate: 'clamp' });
  const passOp = pos.x.interpolate({ inputRange: [-110, -20], outputRange: [1, 0], extrapolate: 'clamp' });
  const backScale = pos.x.interpolate({ inputRange: [-width, 0, width], outputRange: [1, 0.96, 1], extrapolate: 'clamp' });

  return (
    <View style={[tw`flex-1`, { width }]}>
      {next && (
        <Animated.View pointerEvents="none" style={[tw`absolute inset-0`, { transform: [{ scale: backScale }] }]}>{renderCard(next, false)}</Animated.View>
      )}
      {top && (
        <Animated.View {...(tapEnabled ? pan.panHandlers : {})} style={[tw`absolute inset-0`, { transform: [{ translateX: pos.x }, { translateY: pos.y }, { rotate }] }]}>
          {renderCard(top, true)}
          <Animated.View pointerEvents="none" style={[tw`absolute top-10 right-6 px-4 py-1.5 rounded-xl bg-accent`, { opacity: likeOp, transform: [{ rotate: '12deg' }] }]}><Text style={tw`text-[20px] font-extrabold text-ink uppercase tracking-wider`}>{labels.right}</Text></Animated.View>
          <Animated.View pointerEvents="none" style={[tw`absolute top-10 left-6 px-4 py-1.5 rounded-xl bg-surface-2`, { opacity: passOp, transform: [{ rotate: '-12deg' }] }]}><Text style={tw`text-[20px] font-extrabold text-ink-2 uppercase tracking-wider`}>{labels.left}</Text></Animated.View>
        </Animated.View>
      )}
    </View>
  );
}
