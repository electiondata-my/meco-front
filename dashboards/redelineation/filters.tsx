import { FunctionComponent, useEffect, useMemo, useRef } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsIcon,
} from "@govtechmy/myds-react/tabs";
import { useTranslation } from "@hooks/useTranslation";
import {
  CrossIcon,
  FilterIcon,
  FlagIcon,
  GovtOfficeIcon,
} from "@govtechmy/myds-react/icon";
import Dropdown from "@components/Dropdown";
import { OptionType } from "@lib/types";
import { useData } from "@hooks/useData";
import { useRouter } from "next/router";
import { routes } from "@lib/routes";
import { clx } from "@lib/helpers";
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerHeader,
  DrawerTrigger,
  DrawerFooter,
  DrawerTitle,
} from "@components/drawer";
import ElectionFilterTrigger from "@dashboards/elections/filter";
import { Button, ButtonIcon } from "@govtechmy/myds-react/button";
import Label from "@components/Label";
import { yearOptions } from ".";
import { ElectionType, Region } from "@dashboards/types";

interface RedelineationFiltersProps {
  params: {
    type: string;
    year: string;
    election_type: ElectionType;
  };
  yearOptions: yearOptions;
}

const RedelineationFilters: FunctionComponent<RedelineationFiltersProps> = ({
  params,
  yearOptions,
}) => {
  const { t } = useTranslation(["redelineation"]);
  const { data, setData } = useData({
    isStick: false,
    open_filter: false,
    type_value: params.type as Region,

    mobile_type: params.type as Region,
    mobile_year: params.year,
    mobile_election_type: params.election_type as ElectionType,
  });
  const { replace } = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const TYPE_OPTIONS: OptionType[] = [
    {
      label: t("peninsular", { ns: "common" }),
      value: "peninsular",
    },
    {
      label: t("sabah", { ns: "common" }),
      value: "sabah",
    },
    {
      label: t("sarawak", { ns: "common" }),
      value: "sarawak",
    },
  ];

  const YEAR_OPTIONS: OptionType[] = yearOptions[
    `${data.type_value}_${params.election_type}`
  ].map((y) => ({
    value: y,
    label: y,
  }));
  const YEAR_OPTIONS_MOBILE: OptionType[] = yearOptions[
    `${data.mobile_type}_${data.mobile_election_type}`
  ].map((y) => ({
    value: y,
    label: y,
  }));

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

  return (
    <>
      <div ref={sentinelRef} className="-mt-10 h-16 max-sm:hidden" />
      <div
        ref={containerRef}
        className={clx(
          "sticky top-16 z-20 col-span-full mx-auto w-full border border-transparent px-4.5 py-0 transition-all duration-300 max-sm:hidden md:w-[727px] md:px-0",
          data.isStick &&
            "border-otl-gray-200 bg-bg-white py-2.5 max-md:top-14 md:w-full md:px-6",
        )}
      >
        <div
          className={clx(
            "flex w-full flex-row justify-center gap-3",
            data.isStick && "mx-auto max-w-screen-xl",
          )}
        >
          <Dropdown
            anchor="left"
            width="max-sm:w-full"
            options={TYPE_OPTIONS}
            selected={TYPE_OPTIONS.find((opt) => opt.value === data.type_value)}
            onChange={(selected) => {
              setData("type_value", selected.value);
            }}
          />
          <Dropdown
            anchor="left"
            width="max-sm:w-full"
            options={YEAR_OPTIONS}
            selected={YEAR_OPTIONS.find((opt) => opt.value === params.year)}
            onChange={(selected) => {
              replace(
                `${routes.REDELINEATION}/${data.type_value}/${selected.value}/${params.election_type}`,
                undefined,
                {
                  scroll: false,
                },
              );
            }}
          />
          <Tabs
            value={params.election_type}
            onValueChange={(value) => {
              replace(
                `${routes.REDELINEATION}/${data.type_value}/${params.year}/${value}`,
                undefined,
                {
                  scroll: false,
                },
              );
            }}
            size="small"
            variant="enclosed"
          >
            <TabsList className="mx-auto space-x-0 !py-0">
              <TabsTrigger
                disabled={data.type_value !== params.type}
                value="parlimen"
                className=""
              >
                <TabsIcon>
                  <GovtOfficeIcon />
                </TabsIcon>
                {t("parlimen", { ns: "common" })}
              </TabsTrigger>
              <TabsTrigger
                disabled={data.type_value !== params.type}
                value="dun"
              >
                <TabsIcon>
                  <FlagIcon />
                </TabsIcon>

                {t("dun", { ns: "common" })}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>
      <Drawer
        open={data.open_filter}
        onOpenChange={(open) => setData("open_filter", open)}
      >
        <DrawerTrigger asChild>
          <ElectionFilterTrigger />
        </DrawerTrigger>
        <DrawerContent className="max-h-[calc(100%-96px)] pt-0">
          <DrawerHeader className="flex w-full items-center justify-between border-b border-otl-gray-200 px-4 py-4.5 uppercase">
            <DrawerTitle className="text-body-md font-bold">
              {t("filters")}
            </DrawerTitle>
            <DrawerClose>
              <CrossIcon className="h-5 w-5 text-txt-black-500" />
            </DrawerClose>
          </DrawerHeader>

          <div className="flex flex-col">
            <div className="space-y-6 px-4 py-4.5">
              <div className="space-y-1.5">
                <Label
                  label={t("filter.area", { ns: "redelineation" }) + ":"}
                  className="text-body-sm"
                />
                <Dropdown
                  anchor="left"
                  options={TYPE_OPTIONS}
                  selected={TYPE_OPTIONS.find(
                    (opt) => opt.value === data.mobile_type,
                  )}
                  onChange={(selected) => {
                    if (selected.value !== data.mobile_type) {
                      setData("mobile_year", "");
                    }
                    setData("mobile_type", selected.value);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  label={t("filter.year", { ns: "redelineation" }) + ":"}
                  className="text-body-sm"
                />
                <Dropdown
                  anchor="left-0 max-h-36"
                  options={YEAR_OPTIONS_MOBILE}
                  selected={YEAR_OPTIONS_MOBILE.find(
                    (opt) => opt.value === data.mobile_year,
                  )}
                  onChange={(selected) => {
                    setData("mobile_year", selected.value);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  label={
                    t("filter.election_type", { ns: "redelineation" }) + ":"
                  }
                  className="text-body-sm"
                />
                <Tabs
                  value={data.mobile_election_type}
                  onValueChange={(value) => {
                    setData("mobile_election_type", value as ElectionType);
                  }}
                  size="small"
                  variant="enclosed"
                >
                  <TabsList className="space-x-0 !py-0">
                    <TabsTrigger value="parlimen" className="">
                      <TabsIcon>
                        <GovtOfficeIcon />
                      </TabsIcon>
                      {t("parlimen", { ns: "common" })}
                    </TabsTrigger>
                    <TabsTrigger value="dun">
                      <TabsIcon>
                        <FlagIcon />
                      </TabsIcon>

                      {t("dun", { ns: "common" })}
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </div>

          <DrawerFooter className="flex-row gap-3">
            <Button
              variant={"default-outline"}
              className="w-full justify-center"
              onClick={() => setData("open_filter", false)}
            >
              {t("close", { ns: "common" })}
              <ButtonIcon>
                <CrossIcon />
              </ButtonIcon>
            </Button>
            <Button
              disabled={
                !data.mobile_election_type ||
                !data.mobile_type ||
                !data.mobile_year
              }
              variant={"danger-fill"}
              className="w-full justify-center"
              onClick={() => {
                replace(
                  `${routes.REDELINEATION}/${data.mobile_type}/${data.mobile_year}/${data.mobile_election_type}`,
                  undefined,
                  {
                    scroll: false,
                  },
                );
                setData("open_filter", false);
              }}
            >
              {t("filter", { ns: "common" })}
              <ButtonIcon>
                <FilterIcon />
              </ButtonIcon>
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default RedelineationFilters;
