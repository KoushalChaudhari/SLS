const express = require('express');
const session = require('express-session');
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

// === PostgreSQL ===
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname,"public")));

app.use(session({
  secret: process.env.SessionSecret || 'default',     
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,               
    maxAge: 1000 * 60 * 60  
  }
}));

// Login endpoint

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await pool.query(
      "SELECT id, username FROM sales_person WHERE username = $1 AND password = $2",
      [username, password]
    );
    console.log("Login attempt:", username);

    if (result.rows.length > 0) {
      const user = result.rows[0];
      console.log('Login successful:', user.username);

      // Set session
      req.session.loggedIn = true;
      req.session.user = user.username;
      req.session.userId = user.id;

      // Send user info to client
      res.status(200).json({ id: user.id, username: user.username });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Server error" });
  }
});


app.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send("Logout failed");
    }
    res.clearCookie("connect.sid");
    res.sendStatus(200);
  });
});

function authMiddleware(req, res, next) {
  if (req.session.user) return next();
  res.redirect('/login.html');
}

// === Secure Pages ===
app.get('/', authMiddleware, (req, res) => {
  res.redirect('/quotation.html'); //home page
});

app.get('/quotation', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'quotation.html'));
});

app.get('/data', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'data_entry.html'));
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login.html');
  });
});

// === Add Product ===
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

// QUOTATIONS
app.post("/api/quotations", async (req, res) => {
  try {
    const salespersonId = req.session.userId; 
    console.log("Session salespersonId:", req.session.userId);
    if (!salespersonId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { clientName, companyName } = req.body;
    const dateStr = new Date().toISOString().split("T")[0].split("-").reverse().join("-");

    const prefix = `${dateStr}-${salespersonId}`;

    const result = await pool.query(
      `SELECT quotation_id FROM quotations WHERE salesperson_id = $1 AND quotation_id LIKE $2`,
      [salespersonId, `${prefix}-%`]
    );

    const existingIds = result.rows.map(row => row.quotation_id);
    let maxIndex = 0;

    existingIds.forEach(id => {
      const parts = id.split("-");
      const idx = parseInt(parts[parts.length - 1]);
      if (!isNaN(idx) && idx > maxIndex) maxIndex = idx;
    });

    const newIndex = String(maxIndex + 1).padStart(3, "0");
    const quotationId = `${prefix}-${newIndex}`;

    await pool.query(
      `INSERT INTO quotations (quotation_id, client_name, company_name, salesperson_id)
       VALUES ($1, $2, $3, $4)`,
      [quotationId, clientName, companyName, salespersonId]
    );

    res.json({ quotationId });

  } catch (err) {
    console.error("Error inserting quotation:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// === Image by Product ID ===
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

// === Fetch Product Info ===
app.get("/api/products/:id/image", async (req, res) => {
  const id = req.params.id;
  try {
    const result = await pool.query(
      "SELECT image_data, image_type FROM product_images WHERE product_id = $1",
      [id]
    );

    if (result.rows.length === 0 || !result.rows[0].image_data) {
      return res.status(404).send("Image not found");
    }

    const image = result.rows[0];
    res.setHeader("Content-Type", image.image_type || "image/jpeg");
    res.send(image.image_data);
  } catch (err) {
    console.error("Error fetching image:", err);
    res.status(500).send("Server error");
  }
});

// === Fetch All Products ===
app.get('/api/products/all', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products');
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
    const result = await pool.query('SELECT price FROM products WHERE name ILIKE $1 LIMIT 1', [`%${desc}%`]);
    if (result.rows.length === 0) return res.status(404).send('Not found');
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error fetching product info.');
  }
});

// === Search ===
app.get('/api/products/search', async (req, res) => {
  const { q } = req.query;
  try {
    const result = await pool.query(
      'SELECT id, name FROM products WHERE name ILIKE $1 LIMIT 10',
      [`%${q}%`]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Search error.');
  }
});

// === Start Server ===
app.listen(port, () => console.log(`Server running on http://localhost:${port}`));
