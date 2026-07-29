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

- [x] **T3.1 — Bảng giá mana.** Định nghĩa `COST` trong `astGuard.js` theo bảng ở spec.
  *Acceptance:* có đủ add/subtract/multiply/divide/pow/sin/cos/tan/sqrt/log/abs.

- [x] **T3.2 — Duyệt AST & tính mana.** Viết `analyze(expr, rules)` dùng `node.traverse`. Cộng mana theo `OperatorNode` và `FunctionNode`.
  *Acceptance:* `analyze('sin(x)+x^2', …).mana === 4 + 1 + 3 = 8`.

- [x] **T3.3 — Whitelist loại hàm.** Trong traverse, nếu tên hàm không thuộc `rules.allowedFns` → `ok=false`, `reason`.
  *Acceptance:* trận "chỉ đa thức" từ chối `sin(x)`.

- [x] **T3.4 — Chống phá game.** Thêm: cấm `divide`; giới hạn bậc `pow` ≤ `maxDeg`; giới hạn số node ≤ `maxNodes`.
  *Acceptance:* `1/(x-1)` bị từ chối; `x^9` bị từ chối; biểu thức siêu dài bị từ chối.

- [x] **T3.5 — Ràng buộc theo trận.** Hỗ trợ `banPow2` (cấm `x^2`), `requireParen` (bắt buộc có ngoặc).
  *Acceptance:* trận cấm `x^2` từ chối `x^2` nhưng nhận `x^3`; trận yêu cầu ngoặc từ chối `x+1`.

- [x] **T3.6 — Chặn dao động nhanh.** Từ chối hệ số lớn bên trong `sin/cos` (vd `|coeff| > ngưỡng`), hoặc để `MAX_SLOPE` ở sample lo (T4.x). Chọn một, ghi chú lại.
  *Acceptance:* `sin(999*x)` bị chặn hoặc bị cắt đường cong.
  *Ghi chú:* chọn chặn ở mức AST trong `analyze()` (so hệ số nhân trực tiếp trong đối số của sin/cos/tan với `rules.maxTrigCoeff`), không dựa vào `MAX_SLOPE` lúc sample — lỗi hiện ngay lúc gõ, trước khi tốn mana vẽ ra đường cong bị cắt cụt.

- [x] **T3.7 — File cấu hình trận.** `src/game/rules.js` xuất vài `MatchRules` mẫu (polynomial-only, trig-only, no-square, chaos).
  *Acceptance:* đổi rule → hành vi kiểm tra đổi theo, không sửa engine.

- [x] **T3.8 — Hiển thị mana & lý do từ chối.** `EquationInput` gọi `analyze` khi gõ (debounce), hiện mana tiêu hao và lý do nếu không hợp lệ; disable nút Bắn khi `!ok`.
  *Acceptance:* gõ `sin(x)+x^2` thấy "mana 8/10"; gõ hàm cấm thấy lý do.

- [x] **T3.9 — Unit test AST Guard.** Viết test cho các case: hợp lệ, vượt mana, hàm cấm, pole, bậc cao, thiếu ngoặc.
  *Acceptance:* tất cả case pass.

---

## Phase 4 — Người chơi & bắn từ vị trí

- [x] **T4.1 — Mô hình người chơi.** Định nghĩa `Player` (xem spec mục 7). Tạo state ban đầu 2 người: P1 trái, P2 phải.
  *Acceptance:* canvas vẽ 2 chấm tròn có nhãn P1/P2.

- [x] **T4.2 — Đường cong xuất phát từ người bắn.** `origin` = vị trí người đang tới lượt; `direction` = +1 cho P1, -1 cho P2 (lật sang trái).
  *Acceptance:* P2 bắn → đường cong đi sang trái.

- [x] **T4.3 — Giới hạn độ dốc / miền vẽ.** Thêm `maxSlope` và cắt biên vào `sampleCurve` (spec mục 6.1).
  *Acceptance:* hàm dốc đứng bị cắt, không vẽ vọt ra ngoài màn hình.

- [x] **T4.4 — Render trạng thái người chơi.** Người bị loại vẽ khác màu + dấu X.
  *Acceptance:* set `eliminated=true` → hiển thị đổi.

