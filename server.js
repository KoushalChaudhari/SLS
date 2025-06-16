const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// === PostgreSQL ===
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// === ROUTES ===

// Serve HTML UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '/sls_quotation.html'));
});

app.get('/data-entry', (req, res) => {
  res.sendFile(path.join(__dirname, '/data_entry.html'));
});

// === Add Product with Optional Image ===
app.post('/product', upload.single('new_image'), async (req, res) => {
  const { name, price, category } = req.body;
  const image = req.file;

  if (!name || !price || !category) {
    return res.status(400).send('Missing required product fields.');
  }

  try {
    const result = await pool.query(
      'INSERT INTO products (name, price, category) VALUES ($1, $2, $3) RETURNING id',
      [name, price, category]
    );

    const newProductId = result.rows[0].id;

    if (image) {
      await pool.query(
        'INSERT INTO product_images (product_id, image_data, image_type) VALUES ($1, $2, $3)',
        [newProductId, image.buffer, image.mimetype]
      );
    }

    res.send(`Product added with ID ${newProductId}.`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error inserting product.');
  }
});

// === Upload or Update Image ===
app.post('/upload', upload.single('image'), async (req, res) => {
  const { product_id } = req.body;
  const file = req.file;

  if (!file) return res.status(400).send('No file uploaded.');

  try {
    await pool.query(
      'INSERT INTO product_images (product_id, image_data, image_type) VALUES ($1, $2, $3)',
      [product_id, file.buffer, file.mimetype]
    );
    res.send('Image uploaded and saved to database.');
  } catch (err) {
    console.error(err);
    res.status(500).send('Database error.');
  }
});

// === Serve Image by Product ID ===
app.get('/image/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).send('Invalid product ID.');

  try {
    const result = await pool.query(
      'SELECT image_data, image_type FROM product_images WHERE product_id = $1 LIMIT 1',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).send('Image not found.');

    res.set('Content-Type', result.rows[0].image_type);
    res.send(result.rows[0].image_data);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving image.');
  }
});

// === Fetch Product Info by ID ===
app.get('/product/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).send('Invalid product ID.');

  try {
    const result = await pool.query('SELECT * FROM product WHERE id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).send('Product not found.');
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error retrieving product info.');
  }
});

// === Fetch All Products ===
app.get('/api/products/all', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM product');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching products.');
  }
});

// === Fetch Product Info by Description ===
app.get('/api/product-info', async (req, res) => {
  const { desc } = req.query;
  try {
    const result = await pool.query('SELECT price, quantity FROM product WHERE name ILIKE $1 LIMIT 1', [`%${desc}%`]);
    if (result.rows.length === 0) return res.status(404).send('Not found');
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching product info.');
  }
});

// === Search by Name ===
app.get('/api/products/search', async (req, res) => {
  const { q } = req.query;
  try {
    const result = await pool.query('SELECT id, name FROM product WHERE name ILIKE $1 LIMIT 10', [`%${q}%`]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Search error.');
  }
});

// === Price by Machine Name ===
app.get('/api/price', async (req, res) => {
  const { machine } = req.query;
  try {
    const result = await pool.query('SELECT price FROM machine WHERE name ILIKE $1 LIMIT 1', [`%${machine}%`]);
    if (result.rows.length === 0) return res.status(404).send('Machine not found');
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Machine price lookup failed');
  }
});

// === Start Server ===
app.listen(port, () => {
  console.log(`🟢 Unified server running at http://localhost:${port}`);
});
