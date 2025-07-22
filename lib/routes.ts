export const routes = {
  HOME: "/",
  DATA_CATALOGUE: "/data-catalogue",
  DATA_GPT: "/data-catalogue/datagpt",
  PARLIMEN_SEATS: "/parlimen",
  DUN_SEATS: "/dun",
  ELECTIONS: "/elections",
  CANDIDATES: "/candidates",
  PARTIES: "/parties",
  TRIVIA: "/trivia",
  BLOGS: "/blogs",
  API_DOCS: "/api-docs",
};

export const static_routes: string[] = (() => {
  let s_routes = Object.values(routes).filter(
    (route) => !route.startsWith("/data-catalogue"),
  );

  s_routes.forEach((route) => {
    s_routes.push(`/ms-MY${route}`);
  });
  return s_routes;
})();
