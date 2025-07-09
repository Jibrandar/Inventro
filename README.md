# 📦 Malik Mobile Care - Product Inventory Dashboard

A simple and modern product inventory management app built using **Node.js**, **Express**, **MySQL**, and **EJS**.  
It allows you to track total products, low stock items, categories, and out-of-stock items with a clean dashboard UI.

---

## 🚀 Features

- 📊 Dashboard with:
  - Total number of products
  - Low stock items (less than 10)
  - Out-of-stock items
  - Total product categories
- 🧾 Create, update, and delete products
- 📂 Categorize products
- 💾 MySQL database integration
- 🖥️ Clean EJS-based front-end

---

## 📁 Folder Structure

project/
├── public/ # Static assets (CSS, images)
├── views/ # EJS templates
├── index.css # Dashboard styling
├── index.js # Main Express server
├── package.json # Dependencies
└── README.md # Project info

## 🛠 Tech Stack

- **Backend**: Node.js, Express.js
- **Frontend**: EJS
- **Database**: MySQL
- **Styling**: CSS

---

## ⚙️ Setup Instructions

1. **Clone the repo**
   
   git clone https://github.com/yourusername/product-inventory-app.git
   cd product-inventory-app
  
   Install dependencies
npm install
Setup MySQL Database

Create a database named products

Import your SQL schema or use your products table with:


CREATE TABLE products (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(100),
  category VARCHAR(100),
  quantity INT,
  price DECIMAL(10,2)
);
Configure DB in index.js


const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'your_password',
  database: 'products'
});
Start the server


node index.js

Visit
http://localhost:8080