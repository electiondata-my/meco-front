import { FunctionComponent } from "react";

interface EndpointBadgeProps {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
}

const EndpointBadge: FunctionComponent<EndpointBadgeProps> = ({ method, url }) => (
  <div className="my-4 flex items-center gap-3 rounded-xl border border-otl-gray-200 bg-bg-washed px-4 py-3">
    <span className="shrink-0 rounded bg-bg-danger-100 px-2 py-0.5 font-mono text-body-xs font-semibold uppercase tracking-wider text-txt-danger">
      {method}
    </span>
    <code className="font-mono text-body-xs text-txt-black-900">{url}</code>
  </div>
);

export default EndpointBadge;
