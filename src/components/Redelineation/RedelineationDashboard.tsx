import {
  FC,
  Fragment,
  FunctionComponent,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import Map, {
  AttributionControl,
  Layer,
  MapMouseEvent,
  MapRef,
  MapProvider,
  Popup,
  Source,
  useMap,
  ViewState,
  ViewStateChangeEvent,
} from "react-map-gl/mapbox";
import { Root, Thumb, Track } from "@radix-ui/react-slider";
import { GeoJSONFeature } from "mapbox-gl";
import {
  EyeIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
} from "@heroicons/react/20/solid";
import maxBy from "lodash/maxBy";
import minBy from "lodash/minBy";
import { clx, numFormat, seatSlug } from "@lib/helpers";

const MAPBOX_LIGHT_STYLE = "mapbox://styles/mapbox/light-v11";
const MAPBOX_DARK_STYLE = "mapbox://styles/mapbox/dark-v11";
import Container from "@components/Container";
import SectionGrid from "@components/Section/section-grid";
import Dropdown from "@components/Dropdown";
import { useData } from "@hooks/useData";
import {
  Drawer,
  DrawerContent,
  DrawerClose,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerFooter,
} from "@components/drawer";

// ── Types ─────────────────────────────────────────────────────────────────────

type ElectionType = "parlimen" | "dun";
type Region = "peninsular" | "sabah" | "sarawak";
type ToggleState = "old" | "new";

type RedelineationSeatNew = {
  seat_new: string;
  state: string;
  center: [number, number];
  zoom: number;
  seat_old: string[];
  lineage: { seat_new: string; parent: string; perc_from_parent: number }[];
};

type RedelineationSeatOld = {
  seat_old: string;
  seat_new: string[];
  state: string;
  center: [number, number];
  zoom: number;
  lineage: { seat_old: string; child: string; perc_to_child: number }[];
};

type RedelineationData = {
  map_new: string;
  map_old: string;
  new: RedelineationSeatNew[];
  old: RedelineationSeatOld[];
};

type YearOptions = Record<string, string[]>;

type SeatOption = {
  value: string;
  label: string;
  center: [number, number];
  zoom: number;
  state: string;
};

// ── Translation helper ────────────────────────────────────────────────────────

function tFrom(
  dict: Record<string, any>,
  key: string,
  vars?: Record<string, string | number>,
): string {
  const val = key.split(".").reduce((o: any, k) => o?.[k], dict) ?? key;
  return vars
    ? String(val).replace(/\{\{(\w+)\}\}/g, (_, k) => String(vars[k] ?? _))
    : String(val);
}

// ── Theme hook ────────────────────────────────────────────────────────────────

function useDarkMode(): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    const handler = (e: Event) => {
      setDark((e as CustomEvent).detail === "dark");
    };
    window.addEventListener("theme-change", handler);
    return () => window.removeEventListener("theme-change", handler);
  }, []);
  return dark;
}

// ── URL state helpers ─────────────────────────────────────────────────────────

function readParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    level: (p.get("level") ?? "parlimen") as ElectionType,
    type: (p.get("type") ?? "new") as ToggleState,
    seat: p.get("seat") ?? null,
  };
}

function pushParams(params: {
  level: ElectionType;
  type: ToggleState;
  seat: string | null;
}) {
  const p = new URLSearchParams();
  p.set("level", params.level);
  p.set("type", params.type);
  if (params.seat) p.set("seat", params.seat);
  history.pushState(null, "", `${window.location.pathname}?${p.toString()}`);
}

// ── Region default view states ────────────────────────────────────────────────

const REGION_VIEW_STATE: Record<Region, ViewState> = {
  peninsular: {
    longitude: 102.5,
    latitude: 4.5,
    zoom: 5.6,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  },
  sabah: {
    longitude: 117.0,
    latitude: 5.5,
    zoom: 6.5,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  },
  sarawak: {
    longitude: 113.5,
    latitude: 2.5,
    zoom: 6.2,
    bearing: 0,
    pitch: 0,
    padding: { top: 0, bottom: 0, left: 0, right: 0 },
  },
};

const SHADED_COLOR_INDEX = [
  "rgba(255, 194, 194, 0.5)",
  "rgba(255, 241, 166, 0.5)",
  "rgba(185, 255, 255, 0.5)",
  "rgba(162, 255, 162, 0.5)",
  "rgba(206, 191, 255, 0.5)",
  "rgba(255, 206, 157, 0.5)",
  "rgba(255, 191, 255, 0.5)",
  "rgba(206, 191, 255, 0.5)",
];

// ── Seat combobox ────────────────────────────────────────────────────────────

interface SeatComboboxProps {
  options: SeatOption[];
  placeholder: string;
  selected?: SeatOption;
  onChange: (selected: SeatOption) => void;
}

const SeatCombobox: FC<SeatComboboxProps> = ({
  options,
  placeholder,
  selected,
  onChange,
}) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    setQuery(selected?.label ?? "");
  }, [selected]);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div ref={wrapperRef} className="relative w-full text-left">
      <div className="flex items-center overflow-hidden rounded-full border border-otl-gray-200 bg-bg-white shadow-button focus-within:border-otl-danger-300 focus-within:ring focus-within:ring-otl-danger-200">
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          spellCheck={false}
          className="w-full border-0 bg-transparent py-2.5 pl-5 pr-2 text-body-md text-txt-black-700 outline-none placeholder:text-txt-black-500"
          value={query}
          placeholder={placeholder}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear seat"
            className="mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-txt-black-500 hover:text-txt-black-700"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          aria-label="Search"
          className="mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-danger-400 to-danger-600 text-white"
          onClick={() => {
            inputRef.current?.focus();
            setOpen(true);
          }}
        >
          <MagnifyingGlassIcon className="size-4" />
        </button>
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-60 overflow-y-auto rounded-xl border border-otl-gray-200 bg-bg-white py-1 shadow-lg">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className="block w-full truncate px-4 py-2 text-left text-sm text-txt-black-700 hover:bg-bg-black-50"
                onClick={() => {
                  setQuery(option.label);
                  onChange(option);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            ))
          ) : (
            <p className="px-4 py-2 text-sm italic text-txt-black-500">
              No results
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const AttributionText: FC<{ children: string }> = ({ children }) => {
  const match = children.match(/^(.*)\[([^\]]+)\]\(([^)]+)\)(.*)$/);
  if (!match) return <>{children}</>;

  return (
    <>
      {match[1]}
      <a
        className="underline underline-offset-2 hover:text-txt-black-700"
        href={match[3]}
        rel="noreferrer"
        target="_blank"
      >
        {match[2]}
      </a>
      {match[4]}
    </>
  );
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface DashboardProps {
  area: string;
  year: string;
  yearOptions: YearOptions;
  apiBaseUrl: string;
  mapboxToken: string;
  mapboxAccount: string;
  locale: string;
  translations: Record<string, Record<string, any>>;
}

