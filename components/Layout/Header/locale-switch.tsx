import { GlobeIcon } from "@govtechmy/myds-react/icon";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@govtechmy/myds-react/select";
import { useLanguage } from "@hooks/useLanguage";
import { languages } from "@lib/options";

export default function LocaleSwitch() {
  const { language, onLanguageChange } = useLanguage();

  if (!language) {
    return null;
  }

  return (
    <Select
      variant={"outline"}
      size={"small"}
      multiple={false}
      onValueChange={onLanguageChange}
      defaultValue={language}
      value={language}
    >
      <SelectTrigger>
        <GlobeIcon className="hidden lg:block" />
        <SelectValue className="text-txt-black-900">
          {(locale) => languages?.[locale as "ms-MY" | "en-GB"].full}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {Object.entries(languages).map(([value, label]) => (
            <SelectItem key={value} value={value} className="text-body-sm">
              {label.full}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}
