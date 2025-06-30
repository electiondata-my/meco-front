import {
  FunctionComponent,
  ReactNode,
  useContext,
  useMemo,
  useEffect,
  useState,
} from "react";
import Container from "@components/Container";
import { clx, numFormat, toDate } from "@lib/helpers";
import { useTranslation } from "next-i18next";
import { AnalyticsContext } from "@lib/contexts/analytics";
import { EyeIcon } from "@heroicons/react/20/solid";

type ConditionalHeroProps =
  | {
      children?: ReactNode;
      last_updated?: never;
      header?: never;
      category?: never;
      description?: never;
      action?: never;
    }
  | HeroDefault;

type HeroDefault = {
  children?: never;
  last_updated?: string | number;
  header?: [text: string, className?: string];
  category?: [text: string, className?: string];
  description?: [text: string, className?: string] | ReactNode;
  action?: ReactNode;
};

type HeroProps = {
  background?: "gray" | "blue" | "red" | "purple" | "green" | "orange" | string;
  className?: string;
  pageId?: string;
} & ConditionalHeroProps;

const Hero: FunctionComponent<HeroProps> = ({
  background = "gray",
  className,
  children,
  category,
  header,
  description,
  action,
  last_updated,
  pageId = "sitewide",
}) => {
  const { t, i18n } = useTranslation();
  const { result } = useContext(AnalyticsContext);

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
        setViews(data?.data?.[0]?.hits ?? 0);
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
        return "bg-gradient-radial from-[#FFE1E1] to-slate-50 dark:from-[#492424] dark:to-zinc-900";
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
      background={clx(background_style, "border-b dark:border-zinc-800")}
      className={clx("relative", className)}
    >
      {children ? (
        children
      ) : (
        <div>
          <div className="space-y-6 py-12 xl:w-full">
            {category && (
              <div className="relative flex justify-between">
                {category && (
                  <span
                    className={clx(
                      "text-base font-semibold uppercase",
                      category[1]
                    )}
                    data-testid="hero-category"
                  >
                    {category[0]}
                  </span>
                )}
              </div>
            )}

            {(header || description || result?.view_count) && (
              <div className="space-y-3">
                {header && (
                  <h2
                    className={clx("text-zinc-900", header[1])}
                    data-testid="hero-header"
                  >
                    {header[0]}
                  </h2>
                )}

                {description && Array.isArray(description) ? (
                  <p
                    className={clx(
                      "text-zinc-500 max-xl:max-w-prose xl:w-2/3",
                      description[1]
                    )}
                    data-testid="hero-description"
                  >
                    {description[0]}
                  </p>
                ) : (
                  description
                )}
                <p
                  className="text-zinc-500 flex gap-2 text-sm"
                  data-testid="hero-views"
                >
                  <EyeIcon className="w-4.5 h-4.5 self-center" />
                  {loading
                    ? "..."
                    : views !== null
                      ? `${numFormat(views, "standard")} ${t("common:views", { count: views })}`
                      : "-"}
                </p>
              </div>
            )}

            {(action || last_updated) && (
              <div className="space-y-3">
                {action}
                {last_updated && (
                  <p
                    className="text-zinc-500 text-sm"
                    data-testid="hero-last-updated"
                  >
                    {t("common:last_updated", {
                      date: toDate(
                        last_updated,
                        "dd MMM yyyy, HH:mm",
                        i18n.language
                      ),
                    })}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Container>
  );
};

export default Hero;
