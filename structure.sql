CREATE TABLE IF NOT EXISTS `users`(
  `chatID` int(11) NOT NULL,
  `username` varchar(60) DEFAULT NULL,
  `authToken`varchar(500) DEFAULT NULL,
  `state` varchar(32) DEFAULT NULL,
  `mail` varchar(100) DEFAULT NULL,
  `tx` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`chatID`)
)ENGINE=InnoDB DEFAULT CHARSET=utf8;
