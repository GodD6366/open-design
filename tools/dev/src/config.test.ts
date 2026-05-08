import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveHostOption } from "./config.js";

describe("tools-dev host resolution", () => {
  it("prefers the explicit host option", () => {
    assert.equal(resolveHostOption("0.0.0.0"), "0.0.0.0");
  });

  it("falls back to loopback when no host is set", () => {
    const prevHost = process.env.OD_HOST;
    const prevBindHost = process.env.OD_BIND_HOST;
    delete process.env.OD_HOST;
    delete process.env.OD_BIND_HOST;
    try {
      assert.equal(resolveHostOption(undefined), "127.0.0.1");
    } finally {
      if (prevHost == null) delete process.env.OD_HOST;
      else process.env.OD_HOST = prevHost;
      if (prevBindHost == null) delete process.env.OD_BIND_HOST;
      else process.env.OD_BIND_HOST = prevBindHost;
    }
  });

  it("rejects invalid host characters", () => {
    assert.throws(() => resolveHostOption("127.0.0.1;rm -rf /"), /invalid characters/);
  });
});
