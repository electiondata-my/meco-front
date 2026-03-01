import { ComboBox, Container, ImageWithFallback } from "@components/index";
import SegmentTabs from "@components/Tabs/segment";
import SectionGrid from "@components/Section/section-grid";
import { ElectionType, SeatOptions } from "@dashboards/types";
import { useData } from "@hooks/useData";
import { useLanguage } from "@hooks/useLanguage";
import { useTranslation } from "@hooks/useTranslation";
import { ComboOptionProp } from "@components/Combobox/option";
import { OptionType } from "@lib/types";
import { routes } from "@lib/routes";
import { clx } from "@lib/helpers";
import { FunctionComponent } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import {
  MagnifyingGlassIcon,
  CheckIcon,
  ScaleIcon,
  ArrowRightIcon,
} from "@heroicons/react/20/solid";

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
  party_type: string;
};

interface HomeDashboardProps {
  selection: SeatOptions[];
  candidates: Record<"name" | "slug" | "c" | "w" | "l", string>[];
  parties: {
    party_uid: string;
    party: string;
    party_name_en: string;
    party_name_bm: string;
    type: string;
  }[];
}

const HomeDashboard: FunctionComponent<HomeDashboardProps> = ({
  selection,
  candidates,
  parties,
}) => {
  const { t } = useTranslation(["common", "seats", "candidates", "parties"]);
  const { language } = useLanguage();
  const { push } = useRouter();
  const isMalay = language?.startsWith("ms");

  const SEAT_OPTIONS: Array<
    Omit<OptionType, "contests" | "losses" | "wins"> & SeatOption
  > = selection.map(({ seat_name, slug, type }) => ({
    label: seat_name.concat(` (${t(type)})`),
    value: type + "_" + slug,
    state: seat_name.split(", ")[1],
    seat: seat_name.split(", ")[0],
    type,
  }));

  const CANDIDATE_OPTIONS: Array<OptionType> = candidates.map(
    ({ name, slug, c, w, l }) => ({
      label: `${name} (W${w}, L${l})`,
      value: slug,
      contests: Number(c),
      wins: Number(w),
      losses: Number(l),
    }),
  );

  const PARTY_OPTIONS: Array<ComboOptionProp<PartyOption>> = parties
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
      party_type: option.type,
    }));

  const TABS = [
    t("tab.seats", { ns: "home" }),
    t("tab.candidates", { ns: "home" }),
    t("tab.parties", { ns: "home" }),
    t("tab.elections", { ns: "home" }),
  ];

  const { data, setData } = useData({
    tab_index: 0,
    seat_value: "",
    candidate_value: "",
    party_value: "",
    loading: false,
  });

  return (
    <>
    <Container className="pt-4 pb-8 lg:pt-6 lg:pb-12">
      <SectionGrid className="items-start gap-3">
        <div className="mx-auto flex w-full max-w-[727px] flex-col gap-5">
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
                  ? SEAT_OPTIONS.find((e) => e.value === data.seat_value) ??
                    null
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
                keys: ["label", "name"],
              }}
              selected={
                data.candidate_value
                  ? CANDIDATE_OPTIONS.find(
                      (e) => e.value === data.candidate_value,
                    ) ?? null
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

          {data.tab_index === 2 && (
            <ComboBox<PartyOption>
              placeholder={t("search_party", { ns: "parties" })}
              image={(value: string) => {
                const opt = PARTY_OPTIONS.find((e) => e.value === value);
                const folder =
                  opt?.party_type === "coalition" ? "coalitions" : "parties";
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
                  option.party_type === "coalition" ? "coalitions" : "parties";
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
                        option.party_type === "coalition"
                          ? "border-blue-400 bg-blue-50/60 text-blue-600"
                          : "border-red-400 bg-red-50/60 text-red-600",
                      )}
                    >
                      {t(option.party_type, { ns: "parties" })}
                    </span>
                  </>
                );
              }}
              config={{
                keys: ["label", "party"],
                baseSort: (a: any, b: any) => {
                  if (a.item.party_type !== b.item.party_type) {
                    return a.item.party_type === "party" ? -1 : 1;
                  }
                  return a.item.party.localeCompare(b.item.party);
                },
              }}
              options={PARTY_OPTIONS}
              selected={
                data.party_value
                  ? PARTY_OPTIONS.find((e) => e.value === data.party_value) ??
                    null
                  : null
              }
              onChange={(selected) => {
                if (selected) {
                  setData("loading", true);
                  setData("party_value", selected.value);
                  push(`${routes.PARTIES}/${selected.value}/mys`).finally(() =>
                    setData("loading", false),
                  );
                } else setData("party_value", "");
              }}
            />
          )}
        </div>
      </SectionGrid>
    </Container>

    {/* Election data you can trust */}
    <Container className="py-16 lg:pb-[120px]">
      <SectionGrid className="gap-12">
        <h2 className="font-poppins text-center text-2xl font-semibold text-txt-black-900">
          {t("trust.title", { ns: "home" })}
        </h2>
        <div className="flex w-full max-w-[1000px] flex-col gap-4 lg:flex-row">
          {/* Card 1: Research */}
          <div className="flex flex-1 gap-4 rounded-xl border border-otl-gray-200 bg-gradient-to-br from-white to-[#FAFAFA] p-5">
            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-otl-gray-200 bg-white shadow-[0px_1px_3px_rgba(0,0,0,0.07)]">
              <MagnifyingGlassIcon className="h-5 w-5 text-green-700" />
              <CheckIcon className="absolute -right-1 -bottom-1 h-3 w-3 rounded-full bg-white text-green-700" />
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <h3 className="text-base font-semibold text-txt-black-900">
                  {t("trust.research.title", { ns: "home" })}
                </h3>
                <p className="text-sm leading-5 text-[#6B6B74]">
                  {t("trust.research.description", { ns: "home" })}
                </p>
              </div>
              <Link
                href="/research"
                className="flex items-center gap-1 text-sm font-medium text-red-700 hover:underline"
              >
                {t("trust.research.link", { ns: "home" })}
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 2: Neutral */}
          <div className="flex flex-1 gap-4 rounded-xl border border-otl-gray-200 bg-gradient-to-br from-white to-[#FAFAFA] p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-otl-gray-200 bg-white shadow-[0px_1px_3px_rgba(0,0,0,0.07)]">
              <ScaleIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-base font-semibold text-txt-black-900">
                {t("trust.neutral.title", { ns: "home" })}
              </h3>
              <p className="text-sm leading-5 text-[#6B6B74]">
                {t("trust.neutral.description", { ns: "home" })}
              </p>
            </div>
          </div>
        </div>
      </SectionGrid>
    </Container>
    </>
  );
};

export default HomeDashboard;
