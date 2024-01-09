const Users = require("../models/users");
const Follower = require('../models/follower');
const HttpException = require("../utility/HttpException.utils");
const Status = require('../models/status');
const AWS = require('aws-sdk');
const fs = require('fs');

let s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});

//AWS.config.update({ region: 'us-east-2', signatureVersion: 'v4' });


AWS.config.update({ region: 'ap-south-1' });
s3 = new AWS.S3({ apiVersion: '2006-03-01' });
class FeedController {

    followUser = async (req, res, next) => {

        let {
            user_id
        } = req.params;

        let user = req.user;

        if (!user_id) {
            res.status(400).json({
                message: "user_id is required!"
            })
        }

        if (user.id == user_id) {
            res.status(400).json({
                message: "Cannot follow own's account"
            })
        }

        console.log(user_id,'<---user_id')
        let userFromDB = await Users.findOne({
            _id:user_id
        });

        if (!userFromDB) {
            throw new HttpException(404, {
                message: 'User not found!'
            });
        }

        let checkIfRecordAlreadyExists = await Follower.findOne({
            followee_id: userFromDB.id,
            followed_by: user.id
        })

        if (checkIfRecordAlreadyExists) {
            throw new HttpException(400, {
                message: 'User is already followed'
            });
        }

        const follower = new Follower({
            followee_id: userFromDB.id,
            followed_by: user.id
        })

        let result = await follower.save();

        if (result) {

            return res.status(200).json({
                status: 'successful!'
            })
        }

        throw new HttpException(400, {
            message: 'Something went wrong!'
        });

    }
    createStatus = async(req,res,next)=>{


        let {
            text
        } = req.body;

        let media = req.file;        

        let user = req.user;

        if (
            text && media
        ) {
            throw new HttpException(400, {
                message: 'App currently accepts only single attachment at a time.'
            })
        }

        let statusData = {
            createdBy:user.id
        }

        if(text){
            statusData.text = text
            statusData.attachmentType = 'text'
        }else
        if(media)
        {
            console.log(media,'media')

            let mimetype = media.mimetype;

            if(['image/png','image/jpeg'].includes(mimetype))
            {
                statusData.attachmentType = 'image'
            }
            else
            {
                statusData.attachmentType = 'video'
            }
        

         const fileContent = fs.readFileSync(media.path);
         const params = {
             Bucket: 'elredbucket',
             Key: media.filename,
             Body: fileContent
         };

         async function UploadFileToBucket(params){
            return new Promise((resolve,reject)=>{
                s3.upload(params, function (err, data) {
                    if (err) {
                        console.log(err, err.stack);
                        reject(0)
                    } else {
                        console.log('File uploaded successfully!')
                        resolve(1);
                    };
                });
            })
         }


        let fileUploadResult =  await UploadFileToBucket(params);

         if(fileUploadResult == 0)
         {
            throw new HttpException(400,'File Upload failed.')
         }

         statusData.storageLink = params.Key;

        }


        const status = new Status(statusData)

        let result = await status.save();

        if(result)
        {
            res.status(200).json({
                message:'post created successfully'
            })
        }



    }
    getFeed = async (req, res, next) => {

        let user = req.user;

        let listOfAllUsersFollowedByUser = await Follower.find({
            followed_by:user.id
        })

        let listOfAllUsersWhoFollowsUser = await Follower.find({
            followee_id:user.id
        })

        console.log(listOfAllUsersFollowedByUser)

        let followee_id_array = listOfAllUsersFollowedByUser.map((data)=>data.followee_id)

        let follower_id_array = listOfAllUsersWhoFollowsUser.map((data)=>data.followed_by)

        console.log([...follower_id_array,...followee_id_array].length,'**')

        let feed = await Status.find({ createdBy: { $in: [...follower_id_array,...followee_id_array] } })

        res.status(200).send({
            feed,
            length:feed.length
        })

    }
    viewStatus = async (req, res, next) => {

        let {status_id} = req.params;

        let user = req.user;

        let statusInfo = await Status.findById(status_id);

        console.log(statusInfo);
        let signedUrl = null;
        if(['image','video'].includes(statusInfo.attachmentType))
        {
            console.log(1111)
            const params = {
                Bucket: 'elredbucket',
                Key: statusInfo.storageLink,
                Expires: 60  * 5// URL expiration time in seconds
              };
            
              signedUrl = s3.getSignedUrl('getObject', params);

              console.log(signedUrl)
              statusInfo.url = signedUrl;

        }
        res.status(200).send({
            statusInfo,
            url:signedUrl
        })

    }
    likeAction = async (req, res, next) => {

        let {
            status_id
        } = req.params;

        let user = req.user;

        let statusData = await Status.findById(status_id);

          
        if(!statusData) {
            throw new HttpException(404,'Status not found!')
        }

        if (statusData.likes.includes(user.id)) {
            return res.status(400).json({ error: 'User has already liked the post' });
          }


        statusData.likes.push(user.id);

        // Save the updated statusData
        await statusData.save();
    
        res.json({ success: true, message: 'Post liked successfully' });

    }
    commentAction = async (req, res, next) => {

        let {
            status_id
        } = req.params;

        let {
            text
        } = req.body;

        let user = req.user;

        let statusData = await Status.findById(status_id);
        
        if(!statusData) {
            throw new HttpException(404,'Status not found!')
        }

        console.log(user,'<--')

        const newComment = {
            user: user.id,
            text: text,
            createdAt: new Date(),
          };
      
          console.log(newComment,'newComment')

          statusData.comments.push(newComment);

          await statusData.save();

          res.json({ success: true, message: 'Comment added successfully', comment: newComment });
 
    }
}

module.exports = new FeedController;