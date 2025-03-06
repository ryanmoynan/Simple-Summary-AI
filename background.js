chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "summarize") {
        chrome.storage.sync.get(["apiKey", "aiProvider"], (config) => {
            const apiKey = config.apiKey;
            const aiProvider = config.aiProvider || "openai";

            if (!apiKey) {
                console.error("API key not set.");
                sendResponse({ summary: "Error: API key missing." });
                return;
            }

            let apiUrl, body, headers;

            if (aiProvider === "openai") {
                apiUrl = "https://api.openai.com/v1/chat/completions";
                headers = {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                };
                body = JSON.stringify({
                    model: "gpt-4",
                    messages: [{ role: "user", content: "Summarize this: " + message.text }],
                    max_tokens: 150
                });
            } else if (aiProvider === "claude") {
                apiUrl = "https://api.anthropic.com/v1/messages";
                headers = {
                    "x-api-key": apiKey,
                    "anthropic-version": "2023-06-01",
                    "Content-Type": "application/json"
                };
                body = JSON.stringify({
                    model: "claude-2",
                    messages: [{ role: "user", content: "Summarize this: " + message.text }],
                    max_tokens: 150
                });
            } else {
                console.error("Invalid AI provider:", aiProvider);
                sendResponse({ summary: "Error: Invalid AI provider." });
                return;
            }

            console.log("Sending request to", apiUrl);

            fetch(apiUrl, { method: "POST", headers, body })
                .then(response => response.json())
                .then(data => {
                    console.log("AI Response:", data);

                    let summary = "Error generating summary.";
                    if (aiProvider === "openai") {
                        summary = data.choices?.[0]?.message?.content || summary;
                    } else if (aiProvider === "claude") {
                        summary = data.content?.[0]?.text || summary;
                    }

                    sendResponse({ summary });
                })
                .catch(error => {
                    console.error("Fetch error:", error);
                    sendResponse({ summary: "Error: Failed to fetch summary." });
                });

            return true; // IMPORTANT: Keeps `sendResponse` open for async request.
        });

        return true; // Ensure the listener stays alive for async handling.
    }
});