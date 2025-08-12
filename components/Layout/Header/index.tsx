import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "./theme-toggle";
import LocaleSwitch from "./locale-switch";
import { useTranslation } from "@hooks/useTranslation";
import Navbar, { Nav } from "../Navbar";
import { useRouter } from "next/router";
import { routes } from "@lib/routes";
import {
  DownloadIcon,
  FlagIcon,
  MapIcon,
  UserIcon,
} from "@govtechmy/myds-react/icon";
import {
  LightBulbIcon,
  RedelineationIcon,
  SeatsIcon,
  VoteOutlineIcon,
} from "@icons/index";

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
      <Link
        href={"/"}
        className="flex items-center gap-2.5 no-underline max-sm:gap-1.5"
      >
        <Image
          src="/static/logo/logo-default.png"
          alt="ElectionData.MY Logo"
          width={28}
          height={28}
          className="aspect-auto select-none object-contain"
        />
        <h1 className="font-poppins text-body-lg font-bold no-underline max-sm:text-body-md">
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
              key={"/seats"}
              title={t("common:nav.seats")}
              link="/seats"
              onClick={close}
              icon={<SeatsIcon className="hidden size-8 max-lg:block" />}
            />
            <Nav.Item
              key={"/elections"}
              title={t("common:nav.elections")}
              link="/elections"
              onClick={close}
              icon={<VoteOutlineIcon className="hidden size-8 max-lg:block" />}
            />
            <Nav.Item
              key={"/candidates"}
              title={t("common:nav.candidates")}
              link="/candidates"
              onClick={close}
              icon={<UserIcon className="hidden size-8 max-lg:block" />}
            />
            <Nav.Item
              key={"/parties"}
              title={t("common:nav.parties")}
              link="/parties"
              onClick={close}
              icon={<FlagIcon className="hidden size-8 max-lg:block" />}
            />

            <Nav.Item
              key={"/redelineation"}
              title={t("common:nav.redelineation")}
              link="/redelineation"
              onClick={close}
              icon={
                <RedelineationIcon className="hidden size-8 max-lg:block" />
              }
            />
            <Nav.Item
              key={"/map/explorer"}
              title={t("common:nav.map")}
              link="/map/explorer"
              onClick={close}
              icon={<MapIcon className="hidden size-8 max-lg:block" />}
            />

            <Nav.Item
              key={"/trivia"}
              title={t("common:nav.trivia")}
              link="/trivia"
              onClick={close}
              icon={<LightBulbIcon className="hidden size-8 max-lg:block" />}
            />
            {process.env.NEXT_PUBLIC_APP_ENV !== "production" && (
              <Nav.Item
                key={"/data-catalogue"}
                title={t("common:nav.catalogue")}
                link="/data-catalogue"
                icon={<DownloadIcon className="hidden size-8 max-lg:block" />}
                onClick={close}
              />
            )}
          </>
        )}
      </Nav>
    </Navbar>
  );
}
