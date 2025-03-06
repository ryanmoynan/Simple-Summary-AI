document.addEventListener("DOMContentLoaded", function() {
    const apiKeyInput = document.getElementById("api-key");
    const saveButton = document.getElementById("save-btn");
    const statusText = document.getElementById("status");
    const modelSelect = document.getElementById("model-select");
    const clearHistoryBtn = document.getElementById("clear-history-btn");
    
    // Load saved settings
    chrome.storage.sync.get(["apiKey", "model"], function(data) {
        if (data.apiKey) {
            apiKeyInput.value = data.apiKey;
        }
        
        if (data.model) {
            modelSelect.value = data.model;
        }
    });
    
    // Save settings
    saveButton.addEventListener("click", function() {
        const apiKey = apiKeyInput.value.trim();
        const model = modelSelect.value;
        
        if (!apiKey) {
            showStatus("Please enter an API key.", true);
            return;
        }
        
        chrome.storage.sync.set({ 
            apiKey: apiKey,
            model: model
        }, function() {
            showStatus("Settings saved successfully!");
            
            // Auto hide status after 3 seconds
            setTimeout(function() {
                statusText.textContent = "";
                statusText.classList.remove("error", "success");
            }, 3000);
        });
    });
    
    // Clear all history
    clearHistoryBtn.addEventListener("click", function() {
        if (confirm("Are you sure you want to clear all summary history?")) {
            chrome.storage.local.set({ history: [], urlCache: {} }, function() {
                showStatus("History cleared successfully!");
            });
        }
    });
    
    // Helper to show status messages
    function showStatus(message, isError = false) {
        statusText.textContent = message;
        statusText.classList.remove("error", "success");
        statusText.classList.add(isError ? "error" : "success");
    }
});
