const express = require('express');
const router = express.Router();

const awaitHandlerFactory = require('../middleware/awaitHandlerFactory.middleware.js');

const feedController = require('../controller/feed.controller.js');
const authenticateToken = require('../middleware/auth.middleware.js');

//adding limiter to open routes to prevent abuse
router.post('/follow/:user_id',authenticateToken, awaitHandlerFactory(feedController.followUser))
router.get('/getFeed',authenticateToken,awaitHandlerFactory(feedController.getFeed))
router.post('/create',authenticateToken,awaitHandlerFactory(feedController.createStatus))
router.post('/action/comment/:status_id',authenticateToken,awaitHandlerFactory(feedController.commentAction))
router.post('/action/like/:status_id',authenticateToken,awaitHandlerFactory(feedController.likeAction))
router.get('/status/:status_id',authenticateToken,awaitHandlerFactory(feedController.viewStatus))

module.exports = router;