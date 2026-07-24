import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

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
export default function GameCanvas({
  width,
  height,
  origin,
  pixelsPerUnit,
  curve,
  curves,
  players = [],
  backgroundColor = '#111',
}) {
  const allCurves = curves ?? (curve ? [curve] : []);

  return (
    <Svg width={width} height={height} style={{ backgroundColor }}>
      <GridLines origin={origin} pixelsPerUnit={pixelsPerUnit} width={width} height={height} />
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
