(function(prompt, textareaSelector, buttonSelector) {
    console.log("tesing: 2");
    var textarea = document.querySelector(textareaSelector);
    if (textarea) {
        textarea.innerHTML = JSON.stringify(prompt);
        textarea.dispatchEvent(new Event('input', { bubbles: true }));

        setTimeout(function() {
            var button = document.querySelector(buttonSelector);
            if (button) {
                button.removeAttribute('disabled');
                button.click();
            } else {
                console.error("❌ button 不存在，无法点击！");
            }
        }, 100);
    } else {
        console.error("❌ textarea 不存在，无法赋值！");
    }
})(prompt, textareaSelector, buttonSelector);