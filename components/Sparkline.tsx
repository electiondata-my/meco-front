type SparklineProps = {
  values: number[];
  color: string;
  colorH: string;
};

export default function Sparkline({ values, color, colorH }: SparklineProps) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const W = 100;
  const H = 100;
  const pad = 3;

  const pts = values.map((v, i) => ({
    x: (i / (values.length - 1)) * W,
    y: H - pad - ((v - min) / range) * (H - pad * 2),
  }));

  const line = pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const area = `${line} L${pts[pts.length - 1].x},${H} L${pts[0].x},${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full">
      <path d={area} fill={colorH} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}
