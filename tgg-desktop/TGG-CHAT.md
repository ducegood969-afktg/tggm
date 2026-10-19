# TGG Chat — 0.1.13

TGG Chat is the integrated conversation workspace, available in the sidebar and Home launcher. It uses the model and provider already saved in Owner settings. With Ollama selected, requests go only to the local Ollama API; no ChatGPT account or hosted API credit is required. TGG supplies the interface and conversation storage, while the selected model supplies responses. This is not an OpenAI ChatGPT product or a newly trained model.

Follow-ups include previous successful turns. Each conversation is bounded to 40 messages and 60,000 characters, with a 20,000-character message limit; start a new chat when full. Studio companion requests retain their separate, independent behavior. TGG Chat does not read project files automatically, execute tools or control the computer.

Use **Save conversation** to retain a conversation using OS encryption in the existing owner data store. Owner unlock is required to save, list, open or delete saved chats. Refresh saved chats after unlocking or restarting. Up to ten saved conversations are retained; saving an eleventh removes the oldest saved entry. Opening or starting a different chat replaces the visible conversation, so save anything you want to keep first. Delete saved copy removes that saved entry; visible text remains until New chat or another conversation is opened. There is no automatic transcript save.

Selecting OpenAI sends the active conversation context to its API and requires separate API billing. Switching providers does not reset the visible conversation; use New chat if you do not want earlier turns included with the new provider. Browser ChatGPT remains isolated and separate from TGG Chat.

Validation includes bounded alternating roles, rejection of injected system messages, local endpoint/header isolation, prior-turn payloads, and real Electron save/load/delete with encrypted owner data. Cloud smoke uses mock model responses; actual Ollama model quality and speed depend on the owner's installation.
