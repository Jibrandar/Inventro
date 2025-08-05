const mysql = require("mysql2");
const dns = require("dns");

const { encrypt, hashLicenseKey, decrypt } = require("./utils/crypto");

const express = require("express");
const app = express();
const isDev = require("electron-is-dev");
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const methodOverride = require("method-override");
const { error } = require("console");
app.use(methodOverride("_method"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const config=require('./config.json');
const localStoreId=config.store_id;
const localStoreName=config.store_name;
const port = 8080;
const { app: electronApp, BrowserWindow, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const STORE_ID=config.store_id;
 const fs = require('fs');
 const { google } = require("googleapis");
const { exec } = require("child_process");

// --- Google Drive Backup Setup ---
const CREDENTIALS_PATH = isDev
  ? path.join(__dirname, "backup", "oauth_credentials.json")
  : path.join(process.resourcesPath, "backup", "oauth_credentials.json");
  // prod mod // Make sure this file exists
  const TOKEN_PATH = isDev
  ? path.join(__dirname, "backup", "token.json")
  : path.join(process.resourcesPath, "backup", "token.json");
const FOLDER_ID = "1SJl-dehHfghJsIiWFQVRHgYwOSTPt0RO"; // your backup folder
const DB_NAME = "inventra";
const DB_USER = "root"; // change if needed
const DB_PASSWORD = "Stu@7890"; 
// update if your db has password
function getDriveClient() {
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH));

  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  oAuth2Client.setCredentials(token);

  return google.drive({ version: "v3", auth: oAuth2Client });
}
function isOnline() {
  return new Promise((resolve) => {
    dns.lookup("google.com", (err) => {
      resolve(!err);
    });
  });
}

async function ensureStoreFolder(drive, parentFolderId, storeName) {
  // Check if the folder already exists
  const res = await drive.files.list({
    q: `'${parentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and name='${storeName}' and trashed = false`,
    fields: "files(id, name)",
  });

  if (res.data.files.length > 0) {
    return res.data.files[0].id;
  }

  // Create it if it doesn't exist
  const folder = await drive.files.create({
    requestBody: {
      name: storeName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    },
    fields: "id",
  });

  return folder.data.id;
}

async function backupDatabase(STORE_ID) {
  const drive = getDriveClient();
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  const backupFolder = path.join(electronApp.getPath('userData'), 'backups', STORE_ID);

  if (!fs.existsSync(backupFolder)) {
    fs.mkdirSync(backupFolder, { recursive: true });
  }

  const dumpFile = path.join(backupFolder, `backup-${timestamp}.sql`);
  const cmd = `mysqldump -u${DB_USER} ${DB_PASSWORD ? `-p${DB_PASSWORD}` : ""} ${DB_NAME} > "${dumpFile}"`;

  return new Promise((resolve, reject) => {
    exec(cmd, async (err) => {
      if (err) return reject("Backup failed: " + err);

      try {
        // Get or create the store-specific folder in Google Drive
        const storeFolderId = await ensureStoreFolder(drive, FOLDER_ID, STORE_ID);

        const response = await drive.files.create({
          requestBody: {
            name: `backup-${timestamp}.sql`,
            parents: [storeFolderId],
          },
          media: {
            mimeType: "application/sql",
            body: fs.createReadStream(dumpFile),
          },
        });

        fs.unlinkSync(dumpFile);
        resolve(response.data.id);
      } catch (uploadErr) {
        const queueFolder = path.join(electronApp.getPath('userData'), 'backup_queue', STORE_ID);
        if (!fs.existsSync(queueFolder)) {
          fs.mkdirSync(queueFolder, { recursive: true });
        }

        const queuedPath = path.join(queueFolder, path.basename(dumpFile));
        fs.renameSync(dumpFile, queuedPath);
        reject("Upload failed, saved to queue: " + uploadErr);
      }
    });
  });
}

async function processRetryQueue(STORE_ID) {
  const drive = getDriveClient();
  const queueDir = path.join(electronApp.getPath('userData'), 'backup_queue', STORE_ID);

  if (!fs.existsSync(queueDir)) return;

  const files = fs.readdirSync(queueDir);

  // Get or create the correct store folder in Drive
  const storeFolderId = await ensureStoreFolder(drive, FOLDER_ID, STORE_ID);

  for (const file of files) {
    const filePath = path.join(queueDir, file);
    try {
      const response = await drive.files.create({
        requestBody: {
          name: file,
          parents: [storeFolderId],
        },
        media: {
          mimeType: "application/sql",
          body: fs.createReadStream(filePath),
        },
      });

      fs.unlinkSync(filePath);
      console.log(`[✓] Uploaded from queue: ${file}`);
    } catch (err) {
      console.log(`[✗] Still failed: ${file}`);
    }
  }
}

function createWindow(loadURL) {
  const win = new BrowserWindow({
    show:false,
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  // Load your local Express app or main page
  
  win.loadURL(loadURL);
  win.once('ready-to-show', () => {
    win.maximize();
    win.show();
  });

  // Auto-update logic

  autoUpdater.on('update-available', () => {
    dialog.showMessageBox(win, {
      type: 'info',
      title: 'Update Available',
      message: 'A new update is available. It will be downloaded in the background.',
    });
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(win, {
      type: 'info',
      title: 'Install Update',
      message: 'Update downloaded. App will quit and install now.',
    }).then(() => {
      autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('Update error:', err);
    dialog.showMessageBox(win, {
      type: 'error',
      title: 'Update Error',
      message: `There was a problem checking for updates:\n\n${err.message}`,
    });
  });
}

function validateLicense() {
  const license_path = path.join(electronApp.getPath('userData'), 'license.json');

  // If file doesn't exist, return false
  if (!fs.existsSync(license_path)) {
    console.warn("license.json not found");
    return false;
  }

  try {
    const file_content = fs.readFileSync(license_path, 'utf-8').trim();

    if (!file_content) {
      console.warn("license.json is empty");
      return false;
    }

    const data = JSON.parse(file_content); // Safe now

    const is_active = decrypt(data.active) === "true";
    const expiry = new Date(decrypt(data.expiry));
    const today = new Date();

    if (!is_active || today > expiry) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Validation error:", error.message);
    return false;
  }
}

// App startup
electronApp.whenReady().then(async() => {
  const isValid=validateLicense();
  (async () => {
  if (await isOnline()) {
    try {
      await processRetryQueue(STORE_ID);
      console.log("✅ Retry queue processed successfully.");
    } catch (err) {
      console.log("⚠️ Error while processing retry queue:", err);
    }
  } else {
    console.log("📴 Offline — skipping retry queue.");
  }
})();

  if(isValid){
    createWindow('http://localhost:8080');
  }
  else{
    createWindow('http://localhost:8080/activate')
  }

  autoUpdater.checkForUpdatesAndNotify();
  

    electronApp.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const isValid = validateLicense();
      const url = isValid ? 'http://localhost:8080' : `file://${path.join(__dirname, 'views', 'activate.html')}`;
      createWindow(url);
    }
  });
});

// Quit when all windows are closed
electronApp.on('window-all-closed', () => {
  if (process.platform !== 'darwin') electronApp.quit();
});

// Create the connection to database
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  database: "inventra",
  password: "Stu@7890",
});

