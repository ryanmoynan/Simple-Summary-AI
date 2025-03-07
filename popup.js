document.addEventListener("DOMContentLoaded", function () {
    const summarizeBtn = document.getElementById("summarize-btn");
    const urlSummarizeBtn = document.getElementById("url-summarize-btn");
    const settingsBtn = document.getElementById("settings-btn");
    const summaryOutput = document.getElementById("summary-output");
    const loadingSpinner = document.getElementById("loading-spinner");
    const historyList = document.getElementById("history-list");
    
    // Track if a summarization request is in progress
    let isProcessing = false;

    if (!summarizeBtn || !urlSummarizeBtn || !settingsBtn || !summaryOutput || !loadingSpinner || !historyList) {
        console.error("Popup UI elements not found.");
        return;
    }

    // Extract text from the page
    function extractPageText() {
        // Try to get YouTube transcript if on YouTube
        if (window.location.hostname.includes('youtube.com') && window.location.pathname.includes('/watch')) {
            // Get transcript elements - this is a simplified approach
            const transcriptItems = Array.from(document.querySelectorAll('yt-formatted-string.ytd-transcript-segment-renderer'));
            
            if (transcriptItems && transcriptItems.length > 0) {
                return {
                    text: transcriptItems.map(item => item.textContent).join(' '),
                    isTranscript: true
                };
            }
        }
        
        // Regular page content extraction
        return {
            text: document.body.innerText.slice(0, 5000),
            isTranscript: false
        };
    }

    // Check if summary already exists in history
    function summaryExists(summary, history) {
        return history.some(item => item.text === summary);
    }

    // Save summary to storage and refresh UI
    function saveSummary(summary, sourceUrl) {
        chrome.storage.local.get({ history: [] }, function (data) {
            let history = data.history || [];
            const timestamp = Date.now();

            // Only add if this summary doesn't already exist
            if (!summaryExists(summary, history)) {
                history.push({ 
                    text: summary, 
                    timestamp,
                    url: sourceUrl || ""
                });
                
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
            () => {
                console.log('Text copied to clipboard');
            },
            (err) => {
                console.error('Could not copy text: ', err);
            }
        );
    }
    
    // Share summary
    function shareSummary(text, url) {
        if (navigator.share) {
            navigator.share({
                title: 'Web Page Summary',
                text: text,
                url: url || window.location.href
            })
            .then(() => console.log('Shared successfully'))
            .catch((error) => console.log('Error sharing:', error));
        } else {
            alert("Web Share API not supported in your browser. Summary copied to clipboard instead.");
            copyToClipboard(text);
        }
    }

    // Add summary to the history list with collapse and delete features
    function addSummaryToHistory(summary, sourceUrl) {
        const li = document.createElement("li");
        li.classList.add("history-item");

        // Summary preview (collapsed view)
        const preview = summary.length > 50 ? summary.substring(0, 50) + "..." : summary;

        // Create container for summary text
        const summaryContainer = document.createElement("div");
        summaryContainer.classList.add("summary-container");
        
        const summaryText = document.createElement("div");
        summaryText.classList.add("summary-text");
        summaryText.innerText = preview;
        summaryText.addEventListener("click", function () {
            // Toggle full text display
            summaryText.innerText = summaryText.innerText === preview ? summary : preview;
        });
        
        summaryContainer.appendChild(summaryText);
        
        // Create buttons container
        const buttonsContainer = document.createElement("div");
        buttonsContainer.classList.add("buttons-container");
        
        // Copy button
        const copyBtn = document.createElement("button");
        copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
        copyBtn.classList.add("icon-btn");
        copyBtn.title = "Copy to clipboard";
        copyBtn.addEventListener("click", function(e) {
            e.stopPropagation();
            copyToClipboard(summary);
            
            // Show feedback
            copyBtn.classList.add("copied");
            setTimeout(() => {
                copyBtn.classList.remove("copied");
            }, 1000);
        });
        
        // Share button
        const shareBtn = document.createElement("button");
        shareBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>';
        shareBtn.classList.add("icon-btn");
        shareBtn.title = "Share summary";
        shareBtn.addEventListener("click", function(e) {
            e.stopPropagation();
            shareSummary(summary, sourceUrl);
        });
        
        // Delete button
        const deleteBtn = document.createElement("button");
        deleteBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>';
        deleteBtn.classList.add("icon-btn");
        deleteBtn.title = "Remove from history";
        deleteBtn.addEventListener("click", function(e) {
            e.stopPropagation();
            removeSummaryFromHistory(summary);
            li.remove();
        });

        // Add buttons to container
        buttonsContainer.appendChild(copyBtn);
        buttonsContainer.appendChild(shareBtn);
        buttonsContainer.appendChild(deleteBtn);
        
        // Add both containers to the list item
        li.appendChild(summaryContainer);
        li.appendChild(buttonsContainer);
        
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
            data.history.forEach(item => addSummaryToHistory(item.text, item.url));
        });
    }

    // Process summarization request
    function processSummarization(extractedText, isTranscript, tabUrl) {
        if (!extractedText) {
            summaryOutput.innerText = "No text found on page.";
            loadingSpinner.style.display = "none";
            isProcessing = false;
            return;
        }

        chrome.runtime.sendMessage({ 
            action: "summarize", 
            text: extractedText,
            isTranscript: isTranscript || false,
            url: tabUrl
        }, function (response) {
            loadingSpinner.style.display = "none";
            isProcessing = false;

            if (response && response.summary) {
                summaryOutput.innerText = response.summary;
                
                // Add buttons to the summary output
                const actionButtons = document.createElement("div");
                actionButtons.classList.add("summary-actions");
                
                // Copy button
                const copyBtn = document.createElement("button");
                copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy';
                copyBtn.classList.add("action-btn");
                copyBtn.addEventListener("click", function() {
                    copyToClipboard(response.summary);
                    copyBtn.textContent = "Copied!";
                    setTimeout(() => {
                        copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy';
                    }, 1500);
                });
                
                // Share button
                const shareBtn = document.createElement("button");
                shareBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg> Share';
                shareBtn.classList.add("action-btn");
                shareBtn.addEventListener("click", function() {
                    shareSummary(response.summary, tabUrl);
                });
                
                actionButtons.appendChild(copyBtn);
                actionButtons.appendChild(shareBtn);
                summaryOutput.appendChild(actionButtons);
                
                // Check if this summary already exists before saving
                chrome.storage.local.get({ history: [] }, function (data) {
                    if (!summaryExists(response.summary, data.history)) {
                        saveSummary(response.summary, tabUrl); // Save to history
                    } else {
                        console.log("Summary already exists in history");
                    }
                });
            } else {
                summaryOutput.innerText = response?.error || "Error: No summary received.";
            }
        });
    }

    // Load summary history on popup open
    loadSummaryHistory();

    // Extract and summarize page content
    summarizeBtn.addEventListener("click", function () {
        if (isProcessing) return; // Prevent multiple requests
        
        isProcessing = true;
        summaryOutput.innerText = "";
        loadingSpinner.style.display = "block";

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs.length === 0) {
                isProcessing = false;
                return;
            }

            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                function: extractPageText
            }, (results) => {
                if (chrome.runtime.lastError) {
                    console.error("Script injection error:", chrome.runtime.lastError);
                    summaryOutput.innerText = "Error extracting page text.";
                    loadingSpinner.style.display = "none";
                    isProcessing = false;
                    return;
                }

                const result = results?.[0]?.result;
                processSummarization(result?.text, result?.isTranscript, tabs[0].url);
            });
        });
    });
    
    // Summarize by URL (let the AI fetch content)
    urlSummarizeBtn.addEventListener("click", function () {
        if (isProcessing) return; // Prevent multiple requests
        
        isProcessing = true;
        summaryOutput.innerText = "";
        loadingSpinner.style.display = "block";

        chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
            if (tabs.length === 0) {
                isProcessing = false;
                return;
            }

            // Send just the URL for AI to fetch content
            chrome.runtime.sendMessage({ 
                action: "summarizeUrl", 
                url: tabs[0].url
            }, function (response) {
                loadingSpinner.style.display = "none";
                isProcessing = false;

                if (response && response.summary) {
                    summaryOutput.innerText = response.summary;
                    
                    // Add buttons to the summary output
                    const actionButtons = document.createElement("div");
                    actionButtons.classList.add("summary-actions");
                    
                    // Copy button
                    const copyBtn = document.createElement("button");
                    copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy';
                    copyBtn.classList.add("action-btn");
                    copyBtn.addEventListener("click", function() {
                        copyToClipboard(response.summary);
                        copyBtn.textContent = "Copied!";
                        setTimeout(() => {
                            copyBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg> Copy';
                        }, 1500);
                    });
                    
                    // Share button
                    const shareBtn = document.createElement("button");
                    shareBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg> Share';
                    shareBtn.classList.add("action-btn");
                    shareBtn.addEventListener("click", function() {
                        shareSummary(response.summary, tabs[0].url);
                    });
                    
                    actionButtons.appendChild(copyBtn);
                    actionButtons.appendChild(shareBtn);
                    summaryOutput.appendChild(actionButtons);
                    
                    // Save to history
                    chrome.storage.local.get({ history: [] }, function (data) {
                        if (!summaryExists(response.summary, data.history)) {
                            saveSummary(response.summary, tabs[0].url);
                        } else {
                            console.log("Summary already exists in history");
                        }
                    });
                } else {
                    summaryOutput.innerText = response?.error || "Error: No summary received.";
                }
            });
        });
    });

    settingsBtn.addEventListener("click", function () {
        chrome.runtime.openOptionsPage();
    });
});