// ── Main dashboard (wrapped in MapProvider) ───────────────────────────────────

const RedelineationDashboard: FunctionComponent<DashboardProps> = (props) => {
  return (
    <MapProvider>
      <DashboardInner {...props} />
    </MapProvider>
  );
};

// ── Inner dashboard ───────────────────────────────────────────────────────────

const DashboardInner: FunctionComponent<DashboardProps> = ({
  area,
  year,
  yearOptions,
  apiBaseUrl,
  mapboxToken,
  mapboxAccount,
  translations,
}) => {
  const r = (key: string, vars?: Record<string, string | number>) =>
    tFrom(translations.redelineation, key, vars);
  const c = (key: string) => tFrom(translations.common, key);

  const [level, setLevel] = useState<ElectionType>("parlimen");
  const [toggleState, setToggleState] = useState<ToggleState>("new");
  const [seatValue, setSeatValue] = useState<string>("");
  const [data, setData] = useState<RedelineationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [views, setViews] = useState<number | null>(null);
  const [viewsLoading, setViewsLoading] = useState(true);

  useEffect(() => {
    const token = import.meta.env.PUBLIC_TINYBIRD_TOKEN;
    const baseUrl = import.meta.env.PUBLIC_API_URL_TB;
    fetch(
      `${baseUrl}/v0/pipes/views_by_page.json?token=${token}&page_id=/redelineation`,
    )
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((json) => setViews(json?.data?.[0]?.hits ?? null))
      .catch(() => setViews(null))
      .finally(() => setViewsLoading(false));
  }, []);

  // Read initial state from URL on mount
  useEffect(() => {
    const params = readParams();
    setLevel(params.level);
    setToggleState(params.type);
    if (params.seat) {
      // seat slug → actual seat name will be resolved after data loads
      _pendingSeatSlug.current = params.seat;
    }
  }, []);

  const _pendingSeatSlug = useRef<string | null>(null);

  // Fetch data whenever area, year, or level changes
  useEffect(() => {
    setLoading(true);
    fetch(`${apiBaseUrl}/redelineation/${area}_${year}_${level}.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json: RedelineationData) => {
        setData(json);
        // Resolve pending seat slug from URL
        const pending = _pendingSeatSlug.current;
        if (pending) {
          _pendingSeatSlug.current = null;
          const toggle = toggleState;
          const seats = toggle === "new" ? json.new : json.old;
          const found = seats.find(
            (s: any) => seatSlug(s[`seat_${toggle}`]) === pending,
          ) as any;
          if (found) setSeatValue(found[`seat_${toggle}`]);
          else setSeatValue((seats[0] as any)?.[`seat_${toggle}`] ?? "");
        } else {
          // Keep existing seat value if it exists in the new data, else pick first
          const toggle = toggleState;
          const seats = toggle === "new" ? json.new : json.old;
          const exists = seats.some(
            (s: any) => s[`seat_${toggle}`] === seatValue,
          );
          if (!exists) setSeatValue((seats[0] as any)?.[`seat_${toggle}`] ?? "");
        }
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [area, year, level, apiBaseUrl]);

  const { redelineation_map } = useMap();

  const currentSeats = data
    ? toggleState === "new"
      ? data.new
      : data.old
    : [];

  const currentSeat = currentSeats.find(
    (s: any) => s[`seat_${toggleState}`] === seatValue,
  ) as any;

  const dropdown = currentSeats.map((s: any) => ({
    value: s[`seat_${toggleState}`] as string,
    label: `${s[`seat_${toggleState}`]}, ${s.state}` as string,
    center: s.center as [number, number],
    zoom: s.zoom as number,
    state: s.state as string,
  }));

  const new_year = data?.map_new.split("_").find((p) => /^\d{4}$/.test(p)) ?? "";
  const old_year = data?.map_old.split("_").find((p) => /^\d{4}$/.test(p)) ?? "";

  const handleToggleChange = (value: ToggleState) => {
    setToggleState(value);
    // Find the corresponding seat in the new toggle direction
    const newSeatValue = currentSeat
      ? ((currentSeat[`seat_${value}`] as string[] | string | undefined) ?? "")
      : "";
    const resolved = Array.isArray(newSeatValue)
      ? newSeatValue[0] ?? ""
      : newSeatValue;
    setSeatValue(resolved);
    pushParams({ level, type: value, seat: resolved ? seatSlug(resolved) : null });
    if (redelineation_map && currentSeat) {
      redelineation_map.flyTo({
        center: currentSeat.center,
        zoom: currentSeat.zoom,
        duration: 2000,
      });
    }
  };

  const handleSeatChange = (selected: (typeof dropdown)[0]) => {
    setSeatValue(selected.value);
    pushParams({ level, type: toggleState, seat: seatSlug(selected.value) });
    if (redelineation_map) {
      redelineation_map.flyTo({
        center: selected.center,
        zoom: selected.zoom,
        duration: 1500,
      });
    }
  };

  const handleLevelChange = (newLevel: ElectionType) => {
    setLevel(newLevel);
    // Clear seat - will be resolved after data reloads
    setSeatValue("");
    _pendingSeatSlug.current = null;
    const p = new URLSearchParams();
    p.set("level", newLevel);
    p.set("type", toggleState);
    history.pushState(null, "", `${window.location.pathname}?${p.toString()}`);
  };

  const navigateToAreaYear = (newArea: string, newYear: string) => {
    const locale = window.location.pathname.startsWith("/ms-MY")
      ? "/ms-MY"
      : "";
    const p = new URLSearchParams();
    p.set("level", level);
    p.set("type", toggleState);
    window.location.href = `${locale}/redelineation/${newArea}-${newYear}?${p.toString()}`;
  };

  return (
    <>
      {/* ─── HERO ─── */}
      <Container
        as="section"
        background="bg-gradient-radial from-bg-danger-100 to-bg-white"
        className="relative"
      >
        <SectionGrid>
          <div className="flex max-w-[727px] flex-col items-center justify-center space-y-4 pb-8 pt-16 lg:space-y-6">
            <h3 className="text-center text-body-xs font-semibold uppercase leading-5 tracking-[0.1em] text-txt-danger lg:text-start lg:text-body-lg">
              {r("hero.category")}
            </h3>
            <h1 className="text-center font-heading text-heading-sm font-semibold text-txt-black-900 lg:text-start lg:text-heading-md">
              {r("hero.header")}
            </h1>
            <p className="w-full whitespace-pre-line text-center text-body-sm text-txt-black-700 lg:text-body-md">
              {r("hero.description")}
            </p>
            <p className="flex gap-0.5 text-body-sm text-txt-black-500">
              <EyeIcon className="h-4.5 w-4.5 self-center" />
              {viewsLoading
                ? "..."
                : views !== null
                  ? `${numFormat(views, "standard")} ${views === 1 ? c("views_one") : c("views_other")}`
                  : "---"}
            </p>
          </div>
        </SectionGrid>
      </Container>

      {/* ─── FILTERS ─── */}
      <RedelineationFilters
        area={area}
        year={year}
        level={level}
        yearOptions={yearOptions}
        translations={translations}
        onLevelChange={handleLevelChange}
        onAreaYearChange={navigateToAreaYear}
        c={c}
        r={r}
      />

      {/* ─── BEFORE/AFTER MAP ─── */}
      {data && (
        <RedelineationBeforeAfterMap
          election_type={level}
          map_new={data.map_new}
          map_old={data.map_old}
          new_year={new_year}
          old_year={old_year}
          type={area}
          mapboxToken={mapboxToken}
          mapboxAccount={mapboxAccount}
          r={r}
        />
      )}

      {/* ─── CONSTITUENCY REDISTRIBUTION ─── */}
      <Container className="gap-8 pb-8 pt-36 lg:gap-16 lg:pb-16 lg:pt-20">
        <SectionGrid>
          <div className="mx-auto w-full space-y-6">
            <h2 className="mx-auto max-w-[727px] text-center font-heading text-heading-2xs font-semibold">
              {r("constituency_redistribution")}
            </h2>

            <div className="space-y-6 lg:space-y-8">
              {/* Toggle tabs */}
              <div className="mx-auto flex h-8 w-fit items-center rounded-lg bg-bg-washed p-0">
                {(["new", "old"] as ToggleState[]).map((val) => (
                  <button
                    key={val}
                    onClick={() => handleToggleChange(val)}
                    className={clx(
                      "flex h-8 min-h-8 items-center justify-center rounded-md px-2.5 py-1.5 text-body-sm font-medium transition-all",
                      toggleState === val
                        ? "border border-otl-gray-200 bg-bg-dialog-active shadow-button text-txt-black-900"
                        : "text-txt-black-500",
                    )}
                  >
                    {val === "new"
                      ? `${r("new_constituency")} (${new_year})`
                      : `${r("old_constituency")} (${old_year})`}
                  </button>
                ))}
              </div>

              {/* Seat search */}
              <div className="mx-auto w-full max-w-[564px] text-center">
                {!loading && data && (
                  <SeatCombobox
                    options={dropdown}
                    selected={
                      seatValue
                        ? dropdown.find((e) => e.value === seatValue)
                        : undefined
                    }
                    placeholder={tFrom(translations.home, "search_seat")}
                    onChange={handleSeatChange}
                  />
                )}
              </div>

              {/* Map */}
              <div className="space-y-3">
                <div className="relative mx-auto flex h-[400px] w-full items-center justify-center overflow-hidden rounded-lg border border-otl-gray-200 lg:h-[400px] lg:w-[846px]">
                  {data && currentSeat ? (
                    <MapboxRedelineation
                      mapboxToken={mapboxToken}
                      mapboxAccount={mapboxAccount}
                      initialState={{
                        longitude: currentSeat.center[0],
                        latitude: currentSeat.center[1],
                        zoom: currentSeat.zoom,
                      }}
                      toggle_state={toggleState}
                      sources={
                        toggleState === "new"
                          ? [data.map_new, data.map_old]
                          : [data.map_old, data.map_new]
                      }
                      election_type={level}
                      useOutline={
                        toggleState === "new"
                          ? currentSeat.seat_new
                          : currentSeat.seat_old
                      }
                      useShaded={
                        toggleState === "new"
                          ? currentSeat.seat_old
                          : currentSeat.seat_new
                      }
                      mapLabel={
                        toggleState === "new"
                          ? (["new", "old"] as [string, string])
                          : (["old", "new"] as [string, string])
                      }
                      year={
                        toggleState === "new"
                          ? ([new_year, old_year] as [string, string])
                          : ([old_year, new_year] as [string, string])
                      }
                      r={r}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-txt-black-500">
                      {loading ? "Loading…" : "Select a seat"}
                    </div>
                  )}
                </div>
                <p className="text-center text-sm italic text-txt-black-500">
                  <AttributionText>{r("attribution_tindak")}</AttributionText>
                </p>
              </div>

              {/* Geohistory table */}
              <div className="mx-auto max-w-[626px]">
                {data && currentSeat && (
                  <GeohistoryTable
                    type={toggleState}
                    table={currentSeat.lineage}
                    year={
                      toggleState === "new"
                        ? [new_year, old_year]
                        : [old_year, new_year]
                    }
                    r={r}
                  />
                )}
              </div>
            </div>
          </div>
        </SectionGrid>
      </Container>
    </>
  );
};

// ── Filters (sticky header) ───────────────────────────────────────────────────

interface FiltersProps {
  area: string;
  year: string;
  level: ElectionType;
  yearOptions: YearOptions;
  translations: Record<string, Record<string, any>>;
  onLevelChange: (level: ElectionType) => void;
  onAreaYearChange: (area: string, year: string) => void;
  c: (key: string) => string;
  r: (key: string, vars?: Record<string, string | number>) => string;
}

const RedelineationFilters: FC<FiltersProps> = ({
  area,
  year,
  level,
  yearOptions,
  onLevelChange,
  onAreaYearChange,
  c,
  r,
}) => {
  const { data: state, setData } = useData({
    isStick: false,
    openFilter: false,
    typeValue: area as Region,
    mobileType: area as Region,
    mobileYear: year,
    mobileLevel: level,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => setData("isStick", !entry.isIntersecting),
      { threshold: [1] },
    );
    if (sentinel) observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  const TYPE_OPTIONS = [
    { label: c("peninsular") || "Peninsular", value: "peninsular" },
    { label: c("sabah") || "Sabah", value: "sabah" },
    { label: c("sarawak") || "Sarawak", value: "sarawak" },
  ];

  const yearKey = `${state.typeValue}_${level}`;
  const YEAR_OPTIONS = (yearOptions[yearKey] ?? []).map((y) => ({
    value: y,
    label: y,
  }));

  const mobileYearKey = `${state.mobileType}_${state.mobileLevel}`;
  const YEAR_OPTIONS_MOBILE = (yearOptions[mobileYearKey] ?? []).map((y) => ({
    value: y,
    label: y,
  }));

  return (
    <>
      <div ref={sentinelRef} className="-mt-10 h-16 max-sm:hidden" />
      <div
        ref={containerRef}
        className={clx(
          "sticky top-16 z-30 col-span-full mx-auto w-full border border-transparent px-4.5 py-0 transition-all duration-300 max-sm:hidden md:w-[727px] md:px-0",
          state.isStick &&
            "border-otl-gray-200 bg-bg-white py-2.5 max-md:top-14 md:w-full md:px-6",
        )}
      >
        <div
          className={clx(
            "flex w-full flex-row justify-center gap-3",
            state.isStick && "mx-auto max-w-screen-xl",
          )}
        >
          {/* Area dropdown */}
          <Dropdown
            anchor="left"
            width="max-sm:w-full"
            options={TYPE_OPTIONS}
            selected={TYPE_OPTIONS.find((opt) => opt.value === state.typeValue)}
            onChange={(selected) => setData("typeValue", selected.value as Region)}
          />

          {/* Year dropdown */}
          <Dropdown
            anchor="left"
            width="max-sm:w-full"
            options={YEAR_OPTIONS}
            selected={YEAR_OPTIONS.find((opt) => opt.value === year)}
            onChange={(selected) =>
              onAreaYearChange(state.typeValue, selected.value)
            }
          />

          {/* Level tabs */}
          <div className="flex h-8 items-center rounded-lg bg-bg-washed p-0">
            {(["parlimen", "dun"] as ElectionType[]).map((lv) => (
              <button
                key={lv}
                disabled={state.typeValue !== area}
                onClick={() => onLevelChange(lv)}
                className={clx(
                  "flex h-8 min-h-8 items-center justify-center rounded-md px-2.5 py-1.5 text-body-sm font-medium transition-all disabled:opacity-40",
                  level === lv
                    ? "border border-otl-gray-200 bg-bg-dialog-active shadow-button text-txt-black-900"
                    : "text-txt-black-500",
                )}
              >
                {c(lv) || lv}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile filter button + drawer */}
      <Drawer
        open={state.openFilter}
        onOpenChange={(open) => setData("openFilter", open)}
      >
        <DrawerTrigger asChild>
          <button className="fixed bottom-4 right-3 z-20 flex items-center gap-2 rounded-full border border-otl-gray-200 bg-bg-white px-4 py-2 text-body-sm font-medium shadow-md lg:hidden">
            {r("filters") || c("filters") || "Filters"}
          </button>
        </DrawerTrigger>
        <DrawerContent className="max-h-[calc(100%-96px)] pt-0">
          <DrawerHeader className="flex w-full items-center justify-between border-b border-otl-gray-200 px-4 py-4.5">
            <DrawerTitle className="text-body-md font-bold">
              {r("filters") || c("filters") || "Filters"}
            </DrawerTitle>
            <DrawerClose>
              <span className="h-5 w-5 text-txt-black-500">✕</span>
            </DrawerClose>
          </DrawerHeader>

          <div className="flex flex-col space-y-6 px-4 py-4.5">
            <div className="space-y-1.5">
              <p className="text-body-sm text-txt-black-700">
                {r("filter.area") || "Area"}:
              </p>
              <Dropdown
                anchor="left"
                options={TYPE_OPTIONS}
                selected={TYPE_OPTIONS.find((o) => o.value === state.mobileType)}
                onChange={(selected) => {
                  if (selected.value !== state.mobileType)
                    setData("mobileYear", "");
                  setData("mobileType", selected.value as Region);
                }}
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-body-sm text-txt-black-700">
                {r("filter.year") || "Year"}:
              </p>
              <Dropdown
                anchor="left-0 max-h-36"
                options={YEAR_OPTIONS_MOBILE}
                selected={YEAR_OPTIONS_MOBILE.find(
                  (o) => o.value === state.mobileYear,
                )}
                onChange={(selected) => setData("mobileYear", selected.value)}
              />
            </div>

            <div className="space-y-1.5">
              <p className="text-body-sm text-txt-black-700">
                {r("filter.election_type") || "Election type"}:
              </p>
              <div className="flex h-8 items-center rounded-lg bg-bg-washed p-0">
                {(["parlimen", "dun"] as ElectionType[]).map((lv) => (
                  <button
                    key={lv}
                    onClick={() => setData("mobileLevel", lv)}
                    className={clx(
                      "flex h-8 min-h-8 items-center justify-center rounded-md px-2.5 py-1.5 text-body-sm font-medium",
                      state.mobileLevel === lv
                        ? "border border-otl-gray-200 bg-bg-dialog-active shadow-button text-txt-black-900"
                        : "text-txt-black-500",
                    )}
                  >
                    {c(lv) || lv}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DrawerFooter className="flex-row gap-3">
            <button
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-otl-gray-200 bg-bg-white px-4 py-2.5 text-body-sm font-medium"
              onClick={() => setData("openFilter", false)}
            >
              {c("close") || "Close"}
            </button>
            <button
              disabled={!state.mobileLevel || !state.mobileType || !state.mobileYear}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-danger-600 px-4 py-2.5 text-body-sm font-medium text-white disabled:opacity-40"
              onClick={() => {
                if (state.mobileLevel !== level) onLevelChange(state.mobileLevel);
                onAreaYearChange(state.mobileType, state.mobileYear);
                setData("openFilter", false);
              }}
            >
              {c("filter") || "Filter"}
            </button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </>
  );
};

// ── Before/After comparison map ───────────────────────────────────────────────

interface BeforeAfterProps {
  election_type: ElectionType;
  map_new: string;
  map_old: string;
  new_year: string;
  old_year: string;
  type: string;
  mapboxToken: string;
  mapboxAccount: string;
  r: (key: string) => string;
}

interface BoundarySpec {
  color: string;
  labelKey: "new_constituency" | "old_constituency";
  opacity?: number;
  source: string;
  width?: number;
  year: string;
}

interface BoundaryMapProps {
  boundaries: BoundarySpec[];
  id: string;
  election_type: ElectionType;
  map_new: string;
  map_old: string;
  mapboxToken: string;
  mapboxAccount: string;
  onMove: (event: ViewStateChangeEvent) => void;
  styleUrl: string;
  tooltipOwner?: string | null;
  tooltipResetKey?: number;
  onTooltipOwnerChange?: (owner: string | null) => void;
  viewState: ViewState;
  r: (key: string) => string;
}

interface PopupInfo {
  newSeat: string;
  oldSeat: string;
  x: number;
  y: number;
}

const RedelineationBeforeAfterMap: FC<BeforeAfterProps> = ({
  election_type,
  map_new,
  map_old,
  new_year,
  old_year,
  type,
  mapboxToken,
  mapboxAccount,
  r,
}) => {
  const dark = useDarkMode();
  const [styleUrl, setStyleUrl] = useState(MAPBOX_LIGHT_STYLE);
  const [slider, setSlider] = useState(50);
  const [tooltipOwner, setTooltipOwner] = useState<string | null>(null);
  const [tooltipResetKey, setTooltipResetKey] = useState(0);
  const [tab, setTab] = useState<"compare" | "new" | "old">("compare");
  const region = type as Region;
  const [viewState, setViewState] = useState<ViewState>(
    REGION_VIEW_STATE[region] ?? REGION_VIEW_STATE.peninsular,
  );

  useEffect(() => {
    setStyleUrl(dark ? MAPBOX_DARK_STYLE : MAPBOX_LIGHT_STYLE);
  }, [dark]);

  useEffect(() => {
    setViewState(REGION_VIEW_STATE[region] ?? REGION_VIEW_STATE.peninsular);
  }, [region, map_new, map_old, election_type]);

  const primaryColor = dark ? "#FFFFFF" : "#18181B";
  const secondaryColor = "#DC2626";
  const referenceOpacity = dark ? 0.45 : 0.35;

  const handleMove = (event: ViewStateChangeEvent) => setViewState(event.viewState);

  const newBoundaries: BoundarySpec[] = [
    {
      source: map_old,
      color: secondaryColor,
      labelKey: "old_constituency",
      opacity: referenceOpacity,
      width: 1,
      year: old_year,
    },
    {
      source: map_new,
      color: primaryColor,
      labelKey: "new_constituency",
      width: 2,
      year: new_year,
    },
  ];

  const oldBoundaries: BoundarySpec[] = [
    {
      source: map_new,
      color: primaryColor,
      labelKey: "new_constituency",
      opacity: referenceOpacity,
      width: 1,
      year: new_year,
    },
    {
      source: map_old,
      color: secondaryColor,
      labelKey: "old_constituency",
      width: 2,
      year: old_year,
    },
  ];

  const TABS = [
    { value: "compare", label: r("map_explorer.tabs.compare") || "Compare" },
    { value: "new", label: `${r("new_constituency")} (${new_year})` },
    { value: "old", label: `${r("old_constituency")} (${old_year})` },
  ] as const;

  return (
    <SectionGrid className="pt-6">
      <div className="mx-auto w-full space-y-6">
        <h2 className="mx-auto max-w-[727px] text-center font-heading text-heading-2xs font-semibold">
          {r("map_explorer.title")}
        </h2>

        {/* Tab strip */}
        <div className="mx-auto flex h-8 w-fit items-center rounded-lg bg-bg-washed p-0">
          {TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={clx(
                "flex h-8 min-h-8 items-center justify-center rounded-md px-2.5 py-1.5 text-body-sm font-medium transition-all",
                tab === value
                  ? "border border-otl-gray-200 bg-bg-dialog-active shadow-button text-txt-black-900"
                  : "text-txt-black-500",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Compare tab */}
        {tab === "compare" && (
          <div className="space-y-3">
            <div className="relative mx-auto h-[520px] w-full overflow-hidden rounded-lg border border-otl-gray-200 lg:h-[640px] lg:max-w-screen-xl">
              {/* Left map (new boundaries) */}
              <BoundaryMap
                id="redelineation_new_compare_map"
                election_type={election_type}
                map_new={map_new}
                map_old={map_old}
                mapboxToken={mapboxToken}
                mapboxAccount={mapboxAccount}
                styleUrl={styleUrl}
                tooltipOwner={tooltipOwner}
                tooltipResetKey={tooltipResetKey}
                viewState={viewState}
                onMove={handleMove}
                onTooltipOwnerChange={setTooltipOwner}
                boundaries={newBoundaries}
                r={r}
              />
              {/* Right map overlay (old boundaries), clipped */}
              <div
                className="absolute inset-0"
                style={{ clipPath: `inset(0 0 0 ${slider}%)` }}
              >
                <BoundaryMap
                  id="redelineation_old_compare_map"
                  election_type={election_type}
                  map_new={map_new}
                  map_old={map_old}
                  mapboxToken={mapboxToken}
                  mapboxAccount={mapboxAccount}
                  styleUrl={styleUrl}
                  tooltipOwner={tooltipOwner}
                  tooltipResetKey={tooltipResetKey}
                  viewState={viewState}
                  onMove={handleMove}
                  onTooltipOwnerChange={setTooltipOwner}
                  boundaries={oldBoundaries}
                  r={r}
                />
              </div>
              {/* Divider line */}
              <div
                className="pointer-events-none absolute inset-y-0 z-10 w-px bg-bg-black-900 dark:bg-bg-white"
                style={{ left: `${slider}%` }}
              />
              {/* Slider */}
              <Root
                className="absolute inset-x-0 top-1/2 z-20 flex h-9 -translate-y-1/2 touch-none select-none items-center"
                value={[slider]}
                min={0}
                max={100}
                step={1}
                aria-label={r("map_explorer.slider_label") || "Slide to compare"}
                onValueChange={([value]) => {
                  setSlider(value);
                  setTooltipOwner(null);
                  setTooltipResetKey((k) => k + 1);
                }}
              >
                <Track className="relative h-full grow bg-transparent" />
                <Thumb className="shadow-floating flex h-9 w-[94px] cursor-col-resize items-center justify-center gap-1.5 rounded-full bg-[#18181B] px-3 text-body-xs font-semibold text-white outline-none focus-visible:ring-4 focus-visible:ring-fr-primary">
                  <span className="font-mono text-body-sm leading-none">&lt;&gt;</span>
                  <span>{r("map_explorer.slide") || "Slide"}</span>
                </Thumb>
              </Root>
              {/* Corner labels */}
              <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-sm bg-bg-dialog/80 px-2.5 py-1.5 text-body-xs font-medium text-txt-black-500">
                {r("new_constituency")} ({new_year})
              </div>
              <div className="pointer-events-none absolute right-3 top-3 z-10 rounded-sm bg-bg-dialog/80 px-2.5 py-1.5 text-body-xs font-medium text-txt-black-500">
                {r("old_constituency")} ({old_year})
              </div>
            </div>
            <p className="text-center text-sm italic text-txt-black-500">
              <AttributionText>{r("attribution_tindak")}</AttributionText>
            </p>
          </div>
        )}

        {/* New tab */}
        {tab === "new" && (
          <SingleMapFrame
            boundaries={newBoundaries}
            id="redelineation_new_map"
            election_type={election_type}
            map_new={map_new}
            map_old={map_old}
            mapboxToken={mapboxToken}
            mapboxAccount={mapboxAccount}
            onMove={handleMove}
            styleUrl={styleUrl}
            viewState={viewState}
            r={r}
          />
        )}

        {/* Old tab */}
        {tab === "old" && (
          <SingleMapFrame
            boundaries={oldBoundaries}
            id="redelineation_old_map"
            election_type={election_type}
            map_new={map_new}
            map_old={map_old}
            mapboxToken={mapboxToken}
            mapboxAccount={mapboxAccount}
            onMove={handleMove}
            styleUrl={styleUrl}
            viewState={viewState}
            r={r}
          />
        )}
      </div>
    </SectionGrid>
  );
};

const SingleMapFrame: FC<BoundaryMapProps> = (props) => {
  const { r } = props;
  return (
    <div className="space-y-3">
      <div className="relative mx-auto h-[520px] w-full overflow-hidden rounded-lg border border-otl-gray-200 lg:h-[640px] lg:max-w-screen-xl">
        <BoundaryMap {...props} />
        <MapLegend boundaries={props.boundaries} r={r} />
      </div>
      <p className="text-center text-sm italic text-txt-black-500">
        <AttributionText>{r("attribution_tindak")}</AttributionText>
      </p>
    </div>
  );
};

const BoundaryMap: FC<BoundaryMapProps> = ({
  boundaries,
  election_type,
  id,
  map_new,
  map_old,
  mapboxToken,
  mapboxAccount,
  onMove,
  onTooltipOwnerChange,
  styleUrl,
  tooltipOwner,
  tooltipResetKey,
  viewState,
  r,
}) => {
  const mapRef = useRef<MapRef | null>(null);
  const tooltipFrame = useRef<number | null>(null);
  const [popupInfo, setPopupInfo] = useState<PopupInfo | null>(null);
  const querySources = [map_new, map_old];

  // Sources in draw order: boundary sources first, then fill-only query sources
  const orderedSources = [
    ...boundaries.map((b) => b.source),
    ...querySources.filter((s) => !boundaries.some((b) => b.source === s)),
  ];

  useEffect(() => {
    if (tooltipOwner && tooltipOwner !== id) setPopupInfo(null);
  }, [id, tooltipOwner]);

  useEffect(() => {
    setPopupInfo(null);
  }, [tooltipResetKey]);

  useEffect(() => {
    return () => {
      if (tooltipFrame.current) cancelAnimationFrame(tooltipFrame.current);
    };
  }, []);

  const clearTooltip = () => {
    if (tooltipFrame.current) cancelAnimationFrame(tooltipFrame.current);
    tooltipFrame.current = null;
    setPopupInfo(null);
  };

  const handleMouseMove = (event: MapMouseEvent) => {
    onTooltipOwnerChange?.(id);

    const features = mapRef.current?.queryRenderedFeatures(event.point, {
      layers: querySources.map((s) => `${id}-${s}-fill`),
    });

    if (!features?.length) {
      clearTooltip();
      return;
    }

    const prop = election_type === "parlimen" ? "parlimen" : "dun";
    const getSeat = (source: string) => {
      const feat = features.find((f) => f.layer?.id === `${id}-${source}-fill`);
      return feat?.properties?.[prop] ?? "";
    };

    const newSeat = getSeat(map_new);
    const oldSeat = getSeat(map_old);
    if (!newSeat && !oldSeat) {
      clearTooltip();
      return;
    }

    const next: PopupInfo = { newSeat, oldSeat, x: event.point.x, y: event.point.y };
    if (tooltipFrame.current) cancelAnimationFrame(tooltipFrame.current);
    tooltipFrame.current = requestAnimationFrame(() => {
      setPopupInfo((cur) => {
        if (
          cur?.newSeat === next.newSeat &&
          cur.oldSeat === next.oldSeat &&
          Math.abs(cur.x - next.x) < 2 &&
          Math.abs(cur.y - next.y) < 2
        )
          return cur;
        return next;
      });
    });
  };

  return (
    <div
      className="absolute inset-0"
      onMouseLeave={() => {
        clearTooltip();
        onTooltipOwnerChange?.(tooltipOwner === id ? null : (tooltipOwner ?? null));
      }}
      onPointerLeave={() => {
        clearTooltip();
        onTooltipOwnerChange?.(tooltipOwner === id ? null : (tooltipOwner ?? null));
      }}
    >
      <Map
        id={id}
        ref={mapRef}
        reuseMaps={true}
        mapboxAccessToken={mapboxToken}
        {...viewState}
        style={{ width: "100%", height: "100%" }}
        mapStyle={styleUrl}
        attributionControl={false}
        interactiveLayerIds={querySources.map((s) => `${id}-${s}-fill`)}
        onMove={onMove}
        onMouseMove={handleMouseMove}
      >
        <AttributionControl compact={true} customAttribution="ElectionData.MY" />
        {orderedSources.map((source) => (
          <Fragment key={source}>
            <Source
              id={`${id}-${source}`}
              type="vector"
              url={`mapbox://${mapboxAccount}.${source}`}
            >
              <Layer
                id={`${id}-${source}-fill`}
                type="fill"
                source-layer={source}
                paint={{ "fill-color": "transparent", "fill-opacity": 0.01 }}
              />
              {boundaries
                .filter((b) => b.source === source)
                .map((b) => (
                  <Layer
                    key={`${source}-line`}
                    id={`${id}-${source}-line`}
                    type="line"
                    source-layer={source}
                    paint={{
                      "line-color": b.color,
                      "line-width": b.width ?? 1.5,
                      "line-opacity": b.opacity ?? 1,
                    }}
                  />
                ))}
            </Source>
          </Fragment>
        ))}
        {popupInfo && (!tooltipOwner || tooltipOwner === id) && (
          <div
            className="shadow-floating pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full rounded-md bg-bg-black-900 px-3 py-2 font-body text-body-xs text-txt-white"
            style={{ left: popupInfo.x, top: popupInfo.y - 12 }}
          >
            <p>
              {r("new")}: {popupInfo.newSeat || "—"}
            </p>
            <p>
              {r("old")}: {popupInfo.oldSeat || "—"}
            </p>
          </div>
        )}
      </Map>
    </div>
  );
};

