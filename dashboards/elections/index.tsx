import ElectionAnalysis from "./analysis";
import BallotSeat from "./ballot-seat";
import ElectionFilter from "./filter";
import { ElectionEnum, OverallSeat, PartyResult } from "../types";
import { BuildingLibraryIcon, FlagIcon } from "@heroicons/react/24/solid";
import {
  Button,
  Container,
  Dropdown,
  Hero,
  Label,
  List,
  Modal,
  Section,
  StateDropdown,
} from "@components/index";
import { CountryAndStates } from "@lib/constants";
import { WindowProvider } from "@lib/contexts/window";
import { useData } from "@hooks/useData";
import { useTranslation } from "@hooks/useTranslation";
import { useScrollIntersect } from "@hooks/useScrollIntersect";
import { OptionType } from "@lib/types";
import dynamic from "next/dynamic";
import { FunctionComponent, useMemo, useRef } from "react";
import Overview from "./overview";
import { useRouter } from "next/router";
import { routes } from "@lib/routes";
import { toDate } from "@lib/helpers";
import SectionGrid from "@components/Section/section-grid";

/**
 * Election Explorer Dashboard
 * @overview Status: In-development
 */

const Toast = dynamic(() => import("@components/Toast"), { ssr: false });

interface ElectionExplorerProps {
  choropleth: any;
  last_updated: string;
  params: {
    state: string;
    election: string;
  };
  seats: OverallSeat[];
  selection: Record<
    string,
    { state: string; election: string; date: string }[]
  >;
  table: PartyResult;
}

