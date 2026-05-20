import { clx } from "@lib/helpers";
import Sparkline from "@components/Sparkline";
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
  const values = rows.map((row) => rowValue(row, metricKey));

  return (
    <div className="grid grid-cols-[1fr_4.5rem_3rem_3.5rem] items-center gap-3 border-b border-otl-gray-100 px-4 py-4 last:border-b-0">
      <span className="text-body-sm font-medium text-txt-black-900">{title}</span>

      <div className="h-12 w-full">
        {!loading && mounted && values.length >= 2 && (
          <Sparkline values={values} color={color} colorH={colorH} />
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
