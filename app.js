function getHistory() {
    return JSON.parse(localStorage.getItem('history')) || [];
}

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
    T1: ['EDC', 'Sertifikat', 'QRIS', 'Layanan QRIS', 'Kaos', 'Banner', 'Thermal Paper'],
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

    let historyData = JSON.parse(localStorage.getItem('history')) || [];

    if (!session.id) session.id = Date.now().toString();
    session.createdAt = new Date().toISOString();

    historyData.unshift(session);
    localStorage.setItem('history', JSON.stringify(historyData));

    const newId = session.id;

    // reset session
    session = { items: {} };

    location.href = 'summary.html?id=' + newId;
}

async function getHistoryById(id) {
    const history = JSON.parse(localStorage.getItem('history')) || [];
    return history.find(h => h.id === id);
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

const searchInput = document.getElementById('historySearch');

if (searchInput) {
    searchInput.addEventListener('input', () => {
        const keyword = searchInput.value.toLowerCase();

        const cards = document.querySelectorAll('.history-card');

        cards.forEach(card => {
            const customer = card.querySelector('strong')?.innerText.toLowerCase() || '';
            const employee = card.querySelector('.history-employee')?.innerText.toLowerCase() || '';
            const platform = card.querySelector('.history-platform')?.innerText.toLowerCase() || '';
            const resi = (card.dataset.resi || '').toLowerCase();

            const match =
                customer.includes(keyword) ||
                employee.includes(keyword) ||
                platform.includes(keyword) ||
                resi.includes(keyword);

            card.style.display = match ? '' : 'none';
        });

        // Sembunyikan header tanggal kalau semua card di bawahnya hidden
        document.querySelectorAll('.history-date-header').forEach(header => {
            let el = header.nextElementSibling;
            let hasVisible = false;

            while (el && !el.classList.contains('history-date-header')) {
                if (
                    el.classList.contains('history-card') &&
                    el.style.display !== 'none'
                ) {
                    hasVisible = true;
                }
                el = el.nextElementSibling;
            }

            header.style.display = hasVisible ? '' : 'none';
        });
    });
}

const list = document.getElementById('historyList');

if (list) {
    (async () => {
        // Ambil history dari localStorage dulu
        let historyData = JSON.parse(localStorage.getItem('history')) || [];

        // Jika localStorage kosong, fetch dari server
        if (!historyData.length) {
            historyData = await getHistory();
            localStorage.setItem('history', JSON.stringify(historyData));
        }

        // Render semua history
        renderHistory(list, historyData);
    })();
}

// Fungsi untuk render history
function renderHistory(list, historyData) {
    list.innerHTML = ''; // reset list

    const countByDate = {};
    historyData.forEach(h => {
        const dateKey = new Date(h.createdAt).toISOString().split('T')[0];
        countByDate[dateKey] = (countByDate[dateKey] || 0) + 1;
    });

    let lastDate = '';

    historyData.forEach(h => {
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
            dateHeader.style.cursor = 'pointer';
            dateHeader.dataset.collapsed = 'false';
            list.appendChild(dateHeader);
            dateHeader.addEventListener('click', (e) => {
                if (e.target.tagName === 'BUTTON') return;
                toggleCollapse(dateHeader);
            });
            lastDate = dateKey;
        }

        const div = document.createElement('div');
        div.className = 'history-card';
        div.style.cursor = 'pointer';
        div.dataset.id = h.id;           // id untuk delete
        div.dataset.resi = h.resiNumber || '';

        div.innerHTML = `
            <div class="history-row">
                <strong>${h.customerName}</strong>
                <span class="history-employee">${h.employeeName}</span>
            </div>
            <div class="history-meta">
                <div class="history-platform">${h.platform}</div>
                <div class="history-date">${dateObj.toLocaleString("id-ID")}</div>
            </div>
        `;

        enableSwipeToDelete(div, h.id, historyData);

        list.appendChild(div);
    });
}

function toggleCollapse(header) {
    const collapsed = header.dataset.collapsed === 'true';
    header.dataset.collapsed = collapsed ? 'false' : 'true';

    let el = header.nextElementSibling;

    while (el && !el.classList.contains('history-date-header')) {
        if (el.classList.contains('history-card')) {
            el.style.display = collapsed ? '' : 'none';
        }
        el = el.nextElementSibling;
    }
}

