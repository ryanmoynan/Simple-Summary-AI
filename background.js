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

            // Customize prompt based on content type
            let prompt = "Summarize the following text:";
            if (message.isTranscript) {
                console.log("This is a youtube video transcript summarisaiton.");
                prompt = "Summarize the following YouTube video transcript highlighting the keypoint in bulletpoints, if they talk about crypto or stock please list these and their recommendations:";
            }

            // Send text to OpenAI API
            summarizeText(message.text, prompt, apiKey)
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
    else if (message.action === "summarizeUrl") {
        console.log("Background received URL for summarization:", message.url);

        // Retrieve API key from storage
        chrome.storage.sync.get(["apiKey"], function (data) {
            const apiKey = data.apiKey;
            if (!apiKey) {
                console.error("No API key found. Set it in the options.");
                sendResponse({ error: "API key not set. Please configure it in the extension settings." });
                return;
            }

            // Check if it's a YouTube URL
            const isYouTube = message.url.includes('youtube.com/watch') || message.url.includes('youtu.be/');
            const prompt = isYouTube 
                ? "This is a YouTube video. Please browse the web to find and summarize this video:" 
                : "Please browse the web to find and summarize this page:";

            // Send URL to OpenAI API
            summarizeUrl(message.url, prompt, apiKey)
                .then(summary => {
                    sendResponse({ summary });
                })
                .catch(error => {
                    console.error("Error summarizing URL:", error);
                    sendResponse({ error: "Failed to generate summary." });
                });
        });

        return true; // Keep the message channel open for async response
    }
});

// Function to send request to OpenAI API for text summarization
async function summarizeText(text, prompt, apiKey) {
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
                    { role: "system", content: "You are an AI assistant that summarizes web pages and videos concisely." },
                    { role: "user", content: `${prompt}\n${text}` }
                ],
                max_tokens: 250
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

// Function to send request to OpenAI API for URL summarization
async function summarizeUrl(url, prompt, apiKey) {
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
                    { 
                        role: "system", 
                        content: "You are an AI assistant that summarizes web pages and videos. You have the ability to browse the web to fetch content."
                    },
                    { 
                        role: "user", 
                        content: `${prompt} ${url}`
                    }
                ],
                max_tokens: 250
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
