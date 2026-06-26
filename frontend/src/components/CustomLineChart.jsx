import React from 'react';

/**
 * CustomLineChart - Renders an SVG line chart for attendance trends
 * Uses CSS classes from index.css: .chart-wrapper, .chart-svg, .chart-grid-line, .chart-text
 */
export default function CustomLineChart({ data = [] }) {
  // Default sample data if nothing provided
  const chartData = data.length > 0 ? data : [
    { date: '06-03', presentCount: 0 },
    { date: '06-04', presentCount: 0 },
    { date: '06-05', presentCount: 0 },
    { date: '06-06', presentCount: 0 },
    { date: '06-07', presentCount: 3 },
    { date: '06-08', presentCount: 2 },
    { date: '06-09', presentCount: 3 }
  ];

  const maxVal = Math.max(...chartData.map(d => d.presentCount), 4);
  const width = 500;
  const height = 200;
  const pL = 40, pR = 20, pT = 20, pB = 30;
  const cW = width - pL - pR;
  const cH = height - pT - pB;

  // Compute SVG coordinates for each data point
  const points = chartData.map((d, i) => ({
    x: pL + (i / Math.max(chartData.length - 1, 1)) * cW,
    y: pT + cH - (d.presentCount / maxVal) * cH,
    val: d.presentCount,
    label: (d.date || '').slice(-5)
  }));

  // Build SVG path strings
  let linePath = '', areaPath = '';
  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    areaPath = `M ${points[0].x} ${pT + cH} L ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      linePath += ` L ${points[i].x} ${points[i].y}`;
      areaPath += ` L ${points[i].x} ${points[i].y}`;
    }
    areaPath += ` L ${points[points.length - 1].x} ${pT + cH} Z`;
  }

  // Y-axis ticks
  const yTicks = Array.from({ length: 5 }, (_, i) => {
    const val = Math.round((maxVal / 4) * i);
    return { y: pT + cH - (val / maxVal) * cH, val };
  });

  return (
    <div className="chart-wrapper">
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
        <defs>
          <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#b5b7ff" />
            <stop offset="100%" stopColor="#6ec1e4" />
          </linearGradient>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#b5b7ff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#b5b7ff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={pL} y1={t.y} x2={width - pR} y2={t.y} className="chart-grid-line" />
            <text x={pL - 8} y={t.y + 4} textAnchor="end" className="chart-text">{t.val}</text>
          </g>
        ))}

        {/* X-axis labels */}
        {points.map((pt, i) => (
          <text key={i} x={pt.x} y={height - pB + 16} textAnchor="middle" className="chart-text">
            {pt.label}
          </text>
        ))}

        {/* Area fill */}
        {points.length > 0 && <path d={areaPath} fill="url(#areaGrad)" />}

        {/* Line */}
        {points.length > 0 && (
          <path
            d={linePath}
            fill="none"
            stroke="url(#lineGrad)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Dots */}
        {points.map((pt, i) => (
          <circle
            key={i}
            cx={pt.x}
            cy={pt.y}
            r="4"
            fill="var(--bg-page, #131419)"
            stroke="#b5b7ff"
            strokeWidth="2"
            style={{ cursor: 'pointer' }}
          >
            <title>{`${pt.label}: ${pt.val} present`}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}
