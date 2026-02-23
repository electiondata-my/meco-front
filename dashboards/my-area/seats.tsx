import {
  BaseResult,
  Boundaries,
  ElectionResource,
  ElectionType,
  Lineage,
  Seat,
  SeatOptions,
} from "../types";
import FullResults, { Result } from "@components/Election/FullResults";
import { generateSchema } from "@lib/schema/election-explorer";
import { get } from "@lib/api";
import { ComboBox, Container, Hero } from "@components/index";
import SectionGrid from "@components/Section/section-grid";
import { useCache } from "@hooks/useCache";
import { useData } from "@hooks/useData";
import { useTranslation } from "@hooks/useTranslation";
import { OptionType } from "@lib/types";
import dynamic from "next/dynamic";
import { FunctionComponent, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useLanguage } from "@hooks/useLanguage";
import { clx, numFormat } from "@lib/helpers";
import { Chart, TooltipModel } from "chart.js";
import { useToast } from "@govtechmy/myds-react/hooks";
import { routes } from "@lib/routes";
import { useWatch } from "@hooks/useWatch";

/**
 * Seats
 * @overview Status: Live
 */

const ElectionTable = dynamic(
  () => import("@components/Election/ElectionTable"),
  {
    ssr: false,
  },
);
const Pyramid = dynamic(() => import("@charts/pyramid"), { ssr: false });
const BarMeter = dynamic(() => import("@charts/bar-meter"), { ssr: false });
const Mapbox = dynamic(() => import("@dashboards/my-area/mapbox"), {
  ssr: false,
});

type MyAreaBarmeter = {
  votertype: { regular: number; early: number; postal: number };
  sex: { male: number; female: number };
  age: {
    "18_20": number;
    "21_39": number;
    "40_59": number;
    "60_79": number;
    "80_plus": number;
  };
  ethnic: {
    malay: number;
    chinese: number;
    indian: number;
    bumi_sabah: number;
    bumi_sarawak: number;
    orang_asli: number;
    other: number;
  };
};

interface ElectionSeatsProps extends ElectionResource<Seat> {
  selection: Array<SeatOptions>;
  pyramid: { ages: number[]; male: number[]; female: number[] };
  voters_total: number;
  desc_en: string;
  desc_ms: string;
  barmeter: MyAreaBarmeter;
  boundaries: Boundaries;
  lineage: Lineage;
}

type SeatOption = {
  state: string;
  seat: string;
  type: ElectionType;
};

