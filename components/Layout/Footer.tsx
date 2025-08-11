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
                src="/static/images/icons/icon-512.png"
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

          {/* Right: Two cols of links  */}
          <div className="flex flex-row gap-8 md:gap-12">
            {/* Col 1: Useful Sites */}
            <div className="flex w-[200px] flex-col gap-2">
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
                href="https://www.tindakmalaysia.org"
                className="text-body-sm text-txt-black-700 transition-colors hover:text-txt-black-900"
              >
                Tindak Malaysia
              </Link>
              <Link
                target="_blank"
                href="https://bersih.org"
                className="text-body-sm text-txt-black-700 transition-colors hover:text-txt-black-900"
              >
                BERSIH
              </Link>
            </div>

            {/* Col 2: Download + Docs */}
            <div className="flex w-[200px] flex-col gap-2">
              <p className="font-bold text-txt-black-900">
                {t("footer.open_data")}
              </p>
              <Link
                target="_blank"
                href="https://doi.org/10.7910/DVN/O4CRXK"
                className="text-body-sm text-txt-black-700 transition-colors hover:text-txt-black-900"
              >
                {t("footer.download")}
              </Link>
              <Link
                target="_blank"
                href="https://www.arxiv.org/abs/2505.06564"
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
