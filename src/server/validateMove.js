// validateMove.js — THAM KHẢO/SCAFFOLD cho T11.3 (chống gian lận phía server, tuỳ chọn).
// CHƯA deploy ở đâu cả — chờ chốt backend thật ở T11.1 (Firebase Cloud Functions hay Supabase
// Edge Functions) rồi bọc hàm thuần dưới đây vào handler tương ứng của backend đó.
//
// Ý tưởng cốt lõi (spec mục 11.3): không tin client đã tự kiểm tra hợp lệ trước khi gửi move
// lên — server chạy lại ĐÚNG analyze() (cùng file engine/astGuard.js dùng ở client, vì đây là
// hàm thuần không phụ thuộc React/React Native nên chạy được trong Node/Cloud Function y hệt)
// trên move nhận được, đối chiếu với `rules` của trận LƯU Ở SERVER — không dùng rules client
// gửi kèm move, vì client có thể sửa để tự nới lỏng giới hạn của chính mình.
import { analyze } from '../engine/astGuard';

// validateFireMove — trả {ok, reason} thay vì throw, để handler (Cloud Function/Edge Function)
// tự quyết định mã lỗi HTTP/response phù hợp; không phụ thuộc runtime backend cụ thể.
export function validateFireMove(move, rules) {
  if (move?.type !== 'fire') {
    return { ok: false, reason: 'Không phải nước đi bắn' };
  }
  if (typeof move.expr !== 'string' || !move.expr.trim()) {
    return { ok: false, reason: 'Thiếu biểu thức' };
  }

  const result = analyze(move.expr, rules);
  if (!result.ok) {
    return { ok: false, reason: result.reason };
  }
  return { ok: true, reason: '' };
}
