---
name: deploy
description: Deploy to the Hobbit mini PC. Use when pushing code, updating configs, or syncing the web UI.
disable-model-invocation: true
allowed-tools: Bash
---

# Deploy

Valid targets: `web`, `bridge`, `docker`, or omit for full deploy.

## How to run

Do NOT use `deploy.sh` — the `wsl` command returns a false exit code 1 in this shell, which makes `set -e` abort even on success. Instead, run ansible directly and check the **inner** exit code.

Run this command with `timeout: 180000`:

```
wsl bash -c "cd /mnt/c/Users/YOUR_USERNAME/Documents/projects/minipc-setup && ANSIBLE_CONFIG=./ansible.cfg ansible-playbook playbooks/deploy.yml TAGS 2>&1; echo DEPLOY_EXIT_CODE:\$?"
```

Where TAGS is:
- `--tags web` if target is `web`
- `--tags bridge` if target is `bridge`
- `--tags docker` if target is `docker`
- omitted entirely for full deploy

Target from args: `$ARGUMENTS`

## Determining success

The Bash tool will always show exit code 1 because of the WSL wrapper — **ignore it**. Instead, check the last line of output for `DEPLOY_EXIT_CODE:0` (success) vs any other code (failure).

## Retry on failure

If the inner exit code is non-zero, retry up to 3 times total. Report the attempt number on each retry.

## Output

After success, briefly summarize what changed (look at the ansible recap for `changed` counts). If all retries fail, show the error output.
