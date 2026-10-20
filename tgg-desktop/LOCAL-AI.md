# Local AI in 0.1.2

The Ollama option runs inference on this computer without OpenAI API fees. It needs a separately installed Ollama runtime and model, Internet for installation/model downloads, enough RAM/disk space and CPU/GPU time. Ollama and model terms apply. It does not supply unlimited hosted computing or make paid creative services free.

1. Install Ollama for Windows from https://ollama.com/download/windows .
2. Open PowerShell and run `ollama pull qwen2.5:0.5b`. This is a small starter model; quality is limited. If Ollama isn't running, start its desktop app (or run `ollama serve` when no server is active).
3. In TGG AI Ultra **0.1.2**, open Owner settings and unlock with your existing password.
4. Select **Local Ollama — no API fees**. Keep `qwen2.5:0.5b` as the model, or enter the exact name of another model you have downloaded. Save encrypted settings. No API key is needed.
5. Open AI workspace and send a message. The first request may take longer while the model loads. Requests are independent; chat history is not sent with them.

Version 0.1.1 has no local-provider selector. Build/install 0.1.2 from the current release branch using the free Windows builder first. Close the app before installing the newer version. Keep a separate backup of your Source repositories; do not delete app data. The app ID and user-data paths remain unchanged. Upgrade/data preservation on Windows still requires validation.

Only the main process contacts `http://127.0.0.1:11434/api/chat`. The endpoint cannot be supplied by a renderer and redirects are rejected. Local requests contain no OpenAI Authorization header. Owner settings still require the OS keyring, and the provider configuration remains encrypted. The app does not install Ollama, download models automatically, expose the local model server to the network or execute AI-generated commands.

Provider protocol/error handling and the real desktop controls were tested using mocked completions. A real downloaded Ollama model has not been run in this cloud environment; successful live inference on the target laptop remains an acceptance step. The existing OpenAI mode is retained and continues to require its own key and API billing.
