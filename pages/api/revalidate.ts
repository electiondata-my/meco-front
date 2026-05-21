import { static_routes } from "@lib/routes";
import { NextApiRequest, NextApiResponse } from "next";

type RevalidateData = {
  revalidated: string[];
  message?: string;
  error?: string;
  count?: number;
};

/**
 * POST endpoint to revalidate pages from BE activity
 * @param req Request
 * @param res Response
 * @returns {RevalidateData} Result
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RevalidateData | string>,
) {
  if (req.method !== "POST") {
    return res
      .status(405)
      .json({ message: "Method Not Allowed", revalidated: [] });
  }
  if (req.headers.authorization !== `Bearer ${process.env.REVALIDATE_TOKEN}`) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid bearer token",
      revalidated: [],
    });
  }

  try {
    const { route: _route }: { route: string } = req.body;
    if (!_route) throw new Error("Route(s) missing");

    const routes: string[] = _route.split(",");

    await Promise.all(
      routes.map((route) =>
        validate(route)
          .then(() => res.revalidate(route))
          .catch((e) => {
            throw new Error(e);
          }),
      ),
    );

    return res.json({
      message: "Revalidation successful",
      revalidated: routes,
      count: routes.length,
    });
  } catch (err: any) {
    return res.status(400).json({
      error: "Revalidation failed",
      message: err.message,
      revalidated: [],
    });
  }
}

const validate = (route: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const valid = static_routes.some(
      (r) => route === r || route.startsWith(r + "/"),
    );
    if (valid) resolve(route);
    else
      reject(`Route does not exist or is not a static page. Route: ${route}`);
  });
