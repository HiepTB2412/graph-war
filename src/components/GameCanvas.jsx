import Svg, { Line, Path } from 'react-native-svg';

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

// GameCanvas — vẽ lưới nền + các đường cong (mỗi đường là mảng điểm pixel đã quy đổi).
export default function GameCanvas({
  width,
  height,
  origin,
  pixelsPerUnit,
  curve,
  curves,
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
    </Svg>
  );
}
