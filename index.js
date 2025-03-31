const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const si = require('systeminformation');
const schedule = require('node-schedule');
const fs = require('fs');
const downloadService = require('./services/downloadService');

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Fungsi untuk mendapatkan system stats
async function getSystemStats() {
    const cpu = await si.currentLoad();
    const mem = await si.mem();
    const disk = await si.fsSize();
    
    return {
        cpuUsage: cpu.currentLoad.toFixed(2),
        memoryUsage: ((mem.used / mem.total) * 100).toFixed(2),
        diskUsage: ((disk[0].used / disk[0].size) * 100).toFixed(2)
    };
}

// Routes
app.get('/', async (req, res) => {
    try {
        const stats = await getSystemStats();
        const videos = fs.readdirSync(path.join(__dirname, 'videos')) || [];
        
        res.render('dashboard', {
            stats,
            videos: videos.map(video => ({
                name: video,
                size: (fs.statSync(path.join(__dirname, 'videos', video)).size / (1024 * 1024)).toFixed(2), // Convert to MB
                date: fs.statSync(path.join(__dirname, 'videos', video)).mtime
            }))
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Terjadi kesalahan server');
    }
});

// API Endpoints
app.get('/api/system-stats', async (req, res) => {
    try {
        const stats = await getSystemStats();
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Gagal mendapatkan system stats' });
    }
});

// Stream Management
let activeStreams = new Map();

app.post('/api/start-stream', (req, res) => {
    const { platform, videoPath, streamKey, schedule: streamSchedule, duration } = req.body;
    
    // Validasi input
    if (!platform || !videoPath || !streamKey) {
        return res.status(400).json({ error: 'Parameter tidak lengkap' });
    }

    try {
        // TODO: Implementasi logika streaming menggunakan ffmpeg
        // Ini akan diimplementasikan di service terpisah
        res.json({ message: 'Streaming dimulai' });
    } catch (error) {
        res.status(500).json({ error: 'Gagal memulai streaming' });
    }
});

app.post('/api/stop-stream', (req, res) => {
    const { streamId } = req.body;
    
    try {
        // TODO: Implementasi stop streaming
        res.json({ message: 'Streaming dihentikan' });
    } catch (error) {
        res.status(500).json({ error: 'Gagal menghentikan streaming' });
    }
});

// Video Management
app.post('/api/download-video', async (req, res) => {
    const { url } = req.body;
    
    if (!url) {
        return res.status(400).json({ 
            success: false,
            error: 'URL video tidak boleh kosong' 
        });
    }

    try {
        // Mulai proses download
        const result = await downloadService.downloadVideo(url);
        
        res.json({
            success: true,
            message: result.message,
            data: {
                path: result.path,
                size: result.size
            }
        });
    } catch (error) {
        console.error('Error download:', error);
        
        // Determine appropriate status code based on error type
        let statusCode = 500;
        if (error.message.includes('URL tidak boleh kosong') || 
            error.message.includes('URL harus dari Google Drive') ||
            error.message.includes('Format URL Google Drive tidak valid')) {
            statusCode = 400;
        }
        
        // Send error response
        res.status(statusCode).json({
            success: false,
            error: error.message
        });
    }
});

app.post('/api/rename-video', (req, res) => {
    const { oldName, newName } = req.body;
    
    try {
        const oldPath = path.join(__dirname, 'videos', oldName);
        const newPath = path.join(__dirname, 'videos', newName);
        
        fs.renameSync(oldPath, newPath);
        res.json({ message: 'Video berhasil direname' });
    } catch (error) {
        res.status(500).json({ error: 'Gagal merename video' });
    }
});

app.delete('/api/delete-video', (req, res) => {
    const { filename } = req.body;
    
    try {
        fs.unlinkSync(path.join(__dirname, 'videos', filename));
        res.json({ message: 'Video berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ error: 'Gagal menghapus video' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});