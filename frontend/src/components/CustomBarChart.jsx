import React from 'react';

export default function CustomBarChart({ data = [] }) {
  // Setup standard business hours (8 AM to 1 PM) as default distribution
  const defaultPattern = [
    { hourVal: 8, checkInCount: 4 },
    { hourVal: 9, checkInCount: 9 },
    { hourVal: 10, checkInCount: 3 },
    { hourVal: 11, checkInCount: 1 },
    { hourVal: 12, checkInCount: 0 },
    { hourVal: 13, checkInCount: 0 }
  ];

  // Map database results or fall back to default patterns
  let chartData = defaultPattern.map(defaultHour => {
    const matched = data.find(d => d.hourVal === defaultHour.hourVal);
    return {
      hourLabel: `${defaultHour.hourVal > 12 ? defaultHour.hourVal - 12 : defaultHour.hourVal} ${defaultHour.hourVal >= 12 ? 'PM' : 'AM'}`,
      count: matched ? matched.checkInCount : defaultHour.checkInCount
    };
  });

  const maxVal = Math.max(...chartData.map(d => d.count), 5); // Minimum y-limit ceiling of 5
  
  const width = 500;
  const height = 180;
  const paddingLeft = 35;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  
  const barWidth = Math.min(30, (chartWidth / chartData.length) * 0.5);
  const gap = (chartWidth - (barWidth * chartData.length)) / (chartData.length - 1);

  // Generate grids
  const yTicks = [];
  for (let i = 0; i <= 4; i++) {
    const val = Math.round((maxVal / 4) * i);
    const y = paddingTop + chartHeight - (val / maxVal) * chartHeight;
    yTicks.push({ y, val });
  }

  return (
    <div className="custom-chart-wrapper">
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg">
        <defs>
          <linearGradient id="bar-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00e5ff" />
            <stop offset="100%" stopColor="#7c4dff" />
          </linearGradient>
          <filter id="bar-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#00e5ff" floodOpacity="0.25" />
          </filter>
        </defs>

        {/* Y Axis Grid Lines */}
        {yTicks.map((tick, idx) => (
          <g key={idx}>
            <line 
              x1={paddingLeft} 
              y1={tick.y} 
              x2={width - paddingRight} 
              y2={tick.y} 
              className="chart-grid-line" 
            />
            <text 
              x={paddingLeft - 10} 
              y={tick.y + 4} 
              textAnchor="end" 
              className="chart-text"
            >
              {tick.val}
            </text>
          </g>
        ))}

        {/* Bars */}
        {chartData.map((d, index) => {
          const x = paddingLeft + index * (barWidth + gap) + gap/2;
          const barHeight = (d.count / maxVal) * chartHeight;
          const y = paddingTop + chartHeight - barHeight;

          return (
            <g key={index}>
              {/* Pillar Bar */}
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={Math.max(barHeight, 2)} // Ensure at least a line shows
                rx="4"
                fill="url(#bar-gradient)"
                className="chart-bar"
                filter="url(#bar-glow)"
              >
                <title>{`Hour: ${d.hourLabel}, Checked-in: ${d.count}`}</title>
              </rect>

              {/* Text label underneath */}
              <text
                x={x + barWidth / 2}
                y={height - paddingBottom + 18}
                textAnchor="middle"
                className="chart-text"
              >
                {d.hourLabel}
              </text>
            </g>
          );
        })}
      </svg>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-chart-wrapper {
          width: 100%;
          position: relative;
        }
        .chart-svg {
          width: 100%;
          height: auto;
          overflow: visible;
        }
      `}} />
    </div>
  );
}
