const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
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
  jenis: { type: String, enum: ['saham', 'reksadana', 'emas', 'kripto', 'lainnya'] },
  lot: Number,
  hargaBeli: Number,
  hargaSkrg: Number,
  multiplier: { type: Number, default: 1 },
  tanggal: Date,
  updatedAt: Date,
}, { timestamps: true });

const Transaksi = mongoose.model('Transaksi', transaksiSchema);
const Aset = mongoose.model('Aset', asetSchema);

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

app.get('*', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server jalan di port ${PORT}`));
