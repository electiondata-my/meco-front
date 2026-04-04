import Metadata from "@components/Metadata";
import DocLayout from "@dashboards/openapi/DocLayout";
import DocCodeBlock from "@dashboards/openapi/DocCodeBlock";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { TocItem } from "@dashboards/openapi/config";
import { GetStaticProps } from "next";
import Link from "next/link";

const TOC: TocItem[] = [
  { id: "api-keys", text: "API Keys", level: 2 },
  { id: "getting-an-api-key", text: "Getting an API Key", level: 2 },
  { id: "example-authenticated-request", text: "Example request", level: 2 },
  { id: "security", text: "Security", level: 2 },
];

const AuthenticationPage: Page = () => {
  return (
    <>
      <Metadata
        title="Authentication — API Docs"
        description="Learn how to authenticate your requests to the ElectionData.MY API."
        keywords="API, authentication, API key, election data"
      />
      <DocLayout
        breadcrumb="General"
        title="Authentication"
        toc={TOC}
      >
        {/* ── API Keys ── */}
        <h2
          id="api-keys"
          className="mb-4 mt-10 font-poppins text-xl font-semibold text-txt-black-900 first:mt-0"
        >
          API Keys
        </h2>
        <p className="mb-4 text-body-sm leading-relaxed text-txt-black-700">
          All requests to the ElectionData.MY API must be authenticated using a
          Bearer token in the{" "}
          <code className="rounded bg-bg-black-100 px-1.5 py-0.5 font-mono text-body-xs text-txt-black-900">
            Authorization
          </code>{" "}
          header. Requests without a valid API key will receive a{" "}
          <code className="rounded bg-bg-black-100 px-1.5 py-0.5 font-mono text-body-xs text-txt-black-900">
            401 Unauthorized
          </code>{" "}
          response.
        </p>
        <DocCodeBlock
          code={`Authorization: Bearer <your-api-key>`}
          lang="bash"
          className="mb-6"
        />

        {/* ── Getting an API Key ── */}
        <h2
          id="getting-an-api-key"
          className="mb-4 mt-10 font-poppins text-xl font-semibold text-txt-black-900"
        >
          Getting an API Key
        </h2>
        <p className="mb-4 text-body-sm leading-relaxed text-txt-black-700">
          API keys are generated through the{" "}
          <Link
            href="/console"
            className="text-txt-danger underline underline-offset-2 hover:opacity-80"
          >
            API Console
          </Link>
          . The process takes under a minute:
        </p>
        <ol className="mb-6 space-y-3 text-body-sm text-txt-black-700">
          {[
            <>
              Visit the{" "}
              <Link
                href="/console"
                className="text-txt-danger underline underline-offset-2 hover:opacity-80"
              >
                API Console
              </Link>
              .
            </>,
            <>
              Sign in with your email address — a one-time passcode (OTP) will
              be sent to your inbox.
            </>,
            <>
              Once signed in, click <strong>Generate Key</strong>, give it a
              descriptive name (e.g.{" "}
              <em>production-pipeline</em> or{" "}
              <em>local-dev</em>), and copy it.
            </>,
            <>
              Include the key as a{" "}
              <code className="rounded bg-bg-black-100 px-1.5 py-0.5 font-mono text-body-xs text-txt-black-900">
                Bearer
              </code>{" "}
              token in the{" "}
              <code className="rounded bg-bg-black-100 px-1.5 py-0.5 font-mono text-body-xs text-txt-black-900">
                Authorization
              </code>{" "}
              header of every API request.
            </>,
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 leading-relaxed">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg-danger-100 font-mono text-body-2xs font-semibold text-txt-danger">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <div className="mb-6 rounded-xl border border-otl-gray-200 bg-bg-washed px-5 py-4 text-body-sm text-txt-black-700">
          You can generate up to{" "}
          <strong className="text-txt-black-900">15 API keys</strong> per
          account — more than enough to maintain separate keys for
          development, staging, and production.
        </div>

        {/* ── Example request ── */}
        <h2
          id="example-authenticated-request"
          className="mb-4 mt-10 font-poppins text-xl font-semibold text-txt-black-900"
        >
          Example authenticated request
        </h2>
        <p className="mb-4 text-body-sm leading-relaxed text-txt-black-700">
          Here is a complete example showing how to pass your API key:
        </p>
        <DocCodeBlock
          code={`curl -X GET "https://api.electiondata.my/candidates?id=YQJ5S" \\
  -H "Authorization: Bearer your-api-key-here"`}
          lang="bash"
          className="mb-6"
        />

        {/* ── Security ── */}
        <h2
          id="security"
          className="mb-4 mt-10 font-poppins text-xl font-semibold text-txt-black-900"
        >
          Security
        </h2>
        <ul className="space-y-3 text-body-sm text-txt-black-700">
          {[
            "Treat your API key like a password. Anyone with the key can make authenticated requests on your behalf.",
            "Do not commit your API key to public repositories. Use environment variables or a secrets manager instead.",
            "If a key is compromised, revoke it immediately from the API Console and generate a replacement.",
            "All API requests are logged. Please use the API responsibly and in accordance with the data's CC0 licence.",
          ].map(item => (
            <li key={item} className="flex items-start gap-3 leading-relaxed">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-txt-danger" />
              {item}
            </li>
          ))}
        </ul>
      </DocLayout>
    </>
  );
};

export const getStaticProps: GetStaticProps = withi18n(null, async () => ({
  props: { meta: { id: "openapi-authentication", type: "misc" } },
}));

export default AuthenticationPage;
