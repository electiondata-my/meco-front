export const routes = {
  HOME: "/",
  API_DOCS: "/api-docs",
  BLOGS: "/blogs",
  CANDIDATES: "/candidates",
  DATA_CATALOGUE: "/data-catalogue",
  DUN_SEATS: "/dun",
  ELECTIONS: "/elections",
  MAP_EXPLORER: "/map/explorer",
  PARLIMEN_SEATS: "/parlimen",
  PARTIES: "/parties",
  REDELINEATION: "/redelineation",
  RESEARCH: "/research",
  SEATS: "/seats",
  TRIVIA: "/trivia",
};

export const static_routes: string[] = (() => {
  let s_routes = Object.values(routes).filter(
    (route) => ![""].includes(route),
    // !["/data-catalogue", "/data_request", "/community-products"].includes(
    //   route,
    // ),
  );

  s_routes.forEach((route) => {
    s_routes.push(`/ms-MY${route}`);
  });
  return s_routes;
})();
