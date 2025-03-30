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
- Node.js
- FFmpeg (untuk streaming)
- gdown (untuk download Google Drive)
- Koneksi internet yang stabil