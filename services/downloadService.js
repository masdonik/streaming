const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

class DownloadService {
    constructor() {
        this.downloadPath = path.join(__dirname, '..', 'videos');
        this.activeDownloads = new Map();
        
        // Buat direktori videos jika belum ada
        if (!fs.existsSync(this.downloadPath)) {
            fs.mkdirSync(this.downloadPath, { recursive: true });
        }
    }

    extractFileId(url) {
        if (!url) {
            throw new Error('URL tidak boleh kosong');
        }

        if (!url.includes('drive.google.com')) {
            throw new Error('URL harus dari Google Drive');
        }

        // Support berbagai format URL Google Drive
        const patterns = [
            /\/file\/d\/([a-zA-Z0-9_-]+)/,           // Format: /file/d/{fileId}
            /id=([a-zA-Z0-9_-]+)/,                   // Format: ?id={fileId}
            /\/d\/([a-zA-Z0-9_-]+)/                  // Format: /d/{fileId}
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        throw new Error('Format URL Google Drive tidak valid. Gunakan format: https://drive.google.com/file/d/YOUR_FILE_ID/view');
    }

    async downloadVideo(url) {
        try {
            const fileId = this.extractFileId(url);
            const downloadId = `download_${Date.now()}`;
            
            // Validate URL before proceeding
            if (!url.startsWith('https://')) {
                throw new Error('URL harus menggunakan protokol HTTPS');
            }

            // Spawn gdown process tanpa -O untuk menggunakan nama file asli
            const wgetProcess = spawn('wget', [
                '--no-check-certificate',
                '-O', path.join(this.downloadPath, `${fileId}.mp4`),
                `https://drive.google.com/uc?export=download&id=${fileId}`
            ]);

            return new Promise((resolve, reject) => {
                let error = '';

                wgetProcess.stderr.on('data', (data) => {
                    const output = data.toString();
                    console.log(`Progress: ${output}`);
                });

                wgetProcess.on('error', (err) => {
                    console.error(`Process error: ${err.message}`);
                    this.activeDownloads.delete(downloadId);
                    reject(new Error(`Kesalahan proses download: ${err.message}`));
                });

                wgetProcess.on('close', async (code) => {
                    this.activeDownloads.delete(downloadId);
                    
                    if (code === 0) {
                        const filePath = path.join(this.downloadPath, `${fileId}.mp4`);
                        const stats = fs.statSync(filePath);
                        
                        resolve({
                            success: true,
                            path: filePath,
                            filename: `${fileId}.mp4`,
                            message: 'Download berhasil',
                            size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB'
                        });
                    } else {
                        reject(new Error('Download gagal. Pastikan URL valid dan file dapat diakses.'));
                    }
                });

                // Simpan informasi download yang sedang berlangsung
                this.activeDownloads.set(downloadId, {
                    process: gdownProcess,
                    info: {
                        url,
                        startTime: new Date(),
                        status: 'downloading'
                    }
                });
            });
        } catch (error) {
            throw new Error(`Gagal mendownload video: ${error.message}`);
        }
    }

    cancelDownload(downloadId) {
        const download = this.activeDownloads.get(downloadId);
        if (download) {
            download.process.kill();
            this.activeDownloads.delete(downloadId);
            return true;
        }
        return false;
    }

    getVideoInfo(filename) {
        try {
            const filePath = path.join(this.downloadPath, filename);
            const stats = fs.statSync(filePath);
            
            return {
                name: filename,
                size: (stats.size / (1024 * 1024)).toFixed(2), // Convert to MB
                date: stats.mtime
            };
        } catch (error) {
            throw new Error(`Gagal mendapatkan informasi video: ${error.message}`);
        }
    }

    listVideos() {
        try {
            const files = fs.readdirSync(this.downloadPath);
            return files.map(filename => this.getVideoInfo(filename));
        } catch (error) {
            throw new Error(`Gagal membaca daftar video: ${error.message}`);
        }
    }

    renameVideo(oldName, newName) {
        try {
            const oldPath = path.join(this.downloadPath, oldName);
            const newPath = path.join(this.downloadPath, newName);
            
            if (!fs.existsSync(oldPath)) {
                throw new Error('File tidak ditemukan');
            }
            
            if (fs.existsSync(newPath)) {
                throw new Error('Nama file sudah ada');
            }

            fs.renameSync(oldPath, newPath);
            return true;
        } catch (error) {
            throw new Error(`Gagal merename video: ${error.message}`);
        }
    }

    deleteVideo(filename) {
        try {
            const filePath = path.join(this.downloadPath, filename);
            
            if (!fs.existsSync(filePath)) {
                throw new Error('File tidak ditemukan');
            }

            fs.unlinkSync(filePath);
            return true;
        } catch (error) {
            throw new Error(`Gagal menghapus video: ${error.message}`);
        }
    }

    getActiveDownloads() {
        const downloads = [];
        for (const [id, download] of this.activeDownloads) {
            downloads.push({
                id,
                ...download.info
            });
        }
        return downloads;
    }
}

module.exports = new DownloadService();