app.listen(port, () => {
  console.log("Server is working on port 8080");
});

app.get("/home", (req, res) => {
  res.send("Working");
});
app.get("/", (req, res) => {
  let q = "select count(*) AS Total from products ";
  let q2 = "select count(quantity) AS low_stock from products where quantity<?";
  let q3 = "select count(distinct category) AS total_categories from products ";
  let q4 =
    "select count(quantity) AS out_of_stock from products where quantity=?";
  let q5 = "select * from products ORDER BY created_at DESC LIMIT 5 ";
  let q6 =
    "select name,quantity from products where quantity<10 order by quantity ASC";
  let quantity = 10;
  let outstock = 0;

  connection.query(q, (error, result) => {
    if (error) {
      res.send("error in database");
    }
    let data = result[0].Total;

    connection.query(q2, [quantity], (error2, result2) => {
      if (error2) {
        res.send("error in db");
      }
      let lowqty = result2[0].low_stock;
      connection.query(q3, (error3, result3) => {
        if (error3) {
          res.send("error in db");
        }
        let tp = result3[0].total_categories;
        connection.query(q4, [outstock], (error4, result4) => {
          let ots = result4[0].out_of_stock;
          connection.query(q5, (error5, result5) => {
            if (error5) {
              res.send("error in db");
            }
            let products = result5;
            connection.query(q6, (error6, result6) => {
              let stock = result6;

              res.render("index.ejs", {
                data,
                lowqty,
                tp,
                ots,
                products,
                stock,
                localStoreName
              });
            });
          });
        });
      });
    });
  });
});

