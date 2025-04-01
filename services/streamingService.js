const { spawn } = require('child_process');
const path = require('path');

class StreamingService {
    constructor() {
        this.activeStreams = new Map();
    }

    generateStreamId() {
        return Math.random().toString(36).substr(2, 9);
    }

    startStream(videoPath, platform, streamKey, duration = null) {
        const streamId = this.generateStreamId();
        
        // Buat command ffmpeg sesuai platform
        let ffmpegCommand = [
            '-re',  // Read input at native frame rate
            '-i', videoPath,  // Input file
            '-c:v', 'copy',   // Copy video codec
            '-c:a', 'aac',    // Audio codec
            '-f', 'flv'       // Output format
        ];

        // Tambahkan URL streaming sesuai platform
        let streamUrl;
        if (platform === 'facebook') {
            streamUrl = `rtmps://live-api-s.facebook.com:443/rtmp/${streamKey}`;
        } else if (platform === 'youtube') {
            streamUrl = `rtmp://a.rtmp.youtube.com/live2/${streamKey}`;
        } else {
            throw new Error('Platform tidak didukung');
        }

        // Jalankan ffmpeg
        const ffmpeg = spawn('ffmpeg', [...ffmpegCommand, streamUrl]);

        // Catat waktu mulai
        const startTime = new Date();

        // Simpan informasi stream
        const streamInfo = {
            id: streamId,
            process: ffmpeg,
            platform,
            videoPath,
            startTime,
            duration
        };

        // Tambahkan ke daftar stream aktif
        this.activeStreams.set(streamId, streamInfo);

        // Setup event handlers
        ffmpeg.stderr.on('data', (data) => {
            console.log(`[Stream ${streamId}] ${data}`);
        });

        ffmpeg.on('close', (code) => {
            console.log(`[Stream ${streamId}] Process exited with code ${code}`);
            this.activeStreams.delete(streamId);
        });

        // Jika ada durasi, setup timer untuk menghentikan stream
        if (duration) {
            setTimeout(() => {
                this.stopStream(streamId);
            }, duration * 60 * 1000); // Convert minutes to milliseconds
        }

        return streamId;
    }

    scheduleStream(videoPath, platform, streamKey, scheduleTime, duration = null) {
        const streamId = this.generateStreamId();
        const now = new Date();
        const scheduledTime = new Date(scheduleTime);

        if (scheduledTime <= now) {
            throw new Error('Waktu jadwal harus di masa depan');
        }

        const timeoutMs = scheduledTime.getTime() - now.getTime();

        // Simpan informasi jadwal
        const scheduleInfo = {
            id: streamId,
            videoPath,
            platform,
            streamKey,
            scheduleTime: scheduledTime,
            duration,
            timeout: setTimeout(() => {
                this.startStream(videoPath, platform, streamKey, duration);
            }, timeoutMs)
        };

        this.activeStreams.set(streamId, scheduleInfo);
        return streamId;
    }

    stopStream(streamId) {
        const stream = this.activeStreams.get(streamId);
        if (!stream) {
            return false;
        }

        if (stream.process) {
            // Jika stream sedang berjalan
            stream.process.kill('SIGTERM');
        } else if (stream.timeout) {
            // Jika stream masih dalam jadwal
            clearTimeout(stream.timeout);
        }

        this.activeStreams.delete(streamId);
        return true;
    }

    getActiveStreams() {
        const streams = [];
        for (const [id, stream] of this.activeStreams) {
            streams.push({
                id,
                platform: stream.platform,
                videoPath: stream.videoPath,
                startTime: stream.startTime || stream.scheduleTime,
                scheduled: !stream.process
            });
        }
        return streams;
    }
}

module.exports = new StreamingService();