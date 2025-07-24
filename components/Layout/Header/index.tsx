import {
  NavbarMenu,
  NavbarMenuItem,
  NavbarAction,
} from "@govtechmy/myds-react/navbar";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "./theme-toggle";
import LocaleSwitch from "./locale-switch";
import { useTranslation } from "@hooks/useTranslation";
import Navbar from "../Navbar";
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
      <NavbarMenu>
        <NavbarMenuItem href={"/"} asChild>
          <Link href={"/"}>{t("common:nav.home")}</Link>
        </NavbarMenuItem>
        <NavbarMenuItem href={"/elections"} asChild>
          <Link href={"/elections"}>{t("common:nav.elections")}</Link>
        </NavbarMenuItem>
        <NavbarMenuItem href={"/candidates"} asChild>
          <Link href={"/candidates"}>{t("common:nav.candidates")}</Link>
        </NavbarMenuItem>
        <NavbarMenuItem href={"/parties"} asChild>
          <Link href={"/parties"}>{t("common:nav.parties")}</Link>
        </NavbarMenuItem>
        <NavbarMenuItem href={"/trivia"} asChild>
          <Link href={"/trivia"}>{t("common:nav.trivia")}</Link>
        </NavbarMenuItem>
        {process.env.APP_ENV !== "production" && (
          <NavbarMenuItem href={"/data-catalogue"} asChild>
            <Link href={"/data-catalogue"}>{t("common:nav.catalogue")}</Link>
          </NavbarMenuItem>
        )}
        <NavbarMenuItem href={"/map/explorer"} asChild>
          <Link href={"/map/explorer"}>{t("common:nav.map")}</Link>
        </NavbarMenuItem>
      </NavbarMenu>

      <NavbarAction>
        <Suspense>
          <ThemeToggle />
          <LocaleSwitch />
        </Suspense>
      </NavbarAction>
    </Navbar>
  );
}
