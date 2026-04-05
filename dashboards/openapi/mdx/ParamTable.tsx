import { FunctionComponent, ReactNode } from "react";

export interface Param {
  name: string;
  type: string;
  required: boolean;
  description: ReactNode;
}

interface ParamTableProps {
  params: Param[];
}

/**
 * Renders a styled query parameter table.
 *
 * Usage in MDX:
 * <ParamTable params={[
 *   { name: "id", type: "string", required: true, description: <>The candidate ID (e.g. <code>YQJ5S</code>).</> },
 * ]} />
 */
const ParamTable: FunctionComponent<ParamTableProps> = ({ params }) => {
  return (
    <div className="my-4 overflow-hidden rounded-xl border border-otl-gray-200">
      <table className="w-full text-body-sm">
        <thead>
          <tr className="border-b border-otl-gray-200 bg-bg-washed text-left">
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
    </div>
  );
};

export default ParamTable;
