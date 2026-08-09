import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";

export interface BreedSlice {
  label: string;
  count: number;
}

const ChartCard = ({ children }: { children: React.ReactNode }) => (
  <Card
    variant="outlined"
    component="figure"
    className="breed-chart"
    sx={{ m: 0, p: 2, height: "100%", display: "flex", flexDirection: "column", gap: 1 }}
  >
    <Typography component="figcaption" sx={{ fontWeight: 600 }}>
      Breed distribution
    </Typography>
    {children}
  </Card>
);

interface BreedChartProps {
  slices: BreedSlice[];
  totalAnimals: number;
}

const CX = 100;
const CY = 100;
const OUTER = 80;
const INNER = 48;

const point = (radius: number, angle: number): string =>
  `${(CX + radius * Math.cos(angle)).toFixed(3)} ${(CY + radius * Math.sin(angle)).toFixed(3)}`;

const slicePath = (startFraction: number, endFraction: number): string => {
  const a0 = -Math.PI / 2 + startFraction * 2 * Math.PI;
  const a1 = -Math.PI / 2 + endFraction * 2 * Math.PI;
  const large = endFraction - startFraction > 0.5 ? 1 : 0;
  return [
    `M ${point(OUTER, a0)}`,
    `A ${OUTER} ${OUTER} 0 ${large} 1 ${point(OUTER, a1)}`,
    `L ${point(INNER, a1)}`,
    `A ${INNER} ${INNER} 0 ${large} 0 ${point(INNER, a0)}`,
    "Z",
  ].join(" ");
};

const sliceColor = (slice: BreedSlice, index: number): string =>
  slice.label === "Other" ? "var(--series-other)" : `var(--series-${index + 1})`;

export const BreedChart = ({ slices, totalAnimals }: BreedChartProps) => {
  const visible = slices.filter((slice) => slice.count > 0);
  const total = visible.reduce((sum, slice) => sum + slice.count, 0);

  if (total === 0) {
    return (
      <ChartCard>
        <Typography color="text.secondary">No breed data to chart.</Typography>
      </ChartCard>
    );
  }

  const percent = (count: number): number => Math.round((count / total) * 100);

  let cumulative = 0;
  const arcs = visible.map((slice, index) => {
    const start = cumulative / total;
    cumulative += slice.count;
    const end = cumulative / total;
    return { slice, index, start, end };
  });

  return (
    <ChartCard>
      <svg
        viewBox="0 0 200 200"
        role="img"
        aria-label={`Breed distribution donut chart of ${totalAnimals} animals`}
      >
        {arcs.map(({ slice, index, start, end }) =>
          visible.length === 1 ? (
            <circle
              key={slice.label}
              cx={CX}
              cy={CY}
              r={(OUTER + INNER) / 2}
              fill="none"
              stroke={sliceColor(slice, index)}
              strokeWidth={OUTER - INNER}
            >
              <title>{`${slice.label}: ${slice.count} (100%)`}</title>
            </circle>
          ) : (
            <path
              key={slice.label}
              d={slicePath(start, end)}
              fill={sliceColor(slice, index)}
              stroke="var(--bg)"
              strokeWidth="2"
            >
              <title>{`${slice.label}: ${slice.count} (${percent(slice.count)}%)`}</title>
            </path>
          ),
        )}
        <text x={CX} y={CY - 4} textAnchor="middle" className="breed-chart-total">
          {totalAnimals}
        </text>
        <text x={CX} y={CY + 16} textAnchor="middle" className="breed-chart-total-label">
          animals
        </text>
      </svg>
      <ul className="chart-legend">
        {visible.map((slice, index) => (
          <li key={slice.label}>
            <span className="legend-swatch" style={{ background: sliceColor(slice, index) }} />
            <span className="legend-label">{slice.label}</span>
            <span className="legend-value">
              {slice.count} · {percent(slice.count)}%
            </span>
          </li>
        ))}
      </ul>
    </ChartCard>
  );
};
