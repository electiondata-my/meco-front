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
import { FunctionComponent, useRef } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  TabsCounter,
} from "@govtechmy/myds-react/tabs";

const Bar = dynamic(() => import("@charts/bar"), { ssr: false });

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
  bar_data: Bar;
}

const RedelineationDashboard: FunctionComponent<RedelineationProps> = ({
  bar_data,
}) => {
  const { t } = useTranslation(["redelineation"]);
  const { push } = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const { data, setData } = useData({
    loading: false,
    isStick: false,
  });

  const { loading, isStick } = data;

  const STATUS_COLOR_MAP = {
    unchanged: "#E4E4E7",
    bigger: "#8BCBFF",
    smaller: "#FFBA6C",
    new: "#FC6B6B",
  };

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
      <div ref={sentinelRef} className="-mt-10 h-16" />
      <div
        ref={containerRef}
        className={clx(
          "sticky top-16 z-20 col-span-full mx-auto w-full border border-transparent px-4.5 py-3 transition-all duration-300 md:w-[727px] md:px-0",
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

          <div className="flex max-w-[842px] flex-col items-center gap-2">
            <div className="mb-4 flex w-full justify-center gap-8">
              {Object.entries(STATUS_COLOR_MAP).map(([key, value]) => (
                <div className="flex flex-col gap-1">
                  <p className="text-body-xs text-txt-black-500">
                    {t(`status.${key}.title`)}
                  </p>
                  <p className="text-body-md font-semibold">155/222</p>
                </div>
              ))}
            </div>
            <div className="flex w-fit items-center gap-4.5 rounded-md border border-otl-gray-200 bg-bg-dialog px-2 py-1.5">
              {Object.entries(STATUS_COLOR_MAP).map(([key, value]) => (
                <div className="flex items-center gap-2">
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
                    <p>
                      <strong>{t(`status.${key}.title`)}:</strong>{" "}
                      {t(`status.${key}.description`)}
                    </p>
                  ))}
                </TooltipContent>
              </Tooltip>
            </div>

            <Bar
              layout="horizontal"
              enableStack={true}
              className="h-[400px] w-[842px]"
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
                      barThickness: 22,
                      backgroundColor:
                        STATUS_COLOR_MAP[key as keyof typeof STATUS_COLOR_MAP],
                    };
                  }),
              }}
            />
          </div>
        </SectionGrid>
        <SectionGrid>
          <div className="mx-auto w-full space-y-6">
            <h2 className="mx-auto max-w-[727px] text-center font-heading text-body-md font-semibold lg:text-heading-2xs">
              {t("constituency_redistribution")}
            </h2>
            <div className="mx-auto w-full max-w-[727px] text-center">
              <ComboBox
                placeholder={t("search_seat", { ns: "home" })}
                options={[]}
                config={{
                  baseSort: (a: any, b: any) => {
                    if (a.item.type === b.item.type) {
                      return String(a.item.seat).localeCompare(
                        String(b.item.seat),
                      );
                    }
                    return a.item.type === "parlimen" ? -1 : 1;
                  },
                  keys: ["label", "seat", "state", "type"],
                }}
                // format={(option) => (
                //   <>
                //     <span>{`${option.seat}, ${option.state} `}</span>
                //     <span className="text-body-sm text-txt-black-500">
                //       {"(" + t(option.type) + ")"}
                //     </span>
                //   </>
                // )}
                // selected={
                //   data.seat_value
                //     ? SEAT_OPTIONS.find((e) => e.value === data.seat_value)
                //     : null
                // }
                selected={null}
                onChange={(option) => undefined}
                // onChange={(selected) => {
                //   if (selected) {
                //     setData("loading", true);
                //     setData("seat_value", selected.value);
                //     const [type, seat] = selected.value.split("_");
                //     push(`/${type}/${seat}`, `/${type}/${seat}`, {
                //       scroll: false,
                //     })
                //       .catch((e) => {
                //         toast({
                //           variant: "error",
                //           title: t("toast.request_failure"),
                //           description: t("toast.try_again"),
                //         });
                //       })
                //       .finally(() => setData("loading", false));
                //   } else setData("seat_value", "");
                // }}
              />
            </div>

            <Tabs
              defaultValue="new_constituency"
              size="small"
              variant="enclosed"
              className="space-y-8"
            >
              <TabsList className="mx-auto space-x-0 !py-0">
                <TabsTrigger value="new_constituency" className="">
                  {t("new_constituency", { ns: "common" })}
                </TabsTrigger>
                <TabsTrigger value="old_constituency">
                  {t("old_constituency", { ns: "common" })}
                </TabsTrigger>
              </TabsList>
              <div className="mx-auto flex h-[400px] w-[846px] items-center justify-center bg-bg-washed-active">
                mapbox here
              </div>
              <TabsContent
                className="mx-auto max-w-[626px]"
                value="new_constituency"
              >
                last table here
              </TabsContent>
              <TabsContent
                className="mx-auto max-w-[626px]"
                value="old_constituency"
              >
                last table here 2
              </TabsContent>
            </Tabs>
          </div>
        </SectionGrid>
      </Container>
    </>
  );
};

export default RedelineationDashboard;
