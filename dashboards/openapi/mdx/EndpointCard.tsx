import { FunctionComponent } from "react";
import { Param } from "./ParamTable";

interface EndpointCardProps {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  params?: Param[];
}

const EndpointCard: FunctionComponent<EndpointCardProps> = ({
  method,
  url,
  params,
}) => {
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-otl-gray-200">
      {/* Method + URL */}
      <div className="flex items-center gap-3 bg-bg-washed px-4 py-3">
        <span className="shrink-0 rounded bg-bg-danger-100 px-2 py-0.5 font-mono text-body-xs font-semibold uppercase tracking-wider text-txt-danger">
          {method}
        </span>
        <code className="font-mono text-body-xs text-txt-black-900">{url}</code>
      </div>

      {/* Params table */}
      {params && params.length > 0 && (
        <table className="w-full border-t border-otl-gray-200 text-body-sm">
          <thead>
            <tr className="border-b border-otl-gray-200 bg-bg-white text-left">
              <th className="px-4 py-3 font-semibold text-txt-black-700">
                Parameter
              </th>
              <th className="px-4 py-3 font-semibold text-txt-black-700">
                Type
              </th>
              <th className="px-4 py-3 font-semibold text-txt-black-700">
                Required
              </th>
              <th className="px-4 py-3 font-semibold text-txt-black-700">
                Description
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-otl-gray-200">
            {params.map(param => (
              <tr key={param.name} className="bg-bg-white hover:bg-bg-washed">
                <td className="px-4 py-3">
                  <code className="rounded bg-bg-black-100 px-1.5 py-0.5 font-mono text-body-xs font-semibold text-txt-black-900">
                    {param.name}
                  </code>
                </td>
                <td className="px-4 py-3 font-mono text-body-xs text-txt-black-500">
                  {param.type}
                </td>
                <td className="px-4 py-3">
                  {param.required ? (
                    <span className="rounded bg-bg-danger-100 px-1.5 py-0.5 text-body-xs font-semibold text-txt-danger">
                      Yes
                    </span>
                  ) : (
                    <span className="rounded bg-bg-black-100 px-1.5 py-0.5 text-body-xs font-semibold text-txt-black-500">
                      No
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-txt-black-600">
                  {param.description}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default EndpointCard;
