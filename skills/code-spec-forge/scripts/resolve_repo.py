#!/usr/bin/env python3
"""Resolve a GitHub URL to a local FULL collaborator clone under H:\\, read-only-safe.

Prefers an existing matching clone; else clones (gh repo clone if available for private/auth, else
git clone). Never clobbers a non-matching dir. Prints resolved path + provenance. Stdlib only.

Usage: python resolve_repo.py <github-url> [--root H:\\]
"""
import argparse, os, re, shutil, subprocess, sys


def parse_github_url(url):
    """(owner, repo) from common GitHub URL forms; raise ValueError otherwise."""
    u = url.strip().rstrip("/")
    if u.endswith(".git"):
        u = u[:-4]
    m = re.search(r"github\.com[/:]([^/]+)/([^/]+)$", u)
    if not m:
        raise ValueError(f"Not a GitHub repo URL: {url}")
    return m.group(1), m.group(2)


def _norm(url):
    x = (url or "").strip().rstrip("/").lower()
    if x.endswith(".git"):
        x = x[:-4]
    m = re.search(r"github\.com[/:](.+)$", x)
    return m.group(1) if m else x


def same_repo(a, b):
    """True if two git URLs point at the same GitHub repo (ignoring scheme/.git/case)."""
    return _norm(a) == _norm(b)


def plan_action(dest_exists, dest_is_git, origin_matches):
    """Pure decision for H:\\<repo>: 'use' an existing matching clone, 'clone' fresh, or 'error'."""
    if not dest_exists:
        return "clone"
    if dest_is_git and origin_matches:
        return "use"
    return "error"  # exists but unrelated — never clobber


def _origin_url(path):
    try:
        out = subprocess.run(
            ["git", "-C", path, "config", "--get", "remote.origin.url"],
            capture_output=True, text=True,
        )
        return out.stdout.strip() or None
    except Exception:
        return None


def _provenance(path):
    def g(*a):
        return subprocess.run(["git", "-C", path, *a], capture_output=True, text=True).stdout.strip()
    return g("rev-parse", "--abbrev-ref", "HEAD"), g("rev-parse", "--short", "HEAD")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url")
    ap.add_argument("--root", default="H:\\")
    args = ap.parse_args()

    owner, repo = parse_github_url(args.url)
    dest = os.path.join(args.root, repo)
    dest_is_git = os.path.isdir(os.path.join(dest, ".git"))
    origin_matches = dest_is_git and same_repo(_origin_url(dest), args.url)
    action = plan_action(os.path.isdir(dest), dest_is_git, origin_matches)

    if action == "error":
        sys.exit(f"error: {dest} exists but is not a clone of {args.url} — refusing to clobber.")
    if action == "clone":
        if shutil.which("gh"):
            cmd = ["gh", "repo", "clone", f"{owner}/{repo}", dest]
        else:
            cmd = ["git", "clone", args.url, dest]
        if subprocess.run(cmd).returncode != 0:
            sys.exit("error: clone failed. For a private repo, run `gh auth login` first.")

    branch, sha = _provenance(dest)
    print(f"path={dest}")
    print(f"action={action}")
    print(f"provenance={repo}@{branch}#{sha}")


if __name__ == "__main__":
    main()
