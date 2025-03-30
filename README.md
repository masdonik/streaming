# Streaming Manager

Aplikasi untuk mengelola streaming video dan download dari Google Drive.

## Fitur
- Download video dari Google Drive
- Manajemen video (rename, delete)
- Live streaming ke berbagai platform
- Monitoring sistem (CPU, Memory, Disk usage)

## Persyaratan Sistem
- Node.js v14 atau lebih tinggi
- Python 3.x
- pip (Python package manager)
- gdown (untuk download Google Drive)
- PM2 (untuk process manager)

## Instalasi di VPS Ubuntu

### 1. Update Sistem
```bash
sudo apt update && sudo apt upgrade -y
```

### 2. Install Node.js
```bash
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs
```

### 3. Install Python dan pip
```bash
sudo apt install -y python3 python3-pip
```

### 4. Install gdown
```bash
pip3 install gdown
```

### 5. Install PM2
```bash
sudo npm install -g pm2
```

### 6. Clone Repository
```bash
git clone https://github.com/masdonik/streaming.git
cd streaming
```

### 7. Install Dependencies
```bash
npm install
```

### 8. Setup PM2 untuk Auto-start
```bash
# Start aplikasi dengan PM2
pm2 start index.js --name "streaming-app"

# Save PM2 configuration
pm2 save

# Setup PM2 untuk auto-start saat reboot
pm2 startup ubuntu
```

Copy dan jalankan command yang diberikan oleh PM2 setelah menjalankan `pm2 startup ubuntu`.

### 9. Konfigurasi Firewall (Opsional)
```bash
# Jika menggunakan UFW
sudo ufw allow 8000
sudo ufw enable
```

## Penggunaan
1. Akses aplikasi melalui browser: `http://YOUR_SERVER_IP:8000`
2. Untuk download video:
   - Buka tab "Download Video"
   - Masukkan URL Google Drive
   - Klik "Download Video"
3. Video yang didownload akan muncul di tabel "Downloaded Videos"

## Troubleshooting

### Jika aplikasi tidak berjalan setelah reboot:
```bash
# Check status PM2
pm2 status

# Jika tidak ada proses yang berjalan:
cd /path/to/streaming
pm2 start index.js --name "streaming-app"
pm2 save
```

### Jika gdown tidak ditemukan:
```bash
# Install gdown untuk user root
sudo -H pip3 install gdown

# Atau tambahkan path pip ke PATH
echo "export PATH=$PATH:$HOME/.local/bin" >> ~/.bashrc
source ~/.bashrc
```

### Check logs:
```bash
# Check aplikasi logs
pm2 logs streaming-app

# Check system logs
sudo journalctl -u pm2-root