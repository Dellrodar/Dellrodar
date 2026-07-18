import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

// @testing-library/react auto-sets IS_REACT_ACT_ENVIRONMENT itself, but only when it
// detects Jest-style globals (a global `afterEach`/`beforeAll`/`afterAll`). Our
// vite.config.ts doesn't enable vitest's `test.globals`, so that detection never fires
// and React has no way to know it's running under a test runner that understands
// act(). Setting it here does by hand exactly what RTL would have done for us
// automatically under globals mode -- see @testing-library/react's own source
// (dist/@testing-library/react.umd.js), which gates the same assignment behind that
// same globals check.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  cleanup();
});
