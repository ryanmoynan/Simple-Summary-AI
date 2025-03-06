document.addEventListener("DOMContentLoaded", function () {
    const summarizeBtn = document.getElementById("summarize-btn");
    const settingsBtn = document.getElementById("settings-btn");
    const summaryOutput = document.getElementById("summary-output");
    const loadingSpinner = document.getElementById("loading-spinner");
    const historyList = document.getElementById("history-list");

    if (!summarizeBtn || !settingsBtn || !summaryOutput || !loadingSpinner || !historyList) {
        console.error("Popup UI elements not found.");
        return;
    }

    // Extract text from the page
    function extractPageText() {
        return document.body.innerText.slice(0, 5000);
    }

    // Check if summary already exists in history
    function summaryExists(summary, history) {
        return history.some(item => item.text === summary);
    }

    // Save summary to storage and refresh UI
    function saveSummary(summary) {
        chrome.storage.local.get({ history: [] }, function (data) {
            let history = data.history || [];
            const timestamp = Date.now();

            // Only add if this summary doesn't already exist
            if (!summaryExists(summary, history)) {
                history.push({ text: summary, timestamp });
                
                // Remove summaries older than 24 hours
                const oneDayAgo = timestamp - 24 * 60 * 60 * 1000;
                history = history.filter(item => item.timestamp > oneDayAgo);

                chrome.storage.local.set({ history }, function () {
                    loadSummaryHistory(); // Refresh history UI
                });
            }
        });
    }

    // Add summary to the history list with collapse and delete features
    function addSummaryToHistory(summary) {
        const li = document.createElement("li");
        li.classList.add("history-item");

        // Summary preview (collapsed view)
        const preview = summary.length > 50 ? summary.substring(0, 50) + "..." : summary;

        const summaryText = document.createElement("div");
        summaryText.classList.add("summary-text");
        summaryText.innerText = preview;
        summaryText.addEventListener("click", function () {
            // Toggle full text display
            summaryText.innerText = summaryText.innerText === preview ? summary : preview;
        });

        // Delete button
        const deleteBtn = document.createElement("button");
        deleteBtn.innerText = "Remove";
        deleteBtn.classList.add("delete-btn");
        deleteBtn.addEventListener("click", function () {
            removeSummaryFromHistory(summary);
            li.remove();
        });

        li.appendChild(summaryText);
        li.appendChild(deleteBtn);
        historyList.appendChild(li);
    }

    // Remove summary from storage
    function removeSummaryFromHistory(summary) {
        chrome.storage.local.get({ history: [] }, function (data) {
            const updatedHistory = data.history.filter(item => item.text !== summary);
            chrome.storage.local.set({ history: updatedHistory }, function () {
                loadSummaryHistory(); // Refresh UI after deletion
            });
        });
    }

    // Load and display history
    function loadSummaryHistory() {
        chrome.storage.local.get({ history: [] }, function (data) {
            historyList.innerHTML = "";
            data.history.forEach(item => addSummaryToHistory(item.text));
        });
    }

    // Load summary history on popup open
    loadSummaryHistory();

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

                chrome.runtime.sendMessage({ action: "summarize", text: extractedText }, function (response) {
                    loadingSpinner.style.display = "none";

                    if (response && response.summary) {
                        summaryOutput.innerText = response.summary;
                        
                        // Check if this summary already exists before saving
                        chrome.storage.local.get({ history: [] }, function (data) {
                            if (!summaryExists(response.summary, data.history)) {
                                saveSummary(response.summary); // Save to history
                            } else {
                                console.log("Summary already exists in history");
                            }
                        });
                    } else {
                        summaryOutput.innerText = "Error: No summary received.";
                    }
                });
            });
        });
    });

    settingsBtn.addEventListener("click", function () {
        chrome.runtime.openOptionsPage();
    });
});