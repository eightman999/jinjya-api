// Admin page functionality

let shrines = [];

// Load shrines on page load
async function loadShrines() {
    try {
        const response = await fetch('/api/jinjya/list');
        if (!response.ok) {
            throw new Error('Failed to load shrines');
        }

        const data = await response.json();
        shrines = data.shrines || [];

        displayShrineList();
        populateShrineSelect();
    } catch (error) {
        console.error('Error loading shrines:', error);
        document.getElementById('shrine-admin-list').innerHTML =
            '<p class="error">神社の読み込みに失敗しました。</p>';
    }
}

// Display shrine list for admin
function displayShrineList() {
    const listContainer = document.getElementById('shrine-admin-list');

    if (shrines.length === 0) {
        listContainer.innerHTML = '<p>登録されている神社がありません。</p>';
        return;
    }

    listContainer.innerHTML = shrines.map(shrine => `
        <div class="shrine-item">
            <h3>${shrine.name}</h3>
            <p><strong>ID:</strong> ${shrine.id}</p>
            ${shrine.owner ? `<p><strong>管理者:</strong> ${shrine.owner}</p>` : ''}
            <p><strong>Webhook URL:</strong> ${shrine.spreadsheet_url}</p>
            ${shrine.tags ? `<p><strong>固定タグ:</strong> ${JSON.stringify(shrine.tags)}</p>` : ''}
            <small>登録日時: ${new Date(shrine.created_at).toLocaleString('ja-JP')}</small>
            <br>
            <button onclick="deregisterShrine('${shrine.id}')">削除</button>
        </div>
    `).join('');
}

// Populate shrine select for omikuji submission
function populateShrineSelect() {
    const select = document.getElementById('submit-jinjya');
    select.innerHTML = '<option value="">神社を選択してください</option>' +
        shrines.map(shrine =>
            `<option value="${shrine.id}">${shrine.name} (${shrine.id})</option>`
        ).join('');
}

// Register a new shrine
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('shrine-id').value.trim();
    const name = document.getElementById('shrine-name').value.trim();
    const spreadsheet_url = document.getElementById('spreadsheet-url').value.trim();
    const owner = document.getElementById('owner').value.trim();
    const tagsInput = document.getElementById('tags').value.trim();

    // Validate tags JSON if provided
    let tags = null;
    if (tagsInput) {
        try {
            tags = JSON.parse(tagsInput);
        } catch (error) {
            showMessage('register-result', 'タグのJSON形式が正しくありません。', 'error');
            return;
        }
    }

    const payload = {
        id,
        name,
        spreadsheet_url,
        ...(owner && { owner }),
        ...(tags && { tags })
    };

    try {
        const response = await fetch('/api/jinjya/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Registration failed');
        }

        showMessage('register-result', '神社の登録に成功しました！', 'success');
        document.getElementById('register-form').reset();
        loadShrines(); // Reload shrine list
    } catch (error) {
        console.error('Error registering shrine:', error);
        showMessage('register-result', `登録に失敗しました: ${error.message}`, 'error');
    }
});

// Deregister a shrine
async function deregisterShrine(shrineId) {
    if (!confirm(`神社「${shrineId}」を本当に削除しますか？`)) {
        return;
    }

    try {
        const response = await fetch('/api/jinjya/deregister', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: shrineId })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Deregistration failed');
        }

        alert('神社を削除しました。');
        loadShrines(); // Reload shrine list
    } catch (error) {
        console.error('Error deregistering shrine:', error);
        alert(`削除に失敗しました: ${error.message}`);
    }
}

// Submit omikuji
document.getElementById('submit-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const jinjya = document.getElementById('submit-jinjya').value;
    const fortune = document.getElementById('fortune').value;
    const message = document.getElementById('message').value.trim();

    // Collect tags
    const tags = {};
    document.querySelectorAll('.tag-input').forEach(input => {
        const key = input.querySelector('.tag-key').value.trim();
        const value = input.querySelector('.tag-value').value.trim();
        if (key && value) {
            tags[key] = value;
        }
    });

    // Collect extra information
    const extra = {};
    document.querySelectorAll('.extra-input').forEach(input => {
        const key = input.querySelector('.extra-key').value.trim();
        const value = input.querySelector('.extra-value').value.trim();
        if (key && value) {
            extra[key] = value;
        }
    });

    const payload = {
        jinjya,
        fortune,
        message,
        ...(Object.keys(tags).length > 0 && { tags }),
        ...(Object.keys(extra).length > 0 && { extra })
    };

    try {
        const response = await fetch('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Submission failed');
        }

        showMessage('submit-result', 'おみくじの投稿に成功しました！', 'success');
        document.getElementById('submit-form').reset();

        // Reset dynamic fields
        document.getElementById('tags-container').innerHTML = `
            <div class="tag-input">
                <input type="text" class="tag-key" placeholder="カテゴリ（例: 恋愛）">
                <input type="text" class="tag-value" placeholder="メッセージ">
            </div>
        `;
        document.getElementById('extra-container').innerHTML = `
            <div class="extra-input">
                <input type="text" class="extra-key" placeholder="項目（例: ラッキーカラー）">
                <input type="text" class="extra-value" placeholder="値（例: 赤）">
            </div>
        `;
    } catch (error) {
        console.error('Error submitting omikuji:', error);
        showMessage('submit-result', `投稿に失敗しました: ${error.message}`, 'error');
    }
});

// Add tag input field
document.getElementById('add-tag-button').addEventListener('click', () => {
    const container = document.getElementById('tags-container');
    const newInput = document.createElement('div');
    newInput.className = 'tag-input';
    newInput.innerHTML = `
        <input type="text" class="tag-key" placeholder="カテゴリ（例: 恋愛）">
        <input type="text" class="tag-value" placeholder="メッセージ">
    `;
    container.appendChild(newInput);
});

// Add extra input field
document.getElementById('add-extra-button').addEventListener('click', () => {
    const container = document.getElementById('extra-container');
    const newInput = document.createElement('div');
    newInput.className = 'extra-input';
    newInput.innerHTML = `
        <input type="text" class="extra-key" placeholder="項目（例: ラッキーカラー）">
        <input type="text" class="extra-value" placeholder="値（例: 赤）">
    `;
    container.appendChild(newInput);
});

// Show message helper
function showMessage(elementId, message, type) {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.className = `message ${type}`;
    element.style.display = 'block';

    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', loadShrines);
