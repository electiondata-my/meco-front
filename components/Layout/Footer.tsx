import { useTranslation } from "@hooks/useTranslation";
import Image from "next/image";
import Link from "next/link";

const LayoutFooter = () => {
  const { t } = useTranslation();

  return (
    <footer className="w-full border-t border-otl-gray-200 bg-bg-gray-50 px-4 pb-16 pt-12 md:px-6">
      <div className="mx-auto max-w-screen-xl">
        <div className="flex flex-col gap-8 md:flex-row md:justify-between">
          {/* Left: Branding + License */}
          <div className="flex flex-col gap-2 md:w-[300px]">
            <div className="flex items-center gap-x-2.5">
              <Image
                src="/static/logo/logo-default.png"
                alt="ElectionData.MY Logo"
                width={28}
                height={28}
                className="aspect-auto select-none object-contain"
              />
              <h1 className="font-poppins text-body-lg font-bold text-txt-black-900">
                ElectionData.MY
              </h1>
            </div>
            <div className="pl-9">
              <p className="text-body-sm text-txt-black-700">
                {t("footer.copyright")}
              </p>
            </div>
          </div>

          {/* Right: Three cols of links  */}
          <div className="grid grid-cols-2 gap-8 md:flex md:flex-row md:gap-12">
            {/* Col 1: Useful Sites */}
            <div className="order-1 flex w-full flex-col gap-2 md:w-[200px]">
              <p className="font-bold text-txt-black-900">
                {t("footer.useful_sites")}
              </p>
              <Link
                target="_blank"
                href="https://spr.gov.my"
                className="text-body-sm text-txt-black-700 transition-colors hover:text-txt-black-900"
              >
                {t("footer.spr")}
              </Link>
              <Link
                target="_blank"
                href="https://lom.agc.gov.my/subsid.php?type=pub"
                className="text-body-sm text-txt-black-700 transition-colors hover:text-txt-black-900"
              >
                {t("footer.agc")}
              </Link>
              <Link
                target="_blank"
                href="https://open.dosm.gov.my/dashboard/kawasanku"
                className="text-body-sm text-txt-black-700 transition-colors hover:text-txt-black-900"
              >
                {t("footer.kawasanku")}
              </Link>
            </div>

            {/* Col 2: Use the Data */}
            <div className="order-2 flex w-full flex-col gap-2 md:order-3 md:w-[200px]">
              <p className="font-bold text-txt-black-900">
                {t("footer.use_the_data")}
              </p>
              <Link
                href="/query-builder"
                className="text-body-sm text-txt-black-700 transition-colors hover:text-txt-black-900"
              >
                {t("footer.query_builder")}
              </Link>
              <Link
                href="/data-catalogue"
                className="text-body-sm text-txt-black-700 transition-colors hover:text-txt-black-900"
              >
                {t("footer.download")}
              </Link>
              <Link
                href="/openapi"
                className="text-body-sm text-txt-black-700 transition-colors hover:text-txt-black-900"
              >
                {t("footer.open_api")}
              </Link>
            </div>

            {/* Col 3: About */}
            <div className="order-3 flex w-full flex-col gap-2 md:order-2 md:w-[200px]">
              <p className="font-bold text-txt-black-900">
                {t("footer.about")}
              </p>
              <Link
                href="#"
                className="text-body-sm text-txt-black-700 transition-colors hover:text-txt-black-900"
              >
                {t("footer.background")}
              </Link>
              <Link
                href="#"
                className="text-body-sm text-txt-black-700 transition-colors hover:text-txt-black-900"
              >
                {t("footer.site_metrics")}
              </Link>
              <Link
                href="/research"
                className="text-body-sm text-txt-black-700 transition-colors hover:text-txt-black-900"
              >
                {t("footer.documentation")}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default LayoutFooter;
