# Graph War — Đặc tả game & hướng dẫn triển khai

> Tài liệu này viết để một AI coding agent hoặc lập trình viên đọc là có thể triển khai.
> Đọc hết phần "Kiến trúc lõi" trước khi viết bất kỳ dòng code nào — mọi cơ chế đều gắn vào đó.

---

## 1. Tóm tắt

Game PvP 2D, turn-based, trên React Native (Expo). Người chơi **nhập một hàm số `f(x)`**; hàm được vẽ thành đường cong như một viên đạn. Nếu đường cong đi qua hitbox của đối thủ, đối thủ bị loại.

Điểm khác biệt so với "game toán" thông thường: người chơi phải **hình dung hình dạng đồ thị trong đầu để ngắm bắn**, không chỉ tính ra một con số.

Rủi ro cần chặn ngay từ đầu: nếu cho nhập mọi biểu thức, người chơi sẽ tìm ra công thức "phá game" (giá trị cực lớn, hàm không xác định như `1/(x-1)`, dao động cực nhanh, số mũ khổng lồ) và lặp lại. Toàn bộ thiết kế dưới đây xoay quanh việc **kiểm soát không gian hàm số** để buộc người chơi sáng tạo.

**Thể loại tham chiếu:** "Graph War" / function artillery.

---

## 2. Vòng lặp chơi (core loop)

1. Đến lượt người chơi P.
2. P chọn: **di chuyển** (đi tối đa 2 ô) *hoặc* **bắn**.
3. Nếu bắn: P nhập `f(x)` trong giới hạn thời gian (mặc định 10s) và trong ràng buộc của trận (loại hàm cho phép + mana).
4. Hệ thống kiểm tra biểu thức (AST guard). Không hợp lệ → báo lỗi, cho nhập lại nếu còn giờ.
5. Đường cong được sinh, (tuỳ chọn) xoay theo góc nhân vật, bị chặn/phản xạ bởi địa hình.
6. Kiểm tra va chạm dọc đường cong. Trúng ai → người đó bị loại.
7. Chuyển lượt. Còn 1 người sống → thắng.

---

## 3. Kiến trúc lõi — hai pipeline

Đây là insight trung tâm: **hầu hết cơ chế chỉ là thao tác trên một trong hai đối tượng** — cây cú pháp (AST) của biểu thức, hoặc mảng điểm sau khi sample. Xây engine quanh hai pipeline này thì các cơ chế còn lại là "cắm thêm", không phải viết lại.

```
chuỗi f(x)
   │
   ▼
┌─────────────── PIPELINE AST (phân tích biểu thức) ───────────────┐
│  • hạn chế loại hàm  (cơ chế 1)                                   │
│  • tính mana theo toán tử  (cơ chế 2)                            │
│  • chống phá game: chặn pole, giới hạn bậc & miền                 │
└──────────────────────────────────────────────────────────────────┘
   │  compile → sinh mảng điểm
   ▼
┌─────────────── PIPELINE MẢNG ĐIỂM (biến đổi hình học) ───────────┐
│  • xoay theo góc bắn  (cơ chế 6)                                  │
│  • địa hình: chặn / phản xạ  (cơ chế 4)                          │
│  • vật phẩm: đảo trục, nhân đôi, phản chiếu  (cơ chế 7)          │
└──────────────────────────────────────────────────────────────────┘
   │
   ▼
va chạm → loại người chơi
```

Ba việc tưởng như riêng biệt — hạn chế hàm (1), mana (2), chống cheat — **thực chất là cùng một lần duyệt AST** mà `mathjs` cung cấp miễn phí. Đây là hệ thống chịu tải chính; làm nó trước tiên.

---

## 4. Stack kỹ thuật

| Nhu cầu | Thư viện | Ghi chú |
|---|---|---|
| Khởi tạo dự án | Expo | Chạy được trên điện thoại thật nhanh nhất |
| Parse & tính hàm | `mathjs` | `parse()` cho AST, `.compile()` để tính |
| Vẽ đường cong | `react-native-svg` | Đủ cho turn-based; đơn giản |
| (Nâng cao) animation đạn bay | `@shopify/react-native-skia` | Chỉ khi cần perf/hiệu ứng; dùng lại cùng mảng điểm |
| State | `useReducer` hoặc Zustand | Lượt, danh sách người chơi, thắng/thua |

