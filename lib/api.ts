import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import { parseCookies } from "./helpers";

type BaseURL = "api_tb" | "api_s3" | "app" | string;

/**
 * Base URL builder.
 * @param base "api_tb" | "app" | "api_s3"
 * @param {Record<string, string>} headers Additional headers
 * @returns Base of URL
 *
 * @example "api_tb"  -> "https://[NEXT_PUBLIC_API_URL_TB]/"
 * @example "api_s3"  -> "https://[NEXT_PUBLIC_API_URL_S3]/"
 * @example "app"     -> "https://[NEXT_PUBLIC_APP_URL]/"
 */
const instance = (base: BaseURL, headers: Record<string, string> = {}) => {
  const urls: Record<BaseURL, string> = {
    api_tb: process.env.NEXT_PUBLIC_API_URL_TB ?? "",
    api_s3: process.env.NEXT_PUBLIC_API_URL_S3 ?? "",
    app: process.env.NEXT_PUBLIC_APP_URL ?? ""
  };

  // Different authorization logic for each base
  let authorization = "";
  if (base === "api_tb") {
    authorization = `Bearer ${process.env.NEXT_PUBLIC_API_TOKEN_TB}`;
  } else if (base === "app") {
    authorization = `Bearer ${process.env.NEXT_PUBLIC_AUTHORIZATION_TOKEN}`;
  }

  const config: AxiosRequestConfig = {
    baseURL: urls[base] || base,
    headers: {
      ...(authorization && { Authorization: authorization }),
      ...headers,
    },
  };
  return axios.create(config);
};

/**
 * Universal GET helper function.
 * @param {string} route Endpoint URL
 * @param {Record<string, string>} params Queries
 * @param {"api_tb" | "api_s3" | "app" } base api_tb | api_s3 | app
 * @returns {Promise<AxiosResponse>} Promised response
 */
export const get = (
  route: string,
  params?: Record<string, any>,
  base: BaseURL = "api_s3"
): Promise<AxiosResponse> => {
  return new Promise((resolve, reject) => {
    instance(base)
      .get(route, { params })
      .then((response: AxiosResponse) => resolve(response))
      .catch((err) => reject(err));
  });
};

/**
 * Universal POST helper function.
 * @param route Endpoint route
 * @param payload Body payload
 * @param {"api_tb" | "app" | "api_s3"} base api_tb | app | api_s3
 * @param {Record<string, string>} headers Additional headers
 * @returns {Promise<AxiosResponse>} Promised response
 */
export const post = (
  route: string,
  payload?: any,
  base: BaseURL = "api_tb",
  headers: Record<string, string> = {}
): Promise<AxiosResponse> => {
  return new Promise((resolve, reject) => {
    instance(base, headers)
      .post(route, payload)
      .then((response: AxiosResponse) => resolve(response))
      .catch((err) => reject(err));
  });
};

/**
 * POST for AI service-based endpoints. Axios does not support text-stream requests. [https://github.com/axios/axios/issues/479]
 * Might be a good time to move away from axios in the future.
 * @param route Endpoint
 * @param payload Body
 * @returns {Promise<Response>} Text
 */
export const stream = (route: string, payload?: any): Promise<Response> => {
  return fetch(process.env.NEXT_PUBLIC_AI_URL + route, {
    method: "POST",
    headers: {
      Accept: "text/event-stream",
      "Content-Type": "application/json",
      Authorization: `Bearer ${parseCookies(document.cookie).rolling_token}`,
    },
    body: JSON.stringify(payload),
  });
};
