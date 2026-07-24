# Graph War — Danh sách task triển khai chi tiết

> Đọc kèm `graph-war-spec.md`. File này chia công việc thành từng task nhỏ, có thứ tự, mỗi task có: việc cần làm, file liên quan, và tiêu chí hoàn thành (acceptance). Làm tuần tự từ trên xuống. Mỗi phase kết thúc phải chạy được và kiểm tra được trước khi sang phase sau.

**Quy ước:**
- `[ ]` chưa làm · `[x]` xong.
- Mỗi task ghi rõ *Acceptance* = điều kiện coi như hoàn thành.
- Đường dẫn file tính từ gốc dự án.
- Đơn vị toán ↔ pixel: `pixelsPerUnit` (mặc định 34). Trục y màn hình đi xuống nên khi vẽ phải đảo dấu (`y_screen = origin.y - uy*pixelsPerUnit`).

---

## Phase 0 — Chuẩn bị & khởi tạo dự án

- [x] **T0.1 — Kiểm tra môi trường.** Cài Node LTS, xác nhận `node -v`, `npm -v`. Cài Expo Go trên điện thoại thật để test.
  *Acceptance:* chạy được `npx expo --version`.

- [x] **T0.2 — Tạo dự án Expo.**
  ```bash
  npx create-expo-app graph-war --template blank
  cd graph-war
  ```
  *Acceptance:* `npx expo start` mở được app trắng trên Expo Go.

- [x] **T0.3 — Cài dependencies lõi.**
  ```bash
  npx expo install react-native-svg
  npm install mathjs
  ```
  *Acceptance:* import `mathjs` và `react-native-svg` không lỗi.

- [x] **T0.4 — Dựng cấu trúc thư mục.**
  ```
  src/
    engine/        # logic thuần, KHÔNG import React
      astGuard.js
      curve.js
      collision.js
      coords.js
      transforms.js
    game/
      gameState.js  # reducer + initial state
      rules.js      # cấu hình các trận (MatchRules)
    components/
      GameCanvas.jsx
      EquationInput.jsx
      TurnBar.jsx
    screens/
      GameScreen.jsx
    config.js       # hằng số cân bằng
    App.js
  ```
  *Acceptance:* thư mục tồn tại, `App.js` render "Graph War".

- [x] **T0.5 — File config hằng số.** Tạo `src/config.js` chứa: `PIXELS_PER_UNIT`, `X_MAX`, `STEP`, `MAX_SLOPE`, `PLAYER_RADIUS`, `DEFAULT_MANA`, `INPUT_TIME_SEC`, kích thước canvas.
  *Acceptance:* mọi hằng số ma thuật về sau đọc từ đây, không hardcode rải rác.

- [x] **T0.6 — Khởi tạo git.** `git init`, thêm `.gitignore` (node_modules, .expo). Commit đầu tiên.
  *Acceptance:* `git log` có commit "init".

---

## Phase 1 — Hệ toạ độ & vẽ đường cong tĩnh

Mục tiêu: vẽ được đúng một parabol cứng `x^2`, làm chủ việc quy đổi toạ độ trước khi làm bất cứ thứ gì khác.

- [x] **T1.1 — Module toạ độ.** Tạo `src/engine/coords.js`: hàm `toScreen(origin, ux, uy, {pixelsPerUnit, direction})` trả về `{x, y}` pixel (nhớ đảo trục y).
  *Acceptance:* unit test: `toScreen({x:100,y:200}, 0, 0, …) === {x:100, y:200}`.

- [x] **T1.2 — Sinh mảng điểm cơ bản.** Trong `src/engine/curve.js` viết `sampleCurve(fn, origin, opts)` (chưa cần maxSlope). Quét `ux` từ 0 tới `xMax` bước `step`.
  *Acceptance:* `sampleCurve(x=>x*x, …)` trả mảng điểm tăng dần, không NaN.

- [x] **T1.3 — Chuyển mảng điểm thành path SVG.** Viết `toPathD(pts)` trong `curve.js`.
  *Acceptance:* trả chuỗi bắt đầu bằng `M`, các đoạn sau là `L`.

- [x] **T1.4 — Component canvas tối thiểu.** `src/components/GameCanvas.jsx` dùng `<Svg>` + `<Path>` vẽ đường cong từ props `curve`. Vẽ thêm lưới nền (các đường cách nhau `pixelsPerUnit`) để dễ debug.
  *Acceptance:* mở app thấy một parabol vẽ trên lưới, đúng hình.

