
// api/index.js
// Ini adalah Serverless Function yang akan dijalankan oleh Vercel
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// --- Mongoose Connection Cache untuk Serverless ---
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI tidak ditemukan di Environment Variables Vercel');
    }

    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

// Middleware untuk memastikan DB connect sebelum handle request
app.use(async (req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    console.error("Database connection error:", error);
    res.status(500).json({ error: "Gagal terhubung ke database" });
  }
});

// --- Schemas ---
const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: String,
  phoneNumber: String,
  paymentInfo: String,
  preferredObId: String,
  unitKerja: String
});

const ShopSchema = new mongoose.Schema({
  name: String,
  address: String,
  isOpen: Boolean
});

const MenuSchema = new mongoose.Schema({
  shopId: String,
  name: String,
  price: Number,
  description: String,
  category: String,
  isAvailable: { type: Boolean, default: true }
});

const OrderSchema = new mongoose.Schema({
  workerId: String,
  workerName: String,
  workerUnit: String,
  items: Array, 
  totalAmount: Number,
  status: String,
  timestamp: Number,
  notes: String,
  assignedObId: String,
  assignedObName: String
});

// Models
const User = mongoose.models.User || mongoose.model('User', UserSchema);
const Shop = mongoose.models.Shop || mongoose.model('Shop', ShopSchema);
const Menu = mongoose.models.Menu || mongoose.model('Menu', MenuSchema);
const Order = mongoose.models.Order || mongoose.model('Order', OrderSchema);

// --- Routes ---

app.get('/', (req, res) => {
  res.send('KantinKantor API is running on Vercel!');
});

// Users
app.get('/api/users', async (req, res) => {
  try {
    const { role } = req.query;
    const filter = role ? { role } : {};
    // Return only public fields
    const users = await User.find(filter, 'name email role phoneNumber paymentInfo unitKerja'); 
    res.json(users);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

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

app.put('/api/users/:id', async (req, res) => {
  try {
    const updatedUser = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedUser);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Shops
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

// Menus
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

// Orders
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

module.exports = app;
