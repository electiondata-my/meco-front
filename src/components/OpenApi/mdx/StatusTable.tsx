import { FunctionComponent } from "react";

export interface StatusCode {
  code: string;
  name: string;
  description: string;
  color: "green" | "amber" | "red";
}

const STATUS_CLASSES: Record<StatusCode["color"], string> = {
  green: "bg-green-50 text-green-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-bg-danger-100 text-txt-danger",
};

const StatusTable: FunctionComponent<{ codes: StatusCode[] }> = ({ codes }) => (
  <div className="mb-8 overflow-hidden rounded-xl border border-otl-gray-200">
    <table className="w-full text-body-sm">
      <thead>
        <tr className="border-b border-otl-gray-200 bg-bg-washed text-left">
          <th className="px-4 py-3 font-semibold text-txt-black-700">Status</th>
          <th className="px-4 py-3 font-semibold text-txt-black-700">Name</th>
          <th className="px-4 py-3 font-semibold text-txt-black-700">Description</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-otl-gray-200">
        {codes.map(row => (
          <tr key={row.code} className="bg-bg-white hover:bg-bg-washed">
            <td className="px-4 py-3">
              <code className={`rounded px-1.5 py-0.5 font-mono text-body-xs ${STATUS_CLASSES[row.color]}`}>
                {row.code}
              </code>
            </td>
            <td className="px-4 py-3 text-txt-black-900">{row.name}</td>
            <td className="px-4 py-3 text-txt-black-600">{row.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default StatusTable;