---

## Phase 5 — Va chạm & loại người chơi

- [x] **T5.1 — Hàm va chạm.** `checkCollision(pts, players, shooterId)` trong `collision.js` (spec mục 6.4).
  *Acceptance:* test: điểm nằm trong bán kính → trả `hitId`.

- [x] **T5.2 — Nối va chạm vào lượt bắn.** Sau khi vẽ, chạy `checkCollision`; nếu trúng → đánh dấu `eliminated`.
  *Acceptance:* bắn trúng P2 → P2 chuyển trạng thái loại.
  *Ghi chú:* chốt câu hỏi mở #4 = **một phát chết** (không có máu/HP) — trúng → `eliminated=true` ngay (`gameState.js`, action `ELIMINATE`), không có state sát thương tích luỹ. Đơn giản, khớp vòng lặp turn-based cốt lõi (spec mục 2); không cần thiết kế thêm UI thanh máu.

- [x] **T5.3 — (Tuỳ chọn) animate đạn bay.** Vẽ dần từng điểm bằng `requestAnimationFrame` / `Animated`, kiểm tra va chạm theo tiến trình, dừng khi trúng.
  *Acceptance:* thấy đường cong "bay" và dừng tại điểm trúng.

---

## Phase 6 — Turn manager, timer, điều kiện thắng

- [x] **T6.1 — Reducer game state.** `src/game/gameState.js`: actions `FIRE`, `NEXT_TURN`, `ELIMINATE`, `RESET`. `phase`: aiming → firing → over.
  *Acceptance:* dispatch `NEXT_TURN` xoay vòng qua người chưa loại.

- [x] **T6.2 — Chuyển lượt sau mỗi phát.** Bắn xong (trúng hay trượt) → `NEXT_TURN`.
  *Acceptance:* hai người thay phiên đúng.

- [x] **T6.3 — Kiểm tra thắng.** Còn 1 người sống → `phase='over'`, set `winnerId`.
  *Acceptance:* loại P2 → hiện "P1 thắng".

- [x] **T6.4 — Timer nhập (cơ chế 5).** `TurnBar.jsx` đếm ngược `inputTimeSec`. Hết giờ chưa bắn → mất lượt (`NEXT_TURN`).
  *Acceptance:* để trôi 10s → tự chuyển lượt.

- [x] **T6.5 — Reset mana mỗi lượt.** Đầu lượt, mana về `DEFAULT_MANA`.
  *Acceptance:* sang lượt mới mana đầy lại.

- [x] **T6.6 — Màn hình kết thúc.** Overlay "… thắng" + nút "Chơi lại" (dispatch `RESET`).
  *Acceptance:* bấm chơi lại → ván mới, vị trí/mana reset.

---

## Phase 7 — Xoay hệ trục (cơ chế 6)

- [x] **T7.1 — Hàm xoay.** `rotate(pts, origin, deg)` trong `transforms.js` (spec mục 6.2).
  *Acceptance:* test: xoay 90° điểm (origin.x+10, origin.y) → (origin.x, origin.y+10) (theo hệ y xuống).

- [x] **T7.2 — Điều khiển góc.** Thanh trượt / nút chỉnh `player.angle` trước khi bắn; hiện tia ngắm mờ theo góc.
  *Acceptance:* đổi góc → tia ngắm xoay.

- [x] **T7.3 — Áp xoay vào pipeline.** Sau `sampleCurve`, gọi `rotate(pts, origin, player.angle)` trước va chạm.
  *Acceptance:* nhập `x^2` với góc 45° → parabol nghiêng 45°.

**→ Kết thúc Phase 7 = hoàn thành v1 chơi được.**

---

## Phase 8 — Mở rộng v1.1

