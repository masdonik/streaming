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
            // Gunakan environment PATH untuk menemukan Python
            const env = Object.assign({}, process.env, {
                PATH: process.env.PATH + ':/usr/local/python/3.10.13/bin:/usr/local/bin:/usr/bin'
            });
            
            const gdownProcess = spawn('python3', ['-m', 'gdown', 
                `https://drive.google.com/uc?id=${fileId}`
            ], {
                cwd: this.downloadPath, // Set working directory ke folder video
                env: env // Tambahkan environment PATH
            });

            return new Promise((resolve, reject) => {
                let error = '';
                let progress = '';
                let downloadedFileName = '';

                gdownProcess.stdout.on('data', (data) => {
                    const output = data.toString();
                    progress = output;
                    console.log(`Progress: ${output}`);
                    
                    // Tangkap nama file dari output gdown
                    const saveMatch = output.match(/Downloading\s+(.+?)\s+to:/);
                    if (saveMatch && saveMatch[1]) {
                        downloadedFileName = saveMatch[1].trim();
                        console.log(`Nama file terdeteksi: ${downloadedFileName}`);
                    }
                });

                // Konsolidasi error handling
                gdownProcess.stderr.on('data', (data) => {
                    const errorMsg = data.toString();
                    error += errorMsg;
                    console.error(`Download error: ${errorMsg}`);
                    
                    if (errorMsg.includes('Cannot retrieve the public link of the file')) {
                        gdownProcess.kill();
                        reject(new Error('File tidak dapat diakses. Pastikan file telah dibagikan dengan akses "Anyone with the link"'));
                    }
                });

                gdownProcess.on('error', (err) => {
                    console.error(`Process error: ${err.message}`);
                    this.activeDownloads.delete(downloadId);
                    reject(new Error(`Kesalahan proses download: ${err.message}`));
                });

                gdownProcess.on('close', async (code) => {
                    this.activeDownloads.delete(downloadId);
                    
                    if (code === 0) {
                        try {
                            // Tunggu sebentar untuk memastikan file selesai ditulis
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            
                            // Jika nama file tidak terdeteksi, cari file terbaru di direktori
                            if (!downloadedFileName) {
                                const files = fs.readdirSync(this.downloadPath);
                                if (files.length > 0) {
                                    // Ambil file dengan waktu modifikasi terbaru
                                    const latestFile = files
                                        .map(file => ({
                                            name: file,
                                            mtime: fs.statSync(path.join(this.downloadPath, file)).mtime
                                        }))
                                        .sort((a, b) => b.mtime - a.mtime)[0];
                                    
                                    downloadedFileName = latestFile.name;
                                }
                            }

                            if (!downloadedFileName) {
                                throw new Error('Tidak dapat mendeteksi nama file yang didownload');
                            }

                            const filePath = path.join(this.downloadPath, downloadedFileName);
                            
                            if (fs.existsSync(filePath)) {
                                const stats = fs.statSync(filePath);
                                if (stats.size > 0) {
                                    resolve({
                                        success: true,
                                        path: filePath,
                                        filename: downloadedFileName,
                                        message: 'Download berhasil',
                                        size: (stats.size / (1024 * 1024)).toFixed(2) + ' MB'
                                    });
                                    return;
                                }
                            }
                            
                            reject(new Error('Download gagal: File tidak ditemukan atau kosong'));
                        } catch (err) {
                            reject(new Error(`Gagal memproses file: ${err.message}`));
                        }
                    } else {
                        const errorMsg = error.includes('Cannot retrieve the public link') 
                            ? 'File tidak dapat diakses. Pastikan file telah dibagikan dengan akses "Anyone with the link"'
                            : error || 'Terjadi kesalahan yang tidak diketahui';
                        reject(new Error(`Download gagal: ${errorMsg}`));
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