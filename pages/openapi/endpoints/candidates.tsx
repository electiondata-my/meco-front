import Metadata from "@components/Metadata";
import DocLayout from "@dashboards/openapi/DocLayout";
import DocCodeBlock from "@dashboards/openapi/DocCodeBlock";
import DocApiTester from "@dashboards/openapi/DocApiTester";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { TocItem } from "@dashboards/openapi/config";
import { GetStaticProps } from "next";
import { clx } from "@lib/helpers";
import { useState } from "react";

const TOC: TocItem[] = [
  { id: "overview", text: "Overview", level: 2 },
  { id: "endpoint", text: "Endpoint", level: 2 },
  { id: "parameters", text: "Parameters", level: 2 },
  { id: "try-it", text: "Try it", level: 2 },
  { id: "example-request", text: "Example Request", level: 2 },
  { id: "example-response", text: "Example Response", level: 2 },
];

const CURL_CODE = `curl -X GET "https://api.electiondata.my/candidates?id=YQJ5S" \\
  -H "Authorization: Bearer <your-api-key>"`;

const JS_CODE = `const response = await fetch(
  "https://api.electiondata.my/candidates?id=YQJ5S",
  {
    headers: {
      "Authorization": "Bearer <your-api-key>"
    }
  }
);

const data = await response.json();
console.log(data);`;

const EXAMPLE_RESPONSE = JSON.stringify(
  [
    {
      election: "GE-15",
      date: "2022-11-19",
      seat: "P128-Lembah Pantai",
      seat_type: "parlimen",
      state: "Wilayah Persekutuan Kuala Lumpur",
      party: "PKR",
      coalition: "Pakatan Harapan",
      votes: 31827,
      result: "won",
      majority: 8921,
    },
    {
      election: "GE-14",
      date: "2018-05-09",
      seat: "P128-Lembah Pantai",
      seat_type: "parlimen",
      state: "Wilayah Persekutuan Kuala Lumpur",
      party: "PKR",
      coalition: "Pakatan Harapan",
      votes: 29154,
      result: "won",
      majority: 6083,
    },
    {
      election: "GE-13",
      date: "2013-05-05",
      seat: "P128-Lembah Pantai",
      seat_type: "parlimen",
      state: "Wilayah Persekutuan Kuala Lumpur",
      party: "PKR",
      coalition: "Pakatan Rakyat",
      votes: 22135,
      result: "lost",
      majority: -6817,
    },
    {
      election: "GE-12",
      date: "2008-03-08",
      seat: "N28-Pantai Dalam",
      seat_type: "dun",
      state: "Wilayah Persekutuan Kuala Lumpur",
      party: "PKR",
      coalition: "Pakatan Rakyat",
      votes: 18342,
      result: "won",
      majority: 3901,
    },
  ],
  null,
  2,
);

type CodeTab = "curl" | "javascript";

function TabCodeBlock() {
  const [active, setActive] = useState<CodeTab>("curl");
  return (
    <div className="overflow-hidden rounded-xl border border-otl-gray-200">
      {/* Tab bar */}
      <div className="flex border-b border-otl-gray-200 bg-bg-washed">
        {(["curl", "javascript"] as CodeTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActive(tab)}
            className={clx(
              "px-4 py-2.5 text-body-xs font-medium transition-colors",
              active === tab
                ? "border-b-2 border-txt-danger text-txt-danger"
                : "text-txt-black-500 hover:text-txt-black-700",
            )}
          >
            {tab === "curl" ? "cURL" : "JavaScript"}
          </button>
        ))}
      </div>
      {/* Code */}
      <div className="relative">
        {active === "curl" ? (
          <DocCodeBlock code={CURL_CODE} lang="bash" className="rounded-none border-0" />
        ) : (
          <DocCodeBlock code={JS_CODE} lang="javascript" className="rounded-none border-0" />
        )}
      </div>
    </div>
  );
}

