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
import { useRouter } from "next/router";
import { FunctionComponent, useEffect, useRef } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@govtechmy/myds-react/tabs";
import { useMap } from "react-map-gl/mapbox";
import GeohistoryTable from "./geohistory-table";
import { useMediaQuery } from "@hooks/useMediaQuery";

const Bar = dynamic(() => import("@charts/bar"), { ssr: false });
const Mapbox = dynamic(() => import("@dashboards/redelineation/mapbox"), {
  ssr: false,
});

/**
 * Redelineation Dashboard
 * @overview Status: Live
 */

type Bar = {
  state: string[];
  unchanged: number[];
  bigger: number[];
  smaller: number[];
  new: number[];
};

interface RedelineationProps {
  params: {
    type: string;
    year: string;
    election_type: string;
  };
  bar_data: Bar;
  dropdown_data: {
    parlimen: string;
    code_parlimen: string;
    center: [number, number];
    zoom: number;
    dun: string;
    code_dun: string;
  }[];
}

const RedelineationDashboard: FunctionComponent<RedelineationProps> = ({
  bar_data,
  dropdown_data,
  params,
}) => {
  const { t } = useTranslation(["redelineation"]);
  const { push } = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const {
    type = "peninsular",
    year = "2018",
    election_type = "parlimen",
  } = params;

  const { data, setData } = useData({
    loading: false,
    isStick: false,
    seat_value: dropdown_data[0].dun || dropdown_data[0].parlimen,
    dropdown: dropdown_data.map(
      (
        d: any,
      ): {
        value: string;
        label: string;
        code: string;
        center: [number, number];
        zoom: number;
      } => ({
        value: d["dun"] || d["parlimen"],
        label: d["dun"] || d["parlimen"],
        code: d["code_dun"] || d["code_parlimen"],
        center: d.center,
        zoom: d.zoom,
      }),
    ),
  });

  const { loading, isStick, dropdown, seat_value } = data;

  const STATUS_COLOR_MAP = {
    unchanged: "#E4E4E7",
    bigger: "#8BCBFF",
    smaller: "#FFBA6C",
    new: "#FC6B6B",
  };

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

  const { redelineation_map } = useMap();

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
      <div ref={sentinelRef} className="-mt-10 hidden h-16 md:block" />
      <div
        ref={containerRef}
        className={clx(
          "sticky top-16 z-20 col-span-full mx-auto hidden w-full border border-transparent px-4.5 py-3 transition-all duration-300 md:block md:w-[727px] md:px-0",
          isStick &&
            "border-otl-gray-200 bg-bg-white py-0 max-md:top-14 md:w-full md:px-6",
        )}
      >
        <div
          className={clx(
            "flex w-full flex-col items-center gap-6",
            isStick &&
              "mx-auto max-w-screen-xl flex-row justify-between gap-3 py-1",
          )}
        >
          <p>filters here</p>
        </div>
      </div>

      <Container className="gap-8 py-8 lg:gap-16 lg:py-16">
        <SectionGrid className="space-y-8">
          <h2 className="max-w-[727px] text-center font-heading text-body-md font-semibold lg:text-heading-2xs">
            {t("impact_change")}{" "}
            <span className="text-txt-danger">{t("by_state")}</span>
          </h2>

          <div className="flex w-full flex-col items-center gap-2 lg:max-w-[842px]">
            <div className="mb-4 flex w-full gap-8 overflow-scroll sm:justify-center">
              {Object.entries(STATUS_COLOR_MAP).map(([key, value]) => (
                <div key={key} className="flex flex-col gap-1">
                  <p className="text-body-xs text-txt-black-500">
                    {t(`status.${key}.title`)}
                  </p>
                  <p className="text-body-md font-semibold">155/222</p>
                </div>
              ))}
            </div>
            <div className="flex w-full items-center gap-4.5 overflow-scroll rounded-md border border-otl-gray-200 bg-bg-dialog px-2 py-1.5 md:w-fit">
              {Object.entries(STATUS_COLOR_MAP).map(([key, value]) => (
                <div key={key} className="flex items-center gap-2">
                  <div
                    className="size-2 rounded-full"
                    style={{ background: value }}
                  />
                  <p>{t(`status.${key}.title`)}</p>
                </div>
              ))}
              <Tooltip>
                <TooltipTrigger>
                  <QuestionCircleIcon className="size-4.5" />
                </TooltipTrigger>
                <TooltipContent className="flex flex-col text-body-xs">
                  {Object.entries(STATUS_COLOR_MAP).map(([key, value]) => (
                    <p key={key}>
                      <strong>{t(`status.${key}.title`)}:</strong>{" "}
                      {t(`status.${key}.description`)}
                    </p>
                  ))}
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="w-full">
              <Bar
                layout="horizontal"
                enableStack={true}
                className="mx-auto min-h-[350px] w-full max-w-[842px] lg:h-[400px] lg:w-[842px]"
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
            <div className="mx-auto w-full max-w-[727px] text-center">
              <ComboBox<{
                value: string;
                code: string;
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

            <Tabs
              defaultValue="new_constituency"
              size="small"
              variant="enclosed"
              className="space-y-6 lg:space-y-8"
            >
              <TabsList className="mx-auto space-x-0 !py-0">
                <TabsTrigger value="new_constituency" className="">
                  {t("new_constituency", { ns: "common" })}
                </TabsTrigger>
                <TabsTrigger value="old_constituency">
                  {t("old_constituency", { ns: "common" })}
                </TabsTrigger>
              </TabsList>
              <div className="relative mx-auto flex h-[400px] w-full items-center justify-center overflow-hidden rounded-lg border border-otl-gray-200 lg:h-[400px] lg:w-[846px]">
                <Mapbox
                  params_source={`${type}_${year}_${election_type}`}
                  initialState={{
                    longitude: dropdown_data[0].center[0],
                    latitude: dropdown_data[0].center[1],
                    zoom: dropdown_data[0].zoom,
                  }}
                />
              </div>
              <TabsContent
                className="mx-auto max-w-[626px]"
                value="new_constituency"
              >
                <GeohistoryTable
                  type="new"
                  table={{
                    type: "new",
                    data: [
                      {
                        new_name: "P.138 Kota Melaka",
                        seat_transferred: "P.138 Bandar Malacca",
                        pct_transferred: 79.2,
                      },
                    ],
                  }}
                />
              </TabsContent>
              <TabsContent
                className="mx-auto max-w-[626px]"
                value="old_constituency"
              >
                <GeohistoryTable
                  type="old"
                  table={{
                    type: "old",
                    data: [
                      {
                        old_name: "P.138 Bandar Malacca",
                        seat_transferred: "P.138 Kota Melaka",
                        pct_transferred: 79.2,
                      },
                    ],
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        </SectionGrid>
      </Container>
    </>
  );
};

export default RedelineationDashboard;