- [x] **T1.5 — Kiểm chứng đảo trục.** Vẽ thêm `y = x` và `y = -x` để xác nhận hướng lên/xuống đúng.
  *Acceptance:* `y=x` đi lên bên phải, `y=-x` đi xuống.

---

## Phase 2 — Nhập hàm & vẽ động

- [x] **T2.1 — Compile biểu thức.** Trong `astGuard.js` (tạm) hoặc `curve.js`, viết `compileFunction(expr)` dùng `mathjs.parse(expr).compile()`, bọc try/catch trả `NaN` khi lỗi runtime.
  *Acceptance:* `compileFunction('sin(x)+x')(0) === 0`.

- [x] **T2.2 — Ô nhập hàm.** `src/components/EquationInput.jsx`: `TextInput` + nút "Bắn". Có prop `onFire(expr)`.
  *Acceptance:* gõ `x^2`, bấm Bắn → gọi `onFire('x^2')`.

- [x] **T2.3 — Nối input → canvas.** Trong `GameScreen.jsx`, state `curve`; khi `onFire`: compile → sample → setState → canvas vẽ.
  *Acceptance:* nhập hàm bất kỳ hợp lệ → đường cong cập nhật ngay.

- [x] **T2.4 — Xử lý lỗi cú pháp cơ bản.** Nhập sai (`x^`, `sin(`) → hiện thông báo lỗi, không crash.
  *Acceptance:* nhập rác không làm app văng.

---

## Phase 3 — AST Guard (hệ thống lõi)

Xem mục 5 của spec. Đây là phần chịu tải chính.

- [ ] **T3.1 — Bảng giá mana.** Định nghĩa `COST` trong `astGuard.js` theo bảng ở spec.
  *Acceptance:* có đủ add/subtract/multiply/divide/pow/sin/cos/tan/sqrt/log/abs.

- [ ] **T3.2 — Duyệt AST & tính mana.** Viết `analyze(expr, rules)` dùng `node.traverse`. Cộng mana theo `OperatorNode` và `FunctionNode`.
  *Acceptance:* `analyze('sin(x)+x^2', …).mana === 4 + 1 + 3 = 8`.

- [ ] **T3.3 — Whitelist loại hàm.** Trong traverse, nếu tên hàm không thuộc `rules.allowedFns` → `ok=false`, `reason`.
  *Acceptance:* trận "chỉ đa thức" từ chối `sin(x)`.

- [ ] **T3.4 — Chống phá game.** Thêm: cấm `divide`; giới hạn bậc `pow` ≤ `maxDeg`; giới hạn số node ≤ `maxNodes`.
  *Acceptance:* `1/(x-1)` bị từ chối; `x^9` bị từ chối; biểu thức siêu dài bị từ chối.

- [ ] **T3.5 — Ràng buộc theo trận.** Hỗ trợ `banPow2` (cấm `x^2`), `requireParen` (bắt buộc có ngoặc).
  *Acceptance:* trận cấm `x^2` từ chối `x^2` nhưng nhận `x^3`; trận yêu cầu ngoặc từ chối `x+1`.

- [ ] **T3.6 — Chặn dao động nhanh.** Từ chối hệ số lớn bên trong `sin/cos` (vd `|coeff| > ngưỡng`), hoặc để `MAX_SLOPE` ở sample lo (T4.x). Chọn một, ghi chú lại.
  *Acceptance:* `sin(999*x)` bị chặn hoặc bị cắt đường cong.

- [ ] **T3.7 — File cấu hình trận.** `src/game/rules.js` xuất vài `MatchRules` mẫu (polynomial-only, trig-only, no-square, chaos).
  *Acceptance:* đổi rule → hành vi kiểm tra đổi theo, không sửa engine.

- [ ] **T3.8 — Hiển thị mana & lý do từ chối.** `EquationInput` gọi `analyze` khi gõ (debounce), hiện mana tiêu hao và lý do nếu không hợp lệ; disable nút Bắn khi `!ok`.
  *Acceptance:* gõ `sin(x)+x^2` thấy "mana 8/10"; gõ hàm cấm thấy lý do.

- [ ] **T3.9 — Unit test AST Guard.** Viết test cho các case: hợp lệ, vượt mana, hàm cấm, pole, bậc cao, thiếu ngoặc.
  *Acceptance:* tất cả case pass.

---

