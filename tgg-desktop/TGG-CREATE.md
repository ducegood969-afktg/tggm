# TGG Create preview (0.1.17)

TGG Create is a local text-to-image workspace inside AI Ultra. It uses an existing ComfyUI installation and its installed checkpoint; it is not Adobe Firefly, an Adobe integration, or a newly trained model. No cloud API or paid account is required by this adapter. Hardware, electricity, disk space, and model licensing still belong to the local setup.

## Check The Studio first

Unlock Owner settings, open **TGG Create**, then choose **Check this computer**. The check reports Electron's graphics-device identity and probes only `127.0.0.1:8188` and `127.0.0.1:8000` for ComfyUI system information and checkpoint metadata. A running ComfyUI can report VRAM. Electron graphics metadata alone does not establish available VRAM.

For a stopped or unknown installation, run the repository-root `Diagnose-TGG-Create.ps1` locally. It reads Windows graphics-controller information, optionally queries NVIDIA's installed `nvidia-smi.exe`, checks both fixed ComfyUI ports, and examines common installation folders with a bounded one-level search. It writes `Downloads\TGG-Create-Diagnostic.json`. It does not install anything, enable startup, start processes other than the bounded NVIDIA diagnostic, change settings, or upload the report. Review local paths before sharing. Undetected does not mean absent; custom installation locations are outside this search.

This cloud chat cannot inspect the owner's computer. Its hardware remains unknown until a local diagnostic result is supplied.

## Install an already downloaded SD 1.5 checkpoint

Run the repository-root `Install-TGG-Checkpoint.ps1` locally while ComfyUI is running on port 8188. It reads the active engine launch arguments, honors `--models-directory` before `--base-directory`, and otherwise requires an absolute recognizable ComfyUI script path. Ambiguous/relative paths stop without guessing. It finds the completed `v1-5-pruned-emaonly.safetensors` download (including browser duplicate names), checks its safetensors header, then copies through a temporary file and verifies SHA-256 copy integrity. It preserves the original download and refuses to overwrite a different existing checkpoint. This is copy-integrity verification, not publisher authenticity verification. No backend restart, new model download, settings edit, or startup entry is performed. If the running engine does not list it yet, restart ComfyUI and check again in TGG Create.

## Generate and export

1. Start your installed ComfyUI with a compatible SD 1.5 or SDXL checkpoint available. Choose a checkpoint whose license fits the intended use. FLUX, diffusion-only loaders, SD3, and other model families need different workflows and are not supported here.
2. Run the connection check and choose the port/checkpoint. Enter a prompt, negative prompt, canvas, sampling steps, and optional seed. The TGG street preset is a text concept prompt, not an uploaded reference image.
3. Generate, then export the normalized PNG through the Windows save dialog. The preview is held in memory; export before closing. ComfyUI independently retains its generated output in its output directory.

Only a fixed native workflow is submitted: checkpoint loader, text encoders, empty latent, Euler sampler, VAE decoder, and PNG output. Arbitrary backend addresses and imported workflows are not accepted. Requests reject redirects and cap response size. Output retrieval is restricted to this session's prompt ID and generated filename prefix; the native process checks PNG dimensions and decodes/re-encodes it before preview/export. The sandboxed renderer has no network access.

**Stop work** cancels TGG's wait. It deliberately does not call ComfyUI's global interrupt endpoint, which could terminate another application's job. Use **Collect pending image** to retrieve the same session's queued result. **Discard pending request** forgets that request in TGG without deleting ComfyUI's output. Closing TGG loses the pending request and preview. A timeout or interrupted POST may have queued work even if TGG did not receive its ID; look in ComfyUI's own output folder in that case.

This preview does not include a persistent gallery, reference-image remix, inpainting, video, 3D generation, or automatic Unreal import. Concept images are not playable game levels. The existing optional creative service and Unreal plugin are unchanged.

## Verification

Unit tests cover fixed endpoints, bounded parameters, checkpoint detection, owned output paths, malformed responses, cancellation, and result collection. The Electron smoke test uses **mocked inference** while exercising real trusted IPC, native PNG decoding, rendering, and save-dialog export. These checks do not prove GPU inference or Windows compatibility on The Studio. Those require the local engine/hardware check and a real image request after installation.
