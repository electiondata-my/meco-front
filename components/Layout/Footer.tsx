import { At, Container } from "@components/index";
import { useTranslation } from "@hooks/useTranslation";
import { VoteIconSolid } from "@icons/index";

const Footer = () => {
  const { t } = useTranslation();

  return (
    <Container background="bg-slate-50 dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 pt-12 pb-16 z-10">
      <div className="flex w-full max-md:flex-col max-md:gap-8 md:justify-between">
        <div className="flex gap-4">
          {/* LOGO */}
          <VoteIconSolid className="h-9 w-9 rounded-full bg-gradient-to-br from-zinc-700 to-black text-white" />
          <div>
            <div className="mb-2 font-bold">ElectionData.MY</div>
            <p className="text-zinc-500 text-sm">
              {t("footer.copyright")}
            </p>
          </div>
        </div>
        <div className="flex gap-6 text-sm">
          {/* USEFUL SITES */}
          <div className="flex w-full flex-col gap-2 md:w-[200px]">
            <p className="font-bold">{t("footer.useful_sites")}</p>

            <At
              className="link-dim"
              scrollTop={false}
              external
              href="https://spr.gov.my/"
            >
              {t("footer.spr")}
            </At>
            <At
              className="link-dim"
              scrollTop={false}
              external
              href="https://www.tindakmalaysia.org/"
            >
              Tindak Malaysia
            </At>
            <At
              className="link-dim"
              scrollTop={false}
              external
              href="https://bersih.org/"
            >
              BERSIH
            </At>
            {/* <At className="link-dim" scrollTop={false} href="#">
              {t("common:footer.ai")}
            </At> */}
          </div>

          {/* OPEN DATA */}
          <div className="flex w-full flex-col gap-2 md:w-[200px]">
            <p className="font-bold">{t("footer.open_data")}</p>

            <At className="link-dim" scrollTop={false} href="#">
              {t("footer.download")}
            </At>
            <At
              className="link-dim"
              scrollTop={false}
              external
              href="https://www.arxiv.org/abs/2505.06564"
            >
              {t("footer.documentation")}
            </At>
          </div>
        </div>
      </div>
    </Container>
  );
};

export default Footer;
