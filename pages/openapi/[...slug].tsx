import { GetStaticPaths, GetStaticProps } from "next";
import { MDXRemote, MDXRemoteSerializeResult } from "next-mdx-remote";
import { serialize } from "next-mdx-remote/serialize";
import Metadata from "@components/Metadata";
import DocLayout from "@dashboards/openapi/DocLayout";
import { mdxComponents } from "@dashboards/openapi/mdx/components";
import { withi18n } from "@lib/decorators";
import type { TocItem } from "@dashboards/openapi/config";
import {
  getAllDocSlugs,
  readDocFile,
  extractToc,
  type DocFrontmatter,
} from "@lib/docs";

interface Props {
  source: MDXRemoteSerializeResult;
  frontmatter: DocFrontmatter;
  toc: TocItem[];
}

export default function DocPage({ source, frontmatter, toc }: Props) {
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

export const getStaticPaths: GetStaticPaths = async () => {
  const slugs = getAllDocSlugs();
  return {
    paths: slugs.map(parts => ({ params: { slug: parts } })),
    fallback: false,
  };
};

export const getStaticProps: GetStaticProps = withi18n(
  null,
  async ({ params }) => {
    const slugParts = params?.slug as string[];
    const { content, frontmatter } = readDocFile(slugParts);

    const source = await serialize(content, {
      mdxOptions: {
        remarkPlugins: [],
        rehypePlugins: [],
      },
    });

    const toc = extractToc(content);
    const id = `openapi-${slugParts.join("-")}`;

    return {
      props: {
        meta: { id, type: "misc" as const },
        source,
        frontmatter,
        toc,
      },
    };
  },
);
