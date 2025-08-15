import { ComponentProps, FunctionComponent, SVGProps } from "react";

export interface IconProps {
  className?: string;
  fillColor?: string;
  transform?: string;
}

export const UpDownIcon: FunctionComponent<IconProps> = ({
  className,
  transform,
}) => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g id="UpDownIcon">
        <path
          id="Up"
          d="M6.48939 11.0468C6.39703 11.081 6.31232 11.1331 6.24009 11.2001C6.16786 11.2671 6.10952 11.3476 6.06842 11.4371C6.02732 11.5266 6.00425 11.6234 6.00053 11.7218C5.99682 11.8202 6.01253 11.9184 6.04677 12.0108C6.08101 12.1032 6.13311 12.1879 6.20009 12.2601L9.45009 15.7601C9.5203 15.8358 9.60539 15.8962 9.70003 15.9376C9.79467 15.9789 9.89683 16.0002 10.0001 16.0002C10.1034 16.0002 10.2055 15.9789 10.3002 15.9376C10.3948 15.8962 10.4799 15.8358 10.5501 15.7601L13.8001 12.2601C13.9354 12.1142 14.0071 11.9206 13.9996 11.7218C13.9921 11.523 13.906 11.3354 13.7601 11.2001C13.6142 11.0648 13.4206 10.9931 13.2218 11.0006L6.77838 11.0005C6.77838 11.0005 6.58175 11.0125 6.48939 11.0468Z"
          fill={transform === "up" ? "currentColor" : "#94A3B8"}
        />
        <path
          id="Down"
          d="M10.3001 4.0626C10.2055 4.0213 10.1033 3.99999 10.0001 4C9.89681 3.99999 9.79466 4.0213 9.70002 4.0626C9.60538 4.10389 9.52028 4.16429 9.45007 4.24L6.20007 7.74C6.06481 7.88587 5.99303 8.0795 6.00053 8.27828C6.00804 8.47707 6.0942 8.66474 6.24007 8.8C6.38594 8.93526 6.57956 9.00703 6.77835 8.99953H13.2218C13.3202 9.00325 13.4184 8.98754 13.5108 8.9533C13.6031 8.91907 13.6878 8.86697 13.7601 8.8C13.8323 8.73303 13.8906 8.65248 13.9317 8.56297C13.9728 8.47345 13.9959 8.37671 13.9996 8.27828C14.0033 8.17985 13.9876 8.08166 13.9534 7.9893C13.9191 7.89694 13.867 7.81223 13.8001 7.74L10.5501 4.24C10.4799 4.16429 10.3948 4.10389 10.3001 4.0626Z"
          fill={transform === "down" ? "currentColor" : "#94A3B8"}
        />
      </g>
    </svg>
  );
};

/**
 * Vote Icon
 * @param className
 * @returns VoteIcon
 */
export const VoteIcon: FunctionComponent<IconProps> = ({
  className,
  fillColor = "#DC2626",
}) => {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g clipPath="url(#clip0_1208_11803)">
        <circle cx="16" cy="16" r="16" fill={fillColor} />
        <path
          d="M14 24L26 24"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M15.9999 22.0002L13.7236 17.8271L14.5982 18.2019C15.4304 18.5586 16.3842 18.0855 16.6038 17.207C16.7833 16.489 16.6763 15.7554 16.3441 15.1396L16.8711 14.9288L19.3711 13.9288L20.282 13.5645L24.4999 22.0002H15.9999ZM14.3597 15.8203L14.2483 15.876L14.5248 15.9945C14.4784 15.9298 14.4231 15.8711 14.3597 15.8203ZM19.1618 16.7266L18.549 18.1992L17.0763 17.5863L16.6921 18.5096L18.1647 19.1225L17.5518 20.5951L18.4751 20.9793L19.088 19.5067L20.5606 20.1196L20.9448 19.1963L19.4722 18.5834L20.0851 17.1108L19.1618 16.7266Z"
          fill="#F8FAFC"
        />
        <path
          d="M15.6055 10.2012L11.5888 9.34045C10.57 9.12215 9.67663 8.51495 9.0987 7.64804L8.57288 6.85932C8.25952 6.38928 7.61929 6.27194 7.15959 6.60029L5.17363 8.01884C4.78281 8.29799 4.64564 8.81556 4.84691 9.25163L6.66981 13.2012C7.19295 14.3347 8.21528 15.159 9.43392 15.4298L11.2707 15.8379C11.7559 15.9457 12.2299 16.0985 12.6866 16.2943L14.9923 17.2824C15.2586 17.3965 15.5637 17.2452 15.634 16.9642C15.8478 16.1087 15.4388 15.2194 14.6501 14.825L12.9881 13.9941C12.4929 13.7464 12.6691 13 13.2228 13H14.2348C15.0449 13 15.8218 13.3218 16.3946 13.8946L16.5 14L19 13L17.8909 11.6136C17.3147 10.8934 16.5074 10.3944 15.6055 10.2012Z"
          fill="white"
        />
      </g>
      <defs>
        <clipPath id="clip0_1208_11803">
          <rect width="32" height="32" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};

