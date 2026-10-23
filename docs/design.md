# Authoring workbench design

Purpose: a local image-to-hex map tool for the game designer. The map is the main working surface, with inputs on the left and validation/export on the right. No landing page or decorative dashboard.

Tokens: fog #edf2ef, paper #ffffff, ink #183d3b, muted #617470, teal #087f80, canvas #e1e9e4. The six game colors remain reserved for cell content and palette controls. System Avenir Next / Segoe UI for readable Vietnamese; no web fonts or remote dependencies.

Layout: left-aligned header, compact three-column workbench with a large central canvas; stack panels below 1000px and retain accessible controls at 390px. A small-screen author can scroll the workspace and zoom the canvas. Board target/initial/empty views share one precise coordinate transform. File name, cell count and validation state are functional context.

Review against the brief: a generic gallery of generated pictures would conceal actual slot data and export validity. This workbench instead puts the editable hex lattice at the center. Keep the sidebars quiet; use color only for the map and current action. No gradients, external artwork, animation or marketing copy. Visible focus, keyboard-accessible forms, and an accessible text summary accompany the canvas.
