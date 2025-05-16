import BranchNode from "./branch";
import { FileNode, FiletreeContext } from "./utils";
import { Disclosure, Transition } from "@headlessui/react";
import Button from "@components/Button";
import { toast } from "@components/Toast";
import { ChevronUpIcon, PencilSquareIcon, TrashIcon } from "@heroicons/react/24/outline";
import { clx } from "@lib/helpers";
import { FunctionComponent, useContext, useState } from "react";

type FolderProps = {
  className?: string;
  node: FileNode;
  onClick?: () => void;
};

const Folder: FunctionComponent<FolderProps> = ({ className, node, onClick }) => {
  const { setActive, destroy, rename } = useContext(FiletreeContext);
  const [editable, setEditable] = useState<boolean>(false);
  const [name, setName] = useState<string>(node.name);

  const finishEdit = () => {
    if (name.length <= 0) {
      toast.error("Must not be empty");
      return;
    }
    setEditable(false);
    rename(node, name);
  };

  return (
    <Disclosure defaultOpen>
      {({ open }) => (
        <>
          <Disclosure.Button
            as="div"
            className={clx(
              "group flex flex-row items-center justify-between px-3 py-2 dark:bg-zinc-900",
              "cursor-pointer select-none text-start text-sm font-medium text-zinc-900 dark:text-white",
              className
            )}
            onClick={e => {
              e.stopPropagation();
              setActive(node);
            }}
            tabIndex={0}
          >
            <div className="flex max-w-[80%] flex-row items-center gap-2">
              <ChevronUpIcon
                className={clx(
                  "-ml-1 h-4 w-4 transform transition-transform",
                  open ? "rotate-180" : "rotate-0"
                )}
              />
              {!editable ? (
                <p className="truncate" title={node.name}>
                  {node.name}
                </p>
              ) : (
                <input
                  className="dark:bg-[#121212] py-1 text-sm"
                  autoFocus
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      finishEdit();
                    }
                  }}
                  onBlur={finishEdit}
                />
              )}
            </div>
            <div className="text-zinc-500 opacity-0 transition group-hover:opacity-100 group-focus:opacity-100 lg:opacity-0">
              <ul className="flex w-fit flex-row gap-1">
                <li>
                  <Button
                    variant="reset"
                    className="transition hover:text-zinc-900"
                    onClick={e => {
                      e.stopPropagation();
                      setEditable(true);
                    }}
                  >
                    <PencilSquareIcon className="h-4.5 w-4.5 hover:text-zinc-900 dark:hover:text-white" />
                  </Button>
                </li>
                <li>
                  <Button
                    variant="reset"
                    className="transition hover:text-zinc-900"
                    onClick={() => destroy(node)}
                  >
                    <TrashIcon className="h-4.5 w-4.5 hover:text-zinc-900 dark:hover:text-white" />
                  </Button>
                </li>
              </ul>
            </div>
          </Disclosure.Button>

          <Transition
            enter="transition duration-100 ease-out"
            enterFrom="transform scale-95 opacity-0"
            enterTo="transform scale-100 opacity-100"
            leave="transition duration-75 ease-out"
            leaveFrom="transform scale-100 opacity-100"
            leaveTo="transform scale-95 opacity-0"
          >
            <Disclosure.Panel className="ml-4 border-l">
              <BranchNode node={node} onClick={onClick} />
            </Disclosure.Panel>
          </Transition>
        </>
      )}
    </Disclosure>
  );
};

export default Folder;
