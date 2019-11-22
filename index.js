//Set variables for packages
const express = require("express");
exphbs = require("express-handlebars");
const sqlite = require('sqlite');
const multer = require('multer');
const path = require('path');

const app = express();

app.engine("handlebars", exphbs());
app.set("view engine", "handlebars");
app.use(express.urlencoded());

//set Promise with database object
const dbPromise = sqlite.open("./data.sqlite");

//Storage system with Multer
const storage = multer.diskStorage({

    //Set where uploaded images are stored
    destination: './images/uploads/',

    //Callback file name into storage
    filename: function(req, file, cb){
      cb(null,file.fieldname + '-' + Date.now() + path.extname(file.originalname));
    }
});

//inital upload
const upload = multer({

    //Set storage to storage engine
    storage: storage,

    //Set file size limit
    limits:{fileSize: 1000000},

    //Check what files should be uploaded
    fileFilter: function(req, file, cb){
      checkFileType(file, cb);
    }

    //.single uploads one image at a time, use array for multiple image uploading
}).single('myImage');

//check for filetypes
function checkFileType(file, cb){

    //Allowed extentions
    const filetypes = /jpeg|jpg|png|gif/;

    //Check extentions of file
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    //Check mime
    //Mimetype is a standard that indicates the nature and format of a document, file, or assortment of bytes.
    //Browsers use the MIME type, not the file extension, to determine how to process a URL, so it's important that web servers send the correct MIME type in the response's 
    //Content-Type header. If this is not correctly configured, browsers are likely to misinterpret the contents of files and sites will not work correctly, 
    //and downloaded files may be mishandled.
    const mimetype = filetypes.test(file.mimetype);

    //If the mimetype test is positive and the extname is the same as the set allowed filetypes
    //Return callback true
    if(mimetype && extname){
      return cb(null,true);
    } else {
      cb('Error: Images Only!');
    }
}

app.get("/", async (req, res)=>{
    const db = await dbPromise;

    //Get images from table. db.all acts as an array
    const images = await db.all("SELECT * FROM images");
    console.log("images", images)

    //render images in index
    res.render("index", { images });
});

//Replace filepath in directory with defined filepath with dirname
app.get('/userimages/*', async (req, res) => {

    //Replace filepath with new filepath
    let filePath = req.path.replace("/userimages/", "")
    console.log("fp", filePath)
    res.sendFile(__dirname + "/images/uploads/" + filePath)
})

app.get('/imageUpload', (req,res)=>{
    res.render("imageUpload");
});

app.post('/imageUpload', async (req,res)=>{
    const db = await dbPromise;

    //Check for errors with image upload
    upload(req,res, async(err)=>{
        if(err){
            return res.render('index', {error:err})
        }
        if(req.file == undefined){
            return res.render('imageUpload', { error: 'Error: No File Selected!'});
            
        //else if there are no errors
        } else{
            //save filepath
            const fileName = req.file.filename;
            console.log("read fileName: " + fileName);

            //Delete Last File
            //Omit delete function to have multiple images displayed instead of one
            await db.run("DELETE FROM images");

            //insert filepath into database
            await db.run("INSERT INTO images (fileName) VALUES (?)",fileName);
            res.redirect('/');
        }
    });
});

const setup = async () =>{
    const db = await dbPromise;
    
    //Comment out to stop database reset
    db.migrate({force: "last"});

    app.listen(8080, () => console.log("listening on http://localhost:8080"));
};

setup();