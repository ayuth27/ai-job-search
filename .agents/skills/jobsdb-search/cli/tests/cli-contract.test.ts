import { describe, expect, test } from "bun:test";
import { runCLI } from "./helpers";

function parsedStderr(stderr: string): { error?: string; code?: string } {
  try {
    return JSON.parse(stderr);
  } catch {
    return {};
  }
}

describe("JobsDB CLI error contract (no network)", () => {
  test("search without a query fails with JSON on stderr", async () => {
    const result = await runCLI(["search"]);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(JSON.parse(result.stderr)).toEqual({ error: "--query is required", code: "MISSING_REQUIRED" });
  });

  test("detail without an ID fails before making a request", async () => {
    const result = await runCLI(["detail"]);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(JSON.parse(result.stderr)).toEqual({ error: "Job ID or URL is required", code: "MISSING_REQUIRED" });
  });

  test("detail with an unparseable id exits 1 with BAD_ID", async () => {
    const result = await runCLI(["detail", "not-an-id"]);
    expect(result.exitCode).toBe(1);
    expect(parsedStderr(result.stderr).code).toBe("BAD_ID");
  });

  test("a bogus flag exits 1 with UNKNOWN_FLAG", async () => {
    const result = await runCLI(["search", "-q", "x", "--bogus", "1"]);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(parsedStderr(result.stderr).code).toBe("UNKNOWN_FLAG");
  });

  for (const name of ["jobage", "page", "limit"]) {
    test(`--${name} non-numeric exits 1 with BAD_ARG`, async () => {
      const result = await runCLI(["search", "-q", "x", `--${name}`, "foo"]);
      expect(result.exitCode).toBe(1);
      const err = parsedStderr(result.stderr);
      expect(err.code).toBe("BAD_ARG");
      expect(err.error).toMatch(new RegExp(name));
    });

    test(`--${name} fractional exits 1 with BAD_ARG instead of truncating`, async () => {
      const result = await runCLI(["search", "-q", "x", `--${name}`, "1.5"]);
      expect(result.exitCode).toBe(1);
      expect(parsedStderr(result.stderr).code).toBe("BAD_ARG");
    });

    test(`--${name} 0 exits 1 with BAD_ARG`, async () => {
      const result = await runCLI(["search", "-q", "x", `--${name}`, "0"]);
      expect(result.exitCode).toBe(1);
      expect(parsedStderr(result.stderr).code).toBe("BAD_ARG");
    });
  }

  test("an invalid --format exits 1 with BAD_ARG", async () => {
    const result = await runCLI(["search", "-q", "x", "--format", "xml"]);
    expect(result.exitCode).toBe(1);
    expect(parsedStderr(result.stderr).code).toBe("BAD_ARG");
  });

  test("detail --format table exits 1 with BAD_ARG instead of falling through to JSON", async () => {
    const result = await runCLI(["detail", "123", "--format", "table"]);
    expect(result.exitCode).toBe(1);
    expect(result.stdout).toBe("");
    expect(parsedStderr(result.stderr).code).toBe("BAD_ARG");
  });

  test("unknown command exits 1 with BAD_CMD", async () => {
    const result = await runCLI(["frobnicate"]);
    expect(result.exitCode).toBe(1);
    expect(parsedStderr(result.stderr).code).toBe("BAD_CMD");
  });

  test("no command prints help and exits 1; --help exits 0", async () => {
    const none = await runCLI([]);
    expect(none.exitCode).toBe(1);
    expect(none.stdout).toContain("USAGE");
    const help = await runCLI(["search", "--help"]);
    expect(help.exitCode).toBe(0);
    expect(help.stdout).toContain("USAGE");
  });
});
