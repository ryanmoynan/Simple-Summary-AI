document.addEventListener("DOMContentLoaded", function () {
    const summarizeBtn = document.getElementById("summarize-btn");
    const settingsBtn = document.getElementById("settings-btn");
    const summaryOutput = document.getElementById("summary-output");
    const loadingSpinner = document.getElementById("loading-spinner");

    if (!summarizeBtn || !settingsBtn || !summaryOutput || !loadingSpinner) {
        console.error("Popup UI elements not found.");
        return;
    }

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

                // Send the text to background.js for summarization
                chrome.runtime.sendMessage({ action: "summarize", text: extractedText }, function (response) {
                    console.log("Popup received response:", response);

                    loadingSpinner.style.display = "none";

                    if (response && response.summary) {
                        summaryOutput.innerText = response.summary;
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

// Extract text from the page
function extractPageText() {
    return document.body.innerText.slice(0, 5000);
}