app.get("/list", (req, res) => {
  let name = req.query.q;
  let q;
  let values = [];
  if (name) {
    q = "select * from products where name like ?";
    values.push(`%${name}%`);
  } else {
    q = "select * from products";
  }
  connection.query(q, values, (error, result) => {
    let products = result;
    res.render("list.ejs", { products, name ,localStoreName});
  });
});

app.get("/add", (req, res) => {
  res.render("add.ejs");
});

app.post("/list", (req, res) => {
  let { name, category,company, quantity, price } = req.body;
  let id = uuidv4();
  let q =
    "insert into products(id,name,category,company,quantity,price) values (?,?,?,?,?,?)";
  connection.query(
    q,
    [id, name, category,company, quantity, price],
    async(error, result) => {
      res.redirect("/list");
      try {
      await backupDatabase(STORE_ID);
      console.log("✅ Backup created after product addition.");
    } catch (backupError) {
      console.error("❌ Backup failed after product addition:", backupError);
    }
      
    }
  );
});

app.get("/edit/:id", (req, res) => {
  let { id } = req.params; // removes colon if it exists

  let q = "select * from products where id =?";
  connection.query(q, id, (error, result) => {
    let product = result[0];
    res.render("edit.ejs", { product });
  });
});

app.patch("/edit/:id", (req, res) => {
  let { id } = req.params;
  let { name, price, quantity } = req.body;
  console.log(id);

  let q = "update products set name =? ,price=? ,quantity=? where id =?";
  connection.query(q, [name, price, quantity, id], async(error, result) => {
    res.redirect("/list");
    try {
      await backupDatabase(STORE_ID);
      console.log("✅ Backup created after product editing.");
    } catch (backupError) {
      console.error("❌ Backup failed after product editing:", backupError);
    }
  });
});
app.delete("/list/:id", (req, res) => {
  let { id } = req.params;
  let q = "delete from products where id=?";
  connection.query(q, [id], async(error, result) => {
    res.redirect("/list");
    try {
      await backupDatabase(STORE_ID);
      console.log("✅ Backup created after product deleting.");
    } catch (backupError) {
      console.error("❌ Backup failed after product deleting:", backupError);
    }
  });
});

