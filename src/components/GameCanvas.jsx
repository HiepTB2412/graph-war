import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { TERRAIN_TYPES } from '../engine/terrain';

// PlayerMarker — chấm tròn + nhãn cho một người chơi. Người bị loại (eliminated)
// đổi màu xám + dấu X đỏ đè lên (T4.4).
function PlayerMarker({ player }) {
  const { id, x, y, radius, color, label, eliminated } = player;
  const parts = [
    <Circle
      key={`${id}-c`}
      cx={x}
      cy={y}
      r={radius}
      fill={eliminated ? '#444' : color}
      stroke={eliminated ? '#f44336' : '#fff'}
      strokeWidth={2}
    />,
  ];
  if (eliminated) {
    parts.push(
      <Line
        key={`${id}-x1`}
        x1={x - radius * 0.6}
        y1={y - radius * 0.6}
        x2={x + radius * 0.6}
        y2={y + radius * 0.6}
        stroke="#f44336"
        strokeWidth={3}
      />,
      <Line
        key={`${id}-x2`}
        x1={x - radius * 0.6}
        y1={y + radius * 0.6}
        x2={x + radius * 0.6}
        y2={y - radius * 0.6}
        stroke="#f44336"
        strokeWidth={3}
      />
    );
  }
  parts.push(
    <SvgText
      key={`${id}-label`}
      x={x}
      y={y - radius - 8}
      fill="#fff"
      fontSize={13}
      fontWeight="700"
      textAnchor="middle"
    >
      {label}
    </SvgText>
  );
  return parts;
}

const TERRAIN_STYLE = {
  [TERRAIN_TYPES.WALL]: { fill: '#616161', stroke: '#9e9e9e' },
  [TERRAIN_TYPES.PIT]: { fill: '#1a1a1a', stroke: '#4e342e' },
  [TERRAIN_TYPES.REFLECTOR]: { fill: '#5c6bc0', stroke: '#c5cae9' },
  [TERRAIN_TYPES.PORTAL]: { fill: '#ab47bc', stroke: '#f3e5f5' },
};

// TerrainShape — địa hình (Phase 9): hình chữ nhật màu theo loại; khối phản xạ vẽ thêm mũi
// tên pháp tuyến, cổng dịch chuyển vẽ nhãn id (A/B) để nhận ra cặp cổng (T9.1).
function TerrainShape({ t, index }) {
  const style = TERRAIN_STYLE[t.type] ?? { fill: '#555', stroke: '#999' };
  const parts = [
    <Rect
      key={`t${index}-r`}
      x={t.x}
      y={t.y}
      width={t.w}
      height={t.h}
      fill={style.fill}
      stroke={style.stroke}
      strokeWidth={1.5}
    />,
  ];
  if (t.type === TERRAIN_TYPES.REFLECTOR && t.normal) {
    const cx = t.x + t.w / 2;
    const cy = t.y + t.h / 2;
    const len = Math.hypot(t.normal.x, t.normal.y) || 1;
    const nx = t.normal.x / len;
    const ny = t.normal.y / len;
    parts.push(
      <Line
        key={`t${index}-n`}
        x1={cx}
        y1={cy}
        x2={cx + nx * 20}
        y2={cy + ny * 20}
        stroke="#fff"
        strokeWidth={2}
      />
    );
  }
  if (t.type === TERRAIN_TYPES.PORTAL) {
    parts.push(
      <SvgText
        key={`t${index}-label`}
        x={t.x + t.w / 2}
        y={t.y + t.h / 2 + 4}
        fill="#fff"
        fontSize={12}
        fontWeight="700"
        textAnchor="middle"
      >
        {t.id}
      </SvgText>
    );
  }
  return parts;
}

function GridLines({ origin, pixelsPerUnit, width, height }) {
  const lines = [];

  for (let x = origin.x % pixelsPerUnit; x <= width; x += pixelsPerUnit) {
    lines.push(
      <Line key={`v${x}`} x1={x} y1={0} x2={x} y2={height} stroke="#333" strokeWidth={1} />
    );
  }
  for (let y = origin.y % pixelsPerUnit; y <= height; y += pixelsPerUnit) {
    lines.push(
      <Line key={`h${y}`} x1={0} y1={y} x2={width} y2={y} stroke="#333" strokeWidth={1} />
    );
  }
  lines.push(
    <Line key="axis-x" x1={0} y1={origin.y} x2={width} y2={origin.y} stroke="#777" strokeWidth={1.5} />,
    <Line key="axis-y" x1={origin.x} y1={0} x2={origin.x} y2={height} stroke="#777" strokeWidth={1.5} />
  );
  return lines;
}

// GameCanvas — vẽ lưới nền + các đường cong (mỗi đường là mảng điểm pixel đã quy đổi) + người chơi.
// `aim` (tuỳ chọn): {x1,y1,x2,y2,color} — tia ngắm mờ nét đứt theo player.angle (T7.2),
// vẽ trước đường cong/người chơi để không đè lên chúng.
// `renderWidth`/`renderHeight` (tuỳ chọn): kích thước THẬT hiện trên màn hình, khi khác với
// `width`/`height` (không gian toạ độ logic dùng để tính vật lý/va chạm) — cần cho Online
// (OnlineScreen, Phase 11): hai máy màn hình khác kích thước PHẢI tính toán trên cùng một
// không gian toạ độ cố định (CANVAS_WIDTH/HEIGHT) để "cùng move → cùng kết quả" (xem
// game/moves.js), nhưng mỗi máy vẫn muốn hiển thị full màn hình của mình — viewBox co giãn
// đúng tỉ lệ (không méo hình) thay vì đổi không gian toạ độ. Bỏ trống thì render 1:1 như cũ
// (Hot-seat GameScreen/PracticeScreen — một máy, không cần tách logic khỏi hiển thị).
export default function GameCanvas({
  width,
  height,
  renderWidth,
  renderHeight,
  origin,
  pixelsPerUnit,
  curve,
  curves,
  players = [],
  terrain = [],
  aim,
  backgroundColor = '#111',
}) {
  const allCurves = curves ?? (curve ? [curve] : []);

  return (
    <Svg
      width={renderWidth ?? width}
      height={renderHeight ?? height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ backgroundColor }}
    >
      <GridLines origin={origin} pixelsPerUnit={pixelsPerUnit} width={width} height={height} />
      {terrain.map((t, i) => (
        <TerrainShape key={i} t={t} index={i} />
      ))}
      {aim ? (
        <Line
          x1={aim.x1}
          y1={aim.y1}
          x2={aim.x2}
          y2={aim.y2}
          stroke={aim.color ?? '#fff'}
          strokeWidth={2}
          strokeDasharray="6,6"
          opacity={0.5}
        />
      ) : null}
      {allCurves.map((c, i) => (
        <Path
          key={i}
          d={c.d}
          stroke={c.color ?? '#0f0'}
          strokeWidth={c.strokeWidth ?? 2}
          fill="none"
        />
      ))}
      {players.map((p) => (
        <PlayerMarker key={p.id} player={p} />
      ))}
    </Svg>
  );
}
