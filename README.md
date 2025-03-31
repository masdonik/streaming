# Streaming Manager

Aplikasi untuk mengelola streaming video dan download dari Google Drive.

## Fitur
- Download video dari Google Drive
- Manajemen video (rename, delete)
- Live streaming ke platform sosial media
- Monitoring penggunaan sistem (CPU, Memory, Disk)

## Pembaruan Terbaru
### Peningkatan Penanganan Error (Error Handling)
- Validasi URL Google Drive yang lebih baik
- Pesan error yang lebih jelas dan informatif
- Penanganan berbagai skenario error:
  - URL yang tidak valid
  - URL yang bukan dari Google Drive
  - File Google Drive yang tidak dapat diakses
  - Error jaringan dan server
- Status code error yang sesuai (400 untuk error validasi, 500 untuk error server)
- Pembersihan otomatis field input saat beralih tab
- Tampilan error yang lebih user-friendly

## Instalasi di Server

### 1. Persiapan Server
```bash
# Update sistem
sudo apt update && sudo apt upgrade -y

# Install curl
sudo apt install -y curl
```

### 2. Install Node.js
```bash
# Install Node.js 16.x
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

# Verifikasi instalasi
node --version
npm --version
```

### 3. Install Python dan pip
```bash
# Install Python3 dan pip
sudo apt install -y python3 python3-pip

# Verifikasi instalasi
python3 --version
pip3 --version
```

### 4. Install gdown
```bash
# Install gdown untuk download Google Drive
pip3 install gdown

# Jika gdown tidak ditemukan setelah instalasi:
echo "export PATH=$PATH:$HOME/.local/bin" >> ~/.bashrc
source ~/.bashrc
```

### 5. Install PM2
```bash
# Install PM2 secara global
sudo npm install -g pm2

# Verifikasi instalasi
pm2 --version
```

### 6. Clone dan Setup Aplikasi
```bash
# Clone repository
git clone https://github.com/masdonik/streaming.git
cd streaming

# Install dependencies
npm install

# Buat folder untuk video
mkdir -p videos
```

### 7. Konfigurasi PM2
```bash
# Start aplikasi dengan PM2
pm2 start index.js --name "streaming-app"

# Save konfigurasi PM2
pm2 save

# Setup auto-start saat reboot
pm2 startup ubuntu
```

### 8. Konfigurasi Firewall
```bash
# Allow port 8000
sudo ufw allow 8000
sudo ufw enable
```

### 9. Verifikasi Instalasi
- Akses aplikasi melalui browser: `http://YOUR_SERVER_IP:8000`
- Cek status PM2: `pm2 status`
- Cek logs: `pm2 logs streaming-app`

## Troubleshooting

### Error: gdown not found
```bash
# Install gdown untuk user root
sudo -H pip3 install gdown

# Atau tambahkan path pip ke PATH
echo "export PATH=$PATH:$HOME/.local/bin" >> ~/.bashrc
source ~/.bashrc
```

### Error: Permission denied
```bash
# Berikan permission ke folder videos
sudo chown -R $USER:$USER videos/
chmod 755 videos/
```

### Error: PM2 tidak start setelah reboot
```bash
# Check status PM2
pm2 status

# Restart jika diperlukan
cd /path/to/streaming
pm2 start index.js --name "streaming-app"
pm2 save
```

## Cara Penggunaan
### Download Video dari Google Drive
1. Buka tab "Download Video"
2. Masukkan URL Google Drive yang valid
   - Format yang didukung: /file/d/ID, ?id=ID, atau /d/ID
   - File harus diatur dengan akses "Anyone with the link"
3. (Opsional) Masukkan nama file kustom
4. Klik tombol "Download Video"

### Manajemen Video
- Rename: Klik ikon edit pada video yang ingin diubah namanya
- Delete: Klik ikon hapus untuk menghapus video
- Download: Video yang sudah didownload dapat diakses melalui daftar video

### Live Streaming
1. Pilih platform streaming (Facebook)
2. Masukkan stream key
3. (Opsional) Atur jadwal dan durasi
4. Mulai streaming

## Penanganan Error
- URL tidak valid: Sistem akan menampilkan pesan error yang menjelaskan format URL yang benar
- File tidak dapat diakses: Pesan error akan menginstruksikan untuk mengubah pengaturan sharing file
- Error server: Sistem akan menampilkan pesan yang informatif tentang masalah yang terjadi
- Error jaringan: Pengguna akan diberitahu jika terjadi masalah koneksi

## Persyaratan Sistem
- Node.js v16 atau lebih tinggi
- Python 3.x dan pip
- gdown (untuk download Google Drive)
- PM2 (untuk process manager)
- Koneksi internet yang stabil