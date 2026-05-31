# Plain-python tests (no pytest dependency). Run: python test_resolve_repo.py
import resolve_repo as r

# parse_github_url — common forms
assert r.parse_github_url("https://github.com/brainit-consulting/chess") == ("brainit-consulting", "chess")
assert r.parse_github_url("https://github.com/you/repo/") == ("you", "repo")
assert r.parse_github_url("https://github.com/you/repo.git") == ("you", "repo")
assert r.parse_github_url("git@github.com:you/repo.git") == ("you", "repo")
try:
    r.parse_github_url("https://example.com/not/github"); assert False, "should reject"
except ValueError:
    pass

# same_repo — scheme/.git/case-insensitive
assert r.same_repo("https://github.com/A/B", "git@github.com:a/b.git") is True
assert r.same_repo("https://github.com/A/B", "https://github.com/A/C") is False

# plan_action — pure decision, never clobber
assert r.plan_action(dest_exists=False, dest_is_git=False, origin_matches=False) == "clone"
assert r.plan_action(dest_exists=True, dest_is_git=True, origin_matches=True) == "use"
assert r.plan_action(dest_exists=True, dest_is_git=False, origin_matches=False) == "error"
assert r.plan_action(dest_exists=True, dest_is_git=True, origin_matches=False) == "error"

print("ALL PASS")
