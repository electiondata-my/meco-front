import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "./theme-toggle";
import LocaleSwitch from "./locale-switch";
import { useTranslation } from "@hooks/useTranslation";
import Navbar, { Nav } from "../Navbar";
import { useRouter } from "next/router";
import { routes } from "@lib/routes";

export default function Header() {
  const { t } = useTranslation([]);
  const router = useRouter();

  return (
    <Navbar
      innerclassName={
        router.pathname.includes(routes.DATA_CATALOGUE)
          ? "max-w-screen-2xl"
          : ""
      }
    >
      <Link href={"/"} className="flex items-center gap-2.5 no-underline">
        <Image
          src="/static/images/icons/icon-512.png"
          alt="ElectionData.MY Logo"
          width={28}
          height={28}
          className="aspect-auto select-none object-contain"
        />
        <h1 className="hidden font-poppins text-body-lg font-bold no-underline lg:block">
          ElectionData.MY
        </h1>
      </Link>
      <Nav
        action={
          <Nav.Action>
            <Suspense>
              <ThemeToggle />
              <LocaleSwitch />
            </Suspense>
          </Nav.Action>
        }
      >
        {(close) => (
          <>
            <Nav.Item
              key={"/"}
              title={t("common:nav.home")}
              link="/"
              onClick={close}
            />
            <Nav.Item
              key={"/elections"}
              title={t("common:nav.elections")}
              link="/elections"
              onClick={close}
            />
            <Nav.Item
              key={"/candidates"}
              title={t("common:nav.candidates")}
              link="/candidates"
              onClick={close}
            />
            <Nav.Item
              key={"/parties"}
              title={t("common:nav.parties")}
              link="/parties"
              onClick={close}
            />
            <Nav.Item
              key={"/trivia"}
              title={t("common:nav.trivia")}
              link="/trivia"
              onClick={close}
            />
            {process.env.NEXT_PUBLIC_APP_ENV !== "production" && (
              <Nav.Item
                key={"/data-catalogue"}
                title={t("common:nav.catalogue")}
                link="/data-catalogue"
                onClick={close}
              />
            )}
            <Nav.Item
              key={"/map/explorer"}
              title={t("common:nav.map")}
              link="/map/explorer"
              onClick={close}
            />
          </>
        )}
      </Nav>
    </Navbar>
  );
}
