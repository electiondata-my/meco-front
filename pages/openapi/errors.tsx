import Metadata from "@components/Metadata";
import DocLayout from "@dashboards/openapi/DocLayout";
import DocCodeBlock from "@dashboards/openapi/DocCodeBlock";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { TocItem } from "@dashboards/openapi/config";
import { GetStaticProps } from "next";
import { clx } from "@lib/helpers";

const TOC: TocItem[] = [
  { id: "http-status-codes", text: "HTTP Status Codes", level: 2 },
  { id: "error-response-format", text: "Error Response Format", level: 2 },
  { id: "example-missing-parameter", text: "Example: Missing parameter", level: 3 },
  { id: "example-invalid-api-key", text: "Example: Invalid API key", level: 3 },
];

const STATUS_CODES = [
  { code: "200", name: "OK", description: "Request succeeded.", color: "green" },
  { code: "400", name: "Bad Request", description: "Missing or invalid parameters.", color: "amber" },
  { code: "401", name: "Unauthorized", description: "Missing or invalid API key.", color: "red" },
  { code: "404", name: "Not Found", description: "The requested resource does not exist.", color: "amber" },
  { code: "429", name: "Too Many Requests", description: "You have exceeded the soft rate limit.", color: "amber" },
  { code: "500", name: "Internal Server Error", description: "Something went wrong on our end.", color: "red" },
];

const ErrorsPage: Page = () => {
  return (
    <>
      <Metadata
        title="Errors — API Docs"
        description="HTTP status codes and error response format for the ElectionData.MY API."
        keywords="API, errors, HTTP status codes, election data"
      />
      <DocLayout
        breadcrumb="General"
        title="Errors"
        toc={TOC}
      >
        {/* ── HTTP Status Codes ── */}
        <h2
          id="http-status-codes"
          className="mb-4 mt-10 font-poppins text-xl font-semibold text-txt-black-900 first:mt-0"
        >
          HTTP Status Codes
        </h2>
        <p className="mb-5 text-body-sm leading-relaxed text-txt-black-700">
          The API uses standard HTTP status codes to indicate the success or
          failure of a request. Codes in the{" "}
          <code className="rounded bg-bg-black-100 px-1.5 py-0.5 font-mono text-body-xs text-txt-black-900">
            2xx
          </code>{" "}
          range indicate success; codes in the{" "}
          <code className="rounded bg-bg-black-100 px-1.5 py-0.5 font-mono text-body-xs text-txt-black-900">
            4xx
          </code>{" "}
          range indicate a client error; codes in the{" "}
          <code className="rounded bg-bg-black-100 px-1.5 py-0.5 font-mono text-body-xs text-txt-black-900">
            5xx
          </code>{" "}
          range indicate a server-side problem.
        </p>

        {/* Table */}
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
              {STATUS_CODES.map(row => (
                <tr key={row.code} className="bg-bg-white hover:bg-bg-washed">
                  <td className="px-4 py-3">
                    <code
                      className={clx(
                        "rounded px-1.5 py-0.5 font-mono text-body-xs font-semibold",
                        row.color === "green" &&
                          "bg-green-50 text-green-700",
                        row.color === "amber" &&
                          "bg-amber-50 text-amber-700",
                        row.color === "red" && "bg-bg-danger-100 text-txt-danger",
                      )}
                    >
                      {row.code}
                    </code>
                  </td>
                  <td className="px-4 py-3 font-medium text-txt-black-900">
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

        {/* ── Error Response Format ── */}
        <h2
          id="error-response-format"
          className="mb-4 mt-10 font-poppins text-xl font-semibold text-txt-black-900"
        >
          Error Response Format
        </h2>
        <p className="mb-4 text-body-sm leading-relaxed text-txt-black-700">
          All error responses return a JSON body with a single{" "}
          <code className="rounded bg-bg-black-100 px-1.5 py-0.5 font-mono text-body-xs text-txt-black-900">
            error
          </code>{" "}
          field containing a human-readable description of what went wrong:
        </p>
        <DocCodeBlock
          code={`{
  "error": "A human-readable description of the error"
}`}
          lang="json"
          className="mb-8"
        />

        {/* ── Example: Missing parameter ── */}
        <h3
          id="example-missing-parameter"
          className="mb-3 mt-8 font-poppins text-base font-semibold text-txt-black-900"
        >
          Example: Missing parameter
        </h3>
        <p className="mb-3 text-body-sm leading-relaxed text-txt-black-700">
          When a required query parameter is omitted:
        </p>
        <DocCodeBlock
          code={`{
  "error": "Missing required parameter: id"
}`}
          lang="json"
          className="mb-8"
        />

        {/* ── Example: Invalid API key ── */}
        <h3
          id="example-invalid-api-key"
          className="mb-3 mt-8 font-poppins text-base font-semibold text-txt-black-900"
        >
          Example: Invalid API key
        </h3>
        <p className="mb-3 text-body-sm leading-relaxed text-txt-black-700">
          When the{" "}
          <code className="rounded bg-bg-black-100 px-1.5 py-0.5 font-mono text-body-xs text-txt-black-900">
            Authorization
          </code>{" "}
          header is missing or the key is not recognised:
        </p>
        <DocCodeBlock
          code={`{
  "error": "Invalid or missing API key"
}`}
          lang="json"
          className="mb-6"
        />
      </DocLayout>
    </>
  );
};

export const getStaticProps: GetStaticProps = withi18n(null, async () => ({
  props: { meta: { id: "openapi-errors", type: "misc" } },
}));

export default ErrorsPage;
