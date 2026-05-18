import { FunctionComponent, ReactNode } from "react";

interface CalloutProps {
  children: ReactNode;
  label?: string;
}

const Callout: FunctionComponent<CalloutProps> = ({ children, label = "Note" }) => (
  <div className="my-6 rounded-xl border border-otl-gray-200 bg-bg-washed px-5 py-4 text-body-sm text-txt-black-700">
    <strong className="text-txt-black-900">{label}:</strong>{" "}
    {children}
  </div>
);

export default Callout;
