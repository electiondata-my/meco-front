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

interface RedelineationFiltersProps {
  params: {
    type: string;
    year: string;
    election_type: string;
  };
}

const RedelineationFilters: FunctionComponent<RedelineationFiltersProps> = ({
  params,
}) => {
  const { t } = useTranslation(["redelineation"]);
  const { data, setData } = useData({
    isStick: false,
    open_filter: false,
    type_value: params.type,

    mobile_type: params.type,
    mobile_year: params.year,
    mobile_election_type: params.election_type,
  });
  const { push } = useRouter();
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

  const YEAR_OPTIONS: OptionType[] = useMemo(() => {
    if (data.type_value === "peninsular") {
      return [
        {
          label: "2018",
          value: "2018",
        },
        {
          label: "2003",
          value: "2003",
        },
        {
          label: "1994",
          value: "1994",
        },
        {
          label: "1984",
          value: "1984",
        },
        {
          label: "1974",
          value: "1974",
        },
        {
          label: "1959",
          value: "1959",
        },
        params.election_type === "parlimen"
          ? {
              label: "1955",
              value: "1955",
            }
          : {
              label: "",
              value: "",
            },
      ];
    } else if (data.type_value === "sabah") {
      return [
        {
          label: "2019",
          value: "2019",
        },
        {
          label: "2003",
          value: "2003",
        },
        {
          label: "1994",
          value: "1994",
        },
        {
          label: "1984",
          value: "1984",
        },
        {
          label: "1974",
          value: "1974",
        },
        {
          label: "1966",
          value: "1966",
        },
      ];
    } else {
      return [
        {
          label: "2015",
          value: "2015",
        },
        {
          label: "2005",
          value: "2005",
        },
        {
          label: "1996",
          value: "1996",
        },
        {
          label: "1987",
          value: "1987",
        },
        {
          label: "1977",
          value: "1977",
        },
        {
          label: "1968",
          value: "1968",
        },
      ];
    }
  }, [data.type_value, params.election_type]);

  const YEAR_OPTIONS_MOBILE: OptionType[] = useMemo(() => {
    if (data.mobile_type === "peninsular") {
      return [
        {
          label: "2018",
          value: "2018",
        },
        {
          label: "2003",
          value: "2003",
        },
        {
          label: "1994",
          value: "1994",
        },
        {
          label: "1984",
          value: "1984",
        },
        {
          label: "1974",
          value: "1974",
        },
        {
          label: "1959",
          value: "1959",
        },
        data.mobile_election_type === "parlimen"
          ? {
              label: "1955",
              value: "1955",
            }
          : {
              label: "",
              value: "",
            },
      ];
    } else if (data.mobile_type === "sabah") {
      return [
        {
          label: "2019",
          value: "2019",
        },
        {
          label: "2003",
          value: "2003",
        },
        {
          label: "1994",
          value: "1994",
        },
        {
          label: "1984",
          value: "1984",
        },
        {
          label: "1974",
          value: "1974",
        },
        {
          label: "1966",
          value: "1966",
        },
      ];
    } else {
      return [
        {
          label: "2015",
          value: "2015",
        },
        {
          label: "2005",
          value: "2005",
        },
        {
          label: "1996",
          value: "1996",
        },
        {
          label: "1987",
          value: "1987",
        },
        {
          label: "1977",
          value: "1977",
        },
        {
          label: "1968",
          value: "1968",
        },
      ];
    }
  }, [data.mobile_type, data.mobile_election_type]);

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
            options={YEAR_OPTIONS.filter((opt) => Boolean(opt.value))}
            selected={YEAR_OPTIONS.find((opt) => opt.value === params.year)}
            onChange={(selected) => {
              push(
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
              push(
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
                  options={YEAR_OPTIONS_MOBILE.filter((opt) =>
                    Boolean(opt.value),
                  )}
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
                    setData("mobile_election_type", value);
                  }}
                  size="small"
                  variant="enclosed"
                >
                  <TabsList className="space-x-0 !pb-3.5">
                    <TabsTrigger
                      // disabled={data.type_value !== params.type}
                      value="parlimen"
                      className=""
                    >
                      <TabsIcon>
                        <GovtOfficeIcon />
                      </TabsIcon>
                      {t("parlimen", { ns: "common" })}
                    </TabsTrigger>
                    <TabsTrigger
                      // disabled={data.type_value !== params.type}
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
                push(
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
