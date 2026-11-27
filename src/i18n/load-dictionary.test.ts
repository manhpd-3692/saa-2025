import { describe, expect, it } from "vitest";
import {
  loadDictionary,
  translate,
  withMasterFallback,
} from "./load-dictionary";
import { DICTIONARY_NAMESPACES } from "./locale-config";

describe("withMasterFallback", () => {
  it("uses the vi value for a key missing in the localized dictionary", () => {
    const merged = withMasterFallback(
      { a: "một", b: "hai" },
      { a: "one" },
    );
    expect(merged).toEqual({ a: "one", b: "hai" });
  });

  it("keeps the master key set when the localized dictionary is empty", () => {
    expect(withMasterFallback({ a: "một" }, {})).toEqual({ a: "một" });
  });
});

describe("translate", () => {
  it("returns the key when it is unknown everywhere", () => {
    expect(translate({ a: "x" }, "missing.key")).toBe("missing.key");
  });
});

describe.each(DICTIONARY_NAMESPACES)("dictionaries/%s", (namespace) => {
  it("vi master loads and en has every key of the master", async () => {
    const vi = await loadDictionary("vi", namespace);
    const en = await loadDictionary("en", namespace);
    expect(Object.keys(vi).length).toBeGreaterThan(0);
    expect(Object.keys(en).sort()).toEqual(Object.keys(vi).sort());
  });

  it("en dictionary never defines a key the vi master lacks", async () => {
    const vi = await loadDictionary("vi", namespace);
    const rawEn = (await import(`./dictionaries/en/${namespace}.json`)).default;
    for (const key of Object.keys(rawEn)) {
      expect(vi, `key "${key}" missing in vi master`).toHaveProperty(key);
    }
  });

  it("serves english text for en and vietnamese text for vi", async () => {
    const vi = await loadDictionary("vi", namespace);
    const en = await loadDictionary("en", namespace);
    expect(translate(en, "common.retry")).toBe("Retry");
    expect(translate(vi, "common.retry")).toBe("Thử lại");
  });
});
