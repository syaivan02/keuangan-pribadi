const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB terhubung!'))
  .catch(err => console.error('Gagal koneksi MongoDB:', err));

const transaksiSchema = new mongoose.Schema({
  type: { type: String, enum: ['in', 'out'], required: true },
  nama: { type: String, required: true },
  jumlah: { type: Number, required: true },
  kategori: String,
  tanggal: { type: Date, default: Date.now },
  catatan: String,
}, { timestamps: true });

const asetSchema = new mongoose.Schema({
  nama: { type: String, required: true },
  kode: String,
  jenis: { type: String, enum: ['saham', 'saham_us', 'reksadana', 'emas', 'kripto', 'valas', 'lainnya'] },
  lot: Number,
  hargaBeli: Number,
  hargaSkrg: Number,
  multiplier: { type: Number, default: 1 },
  tanggal: Date,
  updatedAt: Date,
}, { timestamps: true });

const Transaksi = mongoose.model('Transaksi', transaksiSchema);
const Aset = mongoose.model('Aset', asetSchema);

// =====================
// FUNGSI UPDATE HARGA
// =====================

async function getKursUSD() {
  try {
    const res = await fetch(`https://v6.exchangerate-api.com/v6/${process.env.EXCHANGERATE_API_KEY}/latest/USD`);
    const data = await res.json();
    return data.conversion_rates.IDR;
  } catch (e) {
    console.error('Gagal ambil kurs USD:', e);
    return null;
  }
}

async function getHargaSahamUS(ticker) {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`);
    const data = await res.json();
    return data.chart.result[0].meta.regularMarketPrice;
  } catch (e) {
    console.error(`Gagal ambil harga ${ticker}:`, e);
    return null;
  }
}

async function getHargaSahamIDX(ticker) {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${ticker}.JK?interval=1d&range=1d`);
    const data = await res.json();
    return data.chart.result[0].meta.regularMarketPrice;
  } catch (e) {
    console.error(`Gagal ambil harga ${ticker}:`, e);
    return null;
  }
}

async function getHargaEmas(kursUSD) {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/GC=F?interval=1d&range=1d`);
    const data = await res.json();
    const hargaPerOzUSD = data.chart.result[0].meta.regularMarketPrice;
    // Konversi: 1 troy oz = 31.1035 gram
    const hargaPerGramUSD = hargaPerOzUSD / 31.1035;
    return Math.round(hargaPerGramUSD * kursUSD);
  } catch (e) {
    console.error('Gagal ambil harga emas:', e);
    return null;
  }
}

async function updateSemuaHarga() {
  try {
    const asetList = await Aset.find();
    const kursUSD = await getKursUSD();
    const now = new Date();

    for (const aset of asetList) {
      let hargaBaru = null;

      if (aset.jenis === 'saham' && aset.kode) {
        hargaBaru = await getHargaSahamIDX(aset.kode);
      } else if (aset.jenis === 'saham_us' && aset.kode) {
        const hargaUSD = await getHargaSahamUS(aset.kode);
        if (hargaUSD && kursUSD) {
          hargaBaru = Math.round(hargaUSD * kursUSD);
        }
      } else if (aset.jenis === 'emas') {
        if (kursUSD) hargaBaru = await getHargaEmas(kursUSD);
      } else if (aset.jenis === 'valas' && aset.kode) {
        if (kursUSD) {
          // Hitung kurs mata uang valas ke IDR
          const resVal = await fetch(`https://v6.exchangerate-api.com/v6/${process.env.EXCHANGERATE_API_KEY}/latest/${aset.kode}`);
          const dataVal = await resVal.json();
          hargaBaru = Math.round(dataVal.conversion_rates.IDR);
        }
      }

      if (hargaBaru) {
        await Aset.findByIdAndUpdate(aset._id, { hargaSkrg: hargaBaru, updatedAt: now });
        console.log(`Updated ${aset.nama}: Rp ${hargaBaru}`);
      }
    }

    return { ok: true, updatedAt: now };
  } catch (e) {
    console.error('Error updateSemuaHarga:', e);
    return { ok: false, error: e.message };
  }
}

// =====================
// API ROUTES
// =====================

app.get('/api/transaksi', async (req, res) => {
  try {
    const { bulan, tahun } = req.query;
    let filter = {};
    if (bulan && tahun) {
      const start = new Date(tahun, bulan - 1, 1);
      const end = new Date(tahun, bulan, 1);
      filter.tanggal = { $gte: start, $lt: end };
    }
    const data = await Transaksi.find(filter).sort({ tanggal: -1 });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/transaksi', async (req, res) => {
  try {
    const tx = new Transaksi(req.body);
    await tx.save();
    res.json(tx);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/transaksi/:id', async (req, res) => {
  try {
    await Transaksi.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/aset', async (req, res) => {
  try {
    const data = await Aset.find().sort({ createdAt: -1 });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/aset', async (req, res) => {
  try {
    const aset = new Aset(req.body);
    await aset.save();
    res.json(aset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/aset/:id', async (req, res) => {
  try {
    const aset = await Aset.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(aset);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/aset/:id', async (req, res) => {
  try {
    await Aset.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ENDPOINT UPDATE HARGA OTOMATIS
app.get('/api/update-harga', async (req, res) => {
  const result = await updateSemuaHarga();
  res.json(result);
});

app.get('*', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server jalan di port ${PORT}`));
