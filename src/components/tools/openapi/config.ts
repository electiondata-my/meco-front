export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface NavItem {
  label: string;
  href: string;
  disabled?: boolean;
}

export interface NavSection {
  group: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    group: "General",
    items: [
      { label: "Introduction", href: "/openapi" },
      { label: "Versioning", href: "/openapi/versioning" },
      { label: "Authentication", href: "/openapi/authentication" },
      { label: "Errors", href: "/openapi/errors" },
    ],
  },
  {
    group: "Endpoints",
    items: [
      { label: "Results", href: "/openapi/endpoints/results" },
      { label: "Elections", href: "#", disabled: true },
      { label: "By-Elections", href: "/openapi/endpoints/byelections" },
      { label: "Seats (Current)", href: "/openapi/endpoints/seats-current" },
      { label: "Seats (Historical)", href: "#", disabled: true },
      { label: "Candidates", href: "/openapi/endpoints/candidates" },
      { label: "Parties", href: "#", disabled: true },
    ],
  },
];

export const ALL_PAGES: NavItem[] = NAV_SECTIONS.flatMap(s => s.items);
