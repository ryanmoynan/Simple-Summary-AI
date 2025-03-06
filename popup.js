document.addEventListener("DOMContentLoaded", function () {
    const summarizeBtn = document.getElementById("summarize-btn");
    const settingsBtn = document.getElementById("settings-btn");
    const summaryOutput = document.getElementById("summary-output");
    const loadingSpinner = document.getElementById("loading-spinner");
    const historyContainer = document.getElementById("history-container");

    if (!summarizeBtn || !settingsBtn || !summaryOutput || !loadingSpinner || !historyContainer) {
        console.error("Popup UI elements not found.");
        return;
    }

    // Load history on startup
    loadHistory();

    summarizeBtn.addEventListener("click", function () {
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs.length === 0) return;

            summaryOutput.innerText = "";
            loadingSpinner.style.display = "block";

            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                function: extractPageText
            }, (results) => {
                if (chrome.runtime.lastError) {
                    console.error("Script injection error:", chrome.runtime.lastError);
                    summaryOutput.innerText = "Error extracting page text.";
                    loadingSpinner.style.display = "none";
                    return;
                }

                let extractedText = results?.[0]?.result;
                if (!extractedText) {
                    summaryOutput.innerText = "No text found on page.";
                    loadingSpinner.style.display = "none";
                    return;
                }

                console.log("Extracted page text:", extractedText.substring(0, 100));

                // Check cache first
                chrome.storage.local.get(["cachedSummaries"], function (data) {
                    const cachedSummaries = data.cachedSummaries || {};
                    if (cachedSummaries[extractedText]) {
                        console.log("Using cached summary.");
                        summaryOutput.innerText = cachedSummaries[extractedText];
                        loadingSpinner.style.display = "none";
                        return;
                    }

                    // Send request to background.js
                    chrome.runtime.sendMessage({ action: "summarize", text: extractedText }, function (response) {
                        console.log("Popup received response:", response);

                        loadingSpinner.style.display = "none";

                        if (response && response.summary) {
                            summaryOutput.innerText = response.summary;

                            // Save to cache
                            cachedSummaries[extractedText] = response.summary;
                            chrome.storage.local.set({ cachedSummaries });

                            // Save to history
                            saveToHistory(response.summary);
                        } else {
                            summaryOutput.innerText = "Error: No summary received.";
                        }
                    });
                });
            });
        });
    });

    settingsBtn.addEventListener("click", function () {
        chrome.runtime.openOptionsPage();
    });

    function saveToHistory(summary) {
        chrome.storage.local.get(["summaryHistory"], function (data) {
            let history = data.summaryHistory || [];
            history.unshift(summary); // Add new summary to the top
            history = history.slice(0, 10); // Limit to 10 entries
            chrome.storage.local.set({ summaryHistory: history }, loadHistory);
        });
    }

    function loadHistory() {
        chrome.storage.local.get(["summaryHistory"], function (data) {
            const history = data.summaryHistory || [];
            historyContainer.innerHTML = "";
            history.forEach((item, index) => {
                const historyItem = document.createElement("div");
                historyItem.classList.add("history-item");
                historyItem.innerText = item;
                historyContainer.appendChild(historyItem);
            });
        });
    }
});

// Extract text from the page
function extractPageText() {
    return document.body.innerText.slice(0, 5000);
}