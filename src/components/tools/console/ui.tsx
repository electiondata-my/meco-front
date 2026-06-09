import { clx } from "@lib/helpers";

export function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="mb-4 font-heading text-body-lg font-semibold text-txt-black-900">
      {title}
    </h3>
  );
}

export function TableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-otl-gray-200">
      <table className="w-full text-body-sm">{children}</table>
    </div>
  );
}

export function Th({
  children,
  right,
  center,
}: {
  children: React.ReactNode;
  right?: boolean;
  center?: boolean;
}) {
  return (
    <th
      className={clx(
        "border-b border-otl-gray-200 bg-bg-black-100 px-4 py-2.5 text-body-xs font-semibold uppercase tracking-widest text-txt-black-500",
        right ? "text-right" : center ? "text-center" : "text-left",
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  right,
  center,
  mono,
}: {
  children: React.ReactNode;
  right?: boolean;
  center?: boolean;
  mono?: boolean;
}) {
  return (
    <td
      className={clx(
        "border-b border-otl-gray-200 px-4 py-3 text-txt-black-900",
        right ? "text-right" : center ? "text-center" : "text-left",
        mono && "font-mono text-body-xs",
      )}
    >
      {children}
    </td>
  );
}

export function StatusBadge({ code }: { code: number }) {
  const isSuccess = code < 400;
  const isClientErr = code >= 400 && code < 500;
  return (
    <span
      className={clx(
        "rounded px-1.5 py-0.5 font-mono text-body-xs",
        isSuccess && "bg-bg-success-100 text-txt-success",
        isClientErr && "bg-bg-warning-100 text-txt-warning",
        !isSuccess && !isClientErr && "bg-bg-danger-100 text-txt-danger",
      )}
    >
      {code}
    </span>
  );
}
