const express = require('express');
const router = express.Router();
const chatController = require('../controller/chatController');
const authenticate = require('../middlewear/authMiddlewear');

router.use(authenticate);

router.post('/initiate', chatController.initiateChat);
router.get('/', chatController.getMyChats);
router.get('/:chatId/messages', chatController.getChatMessages);

module.exports = router;