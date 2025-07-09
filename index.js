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
          res.render('index.ejs',{data,lowqty,tp,ots});
          
        
          
        })
        
        
      })
      
      
      
    })
    
    })
   
})

