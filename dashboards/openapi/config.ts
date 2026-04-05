export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface NavItem {
  label: string;
  href: string;
}

export interface NavSection {
  group: string;
  items: NavItem[];
}

export const NAV_SECTIONS: NavSection[] = [
  {
    group: "General",
    items: [
      { label: "Introduction", href: "/openapi/introduction" },
      { label: "Versioning", href: "/openapi/versioning" },
      { label: "Authentication", href: "/openapi/authentication" },
      { label: "Errors", href: "/openapi/errors" },
    ],
  },
  {
    group: "Endpoints",
    items: [{ label: "Candidates", href: "/openapi/endpoints/candidates" }],
  },
];

export const ALL_PAGES: NavItem[] = NAV_SECTIONS.flatMap(s => s.items);
