// SPDX-License-Identifier: Apache-2.0

// The branch-name, commit-subject and changelog rules (CLAUDE.md; the same
// commit rule bin/hooks/commit-msg enforces).

export const branchFamilies = ['feature', 'bugfix', 'chore', 'documentation', 'release', 'hotfix'];
export const longLivedBranches = ['production', 'development'];
export const commitTypes = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert', 'merge', 'release'];

const branchPattern = new RegExp(`^(${branchFamilies.join('|')})/[0-9]+-[a-z0-9]+(-[a-z0-9]+)*$`);
const commitPattern = new RegExp(`^(${commitTypes.join('|')})\\([a-z0-9._/-]+\\)!?: .+ \\(#[0-9]+\\)$`);

/** Error message for a non-conforming branch name, or null. */
export function validateBranchName(branch) {
  if (longLivedBranches.includes(branch) || branchPattern.test(branch)) return null;
  return `Branch "${branch}" does not match <family>/<N>-<slug> (family one of ${branchFamilies.join(', ')}).`;
}

/** Error message for a non-conforming commit subject, or null. */
export function validateCommitSubject(subject) {
  const s = subject.trimEnd();
  if (commitPattern.test(s)) return null;
  return `Commit subject "${s}" does not match type(scope): description (#N); type is one of ${commitTypes.join(' ')}.`;
}

/** Offending commits (`<sha>\t<subject>` lines) that are not in [baseline]. */
export function findOffenders(lines, baseline) {
  const out = [];
  for (const line of lines) {
    const tab = line.indexOf('\t');
    if (tab < 0) continue;
    const sha = line.slice(0, tab);
    if (baseline.has(sha)) continue;
    const err = validateCommitSubject(line.slice(tab + 1));
    if (err) out.push(`${sha.slice(0, 12)}  ${err}`);
  }
  return out;
}

/** SHAs from a baseline file's text; blank lines and `#` comments ignored. */
export function parseBaseline(text) {
  return new Set(text.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')));
}

/** True when the changelog text has an Unreleased section (`## Unreleased` or `## [Unreleased]`). */
export const hasUnreleased = (text) => /^## \[?Unreleased\]?\s*$/m.test(text);
