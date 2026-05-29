// ═══════════════════════════════════════════════════════════════
// APSIMS Ultra Charts — SVG-based premium chart components
// Line charts, Bar charts, Doughnut, Sparklines for React Native
// ═══════════════════════════════════════════════════════════════
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Rect, Circle, Defs, LinearGradient as SvgGradient, Stop, Line as SvgLine, Text as SvgText, G } from 'react-native-svg';
import { COLORS } from './UltraTheme';

// ── SVG Sparkline (mini line chart for KPI cards) ──
export function Sparkline({ data, color = COLORS.purple, width = 100, height = 28 }: {
  data: number[]; color?: string; width?: number; height?: number;
}) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pad = 2;
  const pts = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * (width - pad * 2),
    y: pad + (1 - (v - min) / range) * (height - pad * 2),
  }));
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1].x},${height} L${pts[0].x},${height} Z`;

  return (
    <Svg width={width} height={height}>
      <Defs>
        <SvgGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <Stop offset="100%" stopColor={color} stopOpacity="0" />
        </SvgGradient>
      </Defs>
      <Path d={areaPath} fill={`url(#spark-${color.replace('#', '')})`} />
      <Path d={linePath} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={3} fill={color} />
    </Svg>
  );
}

// ── SVG Line Chart (gradient area fill, like Chart.js) ──
export function LineChart({ data, labels, colors, width = 320, height = 180, showGrid = true, formatY }: {
  data: number[][]; labels: string[]; colors: string[]; width?: number; height?: number; showGrid?: boolean;
  formatY?: (v: number) => string;
}) {
  if (!data || !data[0] || data[0].length < 2) return <Text style={styles.noData}>No chart data</Text>;
  const allVals = data.flat();
  const max = Math.max(...allVals) * 1.1 || 100;
  const min = 0;
  const pad = { top: 10, right: 10, bottom: 30, left: 50 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;

  const getX = (i: number) => pad.left + (i / (labels.length - 1)) * cw;
  const getY = (v: number) => pad.top + (1 - (v - min) / (max - min)) * ch;

  // Y-axis grid
  const yTicks = 5;
  const gridLines = [];
  for (let i = 0; i <= yTicks; i++) {
    const val = min + (max - min) * (i / yTicks);
    const y = getY(val);
    gridLines.push({ y, label: formatY ? formatY(val) : val >= 1000 ? `${(val / 1000).toFixed(0)}K` : `${Math.round(val)}` });
  }

  return (
    <View>
      <Svg width={width} height={height}>
        <Defs>
          {colors.map((c, idx) => (
            <SvgGradient key={idx} id={`line-fill-${idx}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={c} stopOpacity="0.15" />
              <Stop offset="100%" stopColor={c} stopOpacity="0.01" />
            </SvgGradient>
          ))}
        </Defs>
        {/* Grid */}
        {showGrid && gridLines.map((g, i) => (
          <G key={i}>
            <SvgLine x1={pad.left} y1={g.y} x2={width - pad.right} y2={g.y} stroke="#e2e8f0" strokeWidth={0.5} strokeDasharray="4,4" />
            <SvgText x={pad.left - 6} y={g.y + 3} fill="#94a3b8" fontSize={8} textAnchor="end">{g.label}</SvgText>
          </G>
        ))}
        {/* X labels */}
        {labels.map((l, i) => (
          <SvgText key={i} x={getX(i)} y={height - 8} fill="#94a3b8" fontSize={8} textAnchor="middle">{l}</SvgText>
        ))}
        {/* Data lines */}
        {data.map((series, sIdx) => {
          const pts = series.map((v, i) => ({ x: getX(i), y: getY(v) }));
          const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
          const areaPath = `${linePath} L${pts[pts.length - 1].x},${pad.top + ch} L${pts[0].x},${pad.top + ch} Z`;
          return (
            <G key={sIdx}>
              <Path d={areaPath} fill={`url(#line-fill-${sIdx})`} />
              <Path d={linePath} stroke={colors[sIdx]} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              {pts.map((p, i) => (
                <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={colors[sIdx]} stroke="#fff" strokeWidth={2} />
              ))}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

// ── SVG Bar Chart (rounded, grouped/stacked) ──
export function BarChart({ data, labels, colors, barLabels, width = 320, height = 180, formatY, horizontal = false }: {
  data: number[][]; labels: string[]; colors: string[]; barLabels?: string[]; width?: number; height?: number;
  formatY?: (v: number) => string; horizontal?: boolean;
}) {
  if (!data || !data[0] || data[0].length === 0) return <Text style={styles.noData}>No chart data</Text>;
  const pad = { top: 10, right: 10, bottom: 30, left: horizontal ? 60 : 45 };
  const cw = width - pad.left - pad.right;
  const ch = height - pad.top - pad.bottom;
  const groupCount = labels.length;
  const seriesCount = data.length;
  const allVals = data.flat();
  const max = Math.max(...allVals) * 1.15 || 100;

  if (horizontal) {
    const barH = Math.min(20, (ch / groupCount) * 0.6);
    const gap = (ch - barH * groupCount) / (groupCount + 1);
    return (
      <View>
        <Svg width={width} height={height}>
          {labels.map((l, i) => {
            const y = pad.top + gap * (i + 1) + barH * i;
            const w = (data[0][i] / max) * cw;
            return (
              <G key={i}>
                <Rect x={pad.left} y={y} width={cw} height={barH} rx={4} fill="#f1f5f9" />
                <Rect x={pad.left} y={y} width={w} height={barH} rx={4} fill={colors[i % colors.length]} />
                <SvgText x={pad.left - 4} y={y + barH / 2 + 3} fill="#64748b" fontSize={8} textAnchor="end">{l}</SvgText>
                <SvgText x={pad.left + w + 4} y={y + barH / 2 + 3} fill="#475569" fontSize={8} fontWeight="bold">{formatY ? formatY(data[0][i]) : data[0][i]}</SvgText>
              </G>
            );
          })}
        </Svg>
      </View>
    );
  }

  const groupW = cw / groupCount;
  const barW = Math.min(16, (groupW / (seriesCount + 1)) * 0.8);

  return (
    <View>
      <Svg width={width} height={height}>
        {/* Y grid */}
        {[0, 1, 2, 3, 4].map(i => {
          const val = (max / 4) * i;
          const y = pad.top + ch - (val / max) * ch;
          return (
            <G key={i}>
              <SvgLine x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#e2e8f0" strokeWidth={0.5} strokeDasharray="3,3" />
              <SvgText x={pad.left - 4} y={y + 3} fill="#94a3b8" fontSize={7} textAnchor="end">{formatY ? formatY(val) : val >= 1000 ? `${(val/1000).toFixed(0)}K` : Math.round(val)}</SvgText>
            </G>
          );
        })}
        {/* Bars */}
        {labels.map((l, gi) => {
          const gx = pad.left + gi * groupW + groupW / 2;
          return (
            <G key={gi}>
              <SvgText x={gx} y={height - 8} fill="#94a3b8" fontSize={7} textAnchor="middle">{l}</SvgText>
              {data.map((series, si) => {
                const bx = gx - (seriesCount * barW) / 2 + si * barW;
                const bh = (series[gi] / max) * ch;
                const by = pad.top + ch - bh;
                return <Rect key={si} x={bx} y={by} width={barW - 1} height={bh} rx={3} fill={colors[si]} />;
              })}
            </G>
          );
        })}
      </Svg>
      {barLabels && (
        <View style={styles.legend}>
          {barLabels.map((l, i) => (
            <View key={i} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors[i] }]} />
              <Text style={styles.legendText}>{l}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── SVG Doughnut Chart ──
export function DoughnutChart({ data, colors, labels, size = 140, strokeWidth = 20, centerLabel, centerValue }: {
  data: number[]; colors: string[]; labels?: string[]; size?: number; strokeWidth?: number;
  centerLabel?: string; centerValue?: string;
}) {
  const total = data.reduce((a, b) => a + b, 0);
  if (total === 0) return <Text style={styles.noData}>No data</Text>;
  const r = (size - strokeWidth) / 2;
  const cx = size / 2, cy = size / 2;
  const circ = 2 * Math.PI * r;
  let offset = -90; // start from top

  const arcs = data.map((val, i) => {
    const pct = val / total;
    const angle = pct * 360;
    const startAngle = offset;
    offset += angle;
    const dashArray = `${circ * pct} ${circ * (1 - pct)}`;
    const dashOffset = -circ * (startAngle / 360);
    return { dashArray, dashOffset, color: colors[i % colors.length], pct, val };
  });

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        {/* Background ring */}
        <Circle cx={cx} cy={cy} r={r} stroke="#f1f5f9" strokeWidth={strokeWidth} fill="none" />
        {/* Data arcs */}
        {arcs.map((arc, i) => (
          <Circle
            key={i} cx={cx} cy={cy} r={r}
            stroke={arc.color} strokeWidth={strokeWidth} fill="none"
            strokeDasharray={arc.dashArray} strokeDashoffset={arc.dashOffset}
            strokeLinecap="round" rotation={-90} origin={`${cx}, ${cy}`}
          />
        ))}
        {/* Center text */}
        {centerValue && (
          <>
            <SvgText x={cx} y={cy - 4} fill="#1e293b" fontSize={16} fontWeight="bold" textAnchor="middle">{centerValue}</SvgText>
            {centerLabel && <SvgText x={cx} y={cy + 12} fill="#94a3b8" fontSize={9} textAnchor="middle">{centerLabel}</SvgText>}
          </>
        )}
      </Svg>
      {labels && (
        <View style={[styles.legend, { marginTop: 8 }]}>
          {labels.map((l, i) => (
            <View key={i} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: colors[i] }]} />
              <Text style={styles.legendText}>{l}</Text>
              <Text style={styles.legendVal}>{Math.round((data[i] / total) * 100)}%</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Progress Ring (single value) ──
export function ProgressRing({ value, max = 100, color = COLORS.green, size = 60, strokeWidth = 6, label }: {
  value: number; max?: number; color?: string; size?: number; strokeWidth?: number; label?: string;
}) {
  const pct = Math.min(value / max, 1);
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <View style={{ alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke="#f1f5f9" strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeDasharray={`${circ * pct} ${circ * (1 - pct)}`}
          strokeLinecap="round" rotation={-90} origin={`${size / 2}, ${size / 2}`}
        />
        <SvgText x={size / 2} y={size / 2 + 4} fill="#1e293b" fontSize={12} fontWeight="bold" textAnchor="middle">{Math.round(pct * 100)}%</SvgText>
      </Svg>
      {label && <Text style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{label}</Text>}
    </View>
  );
}

// ── Horizontal Progress Bar ──
export function ProgressBar({ value, max = 100, color = COLORS.green, height = 6, showLabel = true }: {
  value: number; max?: number; color?: string; height?: number; showLabel?: boolean;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <View>
      {showLabel && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
          <Text style={{ fontSize: 9, color: '#94a3b8' }}>Progress</Text>
          <Text style={{ fontSize: 9, color: '#475569', fontWeight: '700' }}>{Math.round(pct)}%</Text>
        </View>
      )}
      <View style={{ height, backgroundColor: '#f1f5f9', borderRadius: height / 2, overflow: 'hidden' }}>
        <View style={{ height, width: `${pct}%` as any, backgroundColor: color, borderRadius: height / 2 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  noData: { textAlign: 'center', fontSize: 11, color: '#94a3b8', paddingVertical: 20 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 2 },
  legendText: { fontSize: 9, color: '#64748b' },
  legendVal: { fontSize: 9, color: '#475569', fontWeight: '700' },
});
