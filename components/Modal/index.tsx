import {
  ForwardRefExoticComponent,
  ForwardedRef,
  Fragment,
  ReactNode,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
import { Dialog, Transition } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/20/solid";
import { clx } from "@lib/helpers";
import Button from "@components/Button";

export interface ModalInterface {
  open: () => void;
  close: () => void;
}

interface ModalProps {
  className?: string;
  trigger?: (open: () => void) => ReactNode;
  children: (close: () => void) => ReactNode;
  title?: ReactNode;
  ref?: ForwardedRef<ModalInterface>;
}

const Modal: ForwardRefExoticComponent<ModalProps> = forwardRef(
  ({ trigger, title, children, className }, ref) => {
    const [show, setShow] = useState(false);
    const open = () => setShow(true);
    const close = () => setShow(false);

    useImperativeHandle(ref, () => ({ open, close }));

    return (
      <>
        {trigger && trigger(open)}
        <Transition appear show={show} as={Fragment}>
          <Dialog open={show} onClose={close} className="relative z-50">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-zinc-900 bg-opacity-25" />
            </Transition.Child>

            <div className="fixed inset-0 flex items-end justify-center lg:items-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel
                  className={clx(
                    "flex h-full w-full max-w-5xl flex-col overflow-auto rounded-t-xl font-sans lg:h-fit lg:justify-center lg:rounded-xl",
                    className
                  )}
                >
                  <div onClick={close} className="min-h-[15vh] grow lg:hidden"></div>
                  <div className="dark:border-zinc-800 relative flex w-full items-center justify-between rounded-t-xl border-b bg-white p-3 dark:bg-zinc-900">
                    <Dialog.Title as="div" className="mr-9 flex grow">
                      {title}
                    </Dialog.Title>
                    <Button
                      variant="ghost"
                      className="hover:bg-slate-100 dark:hover:bg-zinc-800 group absolute right-1 rounded-full p-2"
                      onClick={() => setShow(false)}
                    >
                      <XMarkIcon className="text-zinc-500 mx-auto h-5 w-5 group-hover:text-zinc-900 group-hover:dark:text-white" />
                    </Button>
                  </div>
                  <>{children(close)}</>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </Dialog>
        </Transition>
      </>
    );
  }
);
Modal.displayName = "Modal";

export default Modal;
