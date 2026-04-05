import { FunctionComponent } from "react";

export interface Field {
  name: string;
  type: string;
  description: string;
}

interface FieldTableProps {
  fields: Field[];
}

/**
 * Renders a response field description table.
 *
 * Usage in MDX:
 * <FieldTable fields={[
 *   { name: "election", type: "string", description: 'Election identifier, e.g. "GE-15".' },
 * ]} />
 */
const FieldTable: FunctionComponent<FieldTableProps> = ({ fields }) => {
  return (
    <div className="mt-6 overflow-hidden rounded-xl border border-otl-gray-200">
      <table className="w-full text-body-xs">
        <thead>
          <tr className="border-b border-otl-gray-200 bg-bg-washed text-left">
            <th className="px-4 py-3 font-semibold text-txt-black-700">
              Field
            </th>
            <th className="px-4 py-3 font-semibold text-txt-black-700">
              Type
            </th>
            <th className="px-4 py-3 font-semibold text-txt-black-700">
              Description
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-otl-gray-200">
          {fields.map(row => (
            <tr key={row.name} className="bg-bg-white hover:bg-bg-washed">
              <td className="px-4 py-2.5">
                <code className="font-mono text-body-2xs font-semibold text-txt-black-900">
                  {row.name}
                </code>
              </td>
              <td className="px-4 py-2.5 font-mono text-body-2xs text-txt-black-500">
                {row.type}
              </td>
              <td className="px-4 py-2.5 text-txt-black-600">
                {row.description}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FieldTable;
