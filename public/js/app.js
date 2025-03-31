// Fungsi untuk menampilkan notifikasi
function showNotification(message, type = 'success') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} fixed top-4 right-4 z-50`;
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.remove();
    }, 3000);
}

// Fungsi untuk memformat waktu
function formatDate(date) {
    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(new Date(date));
}

// Fungsi untuk memformat ukuran file
function formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

// Update system stats
async function updateSystemStats() {
    try {
        console.log('Fetching system stats...');
        const response = await fetch('/api/system-stats');
        console.log('System stats response:', response);
        const stats = await response.json();
        
        document.querySelector('[data-stat="cpu"]').textContent = `${stats.cpuUsage}%`;
        document.querySelector('[data-stat="memory"]').textContent = `${stats.memoryUsage}%`;
        document.querySelector('[data-stat="disk"]').textContent = `${stats.diskUsage}%`;
    } catch (error) {
        console.error('Error updating stats:', error);
    }
}

// Fungsi untuk menangani form streaming
async function handleStreamForm(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="loading"></div>';

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        const response = await fetch('/api/start-stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.ok) {
            showNotification(result.message);
            updateActiveStreams();
        } else {
            throw new Error(result.error || 'Failed to start stream');
        }
    } catch (error) {
        showNotification(error.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Fungsi untuk menangani form download
async function handleDownloadForm(event) {
    event.preventDefault();
    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;

    try {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="loading"></div>';

        const urlInput = form.querySelector('input[name="url"]');
        const url = urlInput.value.trim();
        
        const response = await fetch('/api/download-video', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url })
        });

        const result = await response.json();

        if (response.ok) {
            showNotification(result.message);
            setTimeout(() => location.reload(), 1000);
        } else {
            throw new Error(result.error || 'Failed to download video');
        }
    } catch (error) {
        let errorMessage;
        if (error.response) {
            const errorData = await error.response.json();
            errorMessage = errorData.error;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        } else {
            errorMessage = 'Terjadi kesalahan saat mendownload video';
        }
        showNotification(errorMessage, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
    }
}

// Fungsi untuk menangani rename video
async function handleRenameVideo(oldName) {
    const newName = prompt('Masukkan nama baru untuk video:', oldName);
    if (!newName || newName === oldName) return;

    try {
        const response = await fetch('/api/rename-video', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ oldName, newName })
        });

        const result = await response.json();

        if (response.ok) {
            showNotification(result.message);
            setTimeout(() => location.reload(), 1000);
        } else {
            throw new Error(result.error || 'Failed to rename video');
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Fungsi untuk menangani delete video
async function handleDeleteVideo(filename) {
    if (!confirm('Apakah Anda yakin ingin menghapus video ini?')) return;

    try {
        const response = await fetch('/api/delete-video', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filename })
        });

        const result = await response.json();

        if (response.ok) {
            showNotification(result.message);
            setTimeout(() => location.reload(), 1000);
        } else {
            throw new Error(result.error || 'Failed to delete video');
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Fungsi untuk update tabel active streams
async function updateActiveStreams() {
    try {
        // Since the endpoint is not implemented yet, return empty array
        const streams = [];
        
        const tableBody = document.getElementById('activeStreamsTable');
        if (!tableBody) return;
        
        tableBody.innerHTML = streams.length === 0 ? `
            <tr class="table-row">
                <td colspan="4" class="py-3 px-4 text-center text-gray-500">
                    No active streams
                </td>
            </tr>
        ` : streams.map(stream => `
            <tr class="table-row">
                <td class="py-3 px-4">${stream.videoPath.split('/').pop()}</td>
                <td class="py-3 px-4">
                    <span class="badge ${stream.platform === 'facebook' ? 'badge-blue' : 'badge-green'}">
                        ${stream.platform}
                    </span>
                </td>
                <td class="py-3 px-4">${formatDate(stream.startTime)}</td>
                <td class="py-3 px-4">
                    <button onclick="handleStopStream('${stream.id}')" 
                            class="btn-danger">
                        <i class="fas fa-stop mr-2"></i>Stop
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error updating active streams:', error);
    }
}

// Fungsi untuk menghentikan stream
async function handleStopStream(streamId) {
    try {
        const response = await fetch('/api/stop-stream', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ streamId })
        });

        const result = await response.json();

        if (response.ok) {
            showNotification(result.message);
            updateActiveStreams();
        } else {
            throw new Error(result.error || 'Failed to stop stream');
        }
    } catch (error) {
        showNotification(error.message, 'error');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize system stats update
    updateSystemStats();
    setInterval(updateSystemStats, 5000);

    // Initialize active streams update
    updateActiveStreams();
    setInterval(updateActiveStreams, 10000);

    // Form handlers
    document.getElementById('streamForm')?.addEventListener('submit', handleStreamForm);
    
    // Download form handler with input clearing
    const downloadForm = document.getElementById('downloadForm');
    if (downloadForm) {
        // Clear input when switching to download tab
        document.querySelector('[data-tab="download"]')?.addEventListener('click', () => {
            const urlInput = downloadForm.querySelector('input[name="url"]');
            if (urlInput) urlInput.value = '';
        });
        
        downloadForm.addEventListener('submit', handleDownloadForm);
    }

    // Tab switching
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
});

// Fungsi untuk switch tab
function switchTab(tabId) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });

    // Show selected tab content
    document.getElementById(`${tabId}-tab`).classList.remove('hidden');

    // Update tab button styles
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('border-blue-500', 'text-blue-500');
        btn.classList.add('text-gray-400');
        
        if (btn.getAttribute('data-tab') === tabId) {
            btn.classList.remove('text-gray-400');
            btn.classList.add('border-blue-500', 'text-blue-500');
        }
    });
}