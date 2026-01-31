const frame = document.getElementById('page-frame');


document.querySelectorAll('.bottom-nav button').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.bottom-nav button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        frame.src = btn.dataset.page;
    };
});


let currentStep = 1;
let session = { items: {} };
const PACKAGE_ITEMS = {
    T1: ['EDC', 'Sertifikat', 'Bingkai', 'Foto', 'Kaos', 'Banner', 'Thermal Paper'],
    M3: ['EDC', 'Sertifikat', 'Banner', 'Thermal Paper'],
    SIMPLE: ['Barang yang dikirim']
};



function startPacking() {
    session.employeeName = employeeName.value;
    showStep(2);
}


function goChecklist() {
    session.customerName = customerName.value;
    session.platform = platform.value;

    const type = packageType.value;
    session.packageType = type;

    let checklistItems = [];

    if (type === 'T1') {
        checklistItems = PACKAGE_ITEMS.T1;
    } else if (type === 'M3') {
        checklistItems = PACKAGE_ITEMS.M3;
    } else if (
        type === 'online' ||
        type === 'retur_vendor' ||
        type === 'retur_user' ||
        type === 'dokumen'
    ) {
        checklistItems = PACKAGE_ITEMS.SIMPLE;
    } else {
        alert('Pilih tipe paket terlebih dahulu');
        return;
    }

    session.items = {};
    const list = document.getElementById('checklist');
    list.innerHTML = '';

    checklistItems.forEach(i => {
        const div = document.createElement('div');
        div.innerHTML = `
            <strong>${i}</strong>
            <button>Ambil Foto</button>
            <img />
        `;

        const btn = div.querySelector('button');
        const img = div.querySelector('img');

        btn.onclick = () => takePhoto(photo => {
            img.src = photo;
            session.items[i] = photo;
        });

        list.appendChild(div);
    });

    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Lanjut ke Hardbox';
    nextBtn.onclick = () => showStep(4);

    list.appendChild(nextBtn);

    showStep(3);
}


function takeHardboxPhoto() {
    takePhoto(p => hardboxPreview.src = session.hardboxPhoto = p);
}


function goResi() { showStep(5); }


function takeResiPhoto() {
    takePhoto(p => resiPreview.src = session.resiPhoto = p);
}


async function finishPacking() {
    session.resiNumber = resiNumber.value;
    await saveHistory(session);
    location.href = 'summary.html';
}

function showStep(n) {
    currentStep = n;
    document.querySelectorAll('.step').forEach(s => s.classList.add('hidden'));
    document.querySelector(`[data-step="${n}"]`).classList.remove('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    const input = document.getElementById('employeeName');
    const btn = document.getElementById('startPackingBtn');

    if (!input || !btn) return;

    input.addEventListener('input', () => {
        btn.disabled = input.value.trim() === '';
    });
});

const summaryEl = document.getElementById('summary');

if (summaryEl) {
    (async () => {
        const params = new URLSearchParams(location.search);
        const id = params.get('id');

        let data;

        if (id) {
            data = await getHistoryById(id);
        } else {
            const history = await getHistory();
            data = history[0];
        }

        if (!data) {
            summaryEl.innerHTML = '<p>Data tidak ditemukan</p>';
            return;
        }

        let html = `
      <div class="step">
        <strong>Karyawan:</strong> ${data.employeeName}<br/>
        <strong>Customer:</strong> ${data.customerName}<br/>
        <strong>Platform:</strong> ${data.platform}<br/>
        <strong>Resi:</strong> ${data.resiNumber || '-'}
      </div>
    `;

        html += `<div class="step"><h3>Checklist</h3>`;

        for (const item in data.items) {
            html += `
        <div>
          <strong>${item}</strong>
          <img src="${data.items[item]}" />
        </div>
      `;
        }

        html += `</div>`;

        if (data.hardboxPhoto) {
            html += `
        <div class="step">
          <h3>Hardbox</h3>
          <img src="${data.hardboxPhoto}" />
        </div>
      `;
        }

        if (data.resiPhoto) {
            html += `
        <div class="step">
          <h3>Resi</h3>
          <img src="${data.resiPhoto}" />
        </div>
      `;
        }

        summaryEl.innerHTML = html;
    })();
}