const ElectionSeatsDashboard: FunctionComponent<ElectionSeatsProps> = ({
  elections,
  params,
  selection,
  desc_en,
  desc_ms,
  pyramid,
  voters_total,
  barmeter,
  boundaries,
  lineage,
}) => {
  const { t } = useTranslation(["common", "seats"]);
  const { cache } = useCache();
  const { language } = useLanguage();
  const { toast } = useToast();
  const { push } = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const SEAT_OPTIONS: Array<
    Omit<OptionType, "contests" | "losses" | "wins"> & SeatOption
  > = selection.map(({ seat_name, slug, type }) => ({
    label: seat_name.concat(` (${t(type)})`),
    value: type + "_" + slug,
    state: seat_name.split(", ")[1],
    seat: seat_name.split(", ")[0],
    type: type,
  }));

  const CURRENT_SEAT =
    params.type && params.seat_name && `${params.type}_${params.seat_name}`;

  const SELECTED_SEATS = SEAT_OPTIONS.find((e) => e.value === CURRENT_SEAT);

  const { data, setData } = useData({
    seat_value: CURRENT_SEAT,
    loading: false,
    isStick: false,
  });

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        setData("isStick", !entry.isIntersecting);
      },
      { threshold: [1] },
    );

    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => observer.disconnect();
  }, []);

  useWatch(() => {
    if (`${params.type}_${params.seat_name}` !== data.seat_value) {
      setData("seat_value", `${params.type}_${params.seat_name}`);
    }
  }, [params.type, params.seat_name]);

  const fetchFullResult = async (
    election: string,
    seat: string,
    date: string,
    state?: string,
  ): Promise<Result<BaseResult[]>> => {
    const seatKey = state ? `${seat}, ${state}` : seat;
    const identifier = `${election}_${seatKey}`;
    return new Promise(async (resolve) => {
      if (cache.has(identifier)) return resolve(cache.get(identifier));
      try {
        const response = await get(
          `/results/${encodeURIComponent(seatKey)}/${date}.json`,
        );
        const { ballot, summary } = response.data;
        const summaryStats = summary[0];

        const result: Result<BaseResult[]> = {
          data: ballot,
          votes: [
            {
              x: "majority",
              abs: summaryStats.majority,
              perc: summaryStats.majority_perc,
            },
            {
              x: "voter_turnout",
              abs: summaryStats.voter_turnout,
              perc: summaryStats.voter_turnout_perc,
            },
            {
              x: "rejected_votes",
              abs: summaryStats.votes_rejected,
              perc: summaryStats.votes_rejected_perc,
            },
          ],
        };
        cache.set(identifier, result);
        resolve(result);
      } catch (e) {
        toast({
          variant: "error",
          title: t("toast.request_failure"),
          description: t("toast.try_again"),
        });
        throw new Error("Invalid election or seat. Message: " + e);
      }
    });
  };

  const seat_schema = generateSchema<Seat>([
    {
      key: "election_name",
      id: "election_name",
      header: t("election_name"),
    },
    { key: "seat", id: "seat", header: t("constituency") },
    {
      key: "party",
      id: "party",
      header: t("winning_party"),
    },
    { key: "name", id: "name", header: t("candidate_name") },
    { key: "majority", id: "majority", header: t("majority") },
    {
      key: "voter_turnout_perc",
      id: "voter_turnout",
      header: t("voter_turnout"),
    },
    {
      key: (item) => item,
      id: "full_result",
      header: "",
      cell: ({ row }) => (
        <FullResults
          options={elections.filter((election) => !("change_en" in election))}
          currentIndex={row.index}
          onChange={(option: Seat) =>
            fetchFullResult(
              option.election_name,
              option.seat,
              option.date,
              SELECTED_SEATS?.state,
            )
          }
          columns={generateSchema<BaseResult>([
            { key: "name", id: "name", header: t("candidate_name") },
            {
              key: "party",
              id: "party",
              header: t("party_name"),
            },
            {
              key: "votes",
              id: "votes",
              header: t("votes_won"),
            },
          ])}
        />
      ),
    },
  ]);

  const barmeter_data = barmeter
    ? Object?.entries(barmeter).map(([key, value]) => {
        const entries = Object.entries(value);
        const total = entries?.reduce((sum, [, y]) => sum + y, 0);
        let _v = entries.map(([k, v]) => ({
          x: k,
          y: (v / total) * 100,
          abs: v,
        }));

        if (key !== "age") {
          _v = _v.sort((a, b) => b.y - a.y);
        }

        return [key, _v];
      })
    : [];

  return (
    <>
      <Hero
        background="red"
        category={[t("hero.category", { ns: "seats" }), "text-txt-danger"]}
        header={[t("hero.header", { ns: "seats" })]}
        description={[t("hero.description", { ns: "seats" })]}
        pageId={routes.SEATS}
      />
      <div ref={sentinelRef} className="-mt-10 h-16" />
      <div
        ref={containerRef}
        className={clx(
          "sticky top-16 z-20 col-span-full mx-auto w-full border border-transparent px-4.5 py-3 transition-all duration-300 md:w-[727px] md:px-0",
          data.isStick &&
            "border-otl-gray-200 bg-bg-white py-0 max-md:top-14 md:w-full md:px-6",
        )}
      >
        <div
          className={clx(
            "flex w-full flex-col items-center gap-6",
            data.isStick &&
              "mx-auto max-w-screen-xl flex-row justify-between gap-3 py-1",
          )}
        >
          <ComboBox<SeatOption>
            borderless={data.isStick}
            leftSearchButton={data.isStick}
            placeholder={t("search_seat", { ns: "seats" })}
            options={SEAT_OPTIONS}
            config={{
              baseSort: (a: any, b: any) => {
                if (a.item.type === b.item.type) {
                  return String(a.item.seat).localeCompare(String(b.item.seat));
                }
                return a.item.type === "parlimen" ? -1 : 1;
              },
              keys: ["label", "seat", "state", "type"],
            }}
            format={(option) => (
              <>
                <span>{`${option.seat}, ${option.state} `}</span>
                <span className="text-body-sm text-txt-black-500">
                  {"(" + t(option.type) + ")"}
                </span>
              </>
            )}
            selected={
              data.seat_value
                ? SEAT_OPTIONS.find((e) => e.value === data.seat_value)
                : null
            }
            onChange={(selected) => {
              if (selected) {
                setData("loading", true);
                setData("seat_value", selected.value);
                const [type, seat] = selected.value.split("_");
                push(
                  `${routes.SEATS}/${type}/${seat}`,
                  `${routes.SEATS}/${type}/${seat}`,
                  {
                    scroll: false,
                  },
                )
                  .catch((e) => {
                    toast({
                      variant: "error",
                      title: t("toast.request_failure"),
                      description: t("toast.try_again"),
                    });
                  })
                  .finally(() => setData("loading", false));
              } else setData("seat_value", "");
            }}
          />
        </div>
      </div>
      <Container className="gap-8 pt-4 pb-8 lg:gap-16 lg:pt-8 lg:pb-16">
        <SectionGrid className="space-y-8 lg:space-y-10">
          {/* <h2 className="max-w-[727px] text-center font-heading text-heading-2xs font-semibold">
            <span className="text-txt-danger">{SELECTED_SEATS?.seat}</span>
            {language === "en-GB"
              ? desc_en?.replace(SELECTED_SEATS?.seat || "", "")
              : desc_ms?.replace(SELECTED_SEATS?.seat || "", "")}
          </h2> */}
          <div className="space-y-3">
            <div className="relative flex h-[500px] w-full items-center justify-center overflow-hidden rounded-lg border border-otl-gray-200 lg:h-[400px] lg:w-[842px]">
              {boundaries ? (
                <Mapbox
                  type="map"
                  boundaries={boundaries}
                  seat_info={SELECTED_SEATS}
                  lineage={lineage}
                />
              ) : (
                <p>{t("common:toast.request_failure")}</p>
              )}
            </div>
            <p className="text-center text-sm italic text-txt-black-500">
              {t("attribution_tindak")}
            </p>
          </div>
        </SectionGrid>
        <SectionGrid className="space-y-6 lg:space-y-10">
          <ElectionTable
            title={
              <h2 className="text-center font-heading text-heading-2xs font-semibold">
                {t("title", { ns: "seats" })}
                <span className="text-txt-danger">{SELECTED_SEATS?.label}</span>
              </h2>
            }
            data={elections}
            columns={seat_schema}
            isLoading={data.loading}
            className="w-full"
            percentOnlyColumns={["majority", "voter_turnout"]}
          />
        </SectionGrid>

        <SectionGrid className="space-y-6 lg:space-y-10">
          <h2 className="text-center font-heading text-heading-2xs font-semibold">
            {t("breakdown_voters", {
              ns: "seats",
              number: voters_total && numFormat(voters_total, "standard"),
            })}
            <span className="text-txt-danger">{SELECTED_SEATS?.label}</span>
          </h2>

          <div className="flex w-full flex-col gap-6 xl:flex-row">
            <div className="flex flex-col items-start justify-start gap-6 xl:flex-[0.70]">
              {pyramid && (
                <Pyramid
                  title={
                    <h6 className="text-body-md font-semibold lg:text-body-lg">
                      {t("gender_age_distr", { ns: "seats" })}
                    </h6>
                  }
                  className="h-[500px] w-full xl:h-[95%]"
                  customTooltip={pyramidPopulationTooltip}
                  data={{
                    labels: pyramid["ages"].map((age, index, arr) => {
                      if (index === arr.length - 1) {
                        return "100+";
                      }
                      return String(age);
                    }),
                    datasets: [
                      {
                        label: "Male",
                        backgroundColor: "#3A75F6",
                        data: pyramid["male"].map((val, i) => -val),
                        borderRadius: 5,
                        minBarLength: 4,
                      },
                      {
                        label: "Female",
                        data: pyramid["female"].map((val, i) => val),
                        backgroundColor: "#dc2626",
                        borderRadius: 5,
                        minBarLength: 4,
                      },
                    ],
                  }}
                />
              )}
            </div>
            <div className="flex w-full flex-1 flex-row flex-wrap gap-6 pt-8 lg:pt-0 xl:flex-1">
              {barmeter_data.map(([type, data]) => (
                <div
                  key={type as string}
                  className="flex w-full flex-col justify-start gap-6 xl:w-[345px]"
                >
                  <BarMeter
                    layout="horizontal"
                    tooltipVariable="abs"
                    title={
                      <h6 className="text-body-md font-semibold lg:text-body-lg">
                        {t(`${type as string}`, { ns: "seats" })}
                      </h6>
                    }
                    data={Array.isArray(data) ? data : []}
                    formatX={(key) => t(`barmeter.${key}`, { ns: "seats" })}
                    formatY={(perc, name) => (
                      <p className="whitespace-nowrap text-body-sm text-txt-black-500">{`${numFormat(perc, "compact", [2, 2])}%`}</p>
                    )}
                  />
                </div>
              ))}
            </div>
          </div>
        </SectionGrid>
      </Container>
    </>
  );
};

