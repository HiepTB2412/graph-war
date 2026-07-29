import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ITEM_LABELS } from '../engine/items';

// ItemBag — túi đồ (cơ chế 7, T8.3): hiện các vật phẩm đang có, bấm để kích hoạt cho phát
// bắn kế tiếp (bấm lại vật phẩm đang chọn → bỏ chọn). Vật phẩm bị tiêu hao sau khi bắn
// (GameScreen dispatch USE_ITEM), không phải khi chọn.
export default function ItemBag({ items, activeItemId, disabled, onToggle }) {
  if (!items.length) return null;

  return (
    <View style={styles.container}>
      {items.map((itemId) => {
        const active = itemId === activeItemId;
        return (
          <TouchableOpacity
            key={itemId}
            style={[styles.item, active && styles.itemActive, disabled && styles.itemDisabled]}
            disabled={disabled}
            onPress={() => onToggle(active ? null : itemId)}
          >
            <Text style={styles.itemText}>{ITEM_LABELS[itemId] ?? itemId}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  item: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#263238',
    marginHorizontal: 4,
    marginBottom: 4,
  },
  itemActive: {
    backgroundColor: '#00695c',
  },
  itemDisabled: {
    opacity: 0.4,
  },
  itemText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