function enableSwipeToDelete(card, cardId, historyData) {
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let dy = 0;
    let isSwiping = false;

    const swipeThreshold = 80; // jarak swipe kiri untuk delete

    // ===== TOUCH START =====
    card.addEventListener('touchstart', e => {
        const t = e.touches[0];
        startX = t.clientX;
        startY = t.clientY;
        dx = 0;
        dy = 0;
        isSwiping = false;
        card.style.transition = '';
    });

    // ===== TOUCH MOVE =====
    card.addEventListener('touchmove', e => {
        const t = e.touches[0];
        dx = t.clientX - startX;
        dy = t.clientY - startY;

        // hanya anggap swipe jika horizontal dominan
        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx < 0) {
                isSwiping = true;
                card.style.transform = `translateX(${dx}px)`;
            }
        }
    });

    // ===== TOUCH END =====
    card.addEventListener('touchend', () => {
        // Jika swipe kiri cukup jauh → delete
        if (isSwiping && dx < -swipeThreshold) {
            const ok = confirm("Hapus paket ini?");
            if (!ok) {
                resetCard();
                return;
            }

            // Animasi keluar
            card.style.transition = '0.2s';
            card.style.transform = 'translateX(-100%)';
            card.style.opacity = '0';

            setTimeout(() => {
                card.remove();

                // Hapus dari localStorage
                const index = historyData.findIndex(h => h.id === cardId);
                if (index > -1) {
                    historyData.splice(index, 1);
                    localStorage.setItem('history', JSON.stringify(historyData));
		renderHistory(document.getElementById('historyList'), historyData);
                }

            }, 200);
        } else {
            // bukan swipe valid → balik normal
            resetCard();
        }

        // reset flag setelah event selesai
        setTimeout(() => {
            isSwiping = false;
        }, 50);
    });

    function resetCard() {
        card.style.transition = '0.2s';
        card.style.transform = 'translateX(0)';
        card.style.opacity = '1';
    }

    // ===== CLICK HANDLER AMAN =====
    card.addEventListener('click', e => {
        if (isSwiping) {
            e.preventDefault();
            e.stopPropagation();
            return;
        }

        // klik normal → buka summary
        location.href = `summary.html?id=${cardId}`;
    });
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

        if (h.hardboxPhoto) {
            packFolder.file(
                'hardbox.jpg',
                base64ToBlob(h.hardboxPhoto),
                { binary: true }
            );
        }

        if (h.resiPhoto) {
            packFolder.file(
                'resi.jpg',
                base64ToBlob(h.resiPhoto),
                { binary: true }
            );
        }
    });

    rootFolder.file(
        'summary.json',
        JSON.stringify({
            date: dateKey,
            totalPacking: dataByDate.length,
            employees: [...new Set(dataByDate.map(d => d.employeeName))]
        }, null, 2)
    );

    const blob = await zip.generateAsync({ type: 'blob' });

    downloadBlob(blob, `PACKING_${dateKey}.zip`);

    openExportModal(
        `File ZIP untuk tanggal ${formatDate(new Date(dateKey))} berhasil dibuat.`
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
    closeExportModalBtn.onclick = closeExportModal;
    exportModal.querySelector('.modal-backdrop').onclick = closeExportModal;
}

function sendToWhatsApp(button) {
    const dateKey = button.dataset.date;
    if (!dateKey) return;

    const list = document.getElementById('historyList');
    if (!list) return;

    // FIELD BUAT WA --------------
    const fields = [
        { selector: 'strong', label: 'customerName' },
        { selector: '.history-platform', label: 'platform' },
        { selector: null, label: 'resi' },
    ];

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

    // KIRIM CHAT
    const message = cards.map(card => {
        return fields.map(f => {
            if (f.selector) {
                const el = card.querySelector(f.selector);
                return el ? el.innerText : '';
            } else {
                // ambil data-resi per card
                return card.dataset.resi || '';
            }
        }).join(' | ');
    }).join('\n');

    const encodedMessage = encodeURIComponent(message);
    const phone = '6282233425752';
    const url = `https://wa.me/${phone}?text=${encodedMessage}`;

    window.open(url, '_blank');
}

// function enableSwipeToDelete(card) {
//     let startX = 0;
//     let currentX = 0;
//     let swiping = false;
//     const threshold = -100; // jarak minimal swipe kiri untuk delete

//     card.addEventListener('touchstart', e => {
//         startX = e.touches[0].clientX;
//         swiping = true;
//         card.style.transition = ''; // reset transition saat swipe
//     });

//     card.addEventListener('touchmove', e => {
//         if (!swiping) return;
//         currentX = e.touches[0].clientX;
//         const dx = currentX - startX;
//         if (dx < 0) { // swipe kiri
//             card.style.transform = `translateX(${dx}px)`;
//         }
//     });

//     card.addEventListener('touchend', () => {
//         swiping = false;
//         const dx = currentX - startX;

//         if (dx < threshold) {
//             card.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
//             card.style.transform = 'translateX(-100%)';
//             card.style.opacity = '0';
//             setTimeout(() => card.remove(), 200);
//         } else {
//             card.style.transition = 'transform 0.2s ease-out';
//             card.style.transform = 'translateX(0)';
//         }
//     });
// }

