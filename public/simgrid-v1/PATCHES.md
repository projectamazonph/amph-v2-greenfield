# SimGrid patches

This file logs every change applied to the vendored SimGrid source. The base SHA is in
`VERSION.txt`. Re-run `scripts/vendor-simgrid.sh <new-sha>` and re-apply these patches
when upgrading.

## 2026-09-30 — iframe parent posting

**File:** `assets/student-progress.js`

**Why:** SimGrid's `publishToSimHub` only posts to `window.opener`. When AMPH hosts the
page inside an iframe, `window.opener` is null. We extend the bridge to also post to
`window.parent` when framed.

**Before:**

```js
function publishToSimHub(attempt) {
  try {
    if (!root || !root.location || !root.opener) return;
    // ...
    root.opener.postMessage(
      {
        source: "simhub-static-bridge",
        kind: "simulator_attempt",
        token: token,
        attempt: attempt,
      },
      returnOrigin,
    );
  } catch (error) {
    /* ... */
  }
}
```

**After:**

```js
function publishToSimHub(attempt) {
  try {
    if (!root || !root.location) return;
    var target =
      root.opener && root.opener !== root
        ? root.opener
        : root.parent && root.parent !== root
          ? root.parent
          : null;
    if (!target) return;
    // ...
    target.postMessage(
      {
        source: "simhub-static-bridge",
        kind: "simulator_attempt",
        token: token,
        attempt: attempt,
      },
      returnOrigin,
    );
  } catch (error) {
    /* ... */
  }
}
```
