const si = require('systeminformation');

class SystemStats {
    constructor() {
        this.stats = {
            cpu: 0,
            memory: 0,
            disk: 0
        };
        
        // Update stats setiap 5 detik
        this.startMonitoring();
    }

    async startMonitoring() {
        setInterval(async () => {
            try {
                await this.updateStats();
            } catch (error) {
                console.error('Error updating system stats:', error);
            }
        }, 5000);
    }

    async updateStats() {
        try {
            // Get CPU Load
            const cpuLoad = await si.currentLoad();
            this.stats.cpu = cpuLoad.currentLoad.toFixed(2);

            // Get Memory Usage
            const memory = await si.mem();
            this.stats.memory = ((memory.used / memory.total) * 100).toFixed(2);

            // Get Disk Usage
            const disk = await si.fsSize();
            if (disk.length > 0) {
                this.stats.disk = ((disk[0].used / disk[0].size) * 100).toFixed(2);
            }
        } catch (error) {
            console.error('Error in updateStats:', error);
            throw error;
        }
    }

    async getStats() {
        // Pastikan stats sudah diupdate sebelum mengembalikan nilai
        await this.updateStats();
        
        return {
            cpuUsage: this.stats.cpu,
            memoryUsage: this.stats.memory,
            diskUsage: this.stats.disk
        };
    }

    // Method untuk mendapatkan informasi detail sistem
    async getDetailedStats() {
        try {
            const [cpu, mem, disk, os] = await Promise.all([
                si.cpu(),
                si.mem(),
                si.fsSize(),
                si.osInfo()
            ]);

            return {
                cpu: {
                    manufacturer: cpu.manufacturer,
                    brand: cpu.brand,
                    speed: cpu.speed,
                    cores: cpu.cores,
                    physicalCores: cpu.physicalCores,
                    usage: this.stats.cpu
                },
                memory: {
                    total: (mem.total / (1024 * 1024 * 1024)).toFixed(2), // Convert to GB
                    used: (mem.used / (1024 * 1024 * 1024)).toFixed(2),
                    free: (mem.free / (1024 * 1024 * 1024)).toFixed(2),
                    usage: this.stats.memory
                },
                disk: {
                    size: (disk[0].size / (1024 * 1024 * 1024)).toFixed(2), // Convert to GB
                    used: (disk[0].used / (1024 * 1024 * 1024)).toFixed(2),
                    free: (disk[0].free / (1024 * 1024 * 1024)).toFixed(2),
                    usage: this.stats.disk
                },
                os: {
                    platform: os.platform,
                    distro: os.distro,
                    release: os.release,
                    kernel: os.kernel
                }
            };
        } catch (error) {
            console.error('Error getting detailed stats:', error);
            throw error;
        }
    }
}

module.exports = new SystemStats();