// // Inisialisasi untuk semua card yang sudah ada
// document.querySelectorAll('.history-card').forEach(enableSwipeToDelete);

document.getElementById('scanResiBtn')?.addEventListener('click', startScan);
document.getElementById('scanResiFromPhotoBtn')?.addEventListener('click', () => {
    document.getElementById('resiPhotoInput').click();
});


document.getElementById('resiPhotoInput').addEventListener('change', function () {
    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        decodeResiFromImage(e.target.result);
    };
    reader.readAsDataURL(file);

    // reset supaya bisa foto ulang
    this.value = '';
});

function decodeResiFromImage(imageSrc) {
    Quagga.decodeSingle({
        src: imageSrc,
        numOfWorkers: 0,
        inputStream: {
            size: 800
        },
        decoder: {
            readers: [
                "code_128_reader",
                "ean_reader",
                "ean_8_reader",
                "code_39_reader"
            ]
        },
        locate: true
    }, function (result) {
        if (result && result.codeResult) {
            document.getElementById('resiNumber').value = result.codeResult.code;
        } else {
            alert('Barcode tidak terbaca. Ambil ulang foto resi.');
        }
    });
}

// Fungsi scan (QuaggaJS)
function startScan() {
    const resiInput = document.getElementById('resiNumber');

    const overlay = document.createElement('div');
    overlay.id = 'scannerOverlay';
    overlay.style.cssText = `
        position:fixed;inset:0;
        background:rgba(0,0,0,0.8);
        z-index:1000;
    `;
    document.body.appendChild(overlay);

    const videoDiv = document.createElement('div');
    videoDiv.style.width = '100%';
    videoDiv.style.height = '100%';
    overlay.appendChild(videoDiv);

    const closeBtn = document.createElement('button');
    closeBtn.innerText = 'Tutup';
    closeBtn.style.cssText = `
        position:absolute;top:10px;right:10px;z-index:1001
    `;
    overlay.appendChild(closeBtn);

    const onDetected = result => {
        if (result?.codeResult?.code) {
            resiInput.value = result.codeResult.code;
            stopScanner();
        }
    };

    Quagga.init({
        inputStream: {
            type: "LiveStream",
            target: videoDiv,
            constraints: { facingMode: "environment" }
        },
        decoder: { readers: ["code_128_reader", "code_39_reader"] },
        locate: true
    }, err => {
        if (err) {
            console.error(err);
            stopScanner();
            return;
        }
        Quagga.onDetected(onDetected);
        Quagga.start();
    });

    function stopScanner() {
        Quagga.offDetected(onDetected);
        Quagga.stop();
        overlay.remove();
    }

    closeBtn.onclick = stopScanner;
    overlay.onclick = e => {
        if (e.target === overlay) stopScanner();
    };
}


// SCANNER LAINNNNNN
// scanBtn.addEventListener('click', () => {
//     // Buat div modal / overlay untuk scanner
//     let scannerDiv = document.createElement('div');
//     scannerDiv.id = 'qrScanner';
//     scannerDiv.style.position = 'fixed';
//     scannerDiv.style.top = 0;
//     scannerDiv.style.left = 0;
//     scannerDiv.style.width = '100%';
//     scannerDiv.style.height = '100%';
//     scannerDiv.style.background = 'rgba(0,0,0,0.8)';
//     scannerDiv.style.zIndex = 1000;
//     document.body.appendChild(scannerDiv);

//     html5QrCode = new Html5Qrcode("qrScanner");

//     html5QrCode.start(
//         { facingMode: "environment" }, // kamera belakang
//         {
//             fps: 15,
//             qrbox: { width: 300, height: 300 } // ukuran area scan
//         },
//         (decodedText, decodedResult) => {
//             // Saat barcode terbaca
//             resiInput.value = decodedText; // isi field resi
//             stopScanner();
//         },
//         (errorMessage) => {
//             // barcode belum terbaca, bisa abaikan
//         }
//     );
// });


// function stopScanner() {
//     if (html5QrCode) {
//         html5QrCode.stop().then(() => {
//             const scannerDiv = document.getElementById('qrScanner');
//             if (scannerDiv) scannerDiv.remove();
//         }).catch(err => console.error(err));
//     }
// }


(function bindFinishPackingOnce() {
    const btn = document.getElementById('finishPackingBtn');
    if (!btn) return;

    if (btn.dataset.bound === 'true') return;
    btn.dataset.bound = 'true';

    btn.addEventListener('click', () => {
        if (!resiNumber || !resiNumber.value.trim()) {
            alert('Nomor resi belum diisi');
            return;
        }

        if (btn.disabled) return;
        btn.disabled = true;

        // PANGGIL LANGSUNG, TANPA TRY/CATCH
        finishPacking();
    });
})();
