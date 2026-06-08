# Duitku - Aplikasi Keuangan Pribadi

Aplikasi pencatat keuangan pribadi dengan fitur transaksi harian dan portofolio investasi.

## Fitur
- Catat pemasukan & pengeluaran harian
- Portofolio saham, reksa dana, emas, kripto
- Dashboard ringkasan bulanan
- Data tersimpan di MongoDB Atlas (cloud)

## Cara Deploy ke Railway (Gratis)

### 1. Upload ke GitHub
1. Buka github.com → klik "New repository"
2. Nama repo: `keuangan-pribadi`
3. Klik "Create repository"
4. Ikuti instruksi "upload an existing file"

### 2. Deploy ke Railway
1. Buka railway.app → Sign up with GitHub
2. Klik "New Project" → "Deploy from GitHub repo"
3. Pilih repo `keuangan-pribadi`
4. Klik "Add Variables" dan tambahkan:
   - `MONGODB_URI` = connection string MongoDB Atlas kamu

### 3. Selesai!
Railway akan otomatis deploy dan memberi URL website kamu.
