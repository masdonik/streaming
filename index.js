const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const si = require('systeminformation');
const schedule = require('node-schedule');
const fs = require('fs');
const { spawn } = require('child_process');
const downloadService = require('./services/downloadService');
const streamingService = require('./services/streamingService');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    if (req.method === 'POST') {
        console.log('Request body:', req.body);
    }
    next();
});

// Cek ketersediaan ffmpeg
function checkFfmpeg() {
    return new Promise((resolve, reject) => {
        const ffmpeg = spawn('ffmpeg', ['-version']);
        
        ffmpeg.on('error', (err) => {
            console.error('FFMPEG tidak ditemukan:', err);
            reject(new Error('FFMPEG tidak terinstal di sistem'));
        });

        ffmpeg.on('close', (code) => {
            if (code === 0) {
                console.log('FFMPEG terdeteksi dan siap digunakan');
                resolve(true);
            } else {
                reject(new Error('FFMPEG tidak berfungsi dengan benar'));
            }
        });
    });
}

// API endpoint untuk mendapatkan statistik sistem
app.get('/api/system-stats', async (req, res) => {
    try {
        const [cpu, mem, disk] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.fsSize()
        ]);

        res.json({
            cpuUsage: Math.round(cpu.currentLoad),
            memoryUsage: Math.round((mem.used / mem.total) * 100),
            diskUsage: Math.round((disk[0].used / disk[0].size) * 100)
        });
    } catch (error) {
        console.error('Error getting system stats:', error);
        res.status(500).json({ error: 'Failed to get system stats' });
    }
});

// API endpoint untuk memulai streaming
app.post('/api/start-stream', async (req, res) => {
    try {
        console.log('Received streaming request:', req.body);
        const { video, platform, streamKey, schedule: scheduleTime, duration } = req.body;
        const videoPath = path.join(__dirname, 'videos', video);

        // Validasi input
        if (!video || !platform || !streamKey) {
            console.log('Validation failed: Missing required fields');
            return res.status(400).json({ error: 'Video, platform, dan stream key harus diisi' });
        }

        // Validasi file video
        if (!fs.existsSync(videoPath)) {
            console.log('Validation failed: Video file not found:', videoPath);
            return res.status(404).json({ error: 'File video tidak ditemukan' });
        }

        let streamId;
        if (scheduleTime) {
            console.log('Scheduling stream for:', scheduleTime);
            // Jadwalkan streaming untuk waktu tertentu
            streamId = streamingService.scheduleStream(videoPath, platform, streamKey, scheduleTime, duration);
            res.json({ 
                success: true,
                message: `Streaming dijadwalkan untuk ${new Date(scheduleTime).toLocaleString()}`,
                streamId 
            });
        } else {
            console.log('Starting stream immediately');
            // Mulai streaming sekarang
            streamId = streamingService.startStream(videoPath, platform, streamKey, duration);
            res.json({ 
                success: true,
                message: 'Streaming dimulai',
                streamId 
            });
        }
        console.log('Stream started/scheduled with ID:', streamId);
    } catch (error) {
        console.error('Error saat memulai streaming:', error);
        res.status(500).json({ error: error.message });
    }
});

// API endpoint untuk menghentikan streaming
app.post('/api/stop-stream', (req, res) => {
    try {
        const { streamId } = req.body;
        if (!streamId) {
            return res.status(400).json({ error: 'Stream ID harus disediakan' });
        }

        const success = streamingService.stopStream(streamId);
        if (success) {
            res.json({ message: 'Streaming dihentikan' });
        } else {
            res.status(404).json({ error: 'Stream tidak ditemukan' });
        }
    } catch (error) {
        console.error('Error saat menghentikan streaming:', error);
        res.status(500).json({ error: error.message });
    }
});

// API endpoint untuk mendapatkan daftar stream aktif
app.get('/api/active-streams', (req, res) => {
    try {
        const streams = streamingService.getActiveStreams();
        res.json({ streams });
    } catch (error) {
        console.error('Error saat mengambil daftar stream:', error);
        res.status(500).json({ error: error.message });
    }
});

// Route untuk halaman utama
app.get('/', async (req, res) => {
    try {
        const videosDir = path.join(__dirname, 'videos');
        const files = fs.readdirSync(videosDir);
        
        const videos = files.map(file => {
            const stats = fs.statSync(path.join(videosDir, file));
            return {
                name: file,
                size: (stats.size / (1024 * 1024)).toFixed(2), // Convert to MB
                date: stats.mtime
            };
        });

        const [cpu, mem, disk] = await Promise.all([
            si.currentLoad(),
            si.mem(),
            si.fsSize()
        ]);

        const stats = {
            cpuUsage: Math.round(cpu.currentLoad),
            memoryUsage: Math.round((mem.used / mem.total) * 100),
            diskUsage: Math.round((disk[0].used / disk[0].size) * 100)
        };

        res.render('dashboard', { videos, stats });
    } catch (error) {
        console.error('Error rendering dashboard:', error);
        res.status(500).send('Internal Server Error');
    }
});

// API endpoint untuk download video
app.post('/api/download-video', async (req, res) => {
    try {
        const { url } = req.body;
        const result = await downloadService.downloadVideo(url);
        res.json({ success: true, message: 'Video berhasil didownload', data: result });
    } catch (error) {
        console.error('Error downloading video:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// API endpoint untuk menghapus video
app.delete('/api/delete-video', (req, res) => {
    try {
        const { filename } = req.body;
        const videoPath = path.join(__dirname, 'videos', filename);
        
        if (!fs.existsSync(videoPath)) {
            return res.status(404).json({ error: 'Video tidak ditemukan' });
        }

        fs.unlinkSync(videoPath);
        res.json({ message: 'Video berhasil dihapus' });
    } catch (error) {
        console.error('Error deleting video:', error);
        res.status(500).json({ error: 'Gagal menghapus video' });
    }
});

// API endpoint untuk rename video
app.post('/api/rename-video', (req, res) => {
    try {
        const { oldName, newName } = req.body;
        const oldPath = path.join(__dirname, 'videos', oldName);
        const newPath = path.join(__dirname, 'videos', newName);

        if (!fs.existsSync(oldPath)) {
            return res.status(404).json({ error: 'Video tidak ditemukan' });
        }

        if (fs.existsSync(newPath)) {
            return res.status(400).json({ error: 'Nama file sudah digunakan' });
        }

        fs.renameSync(oldPath, newPath);
        res.json({ message: 'Video berhasil direname' });
    } catch (error) {
        console.error('Error renaming video:', error);
        res.status(500).json({ error: 'Gagal merename video' });
    }
});

// Pastikan direktori videos ada
const videosDir = path.join(__dirname, 'videos');
if (!fs.existsSync(videosDir)) {
    fs.mkdirSync(videosDir);
    console.log('Direktori videos dibuat');
}

// Start server dengan pengecekan ffmpeg
async function startServer() {
    try {
        // Cek ketersediaan ffmpeg
        await checkFfmpeg();
        
        // Jalankan server setelah pengecekan berhasil
        app.listen(PORT, () => {
            console.log(`Server berjalan di http://localhost:${PORT}`);
            console.log(`Direktori videos: ${videosDir}`);
        });
    } catch (error) {
        console.error('Error saat memulai server:', error.message);
        console.error('Pastikan ffmpeg terinstal di sistem Anda');
        process.exit(1);
    }
}

startServer();
