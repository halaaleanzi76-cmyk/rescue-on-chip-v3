---
name: 3D label rendering
description: An observed React 19 / Drei lifecycle conflict in the scientific 3D viewport
---

Avoid casually replacing the viewport's projected DOM labels with Drei `Html`.

**Why:** During the 3D upgrade, real preview captures with React 19, React Three Fiber 9 and Drei 10 produced repeated “Attempted to synchronously unmount a root while React was already rendering” errors from `Html` cleanup when its event target changed. Rendering still appeared, so a visible scene alone was insufficient evidence of correctness.

**How to apply:** Keep labels attached to projected 3D positions without independent React roots, or verify a compatible upstream fix through actual preview/browser logs before adopting `Html` again. Do not suppress the console error as a substitute for fixing the lifecycle conflict.
