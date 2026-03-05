import Card from "@components/Card";
import { numFormat } from "@lib/helpers";
import { DownloadOption } from "@lib/types";
import Image from "next/image";
import { FunctionComponent } from "react";

interface DownloadCardProps extends DownloadOption {
  views?: number;
  link_editions?: string[];
  url?: string;
}

export const DownloadCard: FunctionComponent<DownloadCardProps> = ({
  href,
  image,
  title,
  description,
  icon,
  id,
  views,
  link_editions,
  url,
}) => {
  const handleClick = () => {
    // TODO: Refactor. Both opens download link in new tab but
    // following stop-gap solution is used as `url` in href() does not update with selected date
    if (link_editions && link_editions.length > 0) {
      window.open(url, "_blank");
    }
    href();
  };

  return (
    <Card
      onClick={handleClick}
      className="bg-background dark:border-outlineHover-dark dark:bg-washed-dark p-4.5"
    >
      <div className="flex items-center gap-4.5">
        {["svg", "png"].includes(id) ? (
          <Image
            src={image || ""}
            className="dark:border-dim dark:bg-black aspect-video h-14 rounded border bg-white object-cover lg:h-16"
            width={128}
            height={64}
            alt={title as string}
          />
        ) : (
          <Image
            height={64}
            width={64}
            src={image || ""}
            className="object-contain"
            alt={title as string}
          />
        )}
        <div className="block flex-grow">
          <p className="font-bold">{title}</p>
          {description && <p className="text-dim text-sm">{description}</p>}
        </div>

        <div className="space-y-1">
          {icon}
          <p className="text-dim text-center text-xs">
            {numFormat(views ?? 0, "compact")}
          </p>
        </div>
      </div>
    </Card>
  );
};