const CandidatesPage: Page = () => {
  return (
    <>
      <Metadata
        title="Candidates — API Docs"
        description="Query election results for any candidate across every contest they have stood in."
        keywords="API, candidates, election data, Malaysia"
      />
      <DocLayout
        breadcrumb="Endpoints"
        title="Candidates"
        toc={TOC}
      >
        {/* ── Overview ── */}
        <h2
          id="overview"
          className="mb-4 mt-10 font-poppins text-xl font-semibold text-txt-black-900 first:mt-0"
        >
          Overview
        </h2>
        <p className="mb-4 text-body-sm leading-relaxed text-txt-black-700">
          The{" "}
          <code className="rounded bg-bg-black-100 px-1.5 py-0.5 font-mono text-body-xs text-txt-black-900">
            /candidates
          </code>{" "}
          endpoint returns all election results for a specific candidate across
          every contest they have ever stood in — covering both parliamentary (
          <em>parlimen</em>) and state (<em>DUN</em>) elections, and spanning
          all general elections and by-elections in the database.
        </p>
        <p className="text-body-sm leading-relaxed text-txt-black-700">
          Results are returned as a JSON array, ordered from most recent to
          oldest. Each object represents one electoral contest and includes
          the seat, party, coalition, vote count, and outcome.
        </p>

        {/* ── Endpoint ── */}
        <h2
          id="endpoint"
          className="mb-4 mt-10 font-poppins text-xl font-semibold text-txt-black-900"
        >
          Endpoint
        </h2>
        <div className="flex items-center gap-3 rounded-xl border border-otl-gray-200 bg-bg-washed px-4 py-3">
          <span className="shrink-0 rounded bg-bg-danger-100 px-2 py-0.5 font-mono text-body-xs font-semibold uppercase tracking-wider text-txt-danger">
            GET
          </span>
          <code className="font-mono text-body-sm text-txt-black-900">
            https://api.electiondata.my/candidates
          </code>
        </div>

        {/* ── Parameters ── */}
        <h2
          id="parameters"
          className="mb-4 mt-10 font-poppins text-xl font-semibold text-txt-black-900"
        >
          Parameters
        </h2>
        <div className="mb-4 overflow-hidden rounded-xl border border-otl-gray-200">
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
            <tbody>
              <tr className="bg-bg-white">
                <td className="px-4 py-3">
                  <code className="rounded bg-bg-black-100 px-1.5 py-0.5 font-mono text-body-xs font-semibold text-txt-black-900">
                    id
                  </code>
                </td>
                <td className="px-4 py-3 font-mono text-body-xs text-txt-black-500">
                  string
                </td>
                <td className="px-4 py-3">
                  <span className="rounded bg-bg-danger-100 px-1.5 py-0.5 text-body-xs font-semibold text-txt-danger">
                    Yes
                  </span>
                </td>
                <td className="px-4 py-3 text-txt-black-600">
                  The unique candidate identifier (e.g.{" "}
                  <code className="rounded bg-bg-black-100 px-1 py-0.5 font-mono text-body-2xs text-txt-black-900">
                    YQJ5S
                  </code>
                  ).
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-body-xs text-txt-black-500">
          Candidate IDs can be found via the{" "}
          <a
            href="https://electiondata.my/candidates"
            target="_blank"
            rel="noopener noreferrer"
            className="text-txt-danger underline underline-offset-2 hover:opacity-80"
          >
            Candidates
          </a>{" "}
          section of the website, or by referencing the downloadable candidate
          datasets in the{" "}
          <a
            href="https://electiondata.my/data-catalogue"
            target="_blank"
            rel="noopener noreferrer"
            className="text-txt-danger underline underline-offset-2 hover:opacity-80"
          >
            Data Catalogue
          </a>
          .
        </p>

        {/* ── Try it ── */}
        <h2
          id="try-it"
          className="mb-4 mt-10 font-poppins text-xl font-semibold text-txt-black-900"
        >
          Try it
        </h2>
        <DocApiTester
          endpoint="/candidates"
          defaultParams={{ id: "YQJ5S" }}
          paramDescriptions={{ id: "candidate identifier" }}
        />

        {/* ── Example Request ── */}
        <h2
          id="example-request"
          className="mb-4 mt-10 font-poppins text-xl font-semibold text-txt-black-900"
        >
          Example Request
        </h2>
        <TabCodeBlock />

        {/* ── Example Response ── */}
        <h2
          id="example-response"
          className="mb-4 mt-10 font-poppins text-xl font-semibold text-txt-black-900"
        >
          Example Response
        </h2>
        <p className="mb-4 text-body-sm leading-relaxed text-txt-black-700">
          A successful{" "}
          <code className="rounded bg-bg-black-100 px-1.5 py-0.5 font-mono text-body-xs text-txt-black-900">
            200 OK
          </code>{" "}
          response returns a JSON array of result objects. The example below
          uses candidate{" "}
          <code className="rounded bg-bg-black-100 px-1.5 py-0.5 font-mono text-body-xs text-txt-black-900">
            YQJ5S
          </code>
          :
        </p>
        <DocCodeBlock code={EXAMPLE_RESPONSE} lang="json" />

        {/* Field descriptions */}
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
              {[
                { field: "election", type: "string", desc: 'Election identifier, e.g. "GE-15" or "BE-2023-08".' },
                { field: "date", type: "string", desc: "Polling day in ISO 8601 format (YYYY-MM-DD)." },
                { field: "seat", type: "string", desc: 'Seat code and name, e.g. "P128-Lembah Pantai".' },
                { field: "seat_type", type: "string", desc: '"parlimen" for parliamentary seats, "dun" for state seats.' },
                { field: "state", type: "string", desc: "State or federal territory where the seat is located." },
                { field: "party", type: "string", desc: "Acronym of the party the candidate contested under." },
                { field: "coalition", type: "string", desc: "Coalition the party was part of for this election, if any." },
                { field: "votes", type: "number", desc: "Total votes received by the candidate." },
                { field: "result", type: "string", desc: '"won" or "lost".' },
                { field: "majority", type: "number", desc: "Vote majority (positive if won, negative if lost)." },
              ].map(row => (
                <tr key={row.field} className="bg-bg-white hover:bg-bg-washed">
                  <td className="px-4 py-2.5">
                    <code className="font-mono text-body-2xs font-semibold text-txt-black-900">
                      {row.field}
                    </code>
                  </td>
                  <td className="px-4 py-2.5 font-mono text-body-2xs text-txt-black-500">
                    {row.type}
                  </td>
                  <td className="px-4 py-2.5 text-txt-black-600">{row.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DocLayout>
    </>
  );
};

export const getStaticProps: GetStaticProps = withi18n(null, async () => ({
  props: { meta: { id: "openapi-candidates", type: "misc" } },
}));

export default CandidatesPage;
