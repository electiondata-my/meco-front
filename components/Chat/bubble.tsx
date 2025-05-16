import { BoltIcon, UserIcon } from "@heroicons/react/24/outline";
import Markdown from "@components/Markdown";
import { clx } from "@lib/helpers";
import { ForwardRefExoticComponent, ForwardedRef, forwardRef, useEffect, useState } from "react";

interface ChatInterface {
  ref?: ForwardedRef<HTMLDivElement>;
  from: "user" | "assistant";
  children: string;
}

const ChatBubble: ForwardRefExoticComponent<ChatInterface> = forwardRef(
  ({ from = "user", children }, ref) => {
    const [dots, setDot] = useState(".");
    useEffect(() => {
      let _dots = ".";
      const loop = setInterval(() => {
        _dots += ".";
        if (_dots.length > 3) _dots = ".";
        setDot(_dots);
      }, 300);

      return () => {
        clearInterval(loop);
      };
    }, []);
    return (
      <div className="flex items-start gap-2" ref={ref}>
        {
          {
            assistant: (
              <div className="bg-primary dark:bg-primary-dark flex aspect-square min-w-[32px] items-center justify-center rounded-lg">
                <BoltIcon className="h-5 w-5 text-white" />
              </div>
            ),
            user: (
              <div className="dark:border-zinc-700 flex aspect-square min-w-[32px] items-center justify-center rounded-lg border bg-white dark:bg-zinc-900">
                <UserIcon className="h-5 w-5 text-zinc-900 dark:text-white" />
              </div>
            ),
          }[from]
        }
        <div
          className={clx(
            "dark:border-zinc-700 space-y-6 rounded-lg border p-2.5 text-sm",
            from === "user" ? "bg-slate-100 dark:bg-zinc-800" : "bg-transparent"
          )}
        >
          {
            {
              assistant: children.length > 0 ? <Markdown>{children}</Markdown> : <p>{dots}</p>,
              user: <p>{children} </p>,
            }[from]
          }
        </div>
      </div>
    );
  }
);

ChatBubble.displayName = "ChatBubble";
export default ChatBubble;
