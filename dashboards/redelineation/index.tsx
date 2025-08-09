import ComboBox from "@components/Combobox";
import Container from "@components/Container";
import Hero from "@components/Hero";
import SectionGrid from "@components/Section/section-grid";
import { QuestionCircleIcon } from "@govtechmy/myds-react/icon";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@govtechmy/myds-react/tooltip";
import { useData } from "@hooks/useData";
import { useTranslation } from "@hooks/useTranslation";
import { clx } from "@lib/helpers";
import dynamic from "next/dynamic";
import { FunctionComponent, useEffect } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@govtechmy/myds-react/tabs";
import { useMap } from "react-map-gl/mapbox";
import GeohistoryTable from "./geohistory-table";
import { useMediaQuery } from "@hooks/useMediaQuery";
import RedelineationFilters from "./filters";
import { useWatch } from "@hooks/useWatch";
import {
  ElectionType,
  RedelineationData,
  RedelineationTableNew,
  RedelineationTableOld,
  Region,
} from "@dashboards/types";

const Bar = dynamic(() => import("@charts/bar"), { ssr: false });
const Mapbox = dynamic(() => import("@dashboards/redelineation/mapbox"), {
  ssr: false,
});

/**
 * Redelineation Dashboard
 * @overview Status: Live
 */

export type yearOptions = {
  [K in `${Region}_${ElectionType}`]: string[];
};

interface RedelineationProps {
  params: {
    type: string;
    year: string;
    election_type: ElectionType;
  };
  yearOptions: yearOptions;
  data: RedelineationData;
}