export const VoteIconSolid: FunctionComponent<IconProps> = ({ className }) => {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g clipPath="url(#clip0_1208_11803)">
        <path
          d="M14 24L26 24"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M15.9999 22.0002L13.7236 17.8271L14.5982 18.2019C15.4304 18.5586 16.3842 18.0855 16.6038 17.207C16.7833 16.489 16.6763 15.7554 16.3441 15.1396L16.8711 14.9288L19.3711 13.9288L20.282 13.5645L24.4999 22.0002H15.9999ZM14.3597 15.8203L14.2483 15.876L14.5248 15.9945C14.4784 15.9298 14.4231 15.8711 14.3597 15.8203ZM19.1618 16.7266L18.549 18.1992L17.0763 17.5863L16.6921 18.5096L18.1647 19.1225L17.5518 20.5951L18.4751 20.9793L19.088 19.5067L20.5606 20.1196L20.9448 19.1963L19.4722 18.5834L20.0851 17.1108L19.1618 16.7266Z"
          fill="currentColor"
        />
        <path
          d="M15.6055 10.2012L11.5888 9.34045C10.57 9.12215 9.67663 8.51495 9.0987 7.64804L8.57288 6.85932C8.25952 6.38928 7.61929 6.27194 7.15959 6.60029L5.17363 8.01884C4.78281 8.29799 4.64564 8.81556 4.84691 9.25163L6.66981 13.2012C7.19295 14.3347 8.21528 15.159 9.43392 15.4298L11.2707 15.8379C11.7559 15.9457 12.2299 16.0985 12.6866 16.2943L14.9923 17.2824C15.2586 17.3965 15.5637 17.2452 15.634 16.9642C15.8478 16.1087 15.4388 15.2194 14.6501 14.825L12.9881 13.9941C12.4929 13.7464 12.6691 13 13.2228 13H14.2348C15.0449 13 15.8218 13.3218 16.3946 13.8946L16.5 14L19 13L17.8909 11.6136C17.3147 10.8934 16.5074 10.3944 15.6055 10.2012Z"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0_1208_11803">
          <rect width="32" height="32" fill="white" />
        </clipPath>
      </defs>
    </svg>
  );
};

export function MenuIcon(props: ComponentProps<"svg">) {
  return (
    <svg
      fill="none"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      stroke="currentColor"
      {...props}
    >
      <g>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M4 6h16"
        />
      </g>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M4 12h16"
      />
      <g>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M4 18h16"
        />
      </g>
    </svg>
  );
}

/**
 * Vote Outline Icon
 * @param className
 * @returns FlagIcon
 */