Nguyên tắc: **làm bằng `react-native-svg` trước**, chuyển sang Skia sau nếu cần — vì cả hai dùng cùng mảng điểm.

---

## 5. Hệ thống AST Guard (bắt buộc, làm đầu tiên)

Một hàm `analyze()` duy nhất lo cả ba việc: kiểm tra loại hàm, tính mana, chống phá game.

### 5.1 Bảng giá mana

| Toán tử / hàm | Giá |
|---|---|
| `+` `-` | 1 |
| `*` `/` | 2 |
| `^2` | 3 |
| `^3` | 5 |
| `sin()` `cos()` | 4 |
| `tan()` | 8 |
| `sqrt()` | 5 |
| `log()` | 6 |
| `abs()` | 2 |

Mặc định: **10 mana / lượt**. `y = x` rẻ mà yếu; `y = sin(x) + x^2` mạnh nhưng tốn gần hết mana.

### 5.2 Tập hàm an toàn (whitelist)

Chỉ hỗ trợ: **đa thức bậc ≤ 3**, `sin`, `cos`, `sqrt`, `abs`, `log` (giới hạn miền xác định). Mọi thứ ngoài danh sách → từ chối.

### 5.3 Ràng buộc chống phá game

- Cấm phép chia `/` (tránh pole kiểu `1/(x-1)`). Nếu muốn cho chia, phải kiểm tra mẫu số khác 0 trên toàn miền vẽ.
- Giới hạn bậc đa thức (mặc định ≤ 3).
- Giới hạn độ dài biểu thức (số node AST tối đa).
- Chặn hệ số lớn bên trong `sin`/`cos` để tránh dao động cực nhanh (vd cấm `sin(999*x)`).
- Giới hạn miền giá trị `y` được vẽ; kết hợp **giới hạn độ dốc**: khi sample, nếu `|Δy|` giữa hai điểm liên tiếp vượt ngưỡng thì cắt đường cong tại đó (dùng luôn cho tường/hố).

### 5.4 Ràng buộc theo trận (cơ chế 1 — meta thay đổi)

Mỗi trận nạp một `rules` khác nhau:

- Trận 1: chỉ đa thức.
- Trận 2: chỉ `sin`, `cos`.
- Trận 3: cấm `x^2`.
- Trận 4: bắt buộc có ít nhất một dấu ngoặc.

Đổi `rules` → meta tự thay đổi liên tục, không cần sửa engine.

### 5.5 Code tham chiếu

```js
// astGuard.js
import { parse } from 'mathjs';

const COST = { add:1, subtract:1, multiply:2, divide:2,
               pow:3, sin:4, cos:4, tan:8, sqrt:5, log:6, abs:2 };

// rules = { allowedFns:Set, maxMana:number, maxDeg:number, maxNodes:number, requireParen:bool, banPow2:bool }
export function analyze(expr, rules) {
  let node;
  try { node = parse(expr); }
  catch { return { ok:false, reason:'Sai cú pháp', mana:0, degree:0 }; }

  let mana = 0, degree = 0, nodes = 0, ok = true, reason = '';

  node.traverse((n) => {
    nodes++;
    if (n.type === 'FunctionNode') {
      const name = n.fn.name;
      if (!rules.allowedFns.has(name)) { ok = false; reason = `Cấm hàm ${name}`; }
      mana += COST[name] ?? 3;
    }
    if (n.type === 'OperatorNode') {
      mana += COST[n.fn] ?? 1;
      if (n.fn === 'divide') { ok = false; reason = 'Cấm chia (tránh pole 1/x)'; }
      if (n.fn === 'pow') {
        const exp = n.args[1];
        if (exp.type === 'ConstantNode') {
          degree = Math.max(degree, exp.value);
          if (rules.banPow2 && exp.value === 2) { ok = false; reason = 'Trận này cấm x^2'; }
        }
      }
    }
  });

  if (rules.requireParen && !expr.includes('(')) { ok = false; reason = 'Cần ít nhất 1 dấu ngoặc'; }
  if (nodes > rules.maxNodes)  { ok = false; reason = 'Biểu thức quá dài'; }
  if (mana  > rules.maxMana)   { ok = false; reason = `Vượt mana (${mana}/${rules.maxMana})`; }
  if (degree > rules.maxDeg)   { ok = false; reason = `Bậc quá cao (${degree})`; }

  return { ok, reason, mana, degree };
}
```