app.get("/activate", (req, res) => {
  res.render("activate.ejs", { error: null });
});
app.post("/activate", (req, res) => {
  let { license_key } = req.body;
  const hashed = hashLicenseKey(license_key);

  // Validate input
  if (!license_key) {
    console.error("License key is missing in the request body.");
    return res.status(400).send("License key required");
  }

  const selectQuery = "SELECT * FROM licenses WHERE license_key = ?";
  connection.query(selectQuery, [hashed], (error, result) => {
    if (error) {
      console.error("Activation query error:", error);
      return res.status(500).send("Database error");
    }

    if (!result || result.length === 0) {
      console.warn("Invalid or expired license key:", hashed);
      return res.render('invalidkey.ejs');
    }

    const lic = result[0];
    const isused = decrypt(lic.is_used);
    const expiry = new Date(decrypt(lic.expiredate));
    const today = new Date();
    if (isused === "true" || expiry < today) {
      return res.render('error.ejs');
    }

    const updateQuery = "UPDATE licenses SET is_used = ? WHERE license_key = ?";
    connection.query(updateQuery, [encrypt("true"), hashed], (error2, result2) => {
      if (error2) {
        console.error("License update error:", error2);
        return res.status(500).send("Database error during update");
      }

      const licenseData = {
        key: encrypt(license_key),
        expiry: encrypt(expiry),
        active: encrypt("true"),
      };

      try {
        const userDataPath=electronApp.getPath('userData');
        const licenseFilePath=path.join(userDataPath,'license.json')
        fs.writeFileSync(
          licenseFilePath,
          JSON.stringify(licenseData, null, 2)
        );
      } catch (fileError) {
        console.error("Error writing license file:", fileError);
        return res.status(500).send("File write error");
      }

      console.log("License activated successfully:", license_key);
      return res.redirect("/");
    });
  });
});
app.get('/renew', (req, res) => {
  res.render('renew', { message: null });
});

app.post('/renew', (req, res) => {
  const renewalKey = req.body.renewalKey;

  let renewalData;
  try {
    renewalData = JSON.parse(decrypt(renewalKey));
  } catch (e) {
    return res.render('renew', { message: '❌ Invalid or tampered renewal key.' });
  }

  const { storeId: renewalStoreId, expiryDate } = renewalData;

  if (renewalStoreId !== localStoreId) {
    return res.render('renew', { message: '❌ Store ID mismatch.' });
  }

  const encryptedExpiry = encrypt(expiryDate);
  const encryptedIsUsed = encrypt('1');

  connection.query(
    `UPDATE licenses SET expiredate = ?, is_used = ? WHERE store_id = ?`,
    [encryptedExpiry, encryptedIsUsed, localStoreId],
    (err, result) => {
      if (err) {
        return res.render('renew', { message: '❌ DB error: ' + err.message });
      }
      if (result.affectedRows === 0) {
        return res.render('renew', { message: '⚠️ No matching license found.' });
      }
      return res.render('renew', { message: '✅ License renewed successfully!' });
    }
  );
});


//billing section

app.get("/billing", (req, res) => {
  const q = "SELECT * FROM products";
  connection.query(q, (err, products) => {
    res.render("billing.ejs", { products });
  });
});
app.post("/billing", (req, res) => {
  const { customer_name, address, mobile } = req.body;

  // Extract products from body
  const selectedProducts = [];
  const keys = Object.keys(req.body);

  keys.forEach((key) => {
    if (key.startsWith("product_")) {
      const id = key.split("_")[1];
      const qtyKey = `qty_${id}`;
      const qty = parseInt(req.body[qtyKey]);

      if (!isNaN(qty) && qty > 0) {
        // Now fetch product details from DB using ID
        selectedProducts.push({ id, qty });
      }
    }
  });

  if (selectedProducts.length === 0) {
    return res.send("No products selected");
  }

  // Now get actual product details from DB
  const placeholders = selectedProducts.map((p) => "?").join(",");
  const q = `SELECT * FROM products WHERE id IN (${placeholders})`;

  connection.query(
    q,
    selectedProducts.map((p) => p.id),
    (err, dbProducts) => {
      if (err) return res.send("DB error");

      const billId = uuidv4();
      let total = 0;

      const items = dbProducts.map((dbProduct) => {
        const input = selectedProducts.find((p) => p.id == dbProduct.id);
        const subtotal = dbProduct.price * input.qty;
        total += subtotal;

        return [billId, dbProduct.name, input.qty, dbProduct.price];
      });

      const billQuery =
        "INSERT INTO bills (id, customer_name, total ,address,mobile) VALUES (?, ?, ?,?,?)";
      const itemQuery =
        "INSERT INTO bill_items (bill_id, product_name, quantity, price) VALUES ?";
      const updateStockQuery =
        "UPDATE products SET quantity = quantity - ? WHERE id = ?";

      connection.query(
        billQuery,
        [billId, customer_name, total, address, mobile],
        (err1) => {
          if (err1) return res.send("DB error saving bill");

          connection.query(itemQuery, [items], async (err2) => {
            if (err2) return res.send("DB error saving items");

            let done = 0;
            selectedProducts.forEach((p) => {
              connection.query(updateStockQuery, [p.qty, p.id], async(err3) => {
                done++;
                if (done === selectedProducts.length) {
                  res.redirect(`/bill/${billId}`);
                   try {
      await backupDatabase(STORE_ID);
      console.log("✅ Backup created after bill saved.");
    } catch (backupError) {
      console.error("❌ Backup failed after bill saved:", backupError);
    }
                  
                }
              });
            });
          });
        }
      );
    }
  );
});

