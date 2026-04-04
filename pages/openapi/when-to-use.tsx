import Metadata from "@components/Metadata";
import DocLayout from "@dashboards/openapi/DocLayout";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { TocItem } from "@dashboards/openapi/config";
import { GetStaticProps } from "next";
import Link from "next/link";

const TOC: TocItem[] = [
  { id: "use-the-api-when", text: "API Query", level: 2 },
  { id: "use-the-catalogue-instead", text: "Data Lake", level: 2 },
];

const WhenToUsePage: Page = () => {
  return (
    <>
      <Metadata
        title="API vs. Data Catalogue"
        description="Guidance on when to use the ElectionData.MY API vs. the Data Lake."
        keywords="API, election data, Malaysia, guidance"
      />
      <DocLayout
        breadcrumb="General"
        title="API vs. Data Lake"
        toc={TOC}
      >
        <p className="mb-8 text-body-sm leading-relaxed text-txt-black-700">
          The API and the{" "}
          <a
            href="https://electiondata.my/data-catalogue"
            target="_blank"
            rel="noopener noreferrer"
            className="text-txt-danger underline underline-offset-2 hover:opacity-80"
          >
            Data Catalogue
          </a>{" "}
          serve different use cases. This page helps you choose the right
          tool for your needs.
        </p>

        {/* ── Use the API when ── */}
        <h2
          id="use-the-api-when"
          className="mb-4 mt-10 font-poppins text-xl font-semibold text-txt-black-900 first:mt-0"
        >
          Use the API when…
        </h2>
        <ul className="space-y-3 text-body-sm text-txt-black-700">
          {[
            "You are building a dynamic application that queries election data on demand — e.g. a candidate lookup tool or a live election dashboard.",
            "You need to look up specific candidates, seats, or results programmatically, rather than downloading a full dataset.",
            "You are embedding election data into another product, such as a news app, civic platform, or data pipeline.",
            "You want to retrieve structured JSON and handle parsing and filtering yourself within your application.",
            "You need the freshest available data without waiting for a manual download cycle.",
          ].map(item => (
            <li key={item} className="flex items-start gap-3 leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-txt-danger" />
              {item}
            </li>
          ))}
        </ul>

        {/* ── Use the Data Catalogue instead ── */}
        <h2
          id="use-the-catalogue-instead"
          className="mb-4 mt-10 font-poppins text-xl font-semibold text-txt-black-900"
        >
          Use the Data Catalogue instead when…
        </h2>
        <ul className="space-y-3 text-body-sm text-txt-black-700">
          {[
            "You need bulk data for offline analysis — the Catalogue provides full dataset downloads in CSV and Parquet format.",
            "You are working in Python, R, or a BI tool and prefer direct file downloads over API calls.",
            "You need geospatial or boundary data (GeoJSON, Parquet, FlatGeobuf) — these are better served as static files than as API responses.",
            "You are doing a one-off research project that does not require live querying or real-time updates.",
            "You want to explore all available datasets interactively before deciding what to build.",
          ].map(item => (
            <li key={item} className="flex items-start gap-3 leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bg-black-400" />
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-8 rounded-xl border border-otl-gray-200 bg-bg-washed px-5 py-4 text-body-sm text-txt-black-700">
          <strong className="text-txt-black-900">Not sure?</strong> Start with
          the{" "}
          <a
            href="https://electiondata.my/data-catalogue"
            target="_blank"
            rel="noopener noreferrer"
            className="text-txt-danger underline underline-offset-2 hover:opacity-80"
          >
            Data Catalogue
          </a>{" "}
          to explore what's available. If you find yourself writing scripts to
          join, filter, or repeatedly re-download data, the API is likely the
          better fit.
        </div>
      </DocLayout>
    </>
  );
};

export const getStaticProps: GetStaticProps = withi18n(null, async () => ({
  props: { meta: { id: "openapi-when-to-use", type: "misc" } },
}));

export default WhenToUsePage;