---

## 6. Pipeline mảng điểm

### 6.1 Sinh đường cong

```js
// curve.js — origin = vị trí pixel người bắn; direction = +1 (phải) / -1 (trái)
export function sampleCurve(fn, origin, { pixelsPerUnit, direction, xMax, step, bounds, maxSlope }) {
  const pts = [];
  let prev = null;
  for (let ux = 0; ux <= xMax; ux += step) {
    const uy = fn(ux);
    if (!isFinite(uy)) continue;
    const x = origin.x + direction * ux * pixelsPerUnit;
    const y = origin.y - uy * pixelsPerUnit;             // đảo trục y (màn hình y đi xuống)
    if (x < 0 || x > bounds.w || y < -50 || y > bounds.h + 50) break;
    if (prev && Math.abs(y - prev.y) > maxSlope) break;  // chống dao động/độ dốc quá lớn
    pts.push({ x, y }); prev = { x, y };
  }
  return pts;
}
```

### 6.2 Xoay theo góc bắn (cơ chế 6 — ưu tiên sớm)

Rẻ (~5 dòng) nhưng thay đổi gameplay nhiều nhất. Sau khi sample xong, xoay từng điểm quanh vị trí người bắn.

```js
export function rotate(pts, origin, deg) {
  const r = deg * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
  return pts.map(p => {
    const dx = p.x - origin.x, dy = p.y - origin.y;
    return { x: origin.x + dx*c - dy*s, y: origin.y + dx*s + dy*c };
  });
}
```

### 6.3 Vật phẩm (cơ chế 7 — phần lớn "miễn phí")

Nhiều vật phẩm chỉ là biến đổi trên chính pipeline này:

- Phản chiếu đồ thị → `direction *= -1`
- Đảo trục Y → `uy *= -1` (hoặc lật mảng điểm qua trục ngang tại `origin`)
- Đảo trục X → lật qua trục dọc tại `origin`
- Nhân đôi đồ thị → sample thêm bản `-f(x)` và vẽ cả hai
- Tăng phạm vi → tăng `xMax`

### 6.4 Va chạm

```js
export function checkCollision(pts, players, shooterId) {
  for (const p of pts) {
    for (const pl of players) {
      if (pl.id === shooterId || pl.eliminated) continue;
      const dx = p.x - pl.x, dy = p.y - pl.y;
      if (dx*dx + dy*dy <= pl.radius*pl.radius) return { hitId: pl.id, at: p };
    }
  }
  return null;
}

export function toPathD(pts) {
  return pts.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
}
```

---

## 7. Mô hình dữ liệu

```ts
type Player = {
  id: string;
  label: string;         // "P1", "P2"
  x: number; y: number;  // vị trí pixel
  radius: number;        // hitbox
  color: string;
  angle: number;         // góc bắn hiện tại (độ), cho cơ chế 6
  mana: number;
  items: string[];
  eliminated: boolean;
};

type MatchRules = {
  allowedFns: Set<string>;
  maxMana: number;
  maxDeg: number;
  maxNodes: number;
  requireParen: boolean;
  banPow2: boolean;
  inputTimeSec: number;  // cơ chế 5
};

type GameState = {
  players: Player[];
  turnIndex: number;
  rules: MatchRules;
  terrain: Terrain[];    // cơ chế 4, có thể rỗng ở MVP
  lastCurve: Point[];    // để render + phục vụ combo nếu làm
  phase: 'aiming' | 'firing' | 'over';
  winnerId?: string;
};
```

---

## 8. Ưu tiên triển khai

| Cơ chế | Giá trị | Công sức | Móc vào | Giai đoạn |
|---|---|---|---|---|
| Hạn chế hàm (1) | Rất cao | Thấp | AST guard | **MVP** |
| Mana (2) | Rất cao | Thấp | AST guard | **MVP** |
| Chống phá game | Bắt buộc | Thấp | AST + sampler | **MVP** |
| Timer nhập (5) | Trung bình | Rất thấp | UI `setInterval` | **MVP** |
| Xoay hệ trục (6) | Cao | Thấp | Point pipeline | **MVP / sớm** |
| Di chuyển (3) | Cao | Trung bình | Turn manager | v1.1 |
| Vật phẩm (7) | Cao | Thấp/món | Point pipeline | v1.1 |
| Địa hình (4) | Cao | Cao | Point pipeline | v1.2 |
| Chế độ học (9) | Cao | Trung bình | Nội dung | Song song |
| Combo (8) | Chưa rõ | Cao | Rule riêng | **Xem lại / hoãn** |

