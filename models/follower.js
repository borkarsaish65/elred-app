const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const followerSchema = new Schema({
    followee_id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      followed_by: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
      }

},{timestamps:true})


const followers = mongoose.model('followers',followerSchema)


module.exports = followers;