app.get("/bill/:id", (req, res) => {
  const { id } = req.params;
  const q1 = "SELECT * FROM bills WHERE id = ?";
  const q2 = "SELECT * FROM bill_items WHERE bill_id = ?";

  connection.query(q1, [id], (err1, result1) => {
    if (err1 || result1.length === 0) return res.send("Bill not found");
    const bill = result1[0];
    connection.query(q2, [id], (err2, items) => {
      if (err2) return res.send("Error fetching bill items");
      res.render("bill_view.ejs", { bill, items,localStoreName });
    });
  });
});
app.get("/bills", (req, res) => {
  const q = "SELECT * FROM bills ORDER BY date DESC";
  connection.query(q, (err, bills) => {
    res.render("bills.ejs", { bills });
  });
});
app.get("/search-bills", (req, res) => {
  const { name } = req.query;
  const q = "SELECT * FROM bills WHERE customer_name LIKE ?";
  connection.query(q, [`%${name}%`], (err, bills) => {
    res.render("bills.ejs", { bills });
  });
});

app.get("/bill/:id/edit", (req, res) => {
  const billId = req.params.id;
  const billQuery = "SELECT * FROM bills WHERE id = ?";
  const itemsQuery = "SELECT * FROM bill_items WHERE bill_id = ?";
  const allProductsQuery = "SELECT * FROM products";

  connection.query(billQuery, [billId], (err, billResults) => {
    if (err || billResults.length === 0) return res.send("Bill not found");
    const bill = billResults[0];

    connection.query(itemsQuery, [billId], (err, itemResults) => {
      if (err) return res.send("Error loading items");

      connection.query(allProductsQuery, (err, productResults) => {
        if (err) return res.send("Error loading products");

        // Build a lookup for already selected items
        const existingItems = {};
        itemResults.forEach((item) => {
          existingItems[item.product_name] = item;
        });

        res.render("edit-bill", {
          bill,
          products: productResults,
          existingItems,
        });
      });
    });
  });
});