- [x] **T8.1 — Di chuyển (cơ chế 3).** Mỗi lượt chọn *đi ≤ 2 ô* hoặc *bắn*. Quyết định lưới rời rạc hay toạ độ liên tục (câu hỏi mở #3 trong spec) trước khi làm.
  *Acceptance:* chọn di chuyển → người chơi đổi vị trí, hết lượt.
  *Ghi chú:* chốt câu hỏi mở #3 = **lưới ô rời rạc** (1 ô = `PIXELS_PER_UNIT`, khớp lưới nền đã vẽ), không dùng toạ độ liên tục — dễ hình dung, dễ test, nhất quán với cách vẽ grid có sẵn. `MoveControl.jsx` cho chọn 1/2 ô + hướng (8 phía); `MOVE` (gameState.js) kẹp vị trí trong bounds màn hình. Di chuyển và bắn loại trừ nhau vì cả hai đều tự `NEXT_TURN`.

- [x] **T8.2 — Vật phẩm (cơ chế 7).** Cài các biến đổi trên point pipeline: phản chiếu (`direction*=-1`), đảo trục X/Y, nhân đôi đồ thị (thêm bản `-f(x)`), tăng phạm vi (`xMax`).
  *Acceptance:* dùng "phản chiếu" → đường cong lật hướng đúng.
  *Ghi chú:* các biến đổi thuần nằm ở `src/engine/items.js` (`applyItemToSampleOptions`, `applyItemToPoints`, `mirrorFn`), áp vào pipeline trong `GameScreen.handleFire` đúng thứ tự spec 6.1→6.2→6.3 (sample → rotate → item). "Nhân đôi" vẽ + kiểm tra va chạm song song trên cả hai đường cong.

- [x] **T8.3 — UI túi đồ.** Hiển thị vật phẩm đang có, cho phép kích hoạt trước khi bắn.
  *Acceptance:* kích hoạt vật phẩm → hiệu ứng áp vào phát bắn kế.
  *Ghi chú:* chưa có cơ chế nhặt/rơi vật phẩm nên mỗi người chơi khởi đầu với đủ bộ 5 loại (`STARTER_ITEMS` trong `gameState.js`) để chơi/test ngay; `ItemBag.jsx` chọn vật phẩm active, tiêu hao qua action `USE_ITEM` sau khi bắn xong.

---

## Phase 9 — Địa hình (cơ chế 4, v1.2)

- [x] **T9.1 — Mô hình địa hình.** `Terrain`: tường, hố, khối phản xạ, cổng dịch chuyển.
  *Ghi chú:* spec chỉ khai báo `terrain: Terrain[]` mà không định hình cụ thể; thiết kế ở `src/engine/terrain.js` — mỗi terrain là hình chữ nhật `{x,y,w,h}` cùng hệ toạ độ pixel với điểm đường cong sau sample→rotate→item, cộng field riêng theo loại: `reflector` có `normal:{x,y}`, `portal` có `id`/`pairId` để ghép đôi hai chiều. Bản đồ mặc định (`src/game/terrain.js`) đặt theo tỉ lệ width/height, lưu trong `state.terrain` (reducer, `gameState.js`) và vẽ bằng `TerrainShape` trong `GameCanvas.jsx`.

- [x] **T9.2 — Chặn đường cong.** Khi sample gặp tường/hố → cắt đường cong tại điểm chạm.
  *Acceptance:* đường cong dừng ở tường.
  *Ghi chú:* `applyTerrain()` quét mảng điểm (đã sample→rotate→item) theo thứ tự vẽ; gặp `wall`/`pit` → cắt `slice(0, hitIndex+1)`, dừng hẳn.

- [x] **T9.3 — Phản xạ.** Khối phản xạ: tính pháp tuyến mặt, đổi hướng phần đường cong còn lại. (Chốt câu hỏi mở #2 trước.)
  *Acceptance:* đường cong bật lại đúng góc.
  *Ghi chú:* chốt câu hỏi mở #2 = **phản xạ theo pháp tuyến mặt phẳng** (không chỉ chặn) — vì chính task này yêu cầu "tính pháp tuyến, đổi hướng phần còn lại", tường/hố (T9.2) vẫn dùng cách chặn đơn giản vì không có hướng phản xạ. `reflectPoints(pts, pivot, normal)` lật phần đuôi (sau điểm chạm) qua đường thẳng đi qua điểm chạm, vuông góc `normal`.

- [x] **T9.4 — Cổng dịch chuyển.** Điểm chạm cổng A → tiếp tục vẽ từ cổng B.
  *Acceptance:* đường cong "teleport" liên tục.
  *Ghi chú:* `findPortalPair` tìm cổng cùng `pairId` khác `id` (hai chiều); phần đuôi được tịnh tiến theo `offset = tâm cổng kia − điểm chạm` để nối liền mạch. Cổng lẻ (không cặp) → xử lý như tường. `applyTerrain` dùng con trỏ quét (`searchFrom`) để không xử lý lặp lại đoạn đầu đã chạm, tránh dịch chuyển/phản xạ chồng nhiều lần; giới hạn `maxBounces` chống lặp vô hạn nếu địa hình đặt sai.

---

## Phase 10 — Chế độ học (cơ chế 9)

- [x] **T10.1 — Nhận diện dạng hàm.** Từ kết quả `analyze` (loại hàm, bậc), suy ra nhãn: "parabol", "hàm bậc nhất", "sin"…
  *Acceptance:* bắn `x^2` → hiện "Đây là parabol (bậc 2)".
  *Ghi chú:* `analyze()` (`astGuard.js`) nay trả thêm `fnNames` (tên hàm sin/cos/tan/sqrt/log/abs gặp trong lượt duyệt AST đã có sẵn) để không phải parse lại biểu thức lần hai. `engine/classify.js` (`classifyAnalysis`) suy nhãn từ đúng `{degree, fnNames}` đó. `GameScreen.handleFire` hiện caption ngay sau khi bắn, không chặn tiến độ chơi (chạy song song, đúng tinh thần spec mục 10).

- [x] **T10.2 — Chế độ PvE tập luyện.** Bắn vào bia cố định kèm gợi ý cho người mới.
  *Acceptance:* chơi được một mình, có chú thích.
  *Ghi chú:* `src/screens/PracticeScreen.jsx` — màn hình riêng, không dùng `gameReducer` (không có khái niệm lượt/thắng-thua), tái dùng các hàm engine thuần (astGuard/curve/collision/classify) như GameScreen. Bia (`target`) đổi chỗ ngẫu nhiên sau mỗi lần trúng để luyện tập liên tục; gợi ý (`BEGINNER_TIPS`) xoay vòng khi bắn trượt. Rule riêng `practice` (`game/rules.js`) nới rộng mana/bậc/số node cho người mới thoải mái thử nghiệm. `App.js` thêm thanh chuyển chế độ "2 người" / "Luyện tập" ở đầu màn hình.

---

## Phase 11 — Multiplayer online (tuỳ chọn)

- [x] **T11.1 — Chọn backend.** Firestore hoặc Supabase Realtime.
  *Ghi chú:* người dùng chọn **Supabase Realtime** (Broadcast — không cần schema/bảng, không cần bật Realtime Authorization vì không broadcast từ database). `src/network/NetworkAdapter.js` định nghĩa giao diện `createRoom/joinRoom/sendMove/onMove` tách biệt khỏi backend cụ thể, kèm `createLocalLoopbackAdapter()` (bộ nhớ trong, test được không cần mạng). `src/network/SupabaseNetworkAdapter.js` triển khai đúng giao diện đó bằng kênh Broadcast thật (`@supabase/supabase-js`); test bằng client giả lập (không gọi mạng thật). Cần `EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY` — xem `.env.example`; đã thêm `react-native-url-polyfill/auto` (import đầu tiên trong `App.js`, cần cho realtime-js dùng `URL` mà Hermes không có sẵn).

- [x] **T11.2 — Đồng bộ nước đi.** Gửi/nhận `{expr, angle, moveTo, playerId}` mỗi lượt; tái dựng trạng thái từ nước đi.
  *Acceptance:* hai máy chơi cùng ván, thấy nước đi của nhau.
  *Ghi chú:* `src/game/moves.js` — `createFireMove`/`createMoveMove` đóng gói move (field `type` tường minh thay vì suy luận qua expr/moveTo có mặt hay không); `resolveFireMove` tính lại đường cong/va chạm bằng đúng pipeline `GameScreen.handleFire` từng làm inline (sample→rotate→item→terrain→collision) — đã refactor `GameScreen` để gọi hàm này thay vì lặp logic; `applyMove` dispatch lại đúng chuỗi action reducer. Test xác nhận hai state khởi tạo giống nhau + cùng move → kết quả giống hệt nhau. `src/screens/OnlineScreen.jsx` nối trọn vẹn: tạo/vào phòng bằng mã, `sendMove` ngay sau khi bắn/di chuyển cục bộ, `onMove` dựng lại nước đi đối thủ qua `resolveFireMove` + replay animation. Người tạo phòng bị khoá thao tác tới khi nhận tín hiệu `'join'` từ người vào sau (Realtime Broadcast không lưu lịch sử, move gửi trước khi đối thủ subscribe sẽ mất). **Chưa tự kiểm được** hai thiết bị thật cùng chơi — cần bạn tạo project Supabase, điền `.env.local`, rồi tự thử trên 2 máy/2 Expo Go.

- [x] **T11.3 — Chống gian lận phía server (nếu cần).** Chạy `analyze` phía server để không tin client.
  *Ghi chú:* scaffold tham khảo `src/server/validateMove.js` (`validateFireMove`) — chạy lại `analyze()` (cùng file engine dùng ở client) với rules LƯU Ở SERVER, không tin rules client gửi kèm; có test minh hoạ. **Chưa deploy** — cần bọc vào một Supabase Edge Function khi bạn thấy cần chống gian lận thật (game hiện tại chưa có, vì Realtime Broadcast không có "phía server" để chạy code chặn client).

---

## Việc xuyên suốt (làm liên tục)

- [x] **X1 — Tách logic khỏi UI.** Mọi thứ trong `src/engine/` phải là hàm thuần, test được không cần React.
  *Ghi chú (rà soát 2026-07-29):* xác nhận không file nào trong `src/engine/` import React/RN (`grep -ri react src/engine` rỗng). Việc liên tục — kiểm tra lại mỗi khi thêm file engine mới.
- [x] **X2 — Test.** Thêm test cho `analyze`, `sampleCurve`, `checkCollision`, `rotate` mỗi khi sửa.
  *Ghi chú (rà soát 2026-07-29):* cả 4 hàm đều có test riêng (`astGuard.test.js`, `curve.test.js`, `collision.test.js`, `transforms.test.js`), cộng test cho các hàm engine khác thêm sau (`classify`, `items`, `terrain`, `coords`, `gameState`, `moves`). `npx jest` → 13 suites / 117 tests pass. Việc liên tục — mỗi lần sửa 1 trong 4 hàm này phải chạy lại test tương ứng trước khi coi là xong.
- [x] **X3 — Cân bằng.** Bảng mana, `MAX_SLOPE`, miền `y` để ở `config.js`; chỉnh dựa trên playtest, không rải rác trong code.
  *Ghi chú (rà soát 2026-07-29):* phát hiện vi phạm — bảng giá mana (`COST`/`POW_COST`) nằm cứng trong `astGuard.js` thay vì `config.js`. Đã chuyển thành `MANA_COST`/`POW_COST` trong `src/config.js`, `astGuard.js` chỉ import và dùng (không còn định nghĩa số cân bằng). `MAX_SLOPE` vốn đã đúng chỗ (`config.js`, dùng trong `curve.js`/`moves.js`). Test lại: 117/117 pass sau khi sửa.
- [x] **X4 — Chốt câu hỏi mở trong spec** (một-phát-chết hay có máu; luật combo; địa hình phản xạ hay chỉ chặn; di chuyển lưới hay liên tục) *trước khi* code phần liên quan.
  *Ghi chú (rà soát 2026-07-29):* cả 4 câu hỏi mở (spec mục 13) đã có quyết định — #2 (phản xạ theo pháp tuyến) ghi ở T9.3, #3 (lưới rời rạc) ghi ở T8.1, #4 (một phát chết) ghi ở T5.2 (bổ sung trong lượt rà soát này, quyết định vốn đã nằm sẵn trong code từ Phase 5 nhưng chưa viết thành ghi chú). #1 (luật combo, cơ chế 8): giữ nguyên khuyến nghị của spec mục 8 — **hoãn khỏi v1**, chưa định nghĩa đủ rõ điều kiện kích hoạt/vùng sát thương nên chưa có task nào trong Phase 0–11 triển khai; sẽ chỉ code khi thu hẹp thành luật cụ thể như spec gợi ý.

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
