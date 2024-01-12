const Users = require("../models/users");
const Follower = require('../models/follower');
const HttpException = require("../utility/HttpException.utils");
const Status = require('../models/status');
const AWS = require('aws-sdk');
const fs = require('fs');
const { default: mongoose } = require("mongoose");
const { isValidObjectId } = require("./helper/helper");

let s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
});


async function validateUserAction(user,statusData)
{

    let postCreatedBy = statusData.createdBy.toString();

    if(postCreatedBy == user.id)
    {
        return;
    }

    let listOfAllUsersFollowedByUserRelation = await Follower.find({
        followed_by:postCreatedBy
    })

    let listOfAllUsersWhoFollowsUserRelation = await Follower.find({
        followee_id:postCreatedBy
    })

    let listOfAllUsersFollowedByUserIds = listOfAllUsersFollowedByUserRelation.map((relation)=>relation.followee_id.toString())

    let listOfAllUsersWhoFollowsUserIds = listOfAllUsersWhoFollowsUserRelation.map((relation)=>relation.followed_by.toString())

    if (!listOfAllUsersFollowedByUserIds.includes(user.id) &&
        !listOfAllUsersWhoFollowsUserIds.includes(user.id) 
    ) {
        throw new HttpException(403,{message:"Access restricted: Interaction is limited to users you follow or who follow you"})
    }

}

function deleteFile(filePath){

    fs.unlink(filePath, (err) => {
        if (err) {
          console.error(`Error deleting file: ${err}`);
        } else {
          console.log(`File ${filePath} has been deleted successfully.`);
        }
      });
}

function validateFileSize(file,mediaType){

const imageMaxSize = 3145728;
const videoMaxSize = 10485760;

console.log(file,mediaType)

if(mediaType == 'image')
{

    if(file.size > imageMaxSize)
    {
        return 0
    }
}else if(mediaType == 'video')
{
    console.log(file.size,videoMaxSize)
    if(file.size > videoMaxSize)
    {
        return 0
    }
}

return 1;
}
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

        let isValidId = isValidObjectId(user_id);

        if(!isValidId){
            throw new HttpException(400, {
                message: 'This is not a valid user_id'
            });
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


        if(!text && !media){
            throw new HttpException(404, {
                message: 'Atleast either text or media field is required.'
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
                let validationResult = validateFileSize(media,'image')

                if(validationResult == 0)
                {   deleteFile(media.path);
                    throw new HttpException(400, {
                        message: 'Image file must be less than 3 MB'
                    })
                }

            }
            else
            {
                statusData.attachmentType = 'video'
                let validationResult = validateFileSize(media,'video')

                console.log(validationResult,'validationResult')
                if(validationResult == 0)
                {
                    deleteFile(media.path);
                    throw new HttpException(400, {
                        message: 'video file must be less than 10 MB'
                    })
                }
            }
        
         const fileContent = fs.readFileSync(media.path);
         const params = {
             Bucket: process.env.AWS_BUCKET,
             Key: media.filename,
             Body: fileContent
         };

        let fileUploadResult =  await UploadFileToBucket(params);

         deleteFile(media.path);

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

        const validObjectId = mongoose.Types.ObjectId.isValid(status_id);

        if (!validObjectId)  {
            throw new HttpException(404,{message:'Invalid ObjectId format'}) 
        }

        let user = req.user;

        let statusInfo = await Status.findById(status_id);

        if(!statusInfo)
        {
            throw new HttpException(404,'Status not found!') 
        }

        console.log(statusInfo,"<----")
        await validateUserAction(user,statusInfo)

        let signedUrl = null;
        if(['image','video'].includes(statusInfo.attachmentType))
        {
            console.log(1111)
            const params = {
                Bucket: process.env.AWS_BUCKET,
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

        let isValidId = isValidObjectId(status_id);

        if(!isValidId){
            throw new HttpException(400, {
                message: 'This is not a valid status_id'
            });
        }
        
        let statusData = await Status.findById(status_id);
    
        console.log(statusData,'statusData<---')

        if(!statusData) {
            throw new HttpException(404,'Status not found!')
        }

        await validateUserAction(user,statusData)

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


        if(!text){
            throw new HttpException(400,'text field is required!')
        }

        if(text.length > 300)
        {
            throw new HttpException(400,'text length cannot be more than 300 characters!')
       
        }

        let user = req.user;

        let isValidId = isValidObjectId(status_id);

        if(!isValidId){
            throw new HttpException(400, {
                message: 'This is not a valid status_id'
            });
        }

        let statusData = await Status.findById(status_id);
        
        if(!statusData) {
            throw new HttpException(404,'Status not found!')
        }

        

        console.log(user,'<--')

        await validateUserAction(user,statusData)
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