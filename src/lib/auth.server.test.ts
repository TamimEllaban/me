import assert from "node:assert/strict";
import test from "node:test";
import { getSuperAdminProfileIds, isSuperAdminProfile } from "./auth.server.ts";

test("SUPER_ADMIN profile list is normalized", () => {
  const previous = process.env["SUPER_ADMIN_PROFILE_IDS"];
  process.env["SUPER_ADMIN_PROFILE_IDS"] = " baba, Admin-User , ";
  try {
    assert.deepEqual(getSuperAdminProfileIds(), ["baba", "admin-user"]);
    assert.equal(isSuperAdminProfile("BABA"), true);
    assert.equal(isSuperAdminProfile("mama"), false);
    assert.equal(isSuperAdminProfile(undefined), false);
  } finally {
    if (previous === undefined) delete process.env["SUPER_ADMIN_PROFILE_IDS"];
    else process.env["SUPER_ADMIN_PROFILE_IDS"] = previous;
  }
});
