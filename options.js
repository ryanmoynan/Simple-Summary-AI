document.addEventListener("DOMContentLoaded", function () {
    chrome.storage.sync.get(["apiKey", "aiProvider"], function (data) {
        document.getElementById("api-key").value = data.apiKey || "";
        document.getElementById("ai-provider").value = data.aiProvider || "openai";
    });

    document.getElementById("save-settings").addEventListener("click", function () {
        chrome.storage.sync.set({
            apiKey: document.getElementById("api-key").value,
            aiProvider: document.getElementById("ai-provider").value
        }, function () {
            alert("Settings saved!");
        });
    });
});