const MapLegend: FC<{
  boundaries: BoundarySpec[];
  r: (key: string) => string;
}> = ({ boundaries, r }) => (
  <div className="absolute right-4 top-4">
    <div className="flex w-[210px] flex-col rounded-md border border-otl-gray-200 bg-bg-dialog p-[5px] shadow-context-menu">
      <p className="px-2.5 py-1.5 text-start text-body-2xs font-medium text-txt-black-500">
        {r("map_explorer.legend.title") || "Legend"}
      </p>
      {[...boundaries].reverse().map((b) => (
        <div
          key={b.source}
          className="flex items-center gap-2 px-2.5 py-1.5 text-body-xs text-txt-black-700"
        >
          <div className="h-0.5 w-3 shrink-0" style={{ backgroundColor: b.color }} />
          <p>
            {r(b.labelKey)} ({b.year})
          </p>
        </div>
      ))}
    </div>
  </div>
);

// ── Seat detail Mapbox map ────────────────────────────────────────────────────

interface MapboxRedelineationProps {
  mapboxToken: string;
  mapboxAccount: string;
  initialState: Partial<ViewState>;
  sources: [string, string];
  useOutline: string | string[];
  useShaded: string | string[];
  election_type: ElectionType;
  mapLabel: [string, string];
  year: [string, string];
  toggle_state: ToggleState;
  r: (key: string) => string;
}

