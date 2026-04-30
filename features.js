function setupFileUpload(inputId, previewId) {
    const fileInput = document.getElementById(inputId);
    const previewArea = document.getElementById(previewId);

    if (!fileInput || !previewArea) return;

    fileInput.addEventListener('change', function() {
        previewArea.innerHTML = '';
        Array.from(this.files).forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'file-preview-item';
            item.innerHTML = `
                <i data-lucide="file"></i>
                <span>${file.name}</span>
                <span class="remove-file" onclick="removeFile('${inputId}', ${index})">&times;</span>
            `;
            previewArea.appendChild(item);
        });
        if (window.lucide) lucide.createIcons();
    });
}

function removeFile(inputId, index) {
    const fileInput = document.getElementById(inputId);
    const dt = new DataTransfer();
    const { files } = fileInput;
    
    for (let i = 0; i < files.length; i++) {
        if (index !== i) dt.items.add(files[i]);
    }
    
    fileInput.files = dt.files;
    fileInput.dispatchEvent(new Event('change'));
}

function toggleMic(type) {
    const btn = document.getElementById(type + 'MicBtn');
    if (!btn) return;
    
    btn.classList.toggle('recording');
    if (btn.classList.contains('recording')) {
        console.log('Voice recording started for ' + type);
        // Implement voice logic here if needed
    } else {
        console.log('Voice recording stopped for ' + type);
    }
}
