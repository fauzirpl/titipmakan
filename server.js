// server.js - Backend untuk KantinKantor menggunakan MongoDB
// Jalankan dengan: node server.js
// Pastikan install dependencies: npm install express mongoose cors body-parser

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
// GANTI STRING KONEKSI DI BAWAH INI DENGAN MONGODB ANDA
const MONGODB_URI = '##'; 

mongoose.connect(MONGODB_URI)
  .then(() => console.log('Terhubung ke MongoDB'))
  .catch(err => console.error('Gagal terhubung ke MongoDB:', err));

// Schemas
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String, // Note: In production, hash this!
  role: String
});

const ShopSchema = new mongoose.Schema({
  name: String,
  isOpen: Boolean
});

const MenuSchema = new mongoose.Schema({
  shopId: String,
  name: String,
  price: Number,
  description: String,
  category: String
});

const OrderSchema = new mongoose.Schema({
  workerId: String,
  workerName: String,
  items: Array, // Array of objects
  totalAmount: Number,
  status: String,
  timestamp: Number,
  notes: String
});

const User = mongoose.model('User', UserSchema);
const Shop = mongoose.model('Shop', ShopSchema);
const Menu = mongoose.model('Menu', MenuSchema);
const Order = mongoose.model('Order', OrderSchema);

// Routes - Users
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/register', async (req, res) => {
  try {
    const newUser = new User(req.body);
    await newUser.save();
    res.json(newUser);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Routes - Shops
app.get('/api/shops', async (req, res) => {
  const shops = await Shop.find();
  res.json(shops);
});

app.post('/api/shops', async (req, res) => {
  const newShop = new Shop(req.body);
  await newShop.save();
  res.json(newShop);
});

app.put('/api/shops/:id', async (req, res) => {
  const updated = await Shop.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

app.delete('/api/shops/:id', async (req, res) => {
  await Shop.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// Routes - Menus
app.get('/api/menus', async (req, res) => {
  const menus = await Menu.find();
  res.json(menus);
});

app.post('/api/menus', async (req, res) => {
  const newMenu = new Menu(req.body);
  await newMenu.save();
  res.json(newMenu);
});

app.put('/api/menus/:id', async (req, res) => {
  const updated = await Menu.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

app.delete('/api/menus/:id', async (req, res) => {
  await Menu.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// Routes - Orders
app.get('/api/orders', async (req, res) => {
  const orders = await Order.find();
  res.json(orders);
});

app.post('/api/orders', async (req, res) => {
  const newOrder = new Order(req.body);
  await newOrder.save();
  res.json(newOrder);
});

app.put('/api/orders/:id', async (req, res) => {
  const updated = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(updated);
});

app.listen(PORT, () => {
  console.log(`Server berjalan di http://localhost:${PORT}`);
});
