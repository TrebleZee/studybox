import { describe, expect, it } from "vitest";
import config from "../vercel.json";

// vercel.json sets the headers on every route of the deployed app (N4). The
// policy is worked out from the built app; these checks stop it drifting wide.
const everyRoute = config.headers.find((rule) => rule.source === "/(.*)");
const header = (key) => everyRoute?.headers.find((item) => item.key.toLowerCase() === key.toLowerCase())?.value;

const directives = Object.fromEntries(
  header("Content-Security-Policy")
    .split(";")
    .map((part) => part.trim().split(/\s+/))
    .filter(([name]) => name)
    .map(([name, ...sources]) => [name, sources])
);

describe("security headers (vercel.json)", () => {
  it("applies to every route", () => {
    expect(everyRoute).toBeTruthy();
  });

  it("has no wildcard source and never allows eval", () => {
    Object.values(directives)
      .flat()
      .forEach((source) => {
        expect(source).not.toContain("*");
        expect(source).not.toBe("'unsafe-eval'");
        expect(source).not.toBe("'wasm-unsafe-eval'");
      });
  });

  it("allows inline code for styles only", () => {
    Object.entries(directives).forEach(([name, sources]) => {
      if (name !== "style-src") expect(sources).not.toContain("'unsafe-inline'");
    });
    expect(directives["script-src"]).toEqual(["'self'"]);
  });

  it("lets the app talk to its own origin and the Asana API only", () => {
    expect(directives["default-src"]).toEqual(["'self'"]);
    expect(directives["connect-src"]).toEqual(["'self'", "https://app.asana.com"]);
  });

  it("cannot be framed, sniffed or leak the referrer", () => {
    expect(directives["frame-ancestors"]).toEqual(["'none'"]);
    expect(directives["object-src"]).toEqual(["'none'"]);
    expect(header("X-Content-Type-Options")).toBe("nosniff");
    expect(header("Referrer-Policy")).toBe("no-referrer");
  });

  it("turns off device features the app never uses", () => {
    const policy = header("Permissions-Policy");
    ["camera", "microphone", "geolocation", "payment", "usb"].forEach((feature) => {
      expect(policy).toContain(`${feature}=()`);
    });
  });
});
