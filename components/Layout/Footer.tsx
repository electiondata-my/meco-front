import { useTranslation } from "@hooks/useTranslation";
import { clx } from "@lib/helpers";
import Image from "next/image";
import Link from "next/link";

type FooterLink = {
  label: string;
  href: string;
  external?: boolean;
};

const LayoutFooter = () => {
  const { t } = useTranslation();

  const linkClass =
    "inline-flex w-fit text-body-sm leading-6 text-txt-black-500 transition-colors hover:text-txt-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fr-danger";

  const sections: { title: string; links: FooterLink[] }[] = [
    {
      title: t("footer.useful_sites"),
      links: [
        {
          label: t("footer.spr"),
          href: "https://spr.gov.my",
          external: true,
        },
        {
          label: t("footer.agc"),
          href: "https://lom.agc.gov.my/subsid.php?type=pub",
          external: true,
        },
        {
          label: t("footer.kawasanku"),
          href: "https://open.dosm.gov.my/dashboard/kawasanku",
          external: true,
        },
      ],
    },
    {
      title: t("footer.about"),
      links: [
        { label: t("footer.background"), href: "#" },
        { label: t("footer.site_metrics"), href: "#" },
        { label: t("footer.documentation"), href: "/research" },
      ],
    },
    {
      title: t("footer.use_the_data"),
      links: [
        { label: t("footer.query_builder"), href: "/query-builder" },
        { label: t("footer.download"), href: "/data-catalogue" },
        { label: t("footer.open_api"), href: "/openapi" },
      ],
    },
  ];

  return (
    <footer className="w-full border-t border-otl-gray-200 bg-bg-white px-4 pb-14 pt-10 md:px-6 md:pb-16 md:pt-12">
      <div className="mx-auto grid max-w-screen-xl gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(520px,640px)] lg:gap-12">
        <div className="flex max-w-[420px] items-start gap-4">
          <Link
            href="/"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-otl-gray-200 bg-bg-white shadow-button transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fr-danger"
          >
            <Image
              src="/static/logo/logo-default.png"
              alt="ElectionData.MY Logo"
              width={28}
              height={28}
              className="aspect-auto select-none object-contain"
            />
          </Link>

          <div className="flex min-w-0 flex-col gap-1">
            <Link
              href="/"
              className="w-fit font-poppins text-body-lg font-bold text-txt-black-900 no-underline transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fr-danger"
            >
              ElectionData.MY
            </Link>

            <p className="text-body-sm leading-6 text-txt-black-500">
              {t("footer.copyright")}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-9 sm:grid-cols-3 lg:justify-self-end">
          {sections.map((section) => (
            <div
              key={section.title}
              className="flex min-w-0 flex-col gap-3 sm:w-[180px]"
            >
              <p className="text-body-sm font-semibold text-txt-black-900">
                {section.title}
              </p>
              <nav
                aria-label={section.title}
                className="flex flex-col items-start gap-1"
              >
                {section.links.map((link) => (
                  <Link
                    key={`${section.title}-${link.label}`}
                    href={link.href}
                    target={link.external ? "_blank" : undefined}
                    rel={link.external ? "noopener noreferrer" : undefined}
                    className={clx(
                      linkClass,
                      link.href === "#" && "cursor-default",
                    )}
                  >
                    <span>{link.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          ))}
        </div>
      </div>
    </footer>
  );
};

export default LayoutFooter;
