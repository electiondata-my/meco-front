import Chat from "@components/Chat";
import Filetree from "@components/Filetree";
import { FiletreeProvider } from "@components/Filetree/utils";
import Container from "@components/Container";
import { useTranslation } from "@hooks/useTranslation";
import { FunctionComponent } from "react";

/**
 * Catalogue DataGPT
 * @overview Status: In-development
 */
interface CatalogueDataGPTProps {}

const CatalogueDataGPT: FunctionComponent<CatalogueDataGPTProps> = () => {
  return (
    <FiletreeProvider model="chat-directory">
      <Container>
        <div className="flex w-full flex-col lg:flex-row">
          <Filetree />
          <Chat model="chat-history" chain="main" />
        </div>
      </Container>
    </FiletreeProvider>
  );
};

export default CatalogueDataGPT;
