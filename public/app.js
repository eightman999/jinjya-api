// Main page functionality for drawing omikuji

let selectedShrineId = null;
let shrines = [];

// Load shrine list on page load
async function loadShrines() {
    try {
        const response = await fetch('/api/jinjya/list');
        if (!response.ok) {
            throw new Error('Failed to load shrines');
        }

        const data = await response.json();
        shrines = data.shrines || [];

        displayShrines();
    } catch (error) {
        console.error('Error loading shrines:', error);
        document.getElementById('shrine-list').innerHTML =
            '<p class="error">神社の読み込みに失敗しました。後でもう一度お試しください。</p>';
    }
}

// Display shrine cards
function displayShrines() {
    const shrineList = document.getElementById('shrine-list');

    if (shrines.length === 0) {
        shrineList.innerHTML = '<p>登録されている神社がありません。</p>';
        return;
    }

    shrineList.innerHTML = shrines.map(shrine => `
        <div class="shrine-card" data-shrine-id="${shrine.id}">
            <h3>${shrine.name}</h3>
            <p>ID: ${shrine.id}</p>
            ${shrine.owner ? `<p>管理者: ${shrine.owner}</p>` : ''}
        </div>
    `).join('');

    // Add click handlers to shrine cards
    document.querySelectorAll('.shrine-card').forEach(card => {
        card.addEventListener('click', () => selectShrine(card.dataset.shrineId));
    });
}

// Select a shrine
function selectShrine(shrineId) {
    selectedShrineId = shrineId;
    const shrine = shrines.find(s => s.id === shrineId);

    // Update UI
    document.querySelectorAll('.shrine-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.querySelector(`[data-shrine-id="${shrineId}"]`).classList.add('selected');

    // Show omikuji section
    document.getElementById('omikuji-section').style.display = 'block';
    document.getElementById('selected-shrine-name').textContent = shrine.name;
    document.getElementById('result-section').style.display = 'none';

    // Scroll to omikuji section
    document.getElementById('omikuji-section').scrollIntoView({ behavior: 'smooth' });
}

// Draw omikuji
async function drawOmikuji() {
    if (!selectedShrineId) {
        alert('神社を選択してください');
        return;
    }

    const drawButton = document.getElementById('draw-button');
    drawButton.disabled = true;
    drawButton.textContent = 'おみくじを引いています...';

    try {
        const response = await fetch(`/api/draw?jinjya=${encodeURIComponent(selectedShrineId)}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to draw omikuji');
        }

        const result = await response.json();
        displayResult(result);
    } catch (error) {
        console.error('Error drawing omikuji:', error);
        alert(`おみくじを引けませんでした: ${error.message}`);
    } finally {
        drawButton.disabled = false;
        drawButton.textContent = '🎋 おみくじを引く';
    }
}

// Display omikuji result
function displayResult(omikuji) {
    const resultContent = document.getElementById('result-content');

    let html = `
        <div class="fortune-level">${omikuji.fortune}</div>
        <div class="fortune-message">${omikuji.message}</div>
    `;

    // Display tags
    if (omikuji.tags && Object.keys(omikuji.tags).length > 0) {
        html += '<div class="fortune-tags"><h3>運勢詳細</h3>';
        for (const [key, value] of Object.entries(omikuji.tags)) {
            html += `
                <div class="tag-item">
                    <span class="tag-key">${key}:</span>
                    <span class="tag-value">${value}</span>
                </div>
            `;
        }
        html += '</div>';
    }

    // Display extra information
    if (omikuji.extra && Object.keys(omikuji.extra).length > 0) {
        html += '<div class="fortune-extra"><h3>追加情報</h3>';
        for (const [key, value] of Object.entries(omikuji.extra)) {
            html += `
                <div class="extra-item">
                    <span class="extra-key">${key}:</span>
                    <span class="extra-value">${value}</span>
                </div>
            `;
        }
        html += '</div>';
    }

    resultContent.innerHTML = html;

    // Show result section
    document.getElementById('result-section').style.display = 'block';
    document.getElementById('omikuji-section').style.display = 'none';

    // Scroll to result
    document.getElementById('result-section').scrollIntoView({ behavior: 'smooth' });
}

// Draw again
function drawAgain() {
    document.getElementById('result-section').style.display = 'none';
    document.getElementById('omikuji-section').style.display = 'block';
    document.getElementById('omikuji-section').scrollIntoView({ behavior: 'smooth' });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadShrines();

    document.getElementById('draw-button').addEventListener('click', drawOmikuji);
    document.getElementById('draw-again-button').addEventListener('click', drawAgain);
});
