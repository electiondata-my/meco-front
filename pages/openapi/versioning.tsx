import Metadata from "@components/Metadata";
import DocLayout from "@dashboards/openapi/DocLayout";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { TocItem } from "@dashboards/openapi/config";
import { GetStaticProps } from "next";

const TOC: TocItem[] = [
  { id: "current-version", text: "Current Version", level: 2 },
  { id: "stability-and-breaking-changes", text: "Stability & Breaking Changes", level: 2 },
];

const VersioningPage: Page = () => {
  return (
    <>
      <Metadata
        title="Versioning — API Docs"
        description="API versioning policy and stability guarantees for the ElectionData.MY API."
        keywords="API, versioning, breaking changes, election data"
      />
      <DocLayout
        breadcrumb="General"
        title="Versioning"
        toc={TOC}
      >
        {/* ── Current Version ── */}
        <h2
          id="current-version"
          className="mb-4 mt-10 font-poppins text-xl font-semibold text-txt-black-900 first:mt-0"
        >
          Current Version
        </h2>
        <p className="mb-4 text-body-sm leading-relaxed text-txt-black-700">
          The API is currently <strong>unversioned</strong>. There is no{" "}
          <code className="rounded bg-bg-black-100 px-1.5 py-0.5 font-mono text-body-xs text-txt-black-900">
            /v1/
          </code>{" "}
          prefix in the URL. All endpoints are served directly from the base
          URL:
        </p>
        <div className="mb-6 rounded-xl border border-otl-gray-200 bg-bg-washed px-4 py-3">
          <code className="font-mono text-body-sm text-txt-black-900">
            https://api.electiondata.my
          </code>
        </div>
        <p className="mb-4 text-body-sm leading-relaxed text-txt-black-700">
          This means you can call endpoints like{" "}
          <code className="rounded bg-bg-black-100 px-1.5 py-0.5 font-mono text-body-xs text-txt-black-900">
            https://api.electiondata.my/candidates?id=YQJ5S
          </code>{" "}
          without any version segment. If and when a versioned API is
          introduced, existing unversioned URLs will continue to work to
          preserve backwards compatibility.
        </p>

        {/* ── Stability & Breaking Changes ── */}
        <h2
          id="stability-and-breaking-changes"
          className="mb-4 mt-10 font-poppins text-xl font-semibold text-txt-black-900"
        >
          Stability &amp; Breaking Changes
        </h2>
        <p className="mb-4 text-body-sm leading-relaxed text-txt-black-700">
          We aim to maintain backwards compatibility wherever possible. The
          following are considered <strong>non-breaking</strong> changes and may
          happen at any time without notice:
        </p>
        <ul className="mb-6 space-y-2 text-body-sm text-txt-black-700">
          {[
            "Adding new optional query parameters to existing endpoints.",
            "Adding new fields to JSON response objects.",
            "Adding new endpoints.",
            "Improving error messages or adding additional detail to existing error responses.",
          ].map(item => (
            <li key={item} className="flex items-start gap-3 leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bg-black-400" />
              {item}
            </li>
          ))}
        </ul>
        <p className="mb-4 text-body-sm leading-relaxed text-txt-black-700">
          The following are considered <strong>breaking</strong> changes and
          will be announced in advance:
        </p>
        <ul className="mb-6 space-y-2 text-body-sm text-txt-black-700">
          {[
            "Removing or renaming existing fields from response objects.",
            "Changing the type or format of existing response fields.",
            "Removing or renaming existing endpoints.",
            "Making previously optional parameters required.",
          ].map(item => (
            <li key={item} className="flex items-start gap-3 leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-txt-danger" />
              {item}
            </li>
          ))}
        </ul>
        <div className="rounded-xl border border-otl-gray-200 bg-bg-washed px-5 py-4 text-body-sm text-txt-black-700">
          <strong className="text-txt-black-900">Note:</strong> A changelog and
          announcement mechanism is planned. Check back here or watch the{" "}
          <a
            href="https://github.com/electiondata-my/meco-front"
            target="_blank"
            rel="noopener noreferrer"
            className="text-txt-danger underline underline-offset-2 hover:opacity-80"
          >
            GitHub repository
          </a>{" "}
          for updates.
        </div>
      </DocLayout>
    </>
  );
};

export const getStaticProps: GetStaticProps = withi18n(null, async () => ({
  props: { meta: { id: "openapi-versioning", type: "misc" } },
}));

export default VersioningPage;
