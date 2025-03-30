const { spawn } = require('child_process');
const schedule = require('node-schedule');
const path = require('path');

class StreamingService {
    constructor() {
        this.activeStreams = new Map();
        this.scheduledJobs = new Map();
    }

    generateStreamUrl(platform, streamKey) {
        switch (platform.toLowerCase()) {
            case 'facebook':
                return `rtmps://live-api-s.facebook.com:443/rtmp/${streamKey}`;
            case 'youtube':
                return `rtmp://a.rtmp.youtube.com/live2/${streamKey}`;
            default:
                throw new Error('Platform tidak didukung');
        }
    }

    startStream(videoPath, platform, streamKey, duration = null) {
        const streamUrl = this.generateStreamUrl(platform, streamKey);
        const streamId = `${platform}_${Date.now()}`;

        // Buat command ffmpeg untuk streaming tanpa encoding (menggunakan copy codec)
        const ffmpegArgs = [
            '-re',                    // Read input at native frame rate
            '-i', videoPath,          // Input file
            '-c', 'copy',            // Copy codec (no re-encoding)
            '-f', 'flv',             // Force FLV format
            streamUrl                 // Output URL
        ];

        // Spawn ffmpeg process
        const ffmpegProcess = spawn('ffmpeg', ffmpegArgs);
        
        // Handle process events
        ffmpegProcess.stderr.on('data', (data) => {
            console.log(`[${streamId}] ffmpeg: ${data}`);
        });

        ffmpegProcess.on('close', (code) => {
            console.log(`[${streamId}] Stream ended with code ${code}`);
            this.activeStreams.delete(streamId);
        });

        // Store stream information
        this.activeStreams.set(streamId, {
            process: ffmpegProcess,
            info: {
                platform,
                videoPath,
                startTime: new Date(),
                duration
            }
        });

        // If duration is set, schedule stream termination
        if (duration) {
            setTimeout(() => {
                this.stopStream(streamId);
            }, duration * 60 * 1000); // Convert minutes to milliseconds
        }

        return streamId;
    }

    scheduleStream(videoPath, platform, streamKey, startTime, duration = null) {
        const jobId = `${platform}_${Date.now()}`;
        
        const job = schedule.scheduleJob(startTime, () => {
            this.startStream(videoPath, platform, streamKey, duration);
            this.scheduledJobs.delete(jobId);
        });

        this.scheduledJobs.set(jobId, {
            job,
            info: {
                platform,
                videoPath,
                startTime,
                duration
            }
        });

        return jobId;
    }

    stopStream(streamId) {
        const stream = this.activeStreams.get(streamId);
        if (stream) {
            stream.process.kill('SIGTERM');
            this.activeStreams.delete(streamId);
            return true;
        }
        return false;
    }

    cancelScheduledStream(jobId) {
        const scheduledStream = this.scheduledJobs.get(jobId);
        if (scheduledStream) {
            scheduledStream.job.cancel();
            this.scheduledJobs.delete(jobId);
            return true;
        }
        return false;
    }

    getActiveStreams() {
        const streams = [];
        for (const [id, stream] of this.activeStreams) {
            streams.push({
                id,
                ...stream.info
            });
        }
        return streams;
    }

    getScheduledStreams() {
        const streams = [];
        for (const [id, stream] of this.scheduledJobs) {
            streams.push({
                id,
                ...stream.info
            });
        }
        return streams;
    }
}

module.exports = new StreamingService();