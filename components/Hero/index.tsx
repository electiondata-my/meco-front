import {
  FunctionComponent,
  ReactNode,
  useMemo,
  useEffect,
  useState,
} from "react";
import Container from "@components/Container";
import { clx, numFormat } from "@lib/helpers";
import { useTranslation } from "next-i18next";
import { EyeIcon } from "@heroicons/react/20/solid";
import HeroPattern from "./hero-pattern";
import SectionGrid from "@components/Section/section-grid";

type ConditionalHeroProps =
  | {
      children?: ReactNode;
      header?: never;
      category?: never;
      description?: never;
      action?: never;
      withPattern?: true;
    }
  | HeroDefault;

type HeroDefault = {
  children?: never;
  header?: [text: string, className?: string];
  category?: [text: string, className?: string];
  description?: [text: string, className?: string] | ReactNode;
  action?: ReactNode;
  withPattern?: true;
};

type HeroProps = {
  background?: "gray" | "blue" | "red" | "purple" | "green" | "orange" | string;
  className?: string;
  pageId?: string;
  sectionGridClassName?: string;
} & ConditionalHeroProps;

const Hero: FunctionComponent<HeroProps> = ({
  background = "gray",
  className,
  children,
  category,
  header,
  description,
  action,
  pageId = "sitewide",
  withPattern,
  sectionGridClassName,
}) => {
  const { t } = useTranslation();

  // Tinybird view count for the given pageId
  const [views, setViews] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchViews = async () => {
      setLoading(true);
      try {
        const token = process.env.NEXT_PUBLIC_TINYBIRD_TOKEN_READ;
        const url = `https://api.us-west-2.aws.tinybird.co/v0/pipes/views_by_page.json?token=${token}&page_id=${pageId}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Network response was not ok");
        const data = await res.json();
        setViews(data?.data?.[0]?.hits ?? null);
      } catch (e) {
        setViews(null);
      } finally {
        setLoading(false);
      }
    };
    fetchViews();
  }, [pageId]);

  const background_style = useMemo<string>(() => {
    switch (background) {
      case "blue":
        return "bg-gradient-radial from-[#A1BFFF] to-slate-50 dark:from-[#203053] dark:to-zinc-900";
      case "red":
        return "bg-gradient-radial from-bg-danger-100 to-bg-white";
      case "purple":
        return "bg-gradient-radial from-[#C4B5FD] to-slate-50 dark:from-[#281843] dark:to-zinc-900";
      case "green":
        return "bg-gradient-radial from-[#CFFCCC] to-slate-50 dark:from-[#1B2C1A] dark:to-zinc-900";
      case "orange":
        return "bg-gradient-radial from-[#FFE5CD] to-slate-50 dark:from-[#2E2014] dark:to-zinc-900";
      case "gray":
        return "bg-gradient-radial from-[#E2E8F0] to-slate-50 dark:from-[#-zinc-700] dark:to-zinc-900";
      default:
        return background;
    }
  }, [background]);

  return (
    <Container
      background={clx(background_style, "")}
      className={clx("relative", className)}
      as="section"
    >
      {withPattern && (
        <div className="absolute flex h-full w-full justify-center overflow-hidden">
          <HeroPattern className="animate-flow absolute motion-reduce:animate-none" />
        </div>
      )}
      {children ? (
        children
      ) : (
        <SectionGrid className={clx(sectionGridClassName)}>
          <div className="flex max-w-[727px] flex-col items-center justify-center space-y-4 pt-16 lg:space-y-6">
            {category && (
              <h3
                className={clx(
                  "text-center text-body-xs font-semibold uppercase leading-5 tracking-[0.2em] lg:text-start lg:text-body-lg",
                  category[1],
                )}
                data-testid="hero-category"
              >
                {category[0]}
              </h3>
            )}

            {header && (
              <h1
                className={clx(
                  "text-center font-heading text-heading-sm font-semibold text-txt-black-900 lg:text-start lg:text-heading-md",
                  header[1],
                )}
                data-testid="hero-header"
              >
                {header[0]}
              </h1>
            )}

            {description && Array.isArray(description) ? (
              <p
                className={clx(
                  "w-full text-center text-body-sm text-txt-black-700 lg:text-body-md",
                  description[1],
                )}
                data-testid="hero-description"
              >
                {description[0]}
              </p>
            ) : (
              description
            )}
            <p
              className="flex gap-0.5 text-body-sm text-txt-black-500"
              data-testid="hero-views"
            >
              <EyeIcon className="h-4.5 w-4.5 self-center" />
              {loading
                ? "..."
                : views !== null
                  ? `${numFormat(views, "standard")} ${t("common:views", { count: views })}`
                  : "---"}
            </p>

            {action}
          </div>
        </SectionGrid>
      )}
    </Container>
  );
};

export default Hero;
