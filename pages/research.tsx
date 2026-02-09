import Metadata from "@components/Metadata";
import Hero from "@components/Hero";
import Container from "@components/Container";
import SectionGrid from "@components/Section/section-grid";
import { AnalyticsProvider } from "@lib/contexts/analytics";
import { useTranslation } from "@hooks/useTranslation";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { GetStaticProps, InferGetStaticPropsType } from "next";
import Image from "next/image";
import Link from "next/link";
import { clx } from "@lib/helpers";
import { routes } from "@lib/routes";
import { DocumentIcon } from "@heroicons/react/24/outline";

type PaperStatus = "published" | "preprint" | "coming_soon";

interface Paper {
  key: string;
  status: PaperStatus;
  url?: string;
  thumbnail?: string;
}

const PAPERS: Paper[] = [
  {
    key: "paper_1",
    status: "published",
    url: "https://www.nature.com/articles/s41597-025-06502-7",
    thumbnail: "/static/research/paper-1.png",
  },
  {
    key: "paper_2",
    status: "preprint",
    url: "https://arxiv.org/abs/2512.24211",
    thumbnail: "/static/research/paper-2.png",
  },
  {
    key: "paper_3",
    status: "coming_soon",
  },
  {
    key: "paper_4",
    status: "coming_soon",
  },
];

const PaperCard = ({ paper }: { paper: Paper }) => {
  const { t } = useTranslation("research");
  const isComingSoon = paper.status === "coming_soon";

  const content = (
    <div
      className={clx(
        "group flex h-full flex-col overflow-hidden rounded-xl border border-otl-gray-200 bg-bg-white transition dark:bg-zinc-900",
        !isComingSoon && "cursor-pointer hover:shadow-lg hover:border-otl-gray-300",
        isComingSoon && "opacity-75",
      )}
    >
      {/* A4 preview area */}
      <div className="relative aspect-[1/0.707] w-full overflow-hidden bg-gray-50 sm:aspect-[1/1.414] dark:bg-zinc-800">
        {paper.thumbnail ? (
          <Image
            src={paper.thumbnail}
            alt={t(`${paper.key}.title`)}
            fill
            className="object-cover object-top transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <DocumentIcon className="size-12 text-gray-300 dark:text-zinc-600" />
            <p className="text-body-sm font-medium text-gray-400 dark:text-zinc-500">
              {t("coming_soon")}
            </p>
          </div>
        )}
      </div>

      {/* Details below the preview */}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="font-poppins text-body-sm font-semibold leading-snug text-txt-black-900 lg:text-body-md">
          {t(`${paper.key}.title`)}
        </h3>
        <p className="text-body-2xs text-txt-black-500 lg:text-body-sm">
          {t(`${paper.key}.authors`)}
        </p>
        <p className="text-body-2xs font-medium italic text-txt-black-700 lg:text-body-sm">
          {t(`${paper.key}.venue`)}
        </p>
      </div>
    </div>
  );

  if (paper.url) {
    return (
      <Link
        href={paper.url}
        target="_blank"
        className="no-underline"
        aria-label={t(`${paper.key}.title`)}
      >
        {content}
      </Link>
    );
  }

  return content;
};

const ResearchPage: Page = ({
  meta,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const { t } = useTranslation("research");

  return (
    <AnalyticsProvider meta={meta}>
      <Metadata
        title={t("hero.header")}
        description={t("hero.description")}
        keywords="MECo, Malaysian Election Corpus, election data, research, Malaysia"
      />

      <Hero
        background="red"
        category={[t("hero.category"), "text-txt-danger"]}
        header={[t("hero.header")]}
        description={[t("hero.description")]}
        pageId={routes.RESEARCH}
      />

      <Container className="pb-12 pt-6 lg:pt-8">
        <SectionGrid>
          <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:gap-6">
            {PAPERS.map((paper) => (
              <PaperCard key={paper.key} paper={paper} />
            ))}
          </div>
        </SectionGrid>
      </Container>
    </AnalyticsProvider>
  );
};

export const getStaticProps: GetStaticProps = withi18n(
  "research",
  async () => {
    return {
      props: {
        meta: {
          id: "research",
          type: "misc",
        },
      },
    };
  },
);

export default ResearchPage;
