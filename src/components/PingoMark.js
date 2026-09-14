import Svg, { G, Path, Circle } from 'react-native-svg';
import { colors } from '../theme';

// Pingo's mark: a solid centre dot with three arcs opening to the upper right —
// a dial sweep when still, a ping leaving its source when it animates.
// Drawn on the design's 120-unit grid with an even 8.5-unit stroke.
// Sweep flag 0 (not the design file's 1): with 1 the SVG arc spec puts each
// arc on its own centre — (78.2,41.8), (90.9,29.1), (103.6,16.4) — so all
// three collapse onto the dot. 0 centres every arc on (60,60) as intended.
export const ARC_PATHS = [
  'M79.9 61.7 A20 20 0 0 0 58.3 40.1',
  'M93.9 63.0 A34 34 0 0 0 57.0 26.2',
  'M107.8 64.2 A48 48 0 0 0 55.8 12.2',
];

// The mark's ink sits up-and-right of the dot, so a 0 0 120 120 box would hang
// it off-centre wherever it's placed. This box wraps the ink exactly.
export const TIGHT_VIEWBOX = '51.5 7.7 60.8 60.8';

export default function PingoMark({ size = 48, color = colors.lime, dotColor, dotStroke, dotStrokeWidth = 0 }) {
  return (
    <Svg viewBox={TIGHT_VIEWBOX} width={size} height={size}>
      <G fill="none" stroke={color} strokeWidth={8.5} strokeLinecap="round">
        {ARC_PATHS.map((d) => (
          <Path key={d} d={d} />
        ))}
      </G>
      <Circle
        cx={60}
        cy={60}
        r={8}
        fill={dotColor || color}
        stroke={dotStroke}
        strokeWidth={dotStrokeWidth}
      />
    </Svg>
  );
}
