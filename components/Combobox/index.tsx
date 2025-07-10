import ComboOption, { ComboOptionProp } from "./option";
import { Button, Spinner } from "..";
import { useTranslation } from "@hooks/useTranslation";
import { clx } from "@lib/helpers";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/solid";
import {
  autoUpdate,
  FloatingFocusManager,
  FloatingPortal,
  offset,
  size,
  useDismiss,
  useFloating,
  useInteractions,
  useListNavigation,
  useRole,
} from "@floating-ui/react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { matchSorter, MatchSorterOptions } from "match-sorter";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";

type ComboBoxProps<T> = {
  options: ComboOptionProp<T>[];
  selected?: ComboOptionProp<T> | null;
  onChange: (option?: ComboOptionProp<T>) => void;
  onSearch?: (query: string) => void;
  placeholder?: string;
  loading?: boolean;
  config?: MatchSorterOptions;
  image?: (value: string) => ReactNode;
  format?: (option: ComboOptionProp<T>) => ReactNode;
};

const ComboBox = <T extends unknown>({
  options,
  selected,
  onChange,
  onSearch,
  format,
  placeholder,
  image,
  loading = false,
  config = { keys: ["label"] },
}: ComboBoxProps<T>) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState<string>(selected ? selected.label : "");

  useEffect(() => {
    setQuery(selected ? selected.label : "");
  }, [selected]);

  const filteredOptions = useMemo(
    () => matchSorter(options, query, config) as ComboOptionProp<T>[],
    [options, query, config],
  );

  const ITEMS_COUNT = filteredOptions.length;
  const ITEM_HEIGHT = 36;
  const overflowPadding = 10;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  // The initial max-height is what `react-virtual` uses to know how many
  // items to render. This needs to be a smaller value so it doesn't try
  // to render every single item on mount.
  const [maxHeight, setMaxHeight] = useState(240);
  const listRef = useRef<Array<HTMLElement | null>>([]);

  const { refs, floatingStyles, context } = useFloating<HTMLInputElement>({
    placement: "bottom-start",
    whileElementsMounted: autoUpdate,
    open,
    onOpenChange: setOpen,
    middleware: [
      size({
        apply({ rects, elements }) {
          Object.assign(elements.floating.style, {
            width: `${rects.reference.width}px`,
          });
        },
        padding: overflowPadding,
      }),
      offset(4),
    ],
  });

  const rowVirtualizer = useVirtualizer({
    count: ITEMS_COUNT,
    getScrollElement: () => refs.floating.current,
    estimateSize: () => ITEM_HEIGHT,
    overscan: 15,
  });

  const role = useRole(context, { role: "listbox" });
  const dismiss = useDismiss(context);
  const listNav = useListNavigation(context, {
    listRef,
    activeIndex,
    onNavigate: setActiveIndex,
    virtual: true,
    loop: true,
  });

  const { getReferenceProps, getFloatingProps, getItemProps } = useInteractions(
    [role, dismiss, listNav],
  );

  return (
    <div
      ref={refs.setReference}
      onClick={() => setOpen(!open)}
      className="relative flex w-full select-none overflow-hidden rounded-full border border-otl-gray-200 bg-bg-white shadow-button hover:border-bg-black-400 focus:outline-none focus-visible:ring-0"
    >
      <input
        className={clx(
          "w-full truncate border-none bg-bg-white py-2.5 pl-4.5 pr-10 text-body-md focus:outline-none focus:ring-0",
        )}
        spellCheck={false}
        {...getReferenceProps({
          onChange: (event) => {
            const target = event.target as HTMLInputElement;
            const value = target.value as string;
            setQuery(value);
            if (onSearch) onSearch(value);
            if (rowVirtualizer.getVirtualItems().length !== 0)
              rowVirtualizer.scrollToIndex(0);

            if (value) {
              setOpen(true);
              setActiveIndex(0);
            } else {
              onChange(undefined);
              setOpen(false);
            }
          },
          value: query,
          placeholder: placeholder,
          "aria-autocomplete": "list",
          onKeyDown(event) {
            if (
              event.key === "Enter" &&
              activeIndex != null &&
              filteredOptions[activeIndex]
            ) {
              onChange(filteredOptions[activeIndex]);
              setQuery(filteredOptions[activeIndex].label);
              setActiveIndex(null);
              setOpen(false);
            }
          },
        })}
      />

      {(query.length > 0 || selected) && (
        <Button
          className="group absolute right-14 top-2 flex h-8 w-8 items-center rounded-full hover:bg-bg-black-100"
          onClick={() => {
            setQuery("");
            setOpen(true);
            onChange(undefined);
            setActiveIndex(null);
            (refs.reference.current as HTMLInputElement).focus();
          }}
        >
          <XMarkIcon className="absolute right-1.5 h-5 w-5 text-txt-black-500 group-hover:text-txt-black-900" />
        </Button>
      )}
      {image && selected ? (
        <span className="mr-4 flex h-8 max-h-8 w-8 shrink-0 items-center justify-center self-center rounded-full">
          {image(selected.value)}
        </span>
      ) : (
        <span className="mr-4 flex h-8 max-h-8 w-8 shrink-0 items-center justify-center self-center rounded-full border border-otl-danger-300 bg-gray-400 bg-gradient-to-b from-danger-400 to-danger-600">
          <MagnifyingGlassIcon className="h-5 w-5 text-txt-white" />
        </span>
      )}

      {open && (
        <FloatingPortal>
          <FloatingFocusManager
            context={context}
            initialFocus={-1}
            visuallyHiddenDismiss
          >
            <div
              className={clx(
                "shadow-floating absolute z-20 max-h-60 w-full overflow-auto rounded-md border border-otl-gray-200 bg-bg-white text-sm focus:outline-none",
              )}
              ref={refs.setFloating}
              tabIndex={-1}
              style={{
                ...floatingStyles,
                maxHeight,
              }}
            >
              {filteredOptions.length <= 150 ? (
                <>
                  {loading ? (
                    <div className="flex cursor-default select-none items-center gap-2 px-4 py-2 text-txt-black-500">
                      <Spinner loading={loading} />{" "}
                      {t("common:placeholder.loading")}
                    </div>
                  ) : filteredOptions.length === 0 && query !== "" ? (
                    <p className="cursor-default select-none px-4 py-2 text-txt-black-500">
                      {t("common:placeholder.no_results")}
                    </p>
                  ) : (
                    filteredOptions.map((option, i) => {
                      return (
                        <ComboOption
                          {...getItemProps({
                            key: i,
                            ref(node) {
                              listRef.current[i] = node;
                            },
                            onClick() {
                              onChange(option);
                              setQuery(option.label);
                              setActiveIndex(null);
                              setOpen(false);
                              refs.domReference.current?.focus();
                            },
                          })}
                          total={ITEMS_COUNT}
                          option={option}
                          format={format}
                          image={image}
                          isSelected={selected?.value === option.value}
                          active={i === activeIndex}
                          index={i}
                        />
                      );
                    })
                  )}
                </>
              ) : (
                <div
                  className="relative w-full outline-none"
                  style={{
                    height: rowVirtualizer.getTotalSize(),
                  }}
                  // Some screen readers do not like any wrapper tags inside
                  // of the element with the role, so we spread it onto the
                  // virtualizer wrapper.
                  {...getFloatingProps({
                    onKeyDown(e) {
                      if (
                        e.key === "Enter" &&
                        activeIndex != null &&
                        filteredOptions[activeIndex]
                      ) {
                        onChange(filteredOptions[activeIndex]);
                        setQuery(filteredOptions[activeIndex].label);
                        setActiveIndex(null);
                        setOpen(false);
                      }
                    },
                  })}
                  // Ensure this element receives focus upon open so keydowning works.
                  tabIndex={0}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${
                        rowVirtualizer.getVirtualItems()[0]?.start
                      }px)`,
                    }}
                  >
                    {rowVirtualizer
                      .getVirtualItems()
                      .map((virtualItem: any) => {
                        const option = filteredOptions[virtualItem.index];
                        return (
                          <ComboOption
                            {...getItemProps({
                              key: virtualItem.index,
                              ref(node) {
                                listRef.current[virtualItem.index] = node;
                              },
                              onClick() {
                                onChange(option);
                                setQuery(option.label);
                                setActiveIndex(null);
                                setOpen(false);
                                refs.domReference.current?.focus();
                              },
                            })}
                            total={ITEMS_COUNT}
                            option={option}
                            format={format}
                            image={image}
                            isSelected={selected?.value === option.value}
                            active={virtualItem.index === activeIndex}
                            index={virtualItem.index}
                          />
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </FloatingFocusManager>
        </FloatingPortal>
      )}
    </div>
  );
};

export default ComboBox;
