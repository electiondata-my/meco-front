import { ArticleLayout, getArticleMdxComponents } from "@components/Article";
import Metadata from "@components/Metadata";
import { getArticle } from "@lib/articles";
import { withi18n } from "@lib/decorators";
import { Page } from "@lib/types";
import { GetStaticProps, InferGetStaticPropsType } from "next";
import { MDXRemote } from "next-mdx-remote";

const AboutPage: Page = ({
  article,
}: InferGetStaticPropsType<typeof getStaticProps>) => {
  const components = getArticleMdxComponents(
    article.frontmatter.principles ?? [],
  );

  return (
    <>
      <Metadata
        title={article.frontmatter.title}
        description={article.frontmatter.description}
        keywords="MECo, Malaysian Election Corpus, Malaysian election data, open data"
      />
      <ArticleLayout title={article.frontmatter.title}>
        <MDXRemote {...article.source} components={components} />
      </ArticleLayout>
    </>
  );
};

export const getStaticProps: GetStaticProps = withi18n(
  null,
  async ({ locale }) => {
    const article = await getArticle("about", "about", locale);

    return {
      props: {
        meta: {
          id: "about",
          type: "misc",
        },
        article,
      },
    };
  },
);

export default AboutPage;