const ElectionExplorer: FunctionComponent<ElectionExplorerProps> = ({
  choropleth,
  last_updated,
  params,
  seats,
  selection,
  table,
}) => {
  const { t } = useTranslation(["common", "elections", "election"]);

  const divRef = useRef<HTMLDivElement>(null);
  useScrollIntersect(divRef.current, [
    "drop-shadow-xl",
    "dark:lg:drop-shadow-[0_8px_8px_rgba(255,255,255,0.15)]",
  ]);

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

  const ELECTION_FULLNAME = params.election ?? "GE-15";
  const ELECTION_ACRONYM = ELECTION_FULLNAME.slice(-5);
  const CURRENT_STATE = params.state ?? "mys";

  const { data, setData } = useData({
    toggle_index: ELECTION_ACRONYM.startsWith("G")
      ? ElectionEnum.Parlimen
      : ElectionEnum.Dun,
    tab_index: 0,
    election_fullname: ELECTION_FULLNAME,
    election_acronym: ELECTION_ACRONYM,
    state: CURRENT_STATE,
    showFullTable: false,
  });

  const TOGGLE_IS_DUN = data.toggle_index === ElectionEnum.Dun;
  const TOGGLE_IS_PARLIMEN = data.toggle_index === ElectionEnum.Parlimen;
  const NON_SE_STATE = ["mys", "kul", "lbn", "pjy"];

  const GE_OPTIONS: Array<OptionType> = selection["Malaysia"]
    .map(({ election, date }) => ({
      label: `${t(election, { ns: "election" })} (${toDate(date, "yyyy")})`,
      value: election,
    }))
    .reverse();

  const SE_OPTIONS = useMemo<Array<OptionType>>(() => {
    let options: Array<OptionType> = [];
    if (data.state !== null && NON_SE_STATE.includes(data.state) === false)
      options = selection[CountryAndStates[data.state]]
        .map(({ election, date }) => ({
          label: `${t(election, { ns: "election" })} (${toDate(date, "yyyy")})`,
          value: election,
        }))
        .reverse();
    return options;
  }, [data.state]);

  const handleElectionTab = (index: number) => {
    //  When toggling to DUN, if state is Malaysia / W.P, set as null, else set as current state
    if (index === ElectionEnum.Dun) {
      setData(
        "state",
        NON_SE_STATE.includes(data.state ?? "mys")
          ? null
          : data.state || CURRENT_STATE,
      );
      setData("election", null);
    } else {
      setData("state", data.state || CURRENT_STATE);
    }
    setData("toggle_index", index);
  };

  const { push } = useRouter();

  return (
    <>
      <Toast />
      <Hero
        background="red"
        category={[t("hero.category", { ns: "elections" }), "text-txt-danger"]}
        header={[t("hero.header", { ns: "elections" })]}
        description={[t("hero.description", { ns: "elections" })]}
        last_updated={last_updated}
        pageId="/elections"
        withPattern={true}
      />
      <Container>
        {/* Explore any election from Merdeka to the present! */}
        <SectionGrid className="pt-6 lg:pt-6">
          {/* <h4 className="text-center text-heading-2xs font-bold">
            {t("header_1", { ns: "elections" })}
          </h4> */}

          {/* Mobile */}
          <Modal
            trigger={(open) => (
              <WindowProvider>
                <ElectionFilter onClick={open} />
              </WindowProvider>
            )}
            title={
              <Label label={t("filters") + ":"} className="text-sm font-bold" />
            }
          >
            {(close) => (
              <div className="flex flex-col">
                <div className="dark:bg-zinc-900 bg-white">
                  <div className="dark:divide-washed-dark divide-y px-3 pb-3">
                    <div className="space-y-2 py-3">
                      <Label
                        label={t("election", { ns: "elections" }) + ":"}
                        className="text-sm"
                      />
                      <div className="border-slate-200 dark:border-zinc-800 dark:bg-zinc-900 max-w-fit rounded-full border bg-white p-1">
                        <List
                          options={PANELS.map((item) => item.name)}
                          icons={PANELS.map((item) => item.icon)}
                          current={data.toggle_index}
                          onChange={handleElectionTab}
                        />
                      </div>
                    </div>
                    <div className="dark:border-zinc-700 grid grid-cols-2 gap-2 border-y py-3">
                      <Label label={t("state") + ":"} className="text-sm" />
                      <Label
                        label={t("election_year", { ns: "elections" }) + ":"}
                        className="text-sm"
                      />
                      <StateDropdown
                        currentState={data.state}
                        onChange={(selected) => {
                          setData("state", selected.value);
                          TOGGLE_IS_DUN && setData("election_acronym", null);
                        }}
                        exclude={TOGGLE_IS_DUN ? NON_SE_STATE : []}
                        width="w-full"
                        anchor="bottom-10"
                      />
                      <Dropdown
                        width="w-full"
                        anchor="right-0 bottom-10"
                        placeholder={t("select_election", { ns: "elections" })}
                        options={TOGGLE_IS_PARLIMEN ? GE_OPTIONS : SE_OPTIONS}
                        selected={
                          TOGGLE_IS_PARLIMEN
                            ? GE_OPTIONS.find(
                                (e) => e.value === data.election_acronym,
                              )
                            : SE_OPTIONS.find(
                                (e) => e.value === data.election_acronym,
                              )
                        }
                        disabled={!data.state}
                        onChange={(selected) =>
                          setData("election_acronym", selected.value)
                        }
                      />
                    </div>
                  </div>
                  <div className="dark:border-washed-dark dark:bg-black flex w-full flex-col gap-2 border-t bg-white p-3">
                    <Button
                      className="btn-primary w-full justify-center"
                      onClick={() => {
                        setData("loading", true);
                        push(
                          `${routes.ELECTIONS}/${data.state}/${data.election_acronym}`,
                        );
                      }}
                    >
                      {t("filter")}
                    </Button>
                    <Button
                      className="btn w-full justify-center px-3 py-1.5"
                      onClick={close}
                    >
                      {t("close")}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </Modal>

          {/* Desktop */}
          <div
            ref={divRef}
            className="sticky top-16 z-20 mx-auto mt-3 hidden w-fit items-center gap-2 lg:flex"
          >
            <div className="max-w-fit rounded-full border border-otl-gray-200 bg-bg-white p-1">
              <List
                options={PANELS.map((item) => item.name)}
                icons={PANELS.map((item) => item.icon)}
                current={data.toggle_index}
                onChange={handleElectionTab}
              />
            </div>
            <StateDropdown
              currentState={data.state}
              onChange={(selected) => {
                if (TOGGLE_IS_PARLIMEN && data.election_acronym) {
                  setData("loading", true);
                  push(
                    `${routes.ELECTIONS}/${selected.value}/${data.election_acronym}`,
                  );
                } else setData("election_acronym", null);
                setData("state", selected.value);
              }}
              exclude={TOGGLE_IS_DUN ? NON_SE_STATE : []}
              width="w-fit"
              anchor="left"
            />
            <Dropdown
              anchor="left"
              placeholder={t("select_election", { ns: "elections" })}
              options={TOGGLE_IS_PARLIMEN ? GE_OPTIONS : SE_OPTIONS}
              selected={
                TOGGLE_IS_PARLIMEN
                  ? GE_OPTIONS.find((e) => e.value === data.election_acronym)
                  : SE_OPTIONS.find((e) => e.value === data.election_acronym)
              }
              onChange={(selected) => {
                setData("election_acronym", selected.value);
                setData("loading", true);
                push(`${routes.ELECTIONS}/${data.state}/${selected.value}`);
              }}
              disabled={!data.state}
            />
          </div>

          <Overview choropleth={choropleth} params={params} table={table} />
          <hr className="h-px w-full border-otl-gray-200"></hr>

          {/* View the full ballot for a specific seat */}
          <BallotSeat
            election={params.election}
            seats={seats}
            state={params.state}
          />
          <hr className="h-px w-full border-otl-gray-200"></hr>

          {/* Election analysis */}
          <ElectionAnalysis
            choropleth={choropleth}
            seats={seats}
            state={params.state}
            toggle={data.toggle_index}
          />
        </SectionGrid>
      </Container>
    </>
  );
};

export default ElectionExplorer;
