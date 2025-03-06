chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "summarize") {
        console.log("Background received text for summarization.");

        // Retrieve API key from storage
        chrome.storage.sync.get(["apiKey"], function (data) {
            const apiKey = data.apiKey;
            if (!apiKey) {
                console.error("No API key found. Set it in the options.");
                sendResponse({ error: "API key not set. Please configure it in the extension settings." });
                return;
            }

            // Send text to OpenAI API
            summarizeText(message.text, apiKey)
                .then(summary => {
                    sendResponse({ summary });
                })
                .catch(error => {
                    console.error("Error summarizing text:", error);
                    sendResponse({ error: "Failed to generate summary." });
                });
        });

        return true; // Keep the message channel open for async response
    }
});

// Function to send request to OpenAI API
async function summarizeText(text, apiKey) {
    try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "gpt-4",
                messages: [
                    { role: "system", content: "You are an AI assistant that summarizes web pages." },
                    { role: "user", content: `Summarize the following text:\n${text}` }
                ],
                max_tokens: 200
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content.trim() || "No summary available.";
    } catch (error) {
        console.error("API request failed:", error);
        return "Error generating summary.";
    }
}