import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MAP_LIST } from '../game/terrain';

// MapSelect — chọn bản đồ (địa hình, cơ chế 4) trước khi chơi. Đổi bản đồ giữa chừng
// coi như ván mới (GameScreen dispatch RESET kèm mapId) nên khoá khi đang "firing" (đạn
// đang bay) để không đổi bản đồ ngay dưới một phát bắn đang chạy; vẫn cho đổi lúc "aiming"
// hay "over" vì hai trạng thái đó không có gì đang animate dở dang.
export default function MapSelect({ mapId, disabled, onSelect }) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const current = MAP_LIST.find((m) => m.id === mapId) ?? MAP_LIST[0];

  const handleSelect = (id) => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <View style={[styles.container, { top: insets.top + 48 }]}>
      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        disabled={disabled}
        onPress={() => setOpen(true)}
      >
        <Text style={styles.triggerText}>Bản đồ: {current.label}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.menu} onPress={(e) => e.stopPropagation()}>
            {MAP_LIST.map((m) => {
              const active = m.id === mapId;
              return (
                <TouchableOpacity
                  key={m.id}
                  style={[styles.item, active && styles.itemActive]}
                  onPress={() => handleSelect(m.id)}
                >
                  <Text style={styles.itemText}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 12,
  },
  trigger: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#263238',
  },
  triggerDisabled: {
    opacity: 0.4,
  },
  triggerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    backgroundColor: '#1c1c1c',
    borderRadius: 10,
    padding: 12,
    minWidth: 200,
  },
  item: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: '#263238',
    marginBottom: 6,
  },
  itemActive: {
    backgroundColor: '#00695c',
  },
  itemText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
