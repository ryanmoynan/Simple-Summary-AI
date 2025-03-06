document.addEventListener("DOMContentLoaded", function () {
    const summarizeBtn = document.getElementById("summarize-btn");
    const settingsBtn = document.getElementById("settings-btn");
    const summaryOutput = document.getElementById("summary-output");
    const loadingSpinner = document.getElementById("loading-spinner");
    const historyList = document.getElementById("history-list");
    
    // Track if a summarization request is in progress
    let isSummarizing = false;

    if (!summarizeBtn || !settingsBtn || !summaryOutput || !loadingSpinner || !historyList) {
        console.error("Popup UI elements not found.");
        return;
    }

    // Extract text from the page
    function extractPageContent() {
        // Check if on YouTube video page
        if (window.location.hostname.includes("youtube.com") && window.location.pathname.includes("/watch")) {
            // Try to get YouTube video title, description and captions if available
            const videoTitle = document.querySelector("h1.title")?.textContent || "";
            const videoDescription = document.querySelector("#description-text")?.textContent || "";
            
            // For captions, this is simplified - YouTube's captions are loaded dynamically and may require more complex handling
            let content = `YouTube Video: ${videoTitle}\n\nDescription: ${videoDescription}`;
            
            // Add a note about the limitation with YouTube
            content += "\n\n[Note: This is based on the visible video metadata. Full captions may not be available.]";
            
            return content;
        } else {
            // Regular webpage content
            return document.body.innerText.slice(0, 5000);
        }
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

    // Copy text to clipboard
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(
            function() {
                // Success notification
                showNotification("Copied to clipboard!");
            }, 
            function() {
                // Error notification
                showNotification("Failed to copy. Try again.", true);
            }
        );
    }
    
    // Share summary (via native share if available)
    function shareSummary(text) {
        if (navigator.share) {
            navigator.share({
                title: 'Page Summary',
                text: text
            }).then(() => {
                showNotification("Shared successfully!");
            }).catch(err => {
                showNotification("Sharing failed. Try again.", true);
                console.error("Share failed:", err);
            });
        } else {
            // Fallback to copy with notification to user
            copyToClipboard(text);
            showNotification("No share functionality available. Copied to clipboard instead!");
        }
    }
    
    // Show temporary notification
    function showNotification(message, isError = false) {
        const notification = document.createElement("div");
        notification.textContent = message;
        notification.className = "notification";
        if (isError) notification.classList.add("error");
        
        document.body.appendChild(notification);
        
        // Fade in
        setTimeout(() => notification.classList.add("show"), 10);
        
        // Remove after 2 seconds
        setTimeout(() => {
            notification.classList.remove("show");
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    // Add summary to the history list with enhance UI
    function addSummaryToHistory(summary) {
        const li = document.createElement("li");
        li.classList.add("history-item");

        // Summary preview (collapsed view)
        const preview = summary.length > 50 ? summary.substring(0, 50) + "..." : summary;

        // Container for text
        const summaryText = document.createElement("div");
        summaryText.classList.add("summary-text");
        summaryText.innerText = preview;
        summaryText.addEventListener("click", function () {
            // Toggle full text display
            summaryText.innerText = summaryText.innerText === preview ? summary : preview;
        });
        
        // Container for action buttons
        const actionButtons = document.createElement("div");
        actionButtons.classList.add("action-buttons");
        
        // Copy button
        const copyBtn = document.createElement("button");
        copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
        copyBtn.title = "Copy to clipboard";
        copyBtn.classList.add("icon-btn");
        copyBtn.addEventListener("click", function(e) {
            e.stopPropagation();
            copyToClipboard(summary);
        });
        
        // Share button
        const shareBtn = document.createElement("button");
        shareBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>';
        shareBtn.title = "Share summary";
        shareBtn.classList.add("icon-btn");
        shareBtn.addEventListener("click", function(e) {
            e.stopPropagation();
            shareSummary(summary);
        });
        
        // Delete button
        const deleteBtn = document.createElement("button");
        deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
        deleteBtn.title = "Remove from history";
        deleteBtn.classList.add("icon-btn");
        deleteBtn.addEventListener("click", function(e) {
            e.stopPropagation();
            removeSummaryFromHistory(summary);
            li.remove();
        });

        // Add all buttons to the action container
        actionButtons.appendChild(copyBtn);
        actionButtons.appendChild(shareBtn);
        actionButtons.appendChild(deleteBtn);
        
        // Add elements to the li item
        li.appendChild(summaryText);
        li.appendChild(actionButtons);
        
        historyList.appendChild(li);
    }

    // Remove summary from storage
    function removeSummaryFromHistory(summary) {
        chrome.storage.local.get({ history: [] }, function (data) {
            const updatedHistory = data.history.filter(item => item.text !== summary);
            chrome.storage.local.set({ history: updatedHistory });
        });
    }

    // Load and display history
    function loadSummaryHistory() {
        chrome.storage.local.get({ history: [] }, function (data) {
            historyList.innerHTML = "";
            
            if (data.history.length === 0) {
                const emptyMsg = document.createElement("p");
                emptyMsg.textContent = "No summaries in history yet.";
                emptyMsg.className = "empty-history-message";
                historyList.appendChild(emptyMsg);
                return;
            }
            
            // Sort by most recent first
            const sortedHistory = [...data.history].sort((a, b) => b.timestamp - a.timestamp);
            sortedHistory.forEach(item => addSummaryToHistory(item.text));
        });
    }

    // Add copy and share buttons to the current summary output
    function enhanceSummaryOutput(summary) {
        // Create container for the buttons
        const buttonsContainer = document.createElement("div");
        buttonsContainer.className = "summary-actions";
        
        // Copy button
        const copyButton = document.createElement("button");
        copyButton.innerText = "Copy";
        copyButton.className = "action-btn";
        copyButton.addEventListener("click", () => copyToClipboard(summary));
        
        // Share button
        const shareButton = document.createElement("button");
        shareButton.innerText = "Share";
        shareButton.className = "action-btn";
        shareButton.addEventListener("click", () => shareSummary(summary));
        
        // Add buttons to container
        buttonsContainer.appendChild(copyButton);
        buttonsContainer.appendChild(shareButton);
        
        // Add container after summary output
        summaryOutput.parentNode.insertBefore(buttonsContainer, summaryOutput.nextSibling);
    }

    // Load summary history on popup open
    loadSummaryHistory();

    summarizeBtn.addEventListener("click", function () {
        // Prevent multiple simultaneous requests
        if (isSummarizing) {
            showNotification("Summarization already in progress...");
            return;
        }
        
        isSummarizing = true;
        summarizeBtn.disabled = true;
        
        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs.length === 0) {
                isSummarizing = false;
                summarizeBtn.disabled = false;
                return;
            }

            // Remove any existing summary actions
            const existingActions = document.querySelector(".summary-actions");
            if (existingActions) existingActions.remove();
            
            summaryOutput.innerText = "";
            loadingSpinner.style.display = "block";

            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                function: extractPageContent
            }, (results) => {
                if (chrome.runtime.lastError) {
                    console.error("Script injection error:", chrome.runtime.lastError);
                    summaryOutput.innerText = "Error extracting page text.";
                    loadingSpinner.style.display = "none";
                    isSummarizing = false;
                    summarizeBtn.disabled = false;
                    return;
                }

                let extractedText = results?.[0]?.result;
                if (!extractedText) {
                    summaryOutput.innerText = "No text found on page.";
                    loadingSpinner.style.display = "none";
                    isSummarizing = false;
                    summarizeBtn.disabled = false;
                    return;
                }

                chrome.runtime.sendMessage({ action: "summarize", text: extractedText }, function (response) {
                    loadingSpinner.style.display = "none";
                    isSummarizing = false;
                    summarizeBtn.disabled = false;

                    if (response && response.summary) {
                        summaryOutput.innerText = response.summary;
                        
                        // Add copy/share buttons to current summary
                        enhanceSummaryOutput(response.summary);
                        
                        // Check if this summary already exists before saving
                        chrome.storage.local.get({ history: [] }, function (data) {
                            if (!summaryExists(response.summary, data.history)) {
                                saveSummary(response.summary); // Save to history
                            } else {
                                showNotification("Summary already exists in history");
                            }
                        });
                    } else {
                        summaryOutput.innerText = response?.error || "Error: No summary received.";
                    }
                });
            });
        });
    });

    settingsBtn.addEventListener("click", function () {
        chrome.runtime.openOptionsPage();
    });
});
