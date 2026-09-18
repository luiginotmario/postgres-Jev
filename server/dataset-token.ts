import { createHmac, timingSafeEqual } from "node:crypto";
import { deflateSync, inflateSync } from "node:zlib";
import type { Dataset } from "../src/types.js";

export function datasetTokens(secret: string) {
  const sign = (value: string) =>
    createHmac("sha256", secret).update(`dataset:${value}`).digest();
  return {
    encode(dataset: Dataset): string {
      const { token: _token, ...data } = dataset;
      const payload = deflateSync(
        JSON.stringify({ data, expires: Date.now() + 3600000 }),
      ).toString("base64url");
      return `${payload}.${sign(payload).toString("base64url")}`;
    },
    decode(token: unknown): Dataset {
      try {
        if (typeof token !== "string" || token.length > 60000)
          throw new Error();
        const parts = token.split(".");
        if (parts.length !== 2) throw new Error();
        const [payload, signature] = parts;
        const actual = Buffer.from(signature, "base64url");
        const expected = sign(payload);
        if (
          actual.length !== expected.length ||
          !timingSafeEqual(actual, expected)
        )
          throw new Error();
        const { data, expires } = JSON.parse(
          inflateSync(Buffer.from(payload, "base64url"), {
            maxOutputLength: 150000,
          }).toString(),
        );
        if (typeof expires !== "number" || expires <= Date.now())
          throw new Error();
        return data as Dataset;
      } catch {
        throw new Error(
          "The dataset expired or is invalid. Refresh and try again.",
        );
      }
    },
  };
}
