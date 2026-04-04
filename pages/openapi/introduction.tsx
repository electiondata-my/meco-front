import Metadata from "@components/Metadata";
import DocLayout from "@dashboards/openapi/DocLayout";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { TocItem } from "@dashboards/openapi/config";
import { GetStaticProps } from "next";
import Link from "next/link";

const TOC: TocItem[] = [
  { id: "electiondata-my-api", text: "ElectionData.MY API", level: 2 },
  { id: "who-is-this-for", text: "Who is this for?", level: 2 },
  { id: "base-url", text: "Base URL", level: 2 },
];

const IntroductionPage: Page = () => {
  return (
    <>
      <Metadata
        title="Introduction — API Docs"
        description="Programmatic access to Malaysian election data — candidates, seats, parties, and results."
        keywords="API, election data, Malaysia, introduction"
      />
      <DocLayout
        breadcrumb="General"
        title="Introduction"
        toc={TOC}
      >
        {/* ── ElectionData.MY API ── */}
        <h2
          id="electiondata-my-api"
          className="mb-4 mt-10 font-poppins text-xl font-semibold text-txt-black-900 first:mt-0"
        >
          ElectionData.MY API
        </h2>
        <div className="space-y-4 text-body-sm leading-relaxed text-txt-black-700">
          <p>
            Welcome to the ElectionData.MY API — the programmatic interface to
            Malaysia's most comprehensive election data archive. The API gives
            you structured, machine-readable access to election results spanning
            parliamentary (<em>parlimen</em>) and state (<em>DUN</em>) contests
            across every general election and by-election in our database.
          </p>
          <p>
            Whether you're querying individual candidates, looking up historical
            seat results, or building a data pipeline that ingests fresh
            results as they're published, the API provides a consistent,
            versioned interface. All data is released under{" "}
            <strong>CC0 (No Rights Reserved)</strong> — you are free to use it
            for any purpose, commercial or otherwise, without attribution.
          </p>
          <p>
            The API is free to access. You'll need an API key, which you can
            generate in seconds from the{" "}
            <Link
              href="/openapi/authentication"
              className="text-txt-danger underline underline-offset-2 hover:opacity-80"
            >
              API Console
            </Link>
            . The service is built and maintained by the team behind{" "}
            <a
              href="https://electiondata.my"
              target="_blank"
              rel="noopener noreferrer"
              className="text-txt-danger underline underline-offset-2 hover:opacity-80"
            >
              electiondata.my
            </a>
            .
          </p>
        </div>

        {/* ── Who is this for? ── */}
        <h2
          id="who-is-this-for"
          className="mb-4 mt-10 font-poppins text-xl font-semibold text-txt-black-900"
        >
          Who is this for?
        </h2>
        <ul className="space-y-2 text-body-sm text-txt-black-700">
          {[
            "Developers building civic tech applications, election dashboards, or data visualisations.",
            "Journalists and researchers doing data-driven analysis of Malaysian electoral trends.",
            "Educators creating interactive tools or study materials about Malaysian democracy.",
            "Citizens curious about candidate histories, seat trajectories, and party performance over time.",
          ].map(item => (
            <li key={item} className="flex items-start gap-2 leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-txt-danger" />
              {item}
            </li>
          ))}
        </ul>

        {/* ── Base URL ── */}
        <h2
          id="base-url"
          className="mb-4 mt-10 font-poppins text-xl font-semibold text-txt-black-900"
        >
          Base URL
        </h2>
        <p className="mb-4 text-body-sm leading-relaxed text-txt-black-700">
          All API requests are made to the following base URL:
        </p>
        <div className="rounded-xl border border-otl-gray-200 bg-bg-washed px-4 py-3">
          <code className="font-mono text-body-sm text-txt-black-900">
            https://api.electiondata.my
          </code>
        </div>
        <p className="mt-4 text-body-sm leading-relaxed text-txt-black-700">
          Append the endpoint path and query parameters to construct a full
          request URL. For example:{" "}
          <code className="rounded bg-bg-black-100 px-1.5 py-0.5 font-mono text-body-xs text-txt-black-900">
            https://api.electiondata.my/candidates?id=YQJ5S
          </code>
          .
        </p>
      </DocLayout>
    </>
  );
};

export const getStaticProps: GetStaticProps = withi18n(null, async () => ({
  props: { meta: { id: "openapi-introduction", type: "misc" } },
}));

export default IntroductionPage;