const MapboxRedelineation: FC<MapboxRedelineationProps> = ({
  mapboxToken,
  mapboxAccount,
  initialState,
  sources,
  useOutline,
  useShaded,
  election_type,
  mapLabel,
  year,
  toggle_state,
  r,
}) => {
  const dark = useDarkMode();
  const { data: state, setData } = useData({ styleUrl: MAPBOX_LIGHT_STYLE });
  const mapRef = useRef<MapRef | null>(null);
  const { redelineation_map } = useMap();

  const [popupInfo, setPopupInfo] = useState<{
    feature: GeoJSONFeature & { year: string };
    longitude: number;
    latitude: number;
  } | null>(null);

  useEffect(() => {
    setData("styleUrl", dark ? MAPBOX_DARK_STYLE : MAPBOX_LIGHT_STYLE);
  }, [dark]);

  const prop = election_type === "parlimen" ? "parlimen" : "dun";
  const outlineArr = Array.isArray(useOutline) ? useOutline : [useOutline];
  const shadedArr = Array.isArray(useShaded) ? useShaded : [useShaded];

  const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
    const features = mapRef.current?.queryRenderedFeatures(e.point, {
      layers: sources.map((s) => `${s}-fill`),
    });

    if (features && features.length > 0) {
      const feats = features
        .map((feat) => ({
          ...feat,
          year: feat.source?.split("_").find((p) => /^\d{4}$/.test(p)) || "",
        }))
        .sort((a, b) => Number(b.year) - Number(a.year));

      const feat =
        toggle_state === "new" ? minBy(feats, "year") : maxBy(feats, "year");

      if (feat) {
        setPopupInfo({
          feature: feat as GeoJSONFeature & { year: string },
          longitude: e.lngLat.lng,
          latitude: e.lngLat.lat,
        });
      }
    } else {
      setPopupInfo(null);
    }
  };

  return (
    <div className="h-full w-full">
      <Map
        id="redelineation_map"
        ref={mapRef}
        reuseMaps={true}
        mapboxAccessToken={mapboxToken}
        initialViewState={initialState}
        style={{ width: "100%", height: "100%" }}
        mapStyle={state.styleUrl}
        attributionControl={false}
        interactiveLayerIds={sources as unknown as string[]}
        onMouseMove={handleMouseMove}
      >
      <AttributionControl compact={true} customAttribution="ElectionData.MY" />

      {/* Shaded source (old/counterpart) */}
      <Source
        key={sources[1]}
        id={sources[1]}
        type="vector"
        url={`mapbox://${mapboxAccount}.${sources[1]}`}
      >
        <Layer
          id={`${sources[1]}-line`}
          type="line"
          source-layer={sources[1]}
          paint={{
            "line-color": dark ? "#3F3F46" : "#D4D4D8",
            "line-width": 1,
            "line-opacity": 1,
          }}
          filter={["in", prop, ...shadedArr]}
        />
        <Layer
          id={`${sources[1]}-fill`}
          type="fill"
          source-layer={sources[1]}
          paint={{
            "fill-color": [
              "match",
              ["get", prop],
              ...shadedArr.flatMap((seat, i) => [
                seat,
                SHADED_COLOR_INDEX[i % SHADED_COLOR_INDEX.length],
              ]),
              "transparent",
            ],
          }}
          filter={["in", prop, ...shadedArr]}
        />
      </Source>

      {/* Outline source (current) */}
      <Source
        key={sources[0]}
        id={sources[0]}
        type="vector"
        url={`mapbox://${mapboxAccount}.${sources[0]}`}
      >
        <Layer
          id={`${sources[0]}-line`}
          type="line"
          source-layer={sources[0]}
          paint={{
            "line-color": dark ? "white" : "#18181B",
            "line-width": 2,
            "line-opacity": 1,
          }}
          filter={["in", prop, ...outlineArr]}
        />
        <Layer
          id={`${sources[0]}-fill`}
          type="fill"
          source-layer={sources[0]}
          paint={{ "fill-color": "transparent" }}
          filter={["in", prop, ...outlineArr]}
        />
      </Source>

      {/* Legend */}
      <div className="absolute right-4 top-4">
        <div className="flex w-[120px] flex-col rounded-md border border-otl-gray-200 bg-bg-dialog p-[5px] shadow-context-menu">
          <div className="flex items-center gap-2 px-2.5 py-1.5 text-body-xs text-txt-black-700">
            <div className="h-0.5 w-2 shrink-0 bg-bg-black-900" />
            <p>
              {r(mapLabel[0])} ({year[0]})
            </p>
          </div>
          <div className="flex items-center gap-2 px-2.5 py-1.5 text-body-xs text-txt-black-700">
            <div className="grid grid-cols-2 gap-0.5">
              {shadedArr.map((seat, i) => (
                <div
                  key={seat}
                  className="size-2 rounded-full ring-[0.5px] ring-gray-300"
                  style={{
                    background: SHADED_COLOR_INDEX[i % SHADED_COLOR_INDEX.length],
                  }}
                />
              ))}
            </div>
            <p>
              {r(mapLabel[1])} ({year[1]})
            </p>
          </div>
        </div>
      </div>

      {popupInfo && (
        <Popup
          longitude={popupInfo.longitude}
          latitude={popupInfo.latitude}
          closeButton={false}
          closeOnClick={false}
          anchor="bottom"
        >
          <p className="px-3 py-2 font-body text-body-xs text-txt-white">
            {popupInfo.feature.properties?.["dun"] ||
              popupInfo.feature.properties?.["parlimen"]}{" "}
            ({popupInfo.feature.year})
          </p>
        </Popup>
      )}
      </Map>
    </div>
  );
};

// ── Geohistory table ──────────────────────────────────────────────────────────

type GeoTableRow = {
  seat_new?: string;
  seat_old?: string;
  parent?: string;
  child?: string;
  perc_from_parent?: number;
  perc_to_child?: number;
};

interface GeohistoryTableProps {
  type: ToggleState;
  table: GeoTableRow[];
  year: [string, string];
  r: (key: string) => string;
}

const GeohistoryTable: FC<GeohistoryTableProps> = ({ type, table, year, r }) => {
  if (!table?.length) return null;

  const isNew = type === "new";

  const seatKey = isNew ? "seat_new" : "seat_old";
  const otherKey = isNew ? "parent" : "child";
  const percKey = isNew ? "perc_from_parent" : "perc_to_child";

  const seatHeader = isNew
    ? `${r("table.seat_new")} (${year[0]})`
    : `${r("table.seat_old")} (${year[1]})`;
  const otherHeader = isNew
    ? `${r("table.parent")} (${year[1]})`
    : `${r("table.child")} (${year[0]})`;
  const percHeader = isNew
    ? r("table.perc_from_parent")
    : r("table.perc_to_child");

  return (
    <>
      {/* Desktop */}
      <div className="group hidden overflow-x-auto md:block">
        <table className="w-full border-collapse border border-otl-gray-200">
          <thead>
            <tr className="border-b border-otl-gray-200">
              <th className="border-r border-otl-gray-200 px-3 py-3 text-left text-body-sm font-semibold text-txt-black-700">
                {seatHeader}
              </th>
              <th className="border-r border-otl-gray-200 px-3 py-3 text-left text-body-sm font-semibold text-txt-black-700">
                {otherHeader}
              </th>
              <th className="px-3 py-3 text-right text-body-sm font-semibold text-txt-black-700">
                {percHeader}
              </th>
            </tr>
          </thead>
          <tbody>
            {table.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="border-b border-otl-gray-200 hover:bg-bg-washed"
              >
                {rowIndex === 0 && (
                  <td
                    rowSpan={table.length}
                    className="border-r border-otl-gray-200 px-3 py-3 group-hover:bg-bg-washed"
                  >
                    <p className="flex h-full items-center">{row[seatKey]}</p>
                  </td>
                )}
                <td className="border-r border-otl-gray-200 px-3 py-3">
                  {row[otherKey]}
                </td>
                <td className="py-3 pl-1 pr-3 text-right">
                  <p className="text-right font-mono tabular-nums">
                    {Number(row[percKey]).toFixed(2)}
                  </p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <h3 className="mb-4 pl-2 text-center text-body-md font-semibold text-txt-black-700">
          {seatHeader}: {table[0]?.[seatKey]}
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-otl-gray-200">
            <thead>
              <tr className="border-b border-otl-gray-200">
                <th className="w-3/5 border-r border-otl-gray-200 px-3 py-3 text-left text-sm font-semibold text-txt-black-700">
                  {otherHeader}
                </th>
                <th className="w-2/5 px-3 py-3 text-right text-sm font-semibold text-txt-black-700">
                  {percHeader}
                </th>
              </tr>
            </thead>
            <tbody>
              {table.map((row, i) => (
                <tr key={i} className="border-b border-otl-gray-200 hover:bg-bg-washed">
                  <td className="border-r border-otl-gray-200 px-3 py-3">
                    <p className="text-sm text-txt-black-700">{row[otherKey]}</p>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <p className="font-mono text-sm tabular-nums text-txt-black-700">
                      {Number(row[percKey]).toFixed(2)}
                    </p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default RedelineationDashboard;
