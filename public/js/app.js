// Fungsi untuk memperbarui tabel stream aktif
function updateActiveStreams() {
    fetch('/api/active-streams')
        .then(response => response.json())
        .then(data => {
            const tableBody = document.getElementById('activeStreamsTable');
            tableBody.innerHTML = '';

            data.streams.forEach(stream => {
                const row = document.createElement('tr');
                row.className = 'border-t border-gray-700';
                
                // Format waktu mulai
                const startTime = new Date(stream.startTime).toLocaleString('id-ID');
                
                row.innerHTML = `
                    <td class="py-3 px-4">${stream.videoPath.split('/').pop()}</td>
                    <td class="py-3 px-4">${stream.platform}</td>
                    <td class="py-3 px-4">${startTime}</td>
                    <td class="py-3 px-4">
                        <button onclick="stopStream('${stream.id}')" 
                                class="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded">
                            <i class="fas fa-stop mr-1"></i>Stop
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        })
        .catch(error => {
            console.error('Error mengambil data stream aktif:', error);
        });
}

// Fungsi untuk menghentikan stream
async function stopStream(streamId) {
    if (!confirm('Apakah Anda yakin ingin menghentikan streaming ini?')) {
        return;
    }

    try {
        const response = await fetch('/api/stop-stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ streamId }),
        });
        
        const result = await response.json();
        alert(result.message);
        updateActiveStreams();
    } catch (error) {
        console.error('Error menghentikan stream:', error);
        alert('Gagal menghentikan streaming');
    }
}

// Event listener untuk form streaming
document.addEventListener('DOMContentLoaded', () => {
    const streamForm = document.getElementById('streamForm');
    if (streamForm) {
        streamForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitButton = streamForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            
            try {
                // Tampilkan loading state
                submitButton.disabled = true;
                submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Memulai...';

                const formData = new FormData(streamForm);
                const formObject = {};
                formData.forEach((value, key) => {
                    if (value) formObject[key] = value;
                });

                const response = await fetch('/api/start-stream', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formObject),
                });

                const result = await response.json();
                
                if (result.success) {
                    alert(result.message);
                    updateActiveStreams();
                    streamForm.reset();
                } else {
                    throw new Error(result.error || 'Gagal memulai streaming');
                }
            } catch (error) {
                console.error('Error memulai stream:', error);
                alert(error.message || 'Terjadi kesalahan saat memulai streaming');
            } finally {
                // Kembalikan tombol ke keadaan semula
                submitButton.disabled = false;
                submitButton.innerHTML = originalButtonText;
            }
        });
    }

    // Update system stats setiap 5 detik
    updateSystemStats();
    setInterval(updateSystemStats, 5000);

    // Update active streams setiap 5 detik
    updateActiveStreams();
    setInterval(updateActiveStreams, 5000);
});

// Update system stats
function updateSystemStats() {
    fetch('/api/system-stats')
        .then(response => response.json())
        .then(stats => {
            const cpuElement = document.querySelector('[data-stat="cpu"]');
            const memoryElement = document.querySelector('[data-stat="memory"]');
            const diskElement = document.querySelector('[data-stat="disk"]');

            if (cpuElement) cpuElement.textContent = `${stats.cpuUsage}%`;
            if (memoryElement) memoryElement.textContent = `${stats.memoryUsage}%`;
            if (diskElement) diskElement.textContent = `${stats.diskUsage}%`;
        })
        .catch(error => {
            console.error('Error updating stats:', error);
        });
}

// Video management functions
async function renameVideo(oldName) {
    const newName = prompt('Enter new name for video:', oldName);
    if (newName && newName !== oldName) {
        try {
            const response = await fetch('/api/rename-video', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ oldName, newName }),
            });
            const result = await response.json();
            alert(result.message);
            location.reload();
        } catch (error) {
            alert('Error renaming video');
        }
    }
}

async function deleteVideo(filename) {
    if (confirm('Are you sure you want to delete this video?')) {
        try {
            const response = await fetch('/api/delete-video', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ filename }),
            });
            const result = await response.json();
            alert(result.message);
            location.reload();
        } catch (error) {
            alert('Error deleting video');
        }
    }
}