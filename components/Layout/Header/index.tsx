import {
  Navbar,
  NavbarMenu,
  NavbarMenuItem,
  NavbarAction,
} from "@govtechmy/myds-react/navbar";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import ThemeToggle from "./theme-toggle";
import LocaleSwitch from "./locale-switch";

export default function Header() {
  return (
    <Navbar>
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
          <Link href={"/"}>{"My Area"}</Link>
        </NavbarMenuItem>
        <NavbarMenuItem href={"/elections"} asChild>
          <Link href={"/elections"}>{"Elections"}</Link>
        </NavbarMenuItem>
        <NavbarMenuItem href={"/candidates"} asChild>
          <Link href={"/candidates"}>{"Candidates"}</Link>
        </NavbarMenuItem>
        <NavbarMenuItem href={"/parties"} asChild>
          <Link href={"/parties"}>{"Parties"}</Link>
        </NavbarMenuItem>
        <NavbarMenuItem href={"/trivia"} asChild>
          <Link href={"/trivia"}>{"Trivia"}</Link>
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
