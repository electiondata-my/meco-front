export const routes = {
  HOME: "/",
  DATA_CATALOGUE: "/data-catalogue",
  PARLIMEN_SEATS: "/parlimen",
  DUN_SEATS: "/dun",
  ELECTIONS: "/elections",
  CANDIDATES: "/candidates",
  PARTIES: "/parties",
  TRIVIA: "/trivia",
  BLOGS: "/blogs",
  API_DOCS: "/api-docs",
  MAP_EXPLORER: "/map/explorer",
  REDELINEATION: "/redelineation",
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