const RedelineationDashboard: FunctionComponent<RedelineationProps> = ({
  params,
  yearOptions,
  data,
}) => {
  const { t } = useTranslation(["redelineation"]);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const { type, year, election_type } = params;

  const { data: _data, setData } = useData({
    seat_value: "",
    toggle_state: "new" as "new" | "old",
  });

  const { seat_value, toggle_state } = _data;

  const bar_data = data[`bar_${toggle_state}`];
  const callout_data = data[`callout_${toggle_state}`];
  const dropdown = data[toggle_state].map(
    (
      d,
    ): {
      value: string;
      label: string;
      center: [number, number];
      zoom: number;
    } => ({
      value: d[`seat_${toggle_state}`] as string,
      label: d[`seat_${toggle_state}`] as string,
      center: d.center,
      zoom: d.zoom,
    }),
  );

  const current_seat =
    data[toggle_state].find((d) => d[`seat_${toggle_state}`] === seat_value) ||
    data[toggle_state][0];

  const STATUS_COLOR_MAP = {
    unchanged: "#E4E4E7",
    changed: "#FFBA6C",
    new: "#8BCBFF",
    abolished: "#FC6B6B",
  } as const;

  const { redelineation_map } = useMap();

  useEffect(() => {
    setData("seat_value", current_seat[`seat_${toggle_state}`] as string);

    if (redelineation_map) {
      redelineation_map.flyTo({
        center: current_seat.center,
        zoom: current_seat.zoom,
        duration: 2000,
      });
    }
  }, [params, toggle_state]);

  return (
    <>
      <Hero
        background="red"
        category={[
          t("hero.category", { ns: "redelineation" }),
          "text-txt-danger",
        ]}
        header={[t("hero.header", { ns: "redelineation" })]}
        description={[t("hero.description", { ns: "redelineation" })]}
        pageId="geo-history"
      />

      <RedelineationFilters
        params={{ election_type, type, year }}
        yearOptions={yearOptions}
      />

      <Container className="gap-8 py-8 lg:gap-16 lg:pb-16">
        <SectionGrid className="space-y-8">
          <h2 className="max-w-[727px] text-center font-heading text-body-md font-semibold lg:text-heading-2xs">
            {t(`where_seats_${toggle_state}`)}
          </h2>

          <div className="flex w-full flex-col items-center gap-6 lg:max-w-[842px]">
            <Tabs
              size="small"
              variant="enclosed"
              className="space-y-6 lg:space-y-8"
              value={toggle_state}
              onValueChange={(value) =>
                setData("toggle_state", value as "new" | "old")
              }
            >
              <TabsList className="mx-auto space-x-0 !py-0">
                <TabsTrigger value="new" className="">
                  {t("new_constituency", { ns: "common" })}
                </TabsTrigger>
                <TabsTrigger value="old">
                  {t("old_constituency", { ns: "common" })}
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex w-full gap-8 overflow-scroll sm:justify-center">
              {Object.entries(callout_data).map(([key, value]) =>
                key === "total" ? null : (
                  <div key={key} className="flex flex-col gap-1">
                    <p className="text-body-xs text-txt-black-500">
                      {t(`status.${key}.title`)}
                    </p>
                    <p className="text-body-md font-semibold">
                      {value}/{callout_data["total"]}
                    </p>
                  </div>
                ),
              )}
            </div>
            <div className="flex w-full items-center gap-4.5 overflow-scroll rounded-md border border-otl-gray-200 bg-bg-dialog px-2 py-1.5 md:w-fit">
              {Object.entries(callout_data).map(([key, value]) =>
                key === "total" ? null : (
                  <div key={key} className="flex items-center gap-2">
                    <div
                      className="size-2 rounded-full"
                      style={{
                        background: STATUS_COLOR_MAP[key as "unchanged"],
                      }}
                    />
                    <p>{t(`status.${key}.title`)}</p>
                  </div>
                ),
              )}
              <Tooltip>
                <TooltipTrigger>
                  <QuestionCircleIcon className="size-4.5" />
                </TooltipTrigger>
                <TooltipContent className="flex flex-col text-body-xs">
                  {Object.entries(callout_data).map(([key, value]) =>
                    key === "total" ? null : (
                      <p key={key}>
                        <strong>{t(`status.${key}.title`)}:</strong>{" "}
                        {t(`status.${key}.description`)}
                      </p>
                    ),
                  )}
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="-mt-4 w-full">
              <Bar
                layout="horizontal"
                enableStack={true}
                enableGridY={false}
                className={clx(
                  "mx-auto min-h-[350px] w-full max-w-[842px] lg:h-[480px] lg:w-[842px]",
                  bar_data["state"].length === 1 &&
                    "h-[80px] min-h-0 lg:h-[100px]",
                )}
                type="category"
                data={{
                  labels: bar_data["state"],
                  datasets: Object.entries(bar_data)
                    .filter(([key]) => key !== "state")
                    .map(([key, value]) => {
                      return {
                        label: t(`status.${key}.title`),
                        data: value,
                        fill: true,
                        borderRadius: 4,
                        barThickness: isDesktop ? 24 : 16,
                        backgroundColor:
                          STATUS_COLOR_MAP[
                            key as keyof typeof STATUS_COLOR_MAP
                          ],
                      };
                    }),
                }}
              />
            </div>
          </div>
        </SectionGrid>
        <SectionGrid>
          <div className="mx-auto w-full space-y-6">
            <h2 className="mx-auto max-w-[727px] text-center font-heading text-body-md font-semibold lg:text-heading-2xs">
              {t("constituency_redistribution")}
            </h2>

            <Tabs
              size="small"
              variant="enclosed"
              className="space-y-6 lg:space-y-8"
              value={toggle_state}
              onValueChange={(value) =>
                setData("toggle_state", value as "new" | "old")
              }
            >
              <TabsList className="mx-auto space-x-0 !py-0">
                <TabsTrigger value="new" className="">
                  {t("new_constituency", { ns: "common" })}
                </TabsTrigger>
                <TabsTrigger value="old">
                  {t("old_constituency", { ns: "common" })}
                </TabsTrigger>
              </TabsList>
              <div className="mx-auto w-full max-w-[727px] text-center">
                <ComboBox<{
                  value: string;
                  center: [number, number];
                  zoom: number;
                }>
                  placeholder={t("search_seat", { ns: "home" })}
                  options={dropdown}
                  config={{
                    keys: ["label"],
                  }}
                  format={(option) => (
                    <>
                      <span className="text-body-sm">{`${option.label} `}</span>
                    </>
                  )}
                  selected={
                    seat_value
                      ? dropdown.find((e) => e.value === seat_value)
                      : null
                  }
                  onChange={(selected) => {
                    if (selected) {
                      setData("seat_value", selected.value);
                      if (!redelineation_map) return;

                      redelineation_map.flyTo({
                        center: selected.center,
                        zoom: selected.zoom,
                        duration: 1500,
                      });
                    } else setData("seat_value", "");
                  }}
                />
              </div>
              <div className="relative mx-auto flex h-[400px] w-full items-center justify-center overflow-hidden rounded-lg border border-otl-gray-200 lg:h-[400px] lg:w-[846px]">
                <Mapbox
                  params_source={`${type}_${year}_${election_type}`}
                  initialState={{
                    longitude: data[toggle_state][0].center[0],
                    latitude: data[toggle_state][0].center[1],
                    zoom: data[toggle_state][0].zoom,
                  }}
                  sources={[data["map_new"], data["map_old"]]}
                  election_type={election_type}
                  seat_new={current_seat[`seat_new`]}
                  seat_old={current_seat[`seat_old`]}
                />
              </div>
              <TabsContent className="mx-auto max-w-[626px]" value="new">
                {current_seat && (
                  <GeohistoryTable
                    type="new"
                    table={current_seat.lineage as RedelineationTableNew[]}
                  />
                )}
              </TabsContent>
              <TabsContent className="mx-auto max-w-[626px]" value="old">
                {current_seat && (
                  <GeohistoryTable
                    type="old"
                    table={current_seat.lineage as RedelineationTableOld[]}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>
        </SectionGrid>
      </Container>
    </>
  );
};

export default RedelineationDashboard;
