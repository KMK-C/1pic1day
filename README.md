# 1Pic1Day

A small web page for a one-photo-a-day face timelapse, made for the iPhone front camera.

- Dashed face guide (eye targets, face oval, nose and mouth lines) plus a live landmark check
- Ghost overlay of the previous photo
- Level (pitch and roll from the motion sensor) so the phone stays upright
- 9:16 crop preview for vertical video
- Saves one JPEG per day named by date (`YYYY-MM-DD.jpg`)

Photos never leave the device: the page has no server side and uploads nothing. The page, the face landmark runtime and the model are all served as static files from this repository.

## Third-party components

`vendor/` contains MediaPipe Tasks Vision 0.10.35 (`vision_bundle.mjs`, `wasm/`) and the MediaPipe Face Landmarker model (`face_landmarker.task`), both by Google and distributed under the Apache License 2.0. See https://github.com/google-ai-edge/mediapipe and https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker.
