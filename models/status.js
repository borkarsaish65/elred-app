const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const StatusSchema = new Schema({
    createdBy:{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    attachmentType:{
        type:String,
        required:true
    },
    text:{
        type:String,
        required:false
    },
    storageLink:{
        type:String,
        required:false
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      text: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    }],

},{timestamps:true})


const Status = mongoose.model('Status',StatusSchema)


module.exports = Status;