const list = document.getElementById('historyList');

if (list) {
    (async () => {
        const history = await getHistory();

        const countByDate = {};
        history.forEach(h => {
            const dateKey = new Date(h.createdAt).toISOString().split('T')[0];
            countByDate[dateKey] = (countByDate[dateKey] || 0) + 1;
        });

        let lastDate = '';

        history.forEach(h => {
            const dateObj = new Date(h.createdAt);
            const dateKey = dateObj.toISOString().split('T')[0];

            if (dateKey !== lastDate) {
                const dateHeader = document.createElement('div');
                dateHeader.className = 'history-date-header';
                dateHeader.innerHTML = `
                    <div class="left-history">
                        <h5>${formatDate(dateObj)}</h5>
                        <span>${countByDate[dateKey]} paket</span>
                    </div>
                    <button class="export-btn" data-date="${dateKey}">Export ZIP</button>
                    <button class="whatsapp-btn" data-date="${dateKey}" onclick="sendToWhatsApp(this)">Kirim ke WhatsApp</button>
                `;

                list.appendChild(dateHeader);
                lastDate = dateKey;
            }

            const div = document.createElement('div');
            div.className = 'history-card';
            div.style.cursor = 'pointer';

            div.innerHTML = `
                <div class="history-row">
                    <strong>${h.customerName}</strong>
                    <span class="history-employee">${h.employeeName}</span>
                </div>
                <div class="history-meta">
                    <div class="history-platform">${h.platform}</div>
                    <div class="history-date">${new Date(h.createdAt).toLocaleString("id-ID")}</div>
                </div>

            `;

            div.onclick = () => {
                location.href = `summary.html?id=${h.id}`;
            };

            list.appendChild(div);
        });
    })();
}

document.addEventListener('click', async (e) => {
    if (e.target.classList.contains('export-btn')) {
        const date = e.target.dataset.date;
        await exportPackingByDate(date);
    }
});

async function exportPackingByDate(dateKey) {
    const history = await getHistory();

    const dataByDate = history.filter(h =>
        h.createdAt.startsWith(dateKey)
    );

    if (!dataByDate.length) return;

    const zip = new JSZip();
    const rootFolder = zip.folder(`PACKING_${dateKey}`);

    dataByDate.forEach(h => {
        const time = new Date(h.createdAt)
            .toTimeString()
            .slice(0, 8)
            .replace(/:/g, '');

        const folderName = `PACK_${time}_${h.employeeName}_${h.packageType}`;
        const packFolder = rootFolder.folder(folderName);

        // ===== data.json =====
        const dataJson = {
            employeeName: h.employeeName,
            customerName: h.customerName,
            platform: h.platform,
            packageType: h.packageType,
            createdAt: h.createdAt
        };

        packFolder.file(
            'data.json',
            JSON.stringify(dataJson, null, 2)
        );

        // ===== item photos =====
        if (h.items) {
            Object.entries(h.items).forEach(([key, photo], i) => {
                if (!photo) return;
                packFolder.file(
                    `${key.toLowerCase()}.jpg`,
                    base64ToBlob(photo),
                    { binary: true }
                );
            });
        }

        // ===== hardbox =====
        if (h.hardboxPhoto) {
            packFolder.file(
                'hardbox.jpg',
                base64ToBlob(h.hardboxPhoto),
                { binary: true }
            );
        }

        // ===== resi =====
        if (h.resiPhoto) {
            packFolder.file(
                'resi.jpg',
                base64ToBlob(h.resiPhoto),
                { binary: true }
            );
        }
    });

    // ===== summary.json =====
    rootFolder.file(
        'summary.json',
        JSON.stringify({
            date: dateKey,
            totalPacking: dataByDate.length,
            employees: [...new Set(dataByDate.map(d => d.employeeName))]
        }, null, 2)
    );

    // ===== generate ZIP =====
    const blob = await zip.generateAsync({ type: 'blob' });

    downloadBlob(blob, `PACKING_${dateKey}.zip`);

    // ===== popup sukses =====
    openExportModal(
        `File ZIP untuk tanggal ${formatDate(new Date(dateKey))} berhasil dibuat. 
Silakan upload file tersebut ke Google Drive.`
    );
}

function base64ToBlob(base64) {
    const byteString = atob(base64.split(',')[1]);
    const mime = base64.match(/data:(.*);base64/)[1];

    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ab], { type: mime });
}

function downloadBlob(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
}

function formatDate(date) {
    return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

const exportModal = document.getElementById('exportModal');
const exportModalText = document.getElementById('exportModalText');
const closeExportModalBtn = document.getElementById('closeExportModal');

function openExportModal(text) {
    exportModalText.textContent = text;
    exportModal.classList.remove('hidden');
}

function closeExportModal() {
    exportModal.classList.add('hidden');
}

if (exportModal) {
    // tombol tutup
    closeExportModalBtn.onclick = closeExportModal;

    // klik backdrop
    exportModal.querySelector('.modal-backdrop').onclick = closeExportModal;
}

function sendToWhatsApp(button) {
    const dateKey = button.dataset.date;
    if (!dateKey) return;

    const list = document.getElementById('historyList');
    if (!list) return;

    // Tentukan field yang ingin dimasukkan ke message
    const fields = [
        { selector: 'strong', label: 'customerName' },
        { selector: '.history-platform', label: 'platform' },
        // bisa tambah field lain besok: { selector: '.history-employee', label: 'employeeName' }, dst.
    ];

    // Ambil semua card di bawah header untuk tanggal yang dipilih
    const cards = Array.from(list.querySelectorAll('.history-date-header'))
        .filter(header => header.querySelector('button[data-date]')?.dataset.date === dateKey)
        .flatMap(header => {
            const siblings = [];
            let el = header.nextElementSibling;
            while (el && !el.classList.contains('history-date-header')) {
                if (el.classList.contains('history-card')) siblings.push(el);
                el = el.nextElementSibling;
            }
            return siblings;
        });

    if (cards.length === 0) return;

    // KIRIM CHAT DI SINI ------------
    const message = cards.map(card => {
        return fields.map(f => card.querySelector(f.selector)?.innerText || '').join(' | ');
    }).join('\n');

    const encodedMessage = encodeURIComponent(message);
    const phone = '6282233425752';
    const url = `https://wa.me/${phone}?text=${encodedMessage}`;

    window.open(url, '_blank');
}

// Fungsi untuk menambahkan swipe-to-delete ke card
function enableSwipeToDelete(card) {
    let startX = 0;
    let currentX = 0;
    let swiping = false;
    const threshold = -100; // jarak minimal swipe kiri untuk delete

    card.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
        swiping = true;
        card.style.transition = ''; // reset transition saat swipe
    });

    card.addEventListener('touchmove', e => {
        if (!swiping) return;
        currentX = e.touches[0].clientX;
        const dx = currentX - startX;
        if (dx < 0) { // swipe kiri
            card.style.transform = `translateX(${dx}px)`;
        }
    });

    card.addEventListener('touchend', () => {
        swiping = false;
        const dx = currentX - startX;

        if (dx < threshold) {
            card.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
            card.style.transform = 'translateX(-100%)';
            card.style.opacity = '0';
            setTimeout(() => card.remove(), 200);
        } else {
            card.style.transition = 'transform 0.2s ease-out';
            card.style.transform = 'translateX(0)';
        }
    });
}

// Inisialisasi untuk semua card yang sudah ada
document.querySelectorAll('.history-card').forEach(enableSwipeToDelete);

// Jika cards dibuat dinamis, panggil enableSwipeToDelete(card) saat card ditambahkan ke DOM

