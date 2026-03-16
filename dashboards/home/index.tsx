import {
  ComboBox,
  Container,
  ImageTheme,
  ImageWithFallback,
} from "@components/index";
import SegmentTabs from "@components/Tabs/segment";
import SectionGrid from "@components/Section/section-grid";
import { ElectionType, SeatOptions } from "@dashboards/types";
import { useData } from "@hooks/useData";
import { useLanguage } from "@hooks/useLanguage";
import { useTranslation } from "@hooks/useTranslation";
import { StateKeyByName, STATES } from "@lib/constants";
import { routes } from "@lib/routes";
import { clx } from "@lib/helpers";
import { FunctionComponent, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { ArrowRightIcon, ArrowUpRightIcon } from "@heroicons/react/20/solid";
import {
  BoltIcon,
  ClipboardDocumentCheckIcon,
  FlagIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import {
  RedelineationIcon,
  ScaleIcon,
  SearchCheckIcon,
  SeatsIcon,
} from "@icons/index";
import { DateTime } from "luxon";

const STATE_ORDER = STATES.reduce(
  (acc, s, i) => ({ ...acc, [s.key]: i }),
  {} as Record<string, number>,
);

/**
 * Home Dashboard
 * @overview Status: Live
 */

type SeatOption = {
  state: string;
  seat: string;
  type: ElectionType;
};

type PartyOption = {
  party_uid: string;
  party: string;
  party_name_en: string;
  party_name_bm: string;
  type: string;
};

type ElectionOption = {
  state: string;
  election: string;
  date: string;
};

type LatestOption = {
  title_en: string;
  title_bm: string;
  date: string;
  url: string;
  img_light: string;
  img_dark: string;
};

interface HomeDashboardProps {
  selection: SeatOptions[];
  candidates: Record<"name" | "slug" | "c" | "w" | "l", string>[];
  parties: PartyOption[];
  elections: ElectionOption[];
  latest: LatestOption[];
}

const HomeDashboard: FunctionComponent<HomeDashboardProps> = ({
  selection,
  candidates,
  parties,
  elections,
  latest,
}) => {
  const { t } = useTranslation([
    "common",
    "seats",
    "candidates",
    "parties",
    "elections",
  ]);
  const { language } = useLanguage();
  const { push } = useRouter();
  const isMalay = language?.startsWith("ms");

  const SEAT_OPTIONS = useMemo(
    () =>
      selection.map(({ seat_name, slug, type }) => ({
        label: seat_name.concat(` (${t(type)})`),
        value: type + "_" + slug,
        state: seat_name.split(", ")[1],
        seat: seat_name.split(", ")[0],
        type,
      })),
    [selection, t],
  );

  const CANDIDATE_OPTIONS = useMemo(
    () =>
      candidates.map(({ name, slug, c, w, l }) => ({
        label: `${name} (W${w}, L${l})`,
        value: slug,
        contests: Number(c),
        wins: Number(w),
        losses: Number(l),
      })),
    [candidates],
  );

  const ELECTION_OPTIONS = useMemo(
    () =>
      elections
        .filter(
          (option) =>
            !option.election.startsWith("GE") || option.state === "Malaysia",
        )
        .map((option) => {
          const isGE = option.election.startsWith("GE");
          const year = DateTime.fromISO(option.date).toFormat("yyyy");
          const electionDisplay = isMalay
            ? option.election.replace(/^GE/, "PRU").replace(/^SE/, "PRN")
            : option.election;
          const label = isGE
            ? `Malaysia ${electionDisplay} (${year})`
            : `${option.state} ${electionDisplay} (${year})`;
          return {
            label,
            value: option.election,
            state: StateKeyByName[option.state] ?? option.state,
            stateName: option.state,
            election: option.election,
            date: option.date,
            isGE,
          };
        })
        .sort((a, b) => {
          // GE (Malaysia) first, reverse chronological
          if (a.isGE && b.isGE) {
            return new Date(b.date).getTime() - new Date(a.date).getTime();
          }
          if (a.isGE) return -1;
          if (b.isGE) return 1;
          // State elections: by state order, then reverse chronological within state
          const orderA = STATE_ORDER[a.state] ?? 999;
          const orderB = STATE_ORDER[b.state] ?? 999;
          if (orderA !== orderB) return orderA - orderB;
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }),
    [elections, isMalay],
  );

  const PARTY_OPTIONS = useMemo(
    () =>
      parties
        .slice()
        .sort((a, b) => {
          if (a.type !== b.type) return a.type === "party" ? -1 : 1;
          return a.party.localeCompare(b.party);
        })
        .map((option) => ({
          label: `${option.party} (${isMalay ? option.party_name_bm : option.party_name_en})`,
          value: option.party_uid,
          party_uid: option.party_uid,
          party: option.party,
          party_name_en: option.party_name_en,
          party_name_bm: option.party_name_bm,
          type: option.type,
        })),
    [parties, isMalay],
  );

  const TABS = [
    t("tab.seats", { ns: "home" }),
    t("tab.candidates", { ns: "home" }),
    t("tab.parties", { ns: "home" }),
    t("tab.elections", { ns: "home" }),
  ];

  const DASHBOARDS = [
    {
      title: t("explore.seats.title", { ns: "home" }),
      description: t("explore.seats.description", { ns: "home" }),
      link: routes.SEATS,
      icon: <SeatsIcon className="size-8 text-txt-danger" />,
    },
    {
      title: t("explore.candidates.title", { ns: "home" }),
      description: t("explore.candidates.description", { ns: "home" }),
      link: routes.CANDIDATES,
      icon: <UserIcon className="size-8 text-txt-danger" />,
    },
    {
      title: t("explore.parties.title", { ns: "home" }),
      description: t("explore.parties.description", { ns: "home" }),
      link: routes.PARTIES,
      icon: <FlagIcon className="size-8 text-txt-danger" />,
    },
    {
      title: t("explore.byelections.title", { ns: "home" }),
      description: t("explore.byelections.description", { ns: "home" }),
      link: routes.BYELECTIONS,
      icon: <BoltIcon className="size-8 text-txt-danger" />,
    },
    {
      title: t("explore.elections.title", { ns: "home" }),
      description: t("explore.elections.description", { ns: "home" }),
      link: routes.ELECTIONS,
      icon: <ClipboardDocumentCheckIcon className="size-8 text-txt-danger" />,
    },
    {
      title: t("explore.redelineation.title", { ns: "home" }),
      description: t("explore.redelineation.description", { ns: "home" }),
      link: routes.REDELINEATION,
      icon: <RedelineationIcon className="size-8 text-txt-danger" />,
    },
  ];

  const { data, setData } = useData({
    tab_index: 0,
    seat_value: "",
    candidate_value: "",
    party_value: "",
    election_value: "",
    loading: false,
  });

  return (
    <>
      <Container className="pb-8 pt-4 lg:pb-12 lg:pt-6">
        <SectionGrid className="items-start gap-3">
          <div className="mx-auto flex w-full max-w-[727px] flex-col gap-6">
            <SegmentTabs
              options={TABS}
              current={data.tab_index}
              onChange={(index) => setData("tab_index", index)}
              className="self-center"
            />
            {data.tab_index === 0 && (
              <ComboBox<SeatOption>
                placeholder={t("search_seat", { ns: "seats" })}
                options={SEAT_OPTIONS}
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
                format={(option) => (
                  <>
                    <span>{`${option.seat}, ${option.state} `}</span>
                    <span className="text-body-sm text-txt-black-500">
                      {"(" + t(option.type) + ")"}
                    </span>
                  </>
                )}
                selected={
                  data.seat_value
                    ? (SEAT_OPTIONS.find((e) => e.value === data.seat_value) ??
                      null)
                    : null
                }
                onChange={(selected) => {
                  if (selected) {
                    setData("loading", true);
                    setData("seat_value", selected.value);
                    const [type, seat] = selected.value.split("_");
                    push(`${routes.SEATS}/${type}/${seat}`).finally(() =>
                      setData("loading", false),
                    );
                  } else setData("seat_value", "");
                }}
              />
            )}
            {data.tab_index === 1 && (
              <ComboBox
                placeholder={t("search_candidate", { ns: "candidates" })}
                options={CANDIDATE_OPTIONS}
                config={{
                  baseSort: (a: any, b: any) => {
                    if ((a.item.contests ?? 0) === (b.item.contests ?? 0)) {
                      return (b.item.wins ?? 0) - (a.item.wins ?? 0);
                    }
                    return (b.item.contests ?? 0) - (a.item.contests ?? 0);
                  },
                  keys: ["label"],
                }}
                selected={
                  data.candidate_value
                    ? (CANDIDATE_OPTIONS.find(
                        (e) => e.value === data.candidate_value,
                      ) ?? null)
                    : null
                }
                onChange={(selected) => {
                  if (selected) {
                    setData("loading", true);
                    setData("candidate_value", selected.value);
                    push(`${routes.CANDIDATES}/${selected.value}`).finally(() =>
                      setData("loading", false),
                    );
                  } else setData("candidate_value", "");
                }}
              />
            )}
            {data.tab_index === 3 && (
              <ComboBox<ElectionOption>
                placeholder={t("search_election", { ns: "home" })}
                options={ELECTION_OPTIONS}
                config={{
                  keys: ["label", "election", "stateName"],
                  baseSort: (a: any, b: any) => {
                    const x = a.item;
                    const y = b.item;
                    if (x.isGE && y.isGE)
                      return (
                        new Date(y.date).getTime() - new Date(x.date).getTime()
                      );
                    if (x.isGE) return -1;
                    if (y.isGE) return 1;
                    const orderA = STATE_ORDER[x.state] ?? 999;
                    const orderB = STATE_ORDER[y.state] ?? 999;
                    if (orderA !== orderB) return orderA - orderB;
                    return (
                      new Date(y.date).getTime() - new Date(x.date).getTime()
                    );
                  },
                }}
                selected={
                  data.election_value
                    ? (ELECTION_OPTIONS.find(
                        (e) => e.value === data.election_value,
                      ) ?? null)
                    : null
                }
                onChange={(selected) => {
                  if (selected) {
                    setData("loading", true);
                    setData("election_value", selected.value);
                    push(
                      `${routes.ELECTIONS}/${selected.state}/${selected.election}`,
                    ).finally(() => setData("loading", false));
                  } else setData("election_value", "");
                }}
              />
            )}
            {data.tab_index === 2 && (
              <ComboBox<PartyOption>
                placeholder={t("search_party", { ns: "parties" })}
                image={(value: string) => {
                  const opt = PARTY_OPTIONS.find((e) => e.value === value);
                  const folder =
                    opt?.type === "coalition" ? "coalitions" : "parties";
                  return (
                    <div className="flex h-auto max-h-8 w-8 justify-center self-center">
                      <ImageWithFallback
                        className="border border-otl-gray-200"
                        src={`/static/images/${folder}/${value}.png`}
                        width={28}
                        height={18}
                        alt={value}
                        style={{
                          width: "auto",
                          maxWidth: "28px",
                          height: "auto",
                          maxHeight: "28px",
                        }}
                      />
                    </div>
                  );
                }}
                format={(option) => {
                  const folder =
                    option.type === "coalition" ? "coalitions" : "parties";
                  return (
                    <>
                      <div className="flex h-auto w-7 shrink-0 items-center justify-center">
                        <ImageWithFallback
                          className="border border-otl-gray-200"
                          src={`/static/images/${folder}/${option.value}.png`}
                          width={28}
                          height={18}
                          alt={option.party}
                          style={{
                            width: "auto",
                            maxWidth: "28px",
                            height: "auto",
                            maxHeight: "18px",
                          }}
                        />
                      </div>
                      <span className="grow truncate">{option.label}</span>
                      <span
                        className={clx(
                          "ml-auto shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium",
                          option.type === "coalition"
                            ? "border-blue-400 bg-blue-50/60 text-blue-600"
                            : "border-red-400 bg-red-50/60 text-red-600",
                        )}
                      >
                        {t(option.type, { ns: "parties" })}
                      </span>
                    </>
                  );
                }}
                config={{
                  keys: ["label", "party"],
                  baseSort: (a: any, b: any) => {
                    if (a.item.type !== b.item.type) {
                      return a.item.type === "party" ? -1 : 1;
                    }
                    return a.item.party.localeCompare(b.item.party);
                  },
                }}
                options={PARTY_OPTIONS}
                selected={
                  data.party_value
                    ? (PARTY_OPTIONS.find(
                        (e) => e.value === data.party_value,
                      ) ?? null)
                    : null
                }
                onChange={(selected) => {
                  if (selected) {
                    setData("loading", true);
                    setData("party_value", selected.value);
                    push(`${routes.PARTIES}/${selected.value}/mys`).finally(
                      () => setData("loading", false),
                    );
                  } else setData("party_value", "");
                }}
              />
            )}
          </div>
        </SectionGrid>

        <SectionGrid className="gap-6 py-8 lg:gap-12 lg:py-16">
          <h2 className="text-center font-poppins text-2xl font-semibold">
            {t("latest.title", { ns: "home" })}
          </h2>
          <div className="grid w-full max-w-[1000px] grid-cols-2 gap-3 lg:grid-cols-[repeat(3,minmax(250px,1fr))] lg:gap-8">
            {latest.map((item) => (
              <div
                key={item.title_en}
                className="group flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-lg border bg-bg-dialog hover:border-bg-danger-200 hover:ring-[3px] hover:ring-fr-danger dark:border-otl-gray-200"
                onClick={() => {
                  if (!item.url) return;
                  item.url.startsWith("/")
                    ? push(item.url)
                    : window.open(item.url, "_blank");
                }}
              >
                <div className="relative aspect-[1200/630] w-full shrink-0">
                  <ImageTheme
                    lightSrc={item.img_light}
                    darkSrc={item.img_dark}
                    alt={isMalay ? item.title_bm : item.title_en}
                    fill={true}
                    sizes="(max-width: 1024px) 50vw, 312px"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3 lg:p-4.5">
                  <p className="line-clamp-2 flex items-start gap-1 text-body-md font-semibold">
                    {isMalay ? item.title_bm : item.title_en}
                    <ArrowUpRightIcon className="size-5 shrink-0 text-txt-black-500 opacity-0 transition-[opacity_transform] duration-0 group-hover:translate-x-1 group-hover:opacity-100 group-hover:duration-300" />
                  </p>
                  <div className="relative overflow-hidden">
                    <p className="text-body-sm text-txt-black-500 transition-transform group-hover:-translate-y-full">
                      {DateTime.fromISO(item.date).toFormat("d MMM yyyy")}
                    </p>
                    <p className="absolute inset-x-0 bottom-0 translate-y-full text-body-sm font-medium text-txt-danger transition-transform group-hover:translate-y-0 group-hover:duration-300">
                      {t("latest.click_to_explore", { ns: "home" })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionGrid>
        <SectionGrid className="gap-4 py-8 lg:gap-12 lg:py-16">
          <h2 className="text-center font-poppins text-2xl font-semibold">
            {t("explore.title", { ns: "home" })}
          </h2>
          <div className="grid max-w-[1000px] divide-y divide-otl-gray-200 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-4 lg:divide-y-0">
            {DASHBOARDS.map((item) => (
              <div
                key={item.link}
                className="group cursor-pointer overflow-hidden lg:rounded-lg lg:bg-bg-white lg:text-center"
                onClick={() => push(item.link)}
              >
                <div className="flex flex-row items-center gap-4 py-3 lg:flex-col lg:items-center lg:gap-4 lg:p-4.5">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-bg-danger-100 lg:size-[54px]">
                    {item.icon}
                  </div>
                  <div className="flex-1 lg:flex-none">
                    <p className="text-body-md font-semibold">{item.title}</p>
                    <p className="text-body-sm text-txt-black-500">
                      {item.description}
                    </p>
                  </div>
                  <ArrowRightIcon className="size-4 shrink-0 text-txt-black-500 lg:hidden" />

                  <div className="relative hidden w-full overflow-hidden lg:block">
                    <p className="invisible text-body-sm font-medium">
                      {t("latest.click_to_explore", { ns: "home" })}
                    </p>
                    <p className="absolute inset-x-0 bottom-0 translate-y-full whitespace-nowrap text-body-sm font-medium text-txt-danger transition-transform group-hover:translate-y-0 group-hover:duration-300">
                      {t("latest.click_to_explore", { ns: "home" })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SectionGrid>
        {/* Election data you can trust */}
        <SectionGrid className="gap-6 pb-8 pt-4 lg:gap-12 lg:pb-[120px]">
          <h2 className="text-center font-poppins text-2xl font-semibold">
            {t("trust.title", { ns: "home" })}
          </h2>
          <div className="flex w-full max-w-[1000px] flex-col gap-4 lg:flex-row lg:gap-8">
            {/* Card 1: Research */}
            <div className="flex flex-1 flex-col gap-4 rounded-lg border border-otl-gray-200 bg-gradient-to-r from-bg-dialog to-bg-gray-50 p-5 lg:gap-6 lg:p-[30px]">
              <div className="relative flex size-10 shrink-0 items-center justify-center rounded-lg border border-otl-gray-200 shadow-button lg:size-[52px]">
                <SearchCheckIcon />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-body-lg font-semibold">
                  {t("trust.research.title", { ns: "home" })}
                </h3>
                <p className="text-sm leading-5 text-txt-black-500">
                  {t("trust.research.description", { ns: "home" })}
                </p>
              </div>
              <Link
                href="/research"
                className="flex items-center gap-1 text-sm font-medium text-txt-danger hover:underline"
              >
                {t("trust.research.link", { ns: "home" })}
                <ArrowRightIcon className="size-4" />
              </Link>
            </div>

            {/* Card 2: Neutral */}
            <div className="flex flex-1 flex-col gap-4 rounded-lg border border-otl-gray-200 bg-gradient-to-r from-bg-dialog to-bg-gray-50 p-5 lg:gap-6 lg:p-[30px]">
              <div className="relative flex size-10 shrink-0 items-center justify-center rounded-lg border border-otl-gray-200 shadow-button lg:size-[52px]">
                <ScaleIcon />
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-body-lg font-semibold">
                  {t("trust.neutral.title", { ns: "home" })}
                </h3>
                <p className="text-sm leading-5 text-txt-black-500">
                  {t("trust.neutral.description", { ns: "home" })}
                </p>
              </div>
              <Link
                href="/about"
                className="flex items-center gap-1 text-sm font-medium text-txt-danger hover:underline"
              >
                {t("trust.neutral.link", { ns: "home" })}
                <ArrowRightIcon className="size-4" />
              </Link>
            </div>
          </div>
        </SectionGrid>
      </Container>
    </>
  );
};

export default HomeDashboard;
