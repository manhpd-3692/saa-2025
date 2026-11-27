import { describe, expect, it } from "vitest";
import {
  loadDictionaries,
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

  it("prefixes every key with its namespace so merged dictionaries cannot collide", async () => {
    const vi = await loadDictionary("vi", namespace);
    const allowed = namespace === "common" ? ["app.", "locale.", "common.", "error."] : [`${namespace}.`];
    for (const key of Object.keys(vi)) {
      expect(allowed.some((prefix) => key.startsWith(prefix)), `key "${key}"`).toBe(true);
    }
  });
});

describe("dictionaries/common", () => {
  it("serves english text for en and vietnamese text for vi", async () => {
    const vi = await loadDictionary("vi", "common");
    const en = await loadDictionary("en", "common");
    expect(translate(en, "common.retry")).toBe("Retry");
    expect(translate(vi, "common.retry")).toBe("Thử lại");
  });
});

describe("loadDictionaries", () => {
  it("merges namespaces and keeps the vi fallback per key", async () => {
    const merged = await loadDictionaries("en", ["common", "shell"]);
    expect(translate(merged, "common.retry")).toBe("Retry");
    expect(translate(merged, "shell.footer.standards")).toBe("Community Standards");
    const vi = await loadDictionaries("vi", ["shell"]);
    expect(translate(vi, "shell.footer.standards")).toBe("Tiêu chuẩn chung");
  });
});
