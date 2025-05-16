import {
  BaseResult,
  ElectionResource,
  ElectionType,
  Seat,
  SeatOptions,
} from "./types";
import FullResults, { Result } from "@components/Election/FullResults";
import { generateSchema } from "@lib/schema/election-explorer";
import { getNew } from "@lib/api";
import {
  At,
  ComboBox,
  Container,
  Hero,
  Section,
  toast,
} from "@components/index";
import { useCache } from "@hooks/useCache";
import { useData } from "@hooks/useData";
import { useTranslation } from "@hooks/useTranslation";
import { OptionType } from "@lib/types";
import dynamic from "next/dynamic";
import { FunctionComponent, useEffect } from "react";
import { useRouter } from "next/router";

/**
 * Seats
 * @overview Status: Live
 */

const ElectionTable = dynamic(
  () => import("@components/Election/ElectionTable"),
  {
    ssr: false,
  }
);
const Toast = dynamic(() => import("@components/Toast"), { ssr: false });

interface ElectionSeatsProps extends ElectionResource<Seat> {
  selection: Array<SeatOptions & { slug: string }>;
}

type SeatOption = {
  state: string;
  seat: string;
  type: ElectionType;
};

const ElectionSeatsDashboard: FunctionComponent<ElectionSeatsProps> = ({
  elections,
  last_updated,
  params,
  selection,
}) => {
  const { t } = useTranslation(["common", "home"]);
  const { cache } = useCache();

  const SEAT_OPTIONS: Array<OptionType & SeatOption> = selection.map(
    ({ seat_name, slug, type }) => ({
      label: seat_name.concat(` (${t(type)})`),
      value: type + "_" + slug,
      state: seat_name.split(", ")[1],
      seat: seat_name.split(", ")[0],
      type: type,
    })
  );

  const DEFAULT_SEAT =
    params.type && params.seat_name
      ? `${params.type}_${params.seat_name}`
      : "parlimen_kuala-selangor-selangor";

  const SEAT_OPTION = SEAT_OPTIONS.find((e) => e.value === DEFAULT_SEAT);

  const { data, setData } = useData({
    seat_value: null,
    loading: false,
    elections: elections,
  });

  const fetchFullResult = async (
    election: string,
    seat: string
  ): Promise<Result<BaseResult[]>> => {
    const identifier = `${election}_${seat}`;
    return new Promise(async (resolve) => {
      if (cache.has(identifier)) return resolve(cache.get(identifier));
      const results = await Promise.allSettled([
        getNew(`/results/${encodeURIComponent(seat)}/${election}.json`),
        getNew(`/results/${encodeURIComponent(seat)}/${election}-summary.json`),
      ]).catch((e) => {
        toast.error(t("toast.request_failure"), t("toast.try_again"));
        throw new Error("Invalid seat. Message: " + e);
      });

      const [{ data: ballot }, { data: ballot_summary }] = results.map((e) => {
        if (e.status === "rejected") return {};
        else return e.value.data;
      });
      const summary = ballot_summary[0];

      const result: Result<BaseResult[]> = {
        data: ballot,
        votes: [
          {
            x: "majority",
            abs: summary.majority,
            perc: summary.majority_perc,
          },
          {
            x: "voter_turnout",
            abs: summary.voter_turnout,
            perc: summary.voter_turnout_perc,
          },
          {
            x: "rejected_votes",
            abs: summary.votes_rejected,
            perc: summary.votes_rejected_perc,
          },
        ],
      };
      cache.set(identifier, result);
      resolve(result);
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
      key: (item) => item,
      id: "full_result",
      header: "",
      cell: ({ row }) => (
        <FullResults
          options={data.elections}
          currentIndex={row.index}
          onChange={(option: Seat) =>
            fetchFullResult(option.election_name, option.seat)
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

  const { events, push } = useRouter();
  useEffect(() => {
    const finishLoading = () => {
      setData("loading", false);
      setData("seat_value", `${params.type}_${params.seat_name}`);
    };
    events.on("routeChangeComplete", finishLoading);
    return () => events.off("routeChangeComplete", finishLoading);
  }, [params]);

  return (
    <>
      <Toast />
      <Hero
        background="red"
        category={[t("hero.category", { ns: "home" }), "text-danger"]}
        header={[t("hero.header", { ns: "home" })]}
        description={[t("hero.description", { ns: "home" })]}
      />

      <Container>
        <Section>
          <div className="xl:grid xl:grid-cols-12">
            <div className="xl:col-span-10 xl:col-start-2">
              <h4 className="text-center">{t("header", { ns: "home" })}</h4>
              <div className="mx-auto w-full py-6 sm:w-[500px]">
                <ComboBox<SeatOption>
                  placeholder={t("search_seat", { ns: "home" })}
                  options={SEAT_OPTIONS}
                  config={{
                    baseSort: (a, b) => {
                      if (a.item.seat === b.item.seat) {
                        return a.item.type === "parlimen" ? -1 : 1;
                      } else {
                        return String(a.item.seat).localeCompare(
                          String(b.item.seat)
                        );
                      }
                    },
                    keys: ["label", "seat", "state", "type"],
                  }}
                  format={(option) => (
                    <>
                      <span>{`${option.seat}, ${option.state} `}</span>
                      <span className="text-zinc-500">
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
                      push(`/${type}/${seat}`)
                        .catch((e) => {
                          t("toast.request_failure"),
                            toast.error("toast.try_again");
                        })
                        .finally(() => setData("loading", false));
                    } else setData("seat_value", selected);
                  }}
                />
              </div>
              <ElectionTable
                title={
                  <h5 className="py-6">
                    {t("title", { ns: "home" })}
                    <span className="text-primary">{SEAT_OPTION?.label}</span>
                  </h5>
                }
                data={elections}
                columns={seat_schema}
                isLoading={data.loading}
              />
            </div>
          </div>
        </Section>
      </Container>
    </>
  );
};

export default ElectionSeatsDashboard;
