import { describe, expect, test } from "bun:test";
import {
  getGitBranch,
  getGitHubUrl,
  getProjectName,
  getPullRequestInfo,
} from "./git.ts";

describe("git operations", () => {
  test("getGitBranch returns string in git repo, null outside", async () => {
    expect(typeof (await getGitBranch())).toBe("string");
    expect(await getGitBranch("/tmp")).toBeNull();
  });

  test("getProjectName extracts repo name from URL", () => {
    expect(getProjectName("https://github.com/user/repo")).toBe("repo");
    expect(getProjectName(null)).toBeNull();
  });

  test("getPullRequestInfo returns null or valid shape", async () => {
    const result = await getPullRequestInfo();
    if (result !== null) {
      expect(typeof result.number).toBe("number");
      expect(result.url.startsWith("https://")).toBe(true);
    }
  });
});
