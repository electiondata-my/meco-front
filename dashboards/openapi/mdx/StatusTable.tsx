import { FunctionComponent } from "react";
import { clx } from "@lib/helpers";

export interface StatusCode {
  code: string;
  name: string;
  description: string;
  color: "green" | "amber" | "red";
}

interface StatusTableProps {
  codes: StatusCode[];
}

/**
 * Renders a color-coded HTTP status code table.
 *
 * Usage in MDX:
 * <StatusTable codes={[
 *   { code: "200", name: "OK", description: "Request succeeded.", color: "green" },
 *   { code: "401", name: "Unauthorized", description: "Missing or invalid API key.", color: "red" },
 * ]} />
 */
const StatusTable: FunctionComponent<StatusTableProps> = ({ codes }) => {
  return (
    <div className="mb-8 overflow-hidden rounded-xl border border-otl-gray-200">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-otl-gray-200 bg-bg-washed text-left">
            <th className="px-4 py-3 font-semibold text-txt-black-700">
              Status
            </th>
            <th className="px-4 py-3 font-semibold text-txt-black-700">
              Name
            </th>
            <th className="px-4 py-3 font-semibold text-txt-black-700">
              Description
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-otl-gray-200">
          {codes.map(row => (
            <tr key={row.code} className="bg-bg-white hover:bg-bg-washed">
              <td className="px-4 py-3">
                <code
                  className={clx(
                    "rounded px-1.5 py-0.5 font-mono text-body-xs",
                    row.color === "green" && "bg-green-50 text-green-700",
                    row.color === "amber" && "bg-amber-50 text-amber-700",
                    row.color === "red" &&
                      "bg-bg-danger-100 text-txt-danger",
                  )}
                >
                  {row.code}
                </code>
              </td>
              <td className="px-4 py-3 text-txt-black-900">
                {row.name}
              </td>
              <td className="px-4 py-3 text-txt-black-600">
                {row.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StatusTable;
