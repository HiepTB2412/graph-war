import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ITEM_LABELS } from '../engine/items';

// ItemBag — túi đồ (cơ chế 7, T8.3): thay vì hiện cả dãy vật phẩm chiếm 2 dòng trên màn
// hình vốn đã dày đặc điều khiển, gộp lại thành MỘT nút mở popup chọn (tối ưu diện tích
// hiển thị). Bấm để kích hoạt cho phát bắn kế tiếp (bấm lại vật phẩm đang chọn → bỏ chọn).
// Vật phẩm bị tiêu hao sau khi bắn (GameScreen dispatch USE_ITEM), không phải khi chọn.
export default function ItemBag({ items, activeItemId, disabled, onToggle }) {
  const [open, setOpen] = useState(false);

  if (!items.length) return null;

  const activeLabel = activeItemId ? ITEM_LABELS[activeItemId] ?? activeItemId : null;

  const handleSelect = (itemId) => {
    onToggle(itemId === activeItemId ? null : itemId);
    setOpen(false);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.trigger, activeLabel && styles.triggerActive, disabled && styles.itemDisabled]}
        disabled={disabled}
        onPress={() => setOpen(true)}
      >
        <Text style={styles.triggerText}>{activeLabel ? `Vật phẩm: ${activeLabel}` : 'Vật phẩm'}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.menu} onPress={(e) => e.stopPropagation()}>
            {items.map((itemId) => {
              const active = itemId === activeItemId;
              return (
                <TouchableOpacity
                  key={itemId}
                  style={[styles.item, active && styles.itemActive]}
                  onPress={() => handleSelect(itemId)}
                >
                  <Text style={styles.itemText}>{ITEM_LABELS[itemId] ?? itemId}</Text>
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
    alignItems: 'center',
    marginBottom: 8,
  },
  trigger: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    backgroundColor: '#263238',
  },
  triggerActive: {
    backgroundColor: '#00695c',
  },
  triggerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  itemDisabled: {
    opacity: 0.4,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menu: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    backgroundColor: '#1c1c1c',
    borderRadius: 10,
    padding: 12,
    maxWidth: 280,
  },
  item: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#263238',
    margin: 4,
  },
  itemActive: {
    backgroundColor: '#00695c',
  },
  itemText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
