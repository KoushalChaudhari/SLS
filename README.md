# 🧾 Quotation Generator

A fullstack web application for creating, managing, and exporting customer quotations for your oprganisation. This app allows dynamic product listing, live search with PostgreSQL integration, product image inclusion, and generates detailed PDF quotations with custom notes.

---

## 🚀 Features

- 🔐 Log in as a user and track all actions
- ✍️ Add, delete, and edit product rows
- 🔍 Live product search from database
- 📦 Automatic price, quantity, GST calculation
- 🖼️ Product image upload and embedding in PDF
- 📄 Custom notes and customization charges
- 🧾 PDF generation using jsPDF with full layout
- 📝 PDF is trackable through the database
- 🌓 Light/Dark mode toggle
- 🔄 Persistent theme with `localStorage`

---

## 🛠️ Tech Stack

| Layer       | Technology                      |
|-------------|----------------------------------|
| Frontend    | HTML, CSS, JavaScript            |
| PDF Export  | jsPDF + jsPDF AutoTable plugin   |
| Backend     | Node.js, Express                 |
| Database    | PostgreSQL                       |
| API         | RESTful endpoints                |

---

## 🗃️ Folder Structure
```
project/
├── public/
│ ├── quotation.html # Main frontend page
│ ├── script.js # Functionality for quotation.html
│ ├── data_entry.html # Manipulate Product Data
│ └── imgscript.js # FUnctionality for data_entry.html
├── server.js # Express server with DB routes
├── db.sql # Optional: SQL dump to setup DB
├── README.md # You are here!
└── .env # Environment variables (not committed)
```

---

## 🔧 Setup Instructions (Local)

### 1. Clone the Repository
```
git clone https://github.com/KoushalChaudhari/sls-quotation.git
cd sls-quotation
```

### 2. Install Depndencies
```
npm install express pg cors dotenv multer express-session
```

### 3. PostgreSQL Setup
- Ensure PostgreSQL is running.
- Create a Database
- restore database:
```
  psql -U postgres -d quotation_db -f db.sql
```

### /. Example Database Structure
- Schema:
  - products [id, name, price, category]
  - product_images [id, product_id (Foreing reference to the `products` table), image_data _{BLOB}_, image_type]
  - quotations [id, quotation_id, client_name, company_name, salesperson_id, created at _{timestamp without timezones}_]
  - sales_person []id, name, email, contact_no, role, username, password]

### 4. Configure Environment (.env)
```
PORT=3000
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=quotation_db
SessionSecret=SessionSecretKey
```

### 5. Start the server
```
node server.js
```

### 6. Access Frontend
```
http://localhost:PORT
```


