#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage:
  scripts/run-six-pendulum-remote-gpu.sh --host user@host [--command CMD]

Provider-neutral GPU runner for RunPod, Vast, Lambda, Lightning SSH, or a Tailscale GPU host.
By default it syncs the current local worktree to the remote machine, runs a strict-gated
pendulum training command, then rsyncs remote artifacts back to this machine.

Required:
  --host       SSH target, for example root@1.2.3.4 or ubuntu@gpu-host

Optional:
  --ssh-port   SSH port. Required for many RunPod/Vast community pods
  --identity-file SSH private key path
  --ssh-option Extra SSH option, e.g. StrictHostKeyChecking=accept-new. Repeatable
  --repo-url   Git URL to clone when --no-sync-local is set. Default: current repo origin URL
  --branch     Git branch to checkout when --no-sync-local is set. Default: current branch
  --remote-dir Remote checkout dir. Default: /workspace/six-pendulum-maxpetrusenko.com
  --remote-output-dir Remote artifact dir. Default: /tmp/six-pendulum-remote-outputs
  --command    Remote training command. Default: one-link strict down-start PPO dot
  --warmstart-checkpoint Local checkpoint to copy to remote-output-dir/warmstart.pt
  --outputs    Local output dir. Default: existing Codex training-checkpoints dir
  --npm-install Run npm install before the remote command
  --sync-full  Sync the full local app directory instead of training-only files
  --no-sync-local Clone from git instead of syncing this dirty local worktree
EOF
}

HOST=""
SSH_PORT=""
IDENTITY_FILE=""
SSH_OPTIONS=()
REPO_URL=""
BRANCH=""
REMOTE_DIR="/workspace/six-pendulum-maxpetrusenko.com"
REMOTE_OUTPUT_DIR="/tmp/six-pendulum-remote-outputs"
REMOTE_COMMAND=""
WARMSTART_CHECKPOINT=""
SYNC_LOCAL=1
SYNC_FULL=0
NPM_INSTALL=0
LOCAL_OUTPUTS="/Users/maxpetrusenko/Documents/Codex/2026-06-09/i-dont-see-our-work-on/outputs/training-checkpoints"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)
      HOST="$2"
      shift 2
      ;;
    --ssh-port)
      SSH_PORT="$2"
      shift 2
      ;;
    --identity-file)
      IDENTITY_FILE="$2"
      shift 2
      ;;
    --ssh-option)
      SSH_OPTIONS+=("$2")
      shift 2
      ;;
    --repo-url)
      REPO_URL="$2"
      shift 2
      ;;
    --branch)
      BRANCH="$2"
      shift 2
      ;;
    --remote-dir)
      REMOTE_DIR="$2"
      shift 2
      ;;
    --remote-output-dir)
      REMOTE_OUTPUT_DIR="$2"
      shift 2
      ;;
    --command)
      REMOTE_COMMAND="$2"
      shift 2
      ;;
    --warmstart-checkpoint)
      WARMSTART_CHECKPOINT="$2"
      shift 2
      ;;
    --outputs)
      LOCAL_OUTPUTS="$2"
      shift 2
      ;;
    --npm-install)
      NPM_INSTALL=1
      shift
      ;;
    --sync-full)
      SYNC_FULL=1
      shift
      ;;
    --no-sync-local)
      SYNC_LOCAL=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

if [[ -z "$HOST" ]]; then
  echo "Missing --host" >&2
  usage >&2
  exit 2
fi

SSH_ARGS=()
RSYNC_SSH="ssh"
if [[ -n "$SSH_PORT" ]]; then
  SSH_ARGS+=(-p "$SSH_PORT")
  RSYNC_SSH+=" -p $SSH_PORT"
fi
if [[ -n "$IDENTITY_FILE" ]]; then
  SSH_ARGS+=(-i "$IDENTITY_FILE")
  RSYNC_SSH+=" -i $IDENTITY_FILE"
fi
for option in "${SSH_OPTIONS[@]}"; do
  SSH_ARGS+=(-o "$option")
  RSYNC_SSH+=" -o $option"
done

if [[ -z "$REPO_URL" ]]; then
  REPO_URL="$(git remote get-url origin)"
fi

if [[ -z "$BRANCH" ]]; then
  BRANCH="$(git branch --show-current)"
fi

LOCAL_REPO_ROOT="$(git rev-parse --show-toplevel)"
LOCAL_APP_DIR="$(pwd)"
if [[ "$LOCAL_APP_DIR" == "$LOCAL_REPO_ROOT" ]]; then
  LOCAL_APP_REL="."
  REMOTE_APP_DIR="$REMOTE_DIR"
else
  LOCAL_APP_REL="${LOCAL_APP_DIR#"$LOCAL_REPO_ROOT"/}"
  REMOTE_APP_DIR="$REMOTE_DIR/$LOCAL_APP_REL"
fi

if [[ -z "$REMOTE_COMMAND" ]]; then
  WARMSTART_ARG=""
  if [[ -n "$WARMSTART_CHECKPOINT" ]]; then
    WARMSTART_ARG=" --warmstart-checkpoint ${REMOTE_OUTPUT_DIR}/warmstart.pt"
  fi
  REMOTE_COMMAND="uv run --python 3.11 --with mujoco-warp==3.9.0.1 --with numpy==2.2.6 --with torch==2.7.1 python scripts/train_six_pendulum_mjwarp_device_ppo.py --links 1 --nworld 4096 --rollout-steps 768 --eval-steps 2000 --updates 100 --update-epochs 2 --pose down --force-scale 160 --policy-hidden-dim 128 --learning-rate 0.00003 --entropy-coef 0.02 --clip-coef 0.05${WARMSTART_ARG} --eval-stochastic-passes 4 --write-result ${REMOTE_OUTPUT_DIR}/puffer-mjwarp-runpod-link1-down-f160.json --write-checkpoint ${REMOTE_OUTPUT_DIR}/puffer-mjwarp-runpod-link1-down-f160.pt"
