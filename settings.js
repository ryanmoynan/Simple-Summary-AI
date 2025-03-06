document.getElementById("saveSettings").addEventListener("click", () => {
    chrome.storage.sync.set({
        aiProvider: document.getElementById("aiProvider").value,
        openaiKey: document.getElementById("openaiKey").value,
        claudeKey: document.getElementById("claudeKey").value,
        geminiKey: document.getElementById("geminiKey").value
    }, () => alert("Settings saved!"));
});