---
name: WebGL verification
description: Distinguishing a test-browser graphics limitation from an application renderer failure
---

Do not replace the 3D laboratory with a static visualization merely because one automated browser cannot obtain a WebGL context.

**Why:** During verification, the notebook browser returned null for both WebGL contexts while the same app rendered and passed interaction checks in system Chromium with software WebGL. The app-preview screenshot browser also rendered the actual scene. The unavailable-renderer panel was correct behavior in the limited harness, not a defect in the application.

**How to apply:** Verify actual rendering and interactions in a WebGL-capable browser, and separately check the honest fallback in an unavailable-graphics environment. Clearly distinguish an environment limitation from a failed application test. Never treat a screenshot of the fallback as proof that 3D rendering works.
