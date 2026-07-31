let lastSnapshotTime = null;

export function shouldTakeSnapshot() {
  const now = new Date();

  if (!lastSnapshotTime) {
    lastSnapshotTime = now;
    return true;
  }

  const diffMinutes =
    (now.getTime() - lastSnapshotTime.getTime()) /
    (1000 * 60);

  if (diffMinutes >= 1) {
    lastSnapshotTime = now;
    return true;
  }

  console.log("Snapshot Diff Minutes:", diffMinutes);
  return false;
}

export function getLastSnapshotTime() {
  return lastSnapshotTime;
}