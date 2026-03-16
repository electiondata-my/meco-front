import { PartyResult } from "../types";
import {
  BuildingLibraryIcon,
  FlagIcon,
  TableCellsIcon,
} from "@heroicons/react/24/solid";
import { List, Panel, Tabs } from "@components/index";
import { CountryAndStates } from "@lib/constants";
import { useData } from "@hooks/useData";
import { useTranslation } from "@hooks/useTranslation";
import dynamic from "next/dynamic";
import { FunctionComponent } from "react";
import SectionGrid from "@components/Section/section-grid";

/**
 * Election Explorer Dashboard
 * @overview Status: In-development
 */

const ElectionOverviewTable = dynamic(
  () => import("@dashboards/elections/ElectionOverviewTable"),
  { ssr: false },
);

interface OverviewProps {
  choropleth: any;
  params: {
    state: string;
    election: string;
  };
  table: PartyResult;
}

const Overview: FunctionComponent<OverviewProps> = ({ params, table }) => {
  const { t } = useTranslation(["common", "elections", "election"]);

  const PANELS = [
    {
      name: t("parlimen"),
      icon: <BuildingLibraryIcon className="mr-1 h-5 w-5" />,
    },
    {
      name: t("dun"),
      icon: <FlagIcon className="mr-1 h-5 w-5" />,
    },
  ];

  const { data, setData } = useData({
    tab_index: 0,
    isLoading: false,
    toggle_index: 0,
  });

  return (
    <SectionGrid className="pb-8 pt-2 lg:space-y-12">
      <Tabs
        hidden
        current={data.toggle_index}
        onChange={(index) => setData("toggle_index", index)}
      >
        {PANELS.map((panel, index) => (
          <Tabs.Panel name={panel.name as string} icon={panel.icon} key={index}>
            <div className="flex flex-col items-baseline justify-between gap-y-3 sm:flex-row md:gap-y-0">
              <h5 className="w-fit text-heading-2xs font-bold">
                {t("election_of", {
                  ns: "elections",
                  context: (params.election ?? "GE-15").startsWith("G")
                    ? "parlimen"
                    : "dun",
                })}
                <span className="text-danger-600">
                  {CountryAndStates[params.state ?? "mys"]}
                </span>
                <span>: </span>
                <span className="text-danger-600">
                  {t(params.election ?? "GE-15", { ns: "election" })}
                </span>
              </h5>
              <div className="flex w-full justify-start sm:w-auto">
                <List
                  options={[t("table", { ns: "elections" })]}
                  icons={[
                    <TableCellsIcon
                      key="table_cell_icon"
                      className="mr-1 h-5 w-5"
                    />,
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
                <ElectionOverviewTable
                  data={table as any}
                  isLoading={data.isLoading}
                />
              </Panel>
            </Tabs>
          </Tabs.Panel>
        ))}
      </Tabs>
    </SectionGrid>
  );
};

export default Overview;
