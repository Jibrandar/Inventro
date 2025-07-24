const mysql = require('mysql2');
const express=require('express');
const app=express();
const path=require('path');
const { v4: uuidv4 } = require('uuid');
const methodOverride = require('method-override');
const { error } = require('console');
app.use(methodOverride('_method'));
app.set('view engine','ejs');
app.set('views',path.join(__dirname,'views'));
app.use(express.static(path.join(__dirname,'public')));
app.use(express.urlencoded({extended:true}));
app.use(express.json());
const port=8080;
const { app: electronApp, BrowserWindow, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');

function createWindow() {
  const win = new BrowserWindow({
    width: 1000,
    height: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });

  win.loadURL('http://localhost:8080'); // Your Express app runs here

  // ✅ Now this is inside, and win is available
  autoUpdater.checkForUpdatesAndNotify();

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
  });
}

electronApp.whenReady().then(() => {
  createWindow();

  electronApp.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

electronApp.on('window-all-closed', () => {
  if (process.platform !== 'darwin') electronApp.quit();
});








// Create the connection to database
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  database: 'inventra',
  password:"Stu@7890"
});

app.listen(port,()=>{
    console.log("Server is working on port 8080");
})

app.get('/home',(req,res)=>{
  res.send('Working');
})
app.get('/',(req,res)=>{
  let q="select count(*) AS Total from products ";
  let q2="select count(quantity) AS low_stock from products where quantity<?";
  let q3="select count(distinct category) AS total_categories from products ";
  let q4="select count(quantity) AS out_of_stock from products where quantity=?";
  let q5="select * from products ORDER BY created_at DESC LIMIT 5 ";
  let q6="select name,quantity from products where quantity<10 order by quantity ASC";
  let quantity=10;
  let outstock=0;
  
    connection.query(q,(error,result)=>{
      if(error){
        res.send("error in database")
      }
      let data=result[0].Total;
      
      connection.query(q2,[quantity],(error2,result2)=>{
        if(error2){
          res.send("error in db");
        }
      let lowqty=result2[0].low_stock;
      connection.query(q3,(error3,result3)=>{
        if(error3){
          res.send("error in db");
        }
        let tp=result3[0].total_categories;
        connection.query(q4,[outstock],(error4,result4)=>{
          let ots=result4[0].out_of_stock;
          connection.query(q5,(error5,result5)=>{
            if(error5){
              res.send("error in db");
            }
            let products=result5;
            connection.query(q6,(error6,result6)=>{
              let stock=result6;
              
              res.render('index.ejs',{data,lowqty,tp,ots,products,stock});
            })
             })

        })
  })
       })
    
    })
   
})

app.get('/list',(req,res)=>{
  let name=req.query.q;
  let q;
  let values=[];
  if(name){
    q="select * from products where name like ?";
    values.push(`%${name}%`)
  }
  else{
    q="select * from products";
  }
  connection.query(q,values,(error,result)=>{
    let products=result;
    res.render("list.ejs",{products,name});
  })
})


app.get('/add',(req,res)=>{
    res.render('add.ejs');
})

app.post('/list',(req,res)=>{
  let{name,category,quantity,price}=req.body;
  let id=uuidv4();
  let q="insert into products(id,name,category,quantity,price) values (?,?,?,?,?)";
  connection.query(q,[id,name,category,quantity,price],(error,result)=>{
    res.redirect('/list');
  })
  

})

app.get('/edit/:id',(req,res)=>{
  let {id}= req.params // removes colon if it exists

  let q="select * from products where id =?";
connection.query(q,id,(error,result)=>{
  let product=result[0];
  res.render('edit.ejs',{product});
})


  

})

app.patch('/edit/:id',(req,res)=>{
  let {id}=req.params;
  let{name,price,quantity}=req.body;
  console.log(id);

  let q="update products set name =? ,price=? ,quantity=? where id =?";
  connection.query(q,[name,price,quantity,id],(error,result)=>{
    res.redirect('/list');

    
  });
  

})
app.delete('/list/:id',(req,res)=>{
  let{id}=req.params;
  let q="delete from products where id=?";
  connection.query(q,[id],(error,result)=>{
    res.redirect('/list');
    
    
    
  })
})