app.put('/bill/:id', (req, res) => {
  const billId = req.params.id;
  const customerName = req.body.customer_name;
  const address = req.body.address;
  const mobile = req.body.mobile;
  const date = req.body.date;

  const selectedProducts = req.body.products || []; // array of product IDs (strings)
  const quantities = {}; // productId -> qty
  selectedProducts.forEach(pid => {
    quantities[pid] = parseInt(req.body[`qty_${pid}`]) || 0;
  });

  // Fetch old bill items to compare quantities
  const oldItemsQuery = 'SELECT * FROM bill_items WHERE bill_id = ?';

  connection.query(oldItemsQuery, [billId], (err, oldItems) => {
    if (err) return res.send('Error fetching old items');

    const oldQuantities = {}; // product_name -> qty
    oldItems.forEach(item => {
      oldQuantities[item.product_name] = item.quantity;
    });

    // Delete old bill_items
    const deleteQuery = 'DELETE FROM bill_items WHERE bill_id = ?';
    connection.query(deleteQuery, [billId], (err) => {
      if (err) return res.send('Error deleting old items');

      // Insert updated items and update stock
      const insertQuery = 'INSERT INTO bill_items (bill_id, product_name, quantity, price) VALUES (?, ?, ?, ?)';
      const inventoryUpdateTasks = [];
      let total = 0;

      selectedProducts.forEach(productId => {
        const qty = quantities[productId];

        // Get product name and price from DB
        inventoryUpdateTasks.push(new Promise((resolve, reject) => {
          connection.query('SELECT name, price FROM products WHERE id = ?', [productId], (err, results) => {
            if (err || results.length === 0) return reject(`Product "${productId}" not found`);
            const product = results[0];

            const oldQty = oldQuantities[product.name] || 0;
            const difference = qty - oldQty;

            // Update inventory stock
            const updateStockQuery = 'UPDATE products SET quantity = quantity - ? WHERE name = ?';
            connection.query(updateStockQuery, [difference, product.name], (err) => {
              if (err) return reject('Failed to update stock');

              // Insert updated bill_item
              connection.query(insertQuery, [billId, product.name, qty, product.price], (err) => {
                if (err) return reject('Failed to insert bill item');
                total += qty * product.price;
                resolve();
              });
            });
          });
        }));
      });

      Promise.all(inventoryUpdateTasks)
        .then(() => {
          // Update bill details
          const updateBillQuery = `
            UPDATE bills 
            SET customer_name = ?, address = ?, mobile = ?, date = ?, total = ? 
            WHERE id = ?
          `;
          connection.query(updateBillQuery, [customerName, address, mobile, date, total, billId], async (err) => {
            if (err) return res.send('Error updating bill');
            res.redirect(`/bill/${billId}`);
             try {
      await backupDatabase(STORE_ID);
      console.log("✅ Backup created after bill editing.");
    } catch (backupError) {
      console.error("❌ Backup failed after bill editing:", backupError);
    }
          });
        })
        .catch(errMsg => {
          console.error(errMsg);
          res.send(errMsg);
        });
    });
  });
});

app.delete('/bill/:id', (req, res) => {
  const billId = req.params.id;

  // First delete the related items
  const deleteItemsQuery = 'DELETE FROM bill_items WHERE bill_id = ?';
  connection.query(deleteItemsQuery, [billId], (err) => {
    if (err) {
      console.error('Error deleting bill items:', err);
      return res.send('Error deleting bill items');
    }

    // Then delete the bill itself
    const deleteBillQuery = 'DELETE FROM bills WHERE id = ?';
    connection.query(deleteBillQuery, [billId],async (err2) => {
      if (err2) {
        console.error('Error deleting bill:', err2);
        return res.send('Error deleting bill');
      }

      res.redirect('/bills');
       try {
      await backupDatabase(STORE_ID);
      console.log("✅ Backup created after deleting bills.");
    } catch (backupError) {
      console.error("❌ Backup failed after deleting bills:", backupError);
    } // or wherever your bill list page is
    });
  });
});

app.post("/retry-backups", async (req, res) => {
  try {
    await processRetryQueue(STORE_ID);

    dialog.showMessageBox({
      type: "info",
      title: "Backup Success",
      message: "✅ Retry backup completed successfully!",
    });

    res.redirect("http://localhost:8080/"); // or wherever you want
  } catch (err) {
    dialog.showErrorBox("Backup Failed", "❌ Retry backup failed. Check your connection.");
    res.redirect("back");
  }
});