export const VoteOutlineIcon: FunctionComponent<SVGProps<SVGSVGElement>> = (
  props,
) => {
  return (
    <svg
      width="32"
      height="33"
      viewBox="0 0 32 33"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M23.8226 14.7245L28.5118 19.4724C28.6967 19.6595 28.8003 19.912 28.8003 20.1751V22.1045M8.17813 14.7245L3.48886 19.4724C3.30401 19.6595 3.20035 19.912 3.20035 20.1751V22.1045M28.8003 22.1045V24.4445V27.1245C28.8003 28.2291 27.9049 29.1245 26.8003 29.1245H5.20035C4.09578 29.1245 3.20035 28.2291 3.20035 27.1245V22.1045M28.8003 22.1045H3.20035"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M19.8003 3.52441H12.2003C11.6481 3.52441 11.2003 3.97213 11.2003 4.52441V16.9244C11.2003 17.4767 11.6481 17.9244 12.2003 17.9244H19.8003C20.3526 17.9244 20.8003 17.4767 20.8003 16.9244V4.52441C20.8003 3.97213 20.3526 3.52441 19.8003 3.52441Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
};

/**
 * Redelineation Icon
 * @param className
 * @returns FlagIcon
 */
export const RedelineationIcon: FunctionComponent<SVGProps<SVGSVGElement>> = (
  props,
) => {
  return (
    <svg
      width="32"
      height="33"
      viewBox="0 0 32 33"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M10.4 5.76404L3.20001 8.96404V28.964L10.4 25.764M10.4 5.76404V25.764M10.4 5.76404L14.8 7.36404L15.9 7.76404M10.4 25.764L19.2 28.964M19.2 28.964L26.4 25.764V15.764V13.924M19.2 28.964V17.924"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M25.6647 9.62074L24.9775 10.3135L23.6032 11.699L20.8545 14.4701L17.1152 14.8198L17.5524 11.1411L20.3011 8.37009L21.6754 6.98457L22.3626 6.2918M25.6647 9.62074L26.3519 8.92797L28.0872 7.1785C28.3912 6.87208 28.3912 6.37528 28.0872 6.06885L25.8858 3.84957C25.5819 3.54314 25.0891 3.54314 24.7851 3.84957L23.0498 5.59904L22.3626 6.2918M25.6647 9.62074L22.3626 6.2918"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
/**
 * Seats Icon
 * @param className
 * @returns FlagIcon
 */
export const SeatsIcon: FunctionComponent<SVGProps<SVGSVGElement>> = (
  props,
) => {
  return (
    <svg
      width="32"
      height="33"
      viewBox="0 0 32 33"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <g clipPath="url(#clip0_8741_11111)">
        <path
          d="M1.08445 18.5478C0.846584 18.2591 -0.480895 15.9854 0.185061 15.3028C0.851017 14.6201 3.49969 16.4437 3.95074 16.5633C4.4018 16.6828 4.85286 16.8622 6.21584 17.0894C7.57881 17.3166 10.369 17.8422 11.4309 21.3C11.732 22.2805 11.4446 23.4809 12.343 24.1164C12.6665 24.3452 14.9059 27.1383 14.6001 27.3612C11.9758 29.2738 2.32971 26.3665 1.93795 21.0069C1.8921 20.3797 1.47145 19.0175 1.08445 18.5478Z"
          fill="currentColor"
        />
        <path
          d="M16.043 27.397C18.4575 29.3838 11.4936 28.1231 11.8795 28.6241C12.2035 29.2204 15.1542 29.8238 16.0916 29.9546C17.0888 30.0937 19.9545 29.1046 20.1099 28.7291C20.5414 27.6867 28.2255 27.9977 26.3953 26.1959C25.8443 25.6535 25.1429 24.3067 25.3886 23.909C25.5989 23.5687 24.2583 22.586 24.0502 22.0963C23.6422 21.136 32.6054 20.7098 31.3183 19.7487C30.8784 19.4202 29.7198 19.4379 29.6375 19.3739C29.0971 18.9539 32.3531 18.4341 31.8001 18.0397C30.4542 17.0798 25.513 17.685 23.0924 16.9759C22.8956 16.9182 21.8308 15.8774 21.5149 16.0874C21.3327 16.2084 19.5243 19.4135 20.261 19.9835C20.5954 20.2423 20.7843 20.5242 20.8292 20.8422C20.8741 21.1603 19.4764 21.8546 19.0569 21.9238C17.3823 22.2002 19.488 24.1826 18.5336 24.847C17.6418 25.4679 14.5004 26.1277 16.043 27.397Z"
          fill="currentColor"
        />
        <path
          d="M21.2421 7.55641C21.2421 11.2119 15.5304 16.3241 15.5304 16.3241C15.5304 16.3241 9.81873 11.2119 9.81873 7.55641C9.81873 4.35787 12.5021 1.84473 15.5304 1.84473C18.5587 1.84473 21.2421 4.35787 21.2421 7.55641Z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <ellipse
          cx="15.5304"
          cy="7.54564"
          rx="1.76146"
          ry="1.76146"
          fill="currentColor"
        />
      </g>
      <defs>
        <clipPath id="clip0_8741_11111">
          <rect
            width="32"
            height="32"
            fill="white"
            transform="translate(0 0.324097)"
          />
        </clipPath>
      </defs>
    </svg>
  );
};

/**
 * Light Bulb Icon
 * @param className
 * @returns FlagIcon
 */
export const LightBulbIcon: FunctionComponent<SVGProps<SVGSVGElement>> = (
  props,
) => {
  return (
    <svg
      width="32"
      height="33"
      viewBox="0 0 32 33"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M27.2 17.1241H28.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M3.20001 17.1241H4.80001"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16 3.52405L16 5.12405"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M24.843 8.65979L25.9744 7.52843"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M7.1571 8.65979L6.02573 7.52843"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M19.2 21.9241V28.1241C19.2 28.6764 18.7523 29.1241 18.2 29.1241H13.8C13.2477 29.1241 12.8 28.6764 12.8 28.1241V21.9241"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle
        cx="16"
        cy="16.3241"
        r="6.6"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
};