export default ElectionSeatsDashboard;

// Create custom tooltip in chartjs for Population Pyramid
const getOrCreateTooltip = (chart: Chart): HTMLDivElement => {
  const parent = chart.canvas.parentNode as HTMLElement;
  let tooltipEl = parent.querySelector(
    "div.chartjs-custom-tooltip",
  ) as HTMLDivElement | null;

  if (!tooltipEl) {
    tooltipEl = document.createElement("div");
    tooltipEl.className =
      "chartjs-custom-tooltip absolute z-50 pointer-events-none opacity-0 transition-opacity duration-100 " +
      "rounded-sm bg-bg-black-950 border border-bg-black-950 shadow-card px-3 pt-2 pb-3 text-body-xs text-txt-white";

    const table = document.createElement("table");
    table.className = "m-0";
    tooltipEl.appendChild(table);

    parent.appendChild(tooltipEl);
  }

  return tooltipEl;
};

const pyramidPopulationTooltip = (context: {
  chart: Chart;
  tooltip: TooltipModel<"bar">;
}) => {
  const { chart, tooltip } = context;
  const tooltipEl = getOrCreateTooltip(chart);

  if (!tooltip || tooltip.opacity === 0) {
    tooltipEl.style.opacity = "0";
    return;
  }

  const dataIndex = tooltip.dataPoints?.[0]?.dataIndex ?? 0;
  const label = tooltip.dataPoints?.[0]?.label ?? "";

  const male = Math.abs(chart.data.datasets[0].data[dataIndex] as number);
  const female = Math.abs(chart.data.datasets[1].data[dataIndex] as number);
  const total = male + female || 1;
  const malePct = ((male / total) * 100).toFixed(0);
  const femalePct = ((female / total) * 100).toFixed(0);

  const table = tooltipEl.querySelector("table");
  if (table) {
    table.innerHTML = `
      <thead>
        <tr><th class="text-left font-medium pb-1">${label} years old</th></tr>
      </thead>
      <div class='w-full h-px bg-txt-black-700 my-2' />
      <tbody class="flex items-center gap-3">
        <tr class="flex flex-col">
          <td class="flex gap-2 items-center">
            <span class="h-2 w-2 bg-bg-primary-500 rounded-full"></span>
            <span class="font-medium">Male</span> (${malePct}%)
          </td>
          <td class="text-body-xs text-txt-black-500">${male.toLocaleString()}</td>
        </tr>
        <tr class="flex flex-col">
          <td class="flex gap-2 items-center">
            <span class="h-2 w-2 bg-bg-danger-600 rounded-full"></span>
            <span class="font-medium">Female</span> (${femalePct}%)
          </td>
          <td class="text-body-xs text-txt-black-500">${female.toLocaleString()}</td>
        </tr>
      </tbody>
    `;
  }

  const { top, left } = chart.canvas.getBoundingClientRect();
  tooltipEl.style.opacity = "1";
  tooltipEl.style.left = `${left + window.scrollX + tooltip.caretX}px`;
  tooltipEl.style.top = `${top + window.scrollY + tooltip.caretY}px`;
};
