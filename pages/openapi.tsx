import { GetStaticProps } from "next";
import { MDXRemote, MDXRemoteSerializeResult } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import Metadata from "@components/Metadata";
import DocLayout from "@dashboards/openapi/DocLayout";
import { mdxComponents } from "@dashboards/openapi/mdx/components";
import { withi18n } from "@lib/decorators";
import type { TocItem } from "@dashboards/openapi/config";
import { readDocFile, extractToc, type DocFrontmatter } from "@lib/docs";

interface Props {
  source: MDXRemoteSerializeResult;
  frontmatter: DocFrontmatter;
  toc: TocItem[];
}

export default function OpenAPIIndexPage({ source, frontmatter, toc }: Props) {
  return (
    <>
      <Metadata
        title={`${frontmatter.title} — API Docs`}
        description={frontmatter.description}
        keywords={frontmatter.keywords}
      />
      <DocLayout
        breadcrumb={frontmatter.breadcrumb}
        title={frontmatter.title}
        toc={toc}
      >
        <MDXRemote {...source} components={mdxComponents} />
      </DocLayout>
    </>
  );
}

export const getStaticProps: GetStaticProps = withi18n(null, async () => {
  const { content, frontmatter } = readDocFile(["introduction"]);

  const source = await serialize(content, {
    mdxOptions: {
      remarkPlugins: [],
      rehypePlugins: [],
    },
    blockJS: false,
  });

  const toc = extractToc(content);

  return {
    props: {
      meta: { id: "openapi-introduction", type: "misc" as const },
      source,
      frontmatter,
      toc,
    },
  };
});