## Phase 4 — Người chơi & bắn từ vị trí

- [ ] **T4.1 — Mô hình người chơi.** Định nghĩa `Player` (xem spec mục 7). Tạo state ban đầu 2 người: P1 trái, P2 phải.
  *Acceptance:* canvas vẽ 2 chấm tròn có nhãn P1/P2.

- [ ] **T4.2 — Đường cong xuất phát từ người bắn.** `origin` = vị trí người đang tới lượt; `direction` = +1 cho P1, -1 cho P2 (lật sang trái).
  *Acceptance:* P2 bắn → đường cong đi sang trái.

- [ ] **T4.3 — Giới hạn độ dốc / miền vẽ.** Thêm `maxSlope` và cắt biên vào `sampleCurve` (spec mục 6.1).
  *Acceptance:* hàm dốc đứng bị cắt, không vẽ vọt ra ngoài màn hình.

- [ ] **T4.4 — Render trạng thái người chơi.** Người bị loại vẽ khác màu + dấu X.
  *Acceptance:* set `eliminated=true` → hiển thị đổi.

---

## Phase 5 — Va chạm & loại người chơi

- [ ] **T5.1 — Hàm va chạm.** `checkCollision(pts, players, shooterId)` trong `collision.js` (spec mục 6.4).
  *Acceptance:* test: điểm nằm trong bán kính → trả `hitId`.

- [ ] **T5.2 — Nối va chạm vào lượt bắn.** Sau khi vẽ, chạy `checkCollision`; nếu trúng → đánh dấu `eliminated`.
  *Acceptance:* bắn trúng P2 → P2 chuyển trạng thái loại.

- [ ] **T5.3 — (Tuỳ chọn) animate đạn bay.** Vẽ dần từng điểm bằng `requestAnimationFrame` / `Animated`, kiểm tra va chạm theo tiến trình, dừng khi trúng.
  *Acceptance:* thấy đường cong "bay" và dừng tại điểm trúng.

---

## Phase 6 — Turn manager, timer, điều kiện thắng

- [ ] **T6.1 — Reducer game state.** `src/game/gameState.js`: actions `FIRE`, `NEXT_TURN`, `ELIMINATE`, `RESET`. `phase`: aiming → firing → over.
  *Acceptance:* dispatch `NEXT_TURN` xoay vòng qua người chưa loại.

- [ ] **T6.2 — Chuyển lượt sau mỗi phát.** Bắn xong (trúng hay trượt) → `NEXT_TURN`.
  *Acceptance:* hai người thay phiên đúng.

- [ ] **T6.3 — Kiểm tra thắng.** Còn 1 người sống → `phase='over'`, set `winnerId`.
  *Acceptance:* loại P2 → hiện "P1 thắng".

- [ ] **T6.4 — Timer nhập (cơ chế 5).** `TurnBar.jsx` đếm ngược `inputTimeSec`. Hết giờ chưa bắn → mất lượt (`NEXT_TURN`).
  *Acceptance:* để trôi 10s → tự chuyển lượt.

- [ ] **T6.5 — Reset mana mỗi lượt.** Đầu lượt, mana về `DEFAULT_MANA`.
  *Acceptance:* sang lượt mới mana đầy lại.

- [ ] **T6.6 — Màn hình kết thúc.** Overlay "… thắng" + nút "Chơi lại" (dispatch `RESET`).
  *Acceptance:* bấm chơi lại → ván mới, vị trí/mana reset.

---

## Phase 7 — Xoay hệ trục (cơ chế 6)

- [ ] **T7.1 — Hàm xoay.** `rotate(pts, origin, deg)` trong `transforms.js` (spec mục 6.2).
  *Acceptance:* test: xoay 90° điểm (origin.x+10, origin.y) → (origin.x, origin.y+10) (theo hệ y xuống).

- [ ] **T7.2 — Điều khiển góc.** Thanh trượt / nút chỉnh `player.angle` trước khi bắn; hiện tia ngắm mờ theo góc.
  *Acceptance:* đổi góc → tia ngắm xoay.

- [ ] **T7.3 — Áp xoay vào pipeline.** Sau `sampleCurve`, gọi `rotate(pts, origin, player.angle)` trước va chạm.
  *Acceptance:* nhập `x^2` với góc 45° → parabol nghiêng 45°.

**→ Kết thúc Phase 7 = hoàn thành v1 chơi được.**

---

## Phase 8 — Mở rộng v1.1

