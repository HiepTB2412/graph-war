// Polyfill URL cho @supabase/supabase-js (engine WebSocket của realtime-js dùng `new URL(...)`
// mà Hermes/React Native không có sẵn) — phải là import ĐẦU TIÊN của cả app, trước bất kỳ
// import nào khác có thể chạy tới code dùng URL (Phase 11, multiplayer online, tuỳ chọn).
import 'react-native-url-polyfill/auto';
import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import GameScreen from './screens/GameScreen';
import PracticeScreen from './screens/PracticeScreen';
import OnlineScreen from './screens/OnlineScreen';

// AppContent — tách riêng khỏi App vì useSafeAreaInsets() cần chạy BÊN TRONG SafeAreaProvider.
// Thanh chuyển chế độ nằmè trên cùng (position: absolute, top: 0) nên tự cộng insets.top vào
// paddingTop — không thì bị tai thỏ/Dynamic Island che mất (vd tab "Online").
function AppContent() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState('pvp');

  return (
    <>
      <View style={[styles.modeBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'pvp' && styles.modeButtonActive]}
          onPress={() => setMode('pvp')}
        >
          <Text style={styles.modeText}>2 người</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'practice' && styles.modeButtonActive]}
          onPress={() => setMode('practice')}
        >
          <Text style={styles.modeText}>Luyện tập</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'online' && styles.modeButtonActive]}
          onPress={() => setMode('online')}
        >
          <Text style={styles.modeText}>Online</Text>
        </TouchableOpacity>
      </View>
      {mode === 'pvp' && <GameScreen />}
      {mode === 'practice' && <PracticeScreen />}
      {mode === 'online' && <OnlineScreen />}
      <StatusBar style="light" />
    </>
  );
}

// App — chuyển giữa PvP hot-seat (GameScreen), Chế độ học PvE (PracticeScreen, T10.2), và
// Online (OnlineScreen, Phase 11 — tuỳ chọn, cần cấu hình Supabase, xem .env.example). Mỗi
// màn hình tự quản lý state riêng nên chỉ cần unmount/mount lại khi đổi mode.
export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  modeBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  modeButton: {
    paddingVertical: 4,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: '#263238',
    marginHorizontal: 4,
  },
  modeButtonActive: {
    backgroundColor: '#00695c',
  },
  modeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
});
