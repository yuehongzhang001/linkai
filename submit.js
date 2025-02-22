(function(prompt, inputeElementSelector, buttonSelector) {
    console.log("submiting... start");
    var inputElement = document.querySelector(inputeElementSelector);
    if (inputElement) {
        console.log("submiting... found textarea");
        if (inputElement instanceof HTMLTextAreaElement) {
            inputElement.value = JSON.stringify(prompt);
        } else {
            inputElement.innerHTML = JSON.stringify(prompt);        
        }
        
        inputElement.dispatchEvent(new Event('input', { bubbles: true }));

        setTimeout(function() {
            var button = document.querySelector(buttonSelector);
            if (button) {
                console.log("submiting... found button");
                button.removeAttribute('disabled');
                button.click();
            } else {
                console.error("❌ button 不存在，无法点击！");
            }
        }, 200);
    } else {
        console.error("❌ textarea 不存在，无法赋值！");
    }
})(prompt, inputeElementSelector, buttonSelector);