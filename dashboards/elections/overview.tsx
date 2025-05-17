import { Party, PartyResult } from "../types";
import {
  BuildingLibraryIcon,
  FlagIcon,
  MapIcon,
  TableCellsIcon,
} from "@heroicons/react/24/solid";
import { generateSchema } from "@lib/schema/election-explorer";
import {
  Button,
  ImageWithFallback,
  List,
  Panel,
  Section,
  SpinnerBox,
  Tabs,
} from "@components/index";
import { CountryAndStates, PoliticalPartyColours } from "@lib/constants";
import { useData } from "@hooks/useData";
import { useTranslation } from "@hooks/useTranslation";
import dynamic from "next/dynamic";
import { FunctionComponent } from "react";

/**
 * Election Explorer Dashboard
 * @overview Status: In-development
 */

const ElectionTable = dynamic(
  () => import("@components/Election/ElectionTable"),
  {
    ssr: false,
  }
);
const Choropleth = dynamic(() => import("@charts/choropleth"), {
  loading: () => <SpinnerBox height="h-[400px] lg:h-[500px]" width="w-auto"/>,
  ssr: false,
});
const Waffle = dynamic(() => import("@charts/waffle"), { ssr: false });

interface OverviewProps {
  choropleth: any;
  params: {
    state: string;
    election: string;
  };
  table: PartyResult;
}

const Overview: FunctionComponent<OverviewProps> = ({
  choropleth,
  params,
  table,
}) => {
  const { t } = useTranslation(["common", "elections", "election"]);

  const PANELS = [
    {
      name: t("parlimen"),
      icon: <BuildingLibraryIcon className="mr-1 h-5 w-5" />,
    },
    {
      name: t("state"),
      icon: <FlagIcon className="mr-1 h-5 w-5" />,
    },
  ];

  const waffleDummy = [
    {
      id: "PH",
      label: "PH",
      value: 82,
    },
    {
      id: "BN",
      label: "BN",
      value: 30,
    },
    {
      id: "PN",
      label: "PN",
      value: 74,
    },
    {
      id: "GPS",
      label: "GPS",
      value: 23,
    },
    {
      id: "Others",
      label: "Others",
      value: 13,
    },
  ];
  const waffleColours = ["#e2462f", "#000080", "#003152", "#FF9B0E", "#E2E8F0"];

  const { data, setData } = useData({
    tab_index: 0,
    showMore: table.length > 6,
    isLoading: false,
  });

  return (
    <Section>
      <Tabs
        hidden
        current={data.toggle_index}
        onChange={(index) => setData("toggle_index", index)}
      >
        {PANELS.map((panel, index) => (
          <Tabs.Panel name={panel.name as string} icon={panel.icon} key={index}>
            <div className="xl:grid xl:grid-cols-12">
              <div className="flex flex-col gap-y-3 xl:col-span-10 xl:col-start-2">
                <div className="flex flex-col items-baseline justify-between gap-y-3 sm:flex-row md:gap-y-0">
                  <h5 className="w-fit">
                    {t("election_of", {
                      ns: "elections",
                      context: (params.election ?? "GE-15").startsWith("G")
                        ? "parlimen"
                        : "dun",
                    })}
                    <span className="text-primary">
                      {CountryAndStates[params.state ?? "mys"]}
                    </span>
                    <span>: </span>
                    <span className="text-primary">
                      {t(params.election ?? "GE-15", { ns: "election" })}
                    </span>
                  </h5>
                  <div className="flex w-full justify-start sm:w-auto">
                    <List
                      options={[
                        t("table", { ns: "elections" })
                        // t("map", { ns: "elections" }),
                        // t("summary", { ns: "elections" }),
                      ]}
                      icons={[
                        <TableCellsIcon
                          key="table_cell_icon"
                          className="mr-1 h-5 w-5"
                        />
                        // <MapIcon key="map_icon" className="mr-1 h-5 w-5" />,
                      ]}
                      current={data.tab_index}
                      onChange={(index) => setData("tab_index", index)}
                    />
                  </div>
                </div>
                <Tabs hidden current={data.tab_index}>
                  <Panel
                    name={t("table", { ns: "elections" })}
                    icon={<TableCellsIcon className="mr-1 h-5 w-5" />}
                  >
                    <>
                      <ElectionTable
                        isLoading={data.isLoading}
                        data={data.showMore ? table.slice(0, 6) : table}
                        columns={generateSchema<Party>([
                          {
                            key: "party",
                            id: "party",
                            header: t("party_name"),
                          },
                          {
                            key: "seats",
                            id: "seats",
                            header: t("seats_won"),
                          },
                          {
                            key: "votes",
                            id: "votes",
                            header: t("votes_won"),
                          },
                        ])}
                      />
                      {data.showMore && (
                        <Button
                          className="btn-default mx-auto mt-6"
                          onClick={() => setData("showMore", false)}
                        >
                          {t("show_more", { ns: "elections" })}
                        </Button>
                      )}
                    </>
                  </Panel>
                  {/*
                  <Panel
                    name={t("map", { ns: "elections" })}
                    icon={<MapIcon className="mr-1 h-5 w-5" />}
                  >
                    <div className="bg-slate-50 dark:bg-[#121212] border-slate-200 dark:border-zinc-800 rounded-xl border static xl:py-4">
                      <Choropleth
                        className="h-[400px] w-auto lg:h-[500px]"
                        type={
                          (params.election ?? "GE-15").startsWith("S")
                            ? "dun"
                            : "parlimen"
                        }
                      />
                    </div>
                  </Panel>
                  <Panel name={t("summary", { ns: "elections" })}>
                    ...summary content...
                  </Panel>
                  */}
                </Tabs>
              </div>
            </div>
          </Tabs.Panel>
        ))}
      </Tabs>
    </Section>
  );
};

export default Overview;
