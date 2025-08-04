import { useTranslation } from "@hooks/useTranslation";
import {
  Footer,
  SiteInfo,
  FooterSection,
  SiteLinkGroup,
  SiteLink,
} from "@govtechmy/myds-react/footer";
import Image from "next/image";
import Link from "next/link";

const LayoutFooter = () => {
  const { t } = useTranslation();

  return (
    <Footer>
      <FooterSection className="w-full border-0 lg:pb-0">
        <SiteInfo className="lg:col-end-3">
          <div className="flex items-center gap-x-2.5 text-txt-black-900">
            <Image
              src="/static/images/icons/icon-512.png"
              alt="ElectionData.MY Logo"
              width={28}
              height={28}
              className="aspect-auto select-none object-contain"
            />
            <h1 className="font-poppins text-body-lg font-bold no-underline">
              ElectionData.MY
            </h1>
          </div>
          <p className="text-body-sm text-txt-black-700">
            {t("footer.copyright")}
          </p>
        </SiteInfo>

        {/* Buffer Group */}
        <SiteLinkGroup className="lg:col-span-6" groupTitle=""></SiteLinkGroup>
        {/* End of Buffer Group */}

        <SiteLinkGroup className="" groupTitle={t("footer.useful_sites")}>
          <SiteLink asChild className="w-fit">
            <Link target="_blank" href={"https://spr.gov.my"}>
              {t("footer.spr")}
            </Link>
          </SiteLink>
          <SiteLink asChild className="w-fit">
            <Link target="_blank" href={"https://www.tindakmalaysia.org"}>
              Tindak Malaysia
            </Link>
          </SiteLink>
          <SiteLink asChild className="w-fit">
            <Link target="_blank" href={"https://bersih.org"}>
              BERSIH
            </Link>
          </SiteLink>
        </SiteLinkGroup>
        <SiteLinkGroup groupTitle={t("footer.open_data")}>
          <SiteLink asChild className="w-fit">
            <Link target="_blank" href={"https://doi.org/10.7910/DVN/O4CRXK"}>
              {t("footer.download")}
            </Link>
          </SiteLink>
          <SiteLink asChild className="w-fit">
            <Link target="_blank" href={"https://www.arxiv.org/abs/2505.06564"}>
              {t("footer.documentation")}
            </Link>
          </SiteLink>
        </SiteLinkGroup>
      </FooterSection>
    </Footer>
  );
};

export default LayoutFooter;
