const dotenv = require('dotenv');

dotenv.config();

const express = require("express");
const multer = require('multer');
const app = express();
const port = process.env.PORT || 3001;
const userRouter = require('./router/user.router');
const feedRouter = require('./router/feed.router');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'files/'); 
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname)); // Generate a unique filename
    },
  });
  
  const upload = multer({
      storage: storage,
      fileFilter: (req, file, cb) => {
        const allowedMimeTypes = ['image/jpeg', 'image/png', 'video/mp4'];
    
        // Check if the file's MIME type is allowed
        if (allowedMimeTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new HttpException(400,{message:'Invalid file type. Only JPEG, PNG, and MP4 are allowed.'}));
        }

      }
  });

const errorMiddleware = require('./middleware/error.middleware');
const uri = `mongodb+srv://${process.env.mongoUsername}:${process.env.mongoPassword}@elredcluster.vpjvloy.mongodb.net/social_media?retryWrites=true&w=majority`;
const Users = require('./models/users');

const mongoose = require('mongoose');
const HttpException = require('./utility/HttpException.utils');

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/feed',upload.single('media'))

app.use('/users',userRouter);
app.use('/feed',feedRouter);


// 404 error
app.all('*', (req, res, next) => {

    console.log('Endpoint not found!')
    let err = new Error('Enpoint not found!');
    err.status = 404
    console.log(err)
    next(err);
});


// Error middleware
app.use(errorMiddleware);

mongoose.connect(uri).then((result)=>{
    console.log('connected to DB')
    app.listen(port, () =>{
        console.log(`App listening on port ${port}!`)
    });
    
}).catch((err)=>{
    console.log(err,'err')
})

