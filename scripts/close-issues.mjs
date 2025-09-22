// @ts-check

import { Octokit } from '@octokit/rest';

const tag = process.env.RELEASE_TAG;
const owner = 'btjawa';
const repo = 'BiliTools';
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const STATUS_RESOLVED = 'status: resolved';
const STATUS_IN_PROGRESS = 'status: in progress';
const STATUS_RELEASED = 'status: released';

const milestones = await octokit.paginate(octokit.rest.issues.listMilestones, {
  owner,
  repo,
  state: 'all',
  per_page: 100,
});
const milestone = milestones.find((v) => v.title === tag);
if (!milestone) {
  console.error(`[error] No milestone with title ${tag} found.`);
  process.exit(1);
}

console.log(
  `[info] Using milestone #${milestone.number}: ${milestone.title} (${milestone.state})`,
);

const rawIssues = await octokit.paginate(octokit.rest.issues.listForRepo, {
  owner,
  repo,
  state: 'all',
  milestone: milestone.number.toString(),
});

const issues = rawIssues.filter((v) => !v.pull_request);
if (!issues || issues.length <= 0) {
  console.error(`[error] No issues with milestone ${milestone.number} found.`);
  process.exit(1);
}

const body = [
  `✅ Version ${tag} has released, please check it out~`,
  `We will close this issue now, but feel free to comment if you still have problems.`,
  `✅ 版本 ${tag} 已发布，请试试看~`,
  `我们现在会关闭该 Issue，如果你仍有疑问，也可继续评论。`,
].join('\n');

for (const issue of issues) {
  const issue_number = issue.number;
  try {
    await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number,
      body,
    });
    const current = issue.labels.map((l) =>
      typeof l === 'string' ? l : (l?.name ?? ''),
    );
    const labels = Array.from(
      new Set(
        current
          .filter((c) => c !== STATUS_IN_PROGRESS && c !== STATUS_RESOLVED)
          .concat(STATUS_RELEASED),
      ),
    );
    await octokit.rest.issues.update({
      owner,
      repo,
      issue_number,
      labels,
      state: 'closed',
    });
  } catch (err) {
    console.warn(
      `[warn] error occurred while updating issue ${issue_number}:\n`,
      err,
    );
  }
}
