# Hex Map Studio

Standalone private tool repository, separate from the Unity consumer. The human requested this tool and approved the name `hex-map-studio` and private GitHub visibility.

- Process chosen images locally in the browser. Do not upload source pictures or embed them in exported level JSON.
- `contracts/` is the versioned interoperability boundary. Runtime imports explicit axial coordinates and color IDs; no image decoder or image mask is needed by the game.
- The initial supported palette is the game's six shared sprite colors. Do not silently export unsupported custom colors or copy reference-game maps/assets.
- Keep authoring code, uploaded images, preview captures and solution reports out of Unity player content. Never automatically copy exports into a consumer or overwrite levels.
- Source pictures are authoring inputs, not new media authored by this tool. For actual art/sprite/audio authoring follow the workspace native-app and asset-library instructions.
- Run meaningful core tests and browser checks; record them separately from Unity/device/human acceptance. Do not run Unity/builds/devices as part of this tool task.
- Repository creation/initial private delivery is authorized by this task. Future publication/visibility changes require a new request. Never commit input/output files, credentials or captures.
