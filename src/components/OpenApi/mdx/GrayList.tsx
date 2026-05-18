import { FunctionComponent, ReactNode } from "react";

const GrayList: FunctionComponent<{ items: ReactNode[] }> = ({ items }) => (
  <ul className="my-4 space-y-2 pl-4 text-body-sm text-txt-black-700">
    {items.map((item, i) => (
      <li key={i} className="flex items-start gap-3 leading-relaxed">
        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bg-black-400" />
        <span>{item}</span>
      </li>
    ))}
  </ul>
);

export default GrayList;
