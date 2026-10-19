# TGG local coding companion — 0.1.7

Use the TGG app and a downloaded Ollama model for local coding help without hosted Codex or OpenAI API quotas. This does not train a new model, supply unlimited computing or give a cloud chat live access to the computer. Ollama performs inference on the laptop. Model licenses, hardware requirements and quality limits still apply. Installation, model downloads and rebuilding updates need Internet; local inference does not require a paid API key.

## Choose an installed coding model

New installations default to Local Ollama; existing provider settings are retained. Unlock Owner settings, select Local Ollama if needed, then choose **Find downloaded Ollama models**. Select a downloaded model from the picker and save encrypted settings. Selecting a name does not download the model. A larger coding-oriented model is usually more capable than the 0.5B starter model, but suggestions still require review. Use the exact installed model name; do not assume a label denotes a newly trained TGG foundation model.

## Propose, review, apply, save

1. Unlock Owner settings, open Studio workspace, select a folder and an existing text file.
2. Enter a clear change request in the companion prompt, then choose **Propose edit to this file**.
3. This sends the full current editor text (up to 12,000 characters) and instruction (up to 4,000 characters) only to the fixed loopback Ollama endpoint. The chat checkbox applies to regular chat; proposals always include current editor text.
4. Review the current text and full proposed replacement side by side. Reject it, or choose **Apply to editor only**. The model cannot select another file or perform actions.
5. Applying marks the buffer unsaved and does not write to disk. Review the buffer and use **Save file** to write it. Owner unlock and external-change checks still apply.

Generation uses an Ollama JSON schema. Malformed responses, extra fields or replacement content exceeding 32 KiB are rejected without altering the editor or file. If the buffer changes during generation, discard that proposal and request a fresh one. If disk content changes, reopen the file before requesting/saving. In-flight model requests can take up to three minutes; this preview has no Stop control. Do not start multiple requests at once.

No terminal command execution, unattended agent, new-file generation or multi-file edits are implemented. Chat and proposal history are not persisted. Suggestions are not validated as correct merely because the JSON is valid. The general companion prompt asks the model not to invent capabilities, dependencies, tests or licenses, but that does not eliminate model errors.

## Validation

Eighteen desktop tests pass, including local model listing, no cloud-key forwarding, schema-driven request generation, malformed/oversized output rejection and locked-owner rejection. GUI smoke uses mocked model responses to verify model selection, proposal rejection, apply-to-buffer without a disk write, and separate explicit saving, alongside existing editor/Source/Remote tests. Real proposals from the owner's chosen local model and Windows 0.1.7 installation remain acceptance checks.
