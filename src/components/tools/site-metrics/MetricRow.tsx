import { clx } from "@lib/helpers";
import Sparkline from "@components/Sparkline";
import type { MetricKey, SiteMetricsRow } from "./types";
import { formatDaily, formatTotal, rowValue } from "./utils";

export const MOBILE_METRIC_GRID =
  "grid-cols-[minmax(3.25rem,0.7fr)_minmax(2.75rem,0.5fr)_minmax(4.75rem,max-content)_minmax(4.75rem,max-content)] gap-2 px-0 min-[390px]:grid-cols-[minmax(4rem,0.75fr)_minmax(3.25rem,0.55fr)_minmax(5rem,max-content)_minmax(5rem,max-content)]";

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
    <div
      className={clx(
        "grid items-center border-b border-otl-gray-100 py-4 last:border-b-0",
        MOBILE_METRIC_GRID,
      )}
    >
      <span className="text-body-sm font-medium leading-snug text-txt-black-900">{title}</span>

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
