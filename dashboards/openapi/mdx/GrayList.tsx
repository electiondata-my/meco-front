import { FunctionComponent, ReactNode } from "react";

interface GrayListProps {
  items: ReactNode[];
}

/**
 * Bullet list with gray (neutral) bullets — use for non-breaking / neutral items.
 * Default MDX <ul> uses red/danger bullets (for warnings and requirements).
 *
 * Usage in MDX:
 * <GrayList items={[
 *   "Adding new optional parameters.",
 *   <>Removing or renaming <strong>existing</strong> fields.</>,
 * ]} />
 */
const GrayList: FunctionComponent<GrayListProps> = ({ items }) => {
  return (
    <ul className="my-4 space-y-2 pl-4 text-body-sm text-txt-black-700">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 leading-relaxed">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bg-black-400" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
};

export default GrayList;
