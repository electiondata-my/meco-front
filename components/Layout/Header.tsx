import Container from "@components/Container";
import Nav from "@components/Nav";
import { useTranslation } from "@hooks/useTranslation";
import { VoteIconSolid } from "@icons/index";
import Link from "next/link";
import { FunctionComponent, ReactNode } from "react";

interface HeaderProps {
  stateSelector?: ReactNode;
}

const Header: FunctionComponent<HeaderProps> = ({ stateSelector }) => {
  const { t } = useTranslation();

  return (
    <div className="dark:border-zinc-800 fixed left-0 top-0 z-30 w-full border-b">
      <Container
        background="bg-white dark:bg-zinc-900"
        className="flex items-center gap-4 py-[11px]"
      >
        <div className="flex w-full items-center gap-4">
          <Link href="/">
            <div className="flex cursor-pointer gap-2">
              <VoteIconSolid className="h-7 w-7 rounded-full bg-gradient-to-br from-zinc-700 to-black text-white" />
              <h4>ElectionData.MY</h4>
            </div>
          </Link>

          <Nav stateSelector={stateSelector}>
            {(close) => (
              <>
                <Nav.Item
                  key={"/"}
                  title={t("nav.home")}
                  link="/"
                  onClick={close}
                />
                <Nav.Item
                  title={t("nav.elections")}
                  link="/elections"
                  key="/elections"
                  onClick={close}
                />
                <Nav.Item
                  title={t("nav.candidates")}
                  link="/candidates"
                  key="/candidates"
                  onClick={close}
                />
                <Nav.Item
                  title={t("nav.parties")}
                  link="/parties"
                  key="/parties"
                  onClick={close}
                />
                <Nav.Item
                  title="Trivia"
                  link="/trivia"
                  key="/trivia"
                  onClick={close}
                />
              </>
            )}
          </Nav>
        </div>
      </Container>
    </div>
  );
};

export default Header;