- [ ] **T8.1 — Di chuyển (cơ chế 3).** Mỗi lượt chọn *đi ≤ 2 ô* hoặc *bắn*. Quyết định lưới rời rạc hay toạ độ liên tục (câu hỏi mở #3 trong spec) trước khi làm.
  *Acceptance:* chọn di chuyển → người chơi đổi vị trí, hết lượt.

- [ ] **T8.2 — Vật phẩm (cơ chế 7).** Cài các biến đổi trên point pipeline: phản chiếu (`direction*=-1`), đảo trục X/Y, nhân đôi đồ thị (thêm bản `-f(x)`), tăng phạm vi (`xMax`).
  *Acceptance:* dùng "phản chiếu" → đường cong lật hướng đúng.

- [ ] **T8.3 — UI túi đồ.** Hiển thị vật phẩm đang có, cho phép kích hoạt trước khi bắn.
  *Acceptance:* kích hoạt vật phẩm → hiệu ứng áp vào phát bắn kế.

---

## Phase 9 — Địa hình (cơ chế 4, v1.2)

- [ ] **T9.1 — Mô hình địa hình.** `Terrain`: tường, hố, khối phản xạ, cổng dịch chuyển.
- [ ] **T9.2 — Chặn đường cong.** Khi sample gặp tường/hố → cắt đường cong tại điểm chạm.
  *Acceptance:* đường cong dừng ở tường.
- [ ] **T9.3 — Phản xạ.** Khối phản xạ: tính pháp tuyến mặt, đổi hướng phần đường cong còn lại. (Chốt câu hỏi mở #2 trước.)
  *Acceptance:* đường cong bật lại đúng góc.
- [ ] **T9.4 — Cổng dịch chuyển.** Điểm chạm cổng A → tiếp tục vẽ từ cổng B.
  *Acceptance:* đường cong "teleport" liên tục.

---

## Phase 10 — Chế độ học (cơ chế 9)

- [ ] **T10.1 — Nhận diện dạng hàm.** Từ kết quả `analyze` (loại hàm, bậc), suy ra nhãn: "parabol", "hàm bậc nhất", "sin"…
  *Acceptance:* bắn `x^2` → hiện "Đây là parabol (bậc 2)".
- [ ] **T10.2 — Chế độ PvE tập luyện.** Bắn vào bia cố định kèm gợi ý cho người mới.
  *Acceptance:* chơi được một mình, có chú thích.

---

## Phase 11 — Multiplayer online (tuỳ chọn)

- [ ] **T11.1 — Chọn backend.** Firestore hoặc Supabase Realtime.
- [ ] **T11.2 — Đồng bộ nước đi.** Gửi/nhận `{expr, angle, moveTo, playerId}` mỗi lượt; tái dựng trạng thái từ nước đi.
  *Acceptance:* hai máy chơi cùng ván, thấy nước đi của nhau.
- [ ] **T11.3 — Chống gian lận phía server (nếu cần).** Chạy `analyze` phía server để không tin client.

---

## Việc xuyên suốt (làm liên tục)

- [ ] **X1 — Tách logic khỏi UI.** Mọi thứ trong `src/engine/` phải là hàm thuần, test được không cần React.
- [ ] **X2 — Test.** Thêm test cho `analyze`, `sampleCurve`, `checkCollision`, `rotate` mỗi khi sửa.
- [ ] **X3 — Cân bằng.** Bảng mana, `MAX_SLOPE`, miền `y` để ở `config.js`; chỉnh dựa trên playtest, không rải rác trong code.
- [ ] **X4 — Chốt câu hỏi mở trong spec** (một-phát-chết hay có máu; luật combo; địa hình phản xạ hay chỉ chặn; di chuyển lưới hay liên tục) *trước khi* code phần liên quan.

---

## Cột mốc (milestones)

| Mốc | Hoàn thành phase | Trạng thái mong đợi |
|---|---|---|
| M1 — Vẽ được | 1–2 | Nhập hàm → thấy đường cong |
| M2 — Chống phá game | 3 | AST Guard chặn cheat, tính mana |
| M3 — Playable core | 4–6 | Hai người bắn nhau, có thắng/thua, có timer |
| M4 — v1 hoàn chỉnh | 7 | Thêm xoay trục → game có chiều sâu |
| M5 — Mở rộng | 8–10 | Di chuyển, vật phẩm, địa hình, chế độ học |
| M6 — Online | 11 | Chơi qua mạng |
