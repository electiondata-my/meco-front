import { clx } from "@lib/helpers";
import type { ChartOptions } from "chart.js";
import { Line } from "react-chartjs-2";
import type { MetricKey, SiteMetricsRow } from "./types";
import { formatDaily, formatTotal, rowValue } from "./utils";

type Props = {
  title: string;
  metricKey: MetricKey;
  rows: SiteMetricsRow[];
  daily: number;
  total: number;
  color: string;
  colorH: string;
  loading: boolean;
  mounted: boolean;
};

const SPARKLINE_OPTS: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: { duration: 0 },
  plugins: { legend: { display: false }, tooltip: { enabled: false } },
  scales: {
    x: { type: "linear", display: false },
    y: { display: false, beginAtZero: true },
  },
  layout: { padding: { top: 2, bottom: 2, left: 0, right: 0 } },
};

export default function MetricRow({
  title,
  metricKey,
  rows,
  daily,
  total,
  color,
  colorH,
  loading,
  mounted,
}: Props) {
  const hasData = rows.length > 0;

  return (
    <div className="grid grid-cols-[1fr_4rem_3rem_3.5rem] items-center gap-3 border-b border-otl-gray-100 px-4 py-4 last:border-b-0">
      <span className="text-body-sm font-medium text-txt-black-900">{title}</span>

      <div className="relative h-12">
        {!loading && mounted && hasData && (
          <Line
            data={{
              datasets: [
                {
                  data: rows.map((row, i) => ({ x: i, y: rowValue(row, metricKey) })),
                  borderColor: color,
                  backgroundColor: colorH,
                  borderWidth: 1.5,
                  pointRadius: 0,
                  fill: true,
                  tension: 0.3,
                },
              ],
            }}
            options={SPARKLINE_OPTS}
          />
        )}
      </div>

      <span
        className={clx(
          "text-right text-body-sm font-semibold tabular-nums",
          loading ? "text-txt-black-300" : "text-txt-black-900",
        )}
      >
        {loading ? "—" : formatDaily(daily)}
      </span>

      <span className="text-right text-body-sm font-semibold text-txt-black-900 tabular-nums">
        {loading ? "—" : formatTotal(total)}
      </span>
    </div>
  );
}
