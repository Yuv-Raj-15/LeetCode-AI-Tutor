let btnHint = document.getElementById("btn-hint");
let btnSolve = document.getElementById("btn-solve");
let txtOutput = document.getElementById("txt");
let loadingAnim = document.getElementById("loading");

function setLoadingState(isLoading, message = "") {
    if (isLoading) {
        loadingAnim.style.display = "block";
        loadingAnim.innerText = message;
        txtOutput.innerText = ""; 
        btnHint.disabled = true;
        btnSolve.disabled = true;
    } else {
        loadingAnim.style.display = "none";
        btnHint.disabled = false;
        btnSolve.disabled = false;
    }
}

btnHint.addEventListener("click", async function() {
    setLoadingState(true, "AI is analyzing and commenting your code...");

    try {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        const injectionResults = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            world: "MAIN",
            func: () => { 
                return {
                    code: window.monaco.editor.getModels()[0].getValue(),
                    title: document.title.split('-')[0].trim()
                };
            }
        });
        
        let currentCode = injectionResults[0].result.code;
        let problemName = injectionResults[0].result.title;

        let hintPrompt = `You are a C++ tutor for LeetCode problem: "${problemName}". 
        Take the user's code and return the ENTIRE code back. 
        For any line that has a bug, append " // 💡 HINT: [Your advice here]" to the end of that specific line.
        Keep the hints minimal and helpful.
        OUTPUT ONLY THE RAW CODE. Do not use markdown backticks like \`\`\`cpp.
        
        Code to process:
        ${currentCode}`;

        let response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer <YOUR_API_KEY>',//  Enter Your API Key
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b:free',
                messages: [{ role: 'user', content: hintPrompt }],
            }),
        });

        let result = await response.json();
        let aiCommentedCode = result.choices[0].message.content;

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            world: "MAIN",
            args: [aiCommentedCode], 
            func: (textToInject) => { window.monaco.editor.getModels()[0].setValue(textToInject); }
        });
        
        setLoadingState(false);
        txtOutput.innerText = "Hints injected directly into your lines! 🎯";

    } catch (err) {
        setLoadingState(false);
        txtOutput.innerText = "Error: " + err.message;
    }
});

btnSolve.addEventListener("click", async function() {
    setLoadingState(true, "Applying minimal fixes...");

    try {
        let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        
        const injectionResults = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            world: "MAIN",
            func: () => { 
                return {
                    code: window.monaco.editor.getModels()[0].getValue(),
                    title: document.title.split('-')[0].trim()
                };
            }
        });
        
        let currentCode = injectionResults[0].result.code;
        let problemName = injectionResults[0].result.title;

        let fixPrompt = `You are a C++ tutor for LeetCode: "${problemName}". 
        Fix this code by making the MINIMAL changes necessary to pass. 
        Add short inline comments (//) explaining what you changed.
        Also is any new tag or stl is used give sort intro of that tag. 
        Output ONLY the raw C++ code. Do not use markdown backticks like \`\`\`cpp. 
        \n\nCode:\n${currentCode}`;

        let response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer <YOUR_API_KEY>',//  Enter Your API Key 
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b:free',
                messages: [{ role: 'user', content: fixPrompt }],
            }),
        });

        let result = await response.json();
        let aiFixedCode = result.choices[0].message.content;

        let finalInjectedText = "/* ===== AI FIXED CODE ===== \nMinimal changes applied below:\n============================ */\n\n" + aiFixedCode;

        await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            world: "MAIN",
            args: [finalInjectedText], 
            func: (textToInject) => { window.monaco.editor.getModels()[0].setValue(textToInject); }
        });
        
        setLoadingState(false);
        txtOutput.innerText = "Code fixed and replaced! ⚡";

    } catch (err) {
        setLoadingState(false);
        txtOutput.innerText = "Error: " + err.message;
    }
});
