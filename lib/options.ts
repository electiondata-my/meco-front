import { OptionType } from "@lib/types";
import { MALAYSIA, STATES } from "./constants";
import { sortMsiaFirst } from "./helpers";

export const languages: Record<
  "ms-MY" | "en-GB",
  { full: string; short: string }
> = {
  "en-GB": {
    full: "English",
    short: "EN",
  },
  "ms-MY": {
    full: "Malay",
    short: "BM",
  },
};

/**
 * States defs for StateDropdown.
 */
export const statesOptions: OptionType[] = [MALAYSIA]
  .concat(sortMsiaFirst(STATES, "key"))
  .map((state) => ({
    label: state.name,
    value: state.key,
  }));
