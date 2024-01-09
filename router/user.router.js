const express = require('express');
const router = express.Router();

const awaitHandlerFactory = require('../middleware/awaitHandlerFactory.middleware');

const userController = require('../controller/users.controller');

//adding limiter to open routes to prevent abuse
router.post('/sign-up',awaitHandlerFactory(userController.signUp))
router.post('/login',awaitHandlerFactory(userController.login))
router.get('/get-all-user', awaitHandlerFactory(userController.getAllUsers))

module.exports = router;