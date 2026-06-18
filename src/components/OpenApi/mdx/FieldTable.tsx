import { FunctionComponent } from "react";

export interface Field {
  name: string;
  type: string;
  description: string;
}

const FieldTable: FunctionComponent<{ fields: Field[] }> = ({ fields }) => (
  <div className="mt-2 mb-6">
    <table className="w-full text-body-sm">
      <thead>
        <tr className="border-b border-otl-gray-200 text-left">
          <th className="pb-2 pr-4 text-body-xs font-semibold uppercase tracking-wide text-txt-black-400">Field</th>
          <th className="pb-2 pr-4 text-body-xs font-semibold uppercase tracking-wide text-txt-black-400">Type</th>
          <th className="pb-2 text-body-xs font-semibold uppercase tracking-wide text-txt-black-400">Description</th>
        </tr>
      </thead>
      <tbody>
        {fields.map(row => (
          <tr key={row.name} className="border-b border-otl-gray-100">
            <td className="py-2.5 pr-4 align-top">
              <code className="font-mono text-body-xs font-semibold text-txt-black-900">{row.name}</code>
            </td>
            <td className="py-2.5 pr-4 align-top font-mono text-body-xs text-txt-black-400">{row.type}</td>
            <td className="py-2.5 align-top text-txt-black-600">{row.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default FieldTable;