### Ghi chú thiết kế

- **Xoay hệ trục (6):** ban đầu đánh 4 sao nhưng nên đưa vào sớm — cực rẻ mà tăng chiều sâu nhiều nhất.
- **Combo (8):** ý tưởng hay nhưng **chưa đủ định nghĩa** ("hai đồ thị giao nhau tạo vụ nổ" — giao ở đâu? lượt nào tính? đường cũ có tồn tại qua lượt?). Nếu mơ hồ, người chơi không đoán được và mất luôn cái hay của game. **Hoãn khỏi v1**, hoặc thu hẹp thành một luật rõ ràng trước khi code, ví dụ: *"đường của bạn nếu cắt đường đối thủ đã vẽ ở lượt trước, tại điểm gần đối thủ → gây sát thương vùng."*

### Phạm vi v1 khuyến nghị

Hot-seat 2 người + AST guard (hàm + mana + chống cheat) + timer nhập + xoay trục. Đã là một game có chiều sâu, khó lặp lại sau vài chục trận. Cơ chế 3/4/7 là bản mở rộng.

---

## 9. Lộ trình build

1. `npx create-expo-app`, cài `mathjs` + `react-native-svg`.
2. Vẽ được **một đường cong tĩnh** từ hàm cứng (`x^2`) — làm chủ coordinate mapping (đơn vị toán ↔ pixel, đảo trục y).
3. Ô nhập hàm + nút Bắn → vẽ theo input.
4. Cắm **AST guard**: whitelist + mana + chống cheat. Hiển thị mana tiêu hao và lý do từ chối.
5. Đặt người chơi; đường cong xuất phát từ vị trí người bắn (P1 sang phải, P2 lật sang trái).
6. **Va chạm + loại người chơi**.
7. Turn manager + timer nhập (10s) + màn hình thắng.
8. Thêm **xoay trục** (thanh chỉnh góc trước khi bắn).
9. Polish: di chuyển, vật phẩm, rồi địa hình (phản xạ = tính pháp tuyến mặt phản xạ). Cân nhắc Skia khi cần animate đạn bay.
10. (Tuỳ chọn) Multiplayer online.

---

## 10. Chế độ học (cơ chế 9)

Chạy song song, không chặn tiến độ. Sau mỗi phát bắn, nhận diện dạng hàm từ AST và hiển thị chú thích ngắn: "Đây là parabol (bậc 2)", "Đây là hàm bậc nhất", "Đây là sin". Dữ liệu đã có sẵn từ `analyze()` (biết loại hàm, bậc). Có thể mở chế độ chơi PvE với gợi ý để người mới học hình dạng đồ thị.

---

## 11. Cân bằng & tinh chỉnh

- Bảng giá mana và trần mana là các con số cần **playtest** để cân bằng; đặt chúng ở một file config để dễ chỉnh.
- Ngưỡng độ dốc (`maxSlope`) và miền giá trị `y` ảnh hưởng trực tiếp tới việc chống cheat — chỉnh dần.
- Meta được điều khiển hoàn toàn qua `MatchRules`; có thể tạo "chế độ trận" (polynomial-only, trig-only, chaos...) mà không đụng vào engine.

---

## 12. Multiplayer (để sau)

Bắt đầu **hot-seat** (2 người cùng máy, thay phiên). Vì game turn-based, online chỉ cần đồng bộ *nước đi* (chuỗi hàm số + góc + vị trí) qua **Firebase Firestore** hoặc **Supabase Realtime** — không cần server real-time phức tạp.

---

## 13. Câu hỏi mở cần chốt trước khi code phần liên quan

1. **Luật combo (8):** giữ hay bỏ? Nếu giữ, định nghĩa chính xác điều kiện kích hoạt và vùng sát thương.
2. **Địa hình phản xạ (4):** phản xạ theo pháp tuyến mặt phẳng, hay đơn giản chỉ chặn (tường/hố) ở v1?
3. **Di chuyển (3):** lưới ô rời rạc hay toạ độ liên tục?
4. **Sát thương:** loại ngay khi trúng (một phát chết), hay có máu/HP?
