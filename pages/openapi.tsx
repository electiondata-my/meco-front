import Metadata from "@components/Metadata";
import { Hero, Button, Card } from "@components/index";
import Container from "@components/Container";
import { withi18n } from "@lib/decorators";
import { routes } from "@lib/routes";
import { Page } from "@lib/types";
import { clx } from "@lib/helpers";
import { GetStaticProps } from "next";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "/api/auth";

const ENDPOINTS = [
  {
    path: "/candidates",
    description: "All election results for a specific candidate across every contest they have stood in.",
    params: [
      { name: "id", type: "string", description: "Candidate identifier" },
    ],
  },
  {
    path: "/seats/current",
    description: "Election results for a current parliamentary or state seat.",
    params: [
      { name: "seat", type: "string", description: "Seat code — one of 222 parlimen or 600 DUN seats" },
    ],
  },
  {
    path: "/seats/historical",
    description: "Election results for any seat including renamed or abolished constituencies.",
    params: [
      { name: "seat", type: "string", description: "Historical seat code" },
    ],
  },
  {
    path: "/parties",
    description: "Party-level results filtered by state and election type.",
    params: [
      { name: "party_uid", type: "string", description: "Unique party identifier" },
      { name: "state", type: "string", description: "State code" },
      { name: "type", type: "string", description: '"parlimen" or "dun"' },
    ],
  },
  {
    path: "/elections/summary",
    description: "Seats won, contested, and votes received by party and coalition for a given election.",
    params: [
      { name: "state", type: "string", description: "State code" },
      { name: "election", type: "string", description: 'Election identifier (e.g. "GE-15")' },
    ],
  },
  {
    path: "/results",
    description: "Full result for a specific seat on a specific election date.",
    params: [
      { name: "seat", type: "string", description: "Seat code" },
      { name: "date", type: "string", description: "Election date (YYYY-MM-DD)" },
    ],
  },
];

const OpenAPIPage: Page = () => {
  const router = useRouter();
  const [loggedIn, setLoggedIn] = useState<boolean>(false);

  useEffect(() => {
    fetch(`${AUTH_URL}/me`, { credentials: "include" })
      .then(r => setLoggedIn(r.ok))
      .catch(() => setLoggedIn(false));
  }, []);

  return (
    <>
      <Metadata
        title="API Reference"
        description="Programmatic access to Malaysian election data — candidates, seats, parties, and results."
        keywords="API, election data, Malaysia, open data"
      />

      <Hero
        background="red"
        category={["ElectionData.MY", "text-txt-danger"]}
        header={["Public API Reference"]}
        description={["Programmatic access to Malaysian election data — candidates, seats, parties, and results."]}
        action={
          <Button
            variant="default"
            className="border-transparent bg-bg-black-900 px-5 py-2 text-txt-white shadow-none hover:border-transparent hover:bg-bg-black-950 active:bg-bg-black-900 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:border-transparent dark:hover:bg-zinc-700 dark:hover:text-zinc-200 dark:active:bg-zinc-800"
            onClick={() => router.push(loggedIn ? "/console" : "/signin")}
          >
            API Console
          </Button>
        }
        pageId={routes.OPENAPI}
        sectionGridClassName="max-w-screen-2xl"
      />

      <Container as="div" className="py-8 lg:py-12">
        <div className="col-span-full mx-auto w-full max-w-screen-xl">
          <h2 className="mb-6 font-heading text-heading-sm font-semibold text-txt-black-900">
            Endpoints
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {ENDPOINTS.map(endpoint => (
              <Card key={endpoint.path} className="flex flex-col gap-4 p-5">
                <div className="flex items-center gap-2.5">
                  <span className="shrink-0 rounded bg-bg-danger-100 px-2 py-0.5 font-mono text-body-xs font-semibold uppercase tracking-wider text-txt-danger">
                    GET
                  </span>
                  <code className="font-mono text-body-sm font-medium text-txt-black-900">
                    {endpoint.path}
                  </code>
                </div>

                <p className="text-body-sm text-txt-black-700">
                  {endpoint.description}
                </p>

                <div className="flex flex-col gap-2">
                  <p className="text-body-xs font-semibold uppercase tracking-widest text-txt-black-500">
                    Required Parameters
                  </p>
                  <div className="flex flex-col gap-2">
                    {endpoint.params.map(param => (
                      <div
                        key={param.name}
                        className="flex items-start gap-3 rounded-lg border border-otl-gray-200 px-3 py-2"
                      >
                        <code className="shrink-0 font-mono text-body-xs font-semibold text-txt-black-900">
                          {param.name}
                        </code>
                        <span className={clx(
                          "shrink-0 rounded px-1.5 py-0.5 font-mono text-body-2xs font-medium",
                          "bg-bg-black-100 text-txt-black-500"
                        )}>
                          {param.type}
                        </span>
                        <span className="text-body-xs text-txt-black-500">
                          {param.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </Container>
    </>
  );
};

export const getStaticProps: GetStaticProps = withi18n(null, async () => ({
  props: { meta: { id: "openapi", type: "misc" } },
}));

export default OpenAPIPage;
