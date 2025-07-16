import BarPerc from "@charts/bar-perc";
import ElectionTable from "@components/Election/ElectionTable";
import Skeleton from "@components/Skeleton";
import { ElectionResult } from "@dashboards/types";
import { useTranslation } from "@hooks/useTranslation";
import { clx, numFormat } from "@lib/helpers";
import { ColumnDef } from "@tanstack/react-table";

interface FullResultContentProps {
  data: any;
  columns: ColumnDef<any, any>[];
  highlightedRows?: Array<number>;
  highlighted?: string;
  loading: boolean;
  result?: ElectionResult;
  votes: {
    x: string;
    abs: number;
    perc: number;
  }[];
}

const FullResultContent = ({
  data,
  columns,
  highlightedRows,
  highlighted,
  loading,
  result,
  votes,
}: FullResultContentProps) => {
  const { t } = useTranslation("common");

  return (
    <div className="h-[calc(100%-80px)] space-y-6 text-base max-md:overflow-y-scroll max-md:px-4 max-md:pb-4">
      <div className="space-y-3">
        <div className="font-bold">{t("election_result")}</div>
        <ElectionTable
          className="w-full overflow-y-auto md:max-h-96"
          data={data}
          columns={columns}
          isLoading={loading}
          highlighted={highlighted}
          highlightedRows={highlightedRows}
          result={result}
        />
      </div>

      <div className="space-y-3">
        <p className="text-body-sm font-semibold">{t("voting_statistics")}</p>
        {votes && votes.length > 0 ? (
          <div className="flex flex-col gap-3 text-sm">
            {votes.map(({ x, abs, perc }, i: number) =>
              loading ? (
                <Skeleton
                  className={clx(
                    votes.length > 2
                      ? { 0: "w-48", 1: "w-64", 2: "w-56" }[i]
                      : { 0: "w-64", 1: "w-56" }[i],
                  )}
                />
              ) : (
                <div
                  className="flex w-[245px] flex-col gap-3 whitespace-nowrap"
                  key={x}
                >
                  <div className="flex items-center justify-between gap-3 text-body-sm text-txt-black-500">
                    <p className="w-28 md:w-fit">{t(x)}:</p>
                    <p className="text-txt-black-700">{`${abs !== null ? numFormat(abs, "standard") : "—"} ${
                      perc !== null
                        ? `(${numFormat(perc, "compact", [1, 1])}%)`
                        : "(—)"
                    }`}</p>
                  </div>
                  <BarPerc hidden value={perc} size={"h-[5px] w-[245px]"} />
                </div>
              ),
            )}
          </div>
        ) : (
          <div className="flex h-full flex-col gap-3 text-sm">
            {Array(3)
              .fill(null)
              .map((_, i) => (
                <Skeleton className={{ 0: "w-48", 1: "w-64", 2: "w-56" }[i]} />
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export { FullResultContent };
