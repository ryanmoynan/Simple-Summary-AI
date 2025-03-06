chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "summarize") {
        console.log("Background received text for summarization.");

        // Retrieve API key from storage
        chrome.storage.sync.get(["apiKey", "model"], function (data) {
            const apiKey = data.apiKey;
            // Default to GPT-4 if not specified
            const model = data.model || "gpt-4";
            
            if (!apiKey) {
                console.error("No API key found. Set it in the options.");
                sendResponse({ error: "API key not set. Please configure it in the extension settings." });
                return;
            }

            // Send text to OpenAI API
            summarizeText(message.text, apiKey, model)
                .then(summary => {
                    // Store the URL and summary in history for caching
                    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                        if (tabs.length > 0) {
                            const currentUrl = tabs[0].url;
                            // Store in a URL-based cache
                            chrome.storage.local.get({urlCache: {}}, function(data) {
                                let urlCache = data.urlCache || {};
                                urlCache[currentUrl] = {
                                    summary: summary,
                                    timestamp: Date.now()
                                };
                                // Limit cache size to 50 URLs
                                const urlEntries = Object.entries(urlCache);
                                if (urlEntries.length > 50) {
                                    // Sort by timestamp and remove oldest
                                    urlEntries.sort((a, b) => a[1].timestamp - b[1].timestamp);
                                    const newCache = {};
                                    urlEntries.slice(-50).forEach(([url, data]) => {
                                        newCache[url] = data;
                                    });
                                    urlCache = newCache;
                                }
                                chrome.storage.local.set({urlCache: urlCache});
                            });
                        }
                    });
                    
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
async function summarizeText(text, apiKey, model = "gpt-4") {
    try {
        // If text is from YouTube, customize the prompt
        let promptContent;
        if (text.startsWith("YouTube Video:")) {
            promptContent = `You are an AI assistant that summarizes YouTube videos. 
            Create a concise summary of this YouTube video based on the title and description provided. 
            Format your response as a bullet-point summary of the main topics covered.
            Here's the content:\n${text}`;
        } else {
            promptContent = `Summarize the following text in a clear, concise way that captures the main points:
            \n${text}`;
        }
        
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: "You are an AI assistant that summarizes web content effectively. Create clear, concise summaries that capture the main points." },
                    { role: "user", content: promptContent }
                ],
                max_tokens: 250
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content.trim() || "No summary available.";
    } catch (error) {
        console.error("API request failed:", error);
        return `Error generating summary: ${error.message}`;
    }
}

// Add URL caching system - check if we already have a summary for this URL
chrome.tabs.onActivated.addListener(function(activeInfo) {
    chrome.tabs.get(activeInfo.tabId, function(tab) {
        if (tab.url) {
            // Check if we have a cached summary
            chrome.storage.local.get({urlCache: {}}, function(data) {
                const cachedData = data.urlCache[tab.url];
                if (cachedData) {
                    // Update the badge to indicate we have a cached summary
                    chrome.action.setBadgeText({text: "✓", tabId: tab.tabId});
                    chrome.action.setBadgeBackgroundColor({color: "#4CAF50", tabId: tab.tabId});
                } else {
                    chrome.action.setBadgeText({text: "", tabId: tab.tabId});
                }
            });
        }
    });
});

// Listen for options updates
chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === "install") {
        // Open options page on install to set API key
        chrome.runtime.openOptionsPage();
    }
});