fi

REMOTE_BOOTSTRAP=$(cat <<EOF
set -euo pipefail
install_packages() {
  if command -v apt-get >/dev/null 2>&1; then
    if [[ "\$(id -u)" == "0" ]]; then
      apt-get update && apt-get install -y "\$@"
    elif command -v sudo >/dev/null 2>&1; then
      sudo apt-get update && sudo apt-get install -y "\$@"
    fi
  fi
}
if ! command -v git >/dev/null 2>&1; then
  install_packages git curl ca-certificates rsync
fi
if ! command -v rsync >/dev/null 2>&1; then
  install_packages rsync
fi
if [[ ${NPM_INSTALL@Q} == "1" ]] && ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  install_packages nodejs
fi
if ! command -v uv >/dev/null 2>&1; then
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="\$HOME/.local/bin:\$PATH"
fi
mkdir -p ${REMOTE_DIR@Q} ${REMOTE_APP_DIR@Q} ${REMOTE_OUTPUT_DIR@Q}
EOF
)

ssh "${SSH_ARGS[@]}" "$HOST" "$REMOTE_BOOTSTRAP"

if [[ "$SYNC_LOCAL" == "1" ]]; then
  RSYNC_COMMON=(-az --delete --no-owner --no-group --no-perms --omit-dir-times -e "$RSYNC_SSH")
  if [[ "$SYNC_FULL" == "1" ]]; then
    rsync "${RSYNC_COMMON[@]}" \
      --exclude .git \
      --exclude node_modules \
      --exclude .next \
      --exclude .vercel \
      --exclude .wrangler \
      --exclude __pycache__ \
      --exclude .claude \
      --exclude .codex \
      "$LOCAL_APP_DIR/" "$HOST:${REMOTE_APP_DIR}/"
  else
    rsync "${RSYNC_COMMON[@]}" "$LOCAL_APP_DIR/package.json" "$HOST:${REMOTE_APP_DIR}/"
    if [[ -f "$LOCAL_APP_DIR/package-lock.json" ]]; then
      rsync "${RSYNC_COMMON[@]}" "$LOCAL_APP_DIR/package-lock.json" "$HOST:${REMOTE_APP_DIR}/"
    fi
    rsync "${RSYNC_COMMON[@]}" \
      --exclude __pycache__ \
      "$LOCAL_APP_DIR/scripts/" "$HOST:${REMOTE_APP_DIR}/scripts/"
    rsync "${RSYNC_COMMON[@]}" "$LOCAL_APP_DIR/docs/" "$HOST:${REMOTE_APP_DIR}/docs/"
    if [[ -d "$LOCAL_APP_DIR/app/ailab/six-pendulum-cartpole/mjcf" ]]; then
      ssh "${SSH_ARGS[@]}" "$HOST" "mkdir -p ${REMOTE_APP_DIR@Q}/app/ailab/six-pendulum-cartpole"
      rsync "${RSYNC_COMMON[@]}" \
        "$LOCAL_APP_DIR/app/ailab/six-pendulum-cartpole/mjcf/" \
        "$HOST:${REMOTE_APP_DIR}/app/ailab/six-pendulum-cartpole/mjcf/"
    fi
  fi
else
  REMOTE_GIT_SYNC=$(cat <<EOF
set -euo pipefail
if [[ ! -d ${REMOTE_DIR@Q}/.git ]]; then
  git clone ${REPO_URL@Q} ${REMOTE_DIR@Q}
fi
cd ${REMOTE_DIR@Q}
git fetch origin ${BRANCH@Q}
git checkout ${BRANCH@Q}
git pull --ff-only origin ${BRANCH@Q}
EOF
)
  ssh "${SSH_ARGS[@]}" "$HOST" "$REMOTE_GIT_SYNC"
fi

if [[ -n "$WARMSTART_CHECKPOINT" ]]; then
  rsync -az -e "$RSYNC_SSH" "$WARMSTART_CHECKPOINT" "$HOST:${REMOTE_OUTPUT_DIR}/warmstart.pt"
fi

REMOTE_RUN=$(cat <<EOF
set -euo pipefail
export PATH="\$HOME/.local/bin:\$PATH"
if [[ -f ${REMOTE_DIR@Q}/${LOCAL_APP_REL@Q}/package.json ]]; then
  cd ${REMOTE_DIR@Q}/${LOCAL_APP_REL@Q}
elif [[ -f ${REMOTE_DIR@Q}/nextjs/package.json ]]; then
  cd ${REMOTE_DIR@Q}/nextjs
elif [[ -f ${REMOTE_DIR@Q}/package.json ]]; then
  cd ${REMOTE_DIR@Q}
else
  echo "Could not find package.json under ${REMOTE_DIR@Q}" >&2
  exit 1
fi
if [[ ${NPM_INSTALL@Q} == "1" ]]; then
  npm install
fi
mkdir -p ${REMOTE_OUTPUT_DIR@Q}
nvidia-smi || true
${REMOTE_COMMAND}
EOF
)

ssh "${SSH_ARGS[@]}" "$HOST" "$REMOTE_RUN"
mkdir -p "$LOCAL_OUTPUTS"
rsync -av -e "$RSYNC_SSH" "$HOST:${REMOTE_OUTPUT_DIR}/" "$LOCAL_OUTPUTS/"
