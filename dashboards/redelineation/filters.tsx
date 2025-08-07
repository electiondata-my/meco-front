import { FunctionComponent, useEffect, useMemo, useRef } from "react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsIcon,
} from "@govtechmy/myds-react/tabs";
import { useTranslation } from "@hooks/useTranslation";
import { FlagIcon, GovtOfficeIcon } from "@govtechmy/myds-react/icon";
import Dropdown from "@components/Dropdown";
import { OptionType } from "@lib/types";
import { useData } from "@hooks/useData";
import { useRouter } from "next/router";
import { routes } from "@lib/routes";
import { clx } from "@lib/helpers";

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
    type_value: params.type,
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
                  shallow: false,
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
                  shallow: false,
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
    </>
  );
};

export default RedelineationFilters;
