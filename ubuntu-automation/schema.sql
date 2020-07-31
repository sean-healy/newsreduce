-- MySQL dump 10.13  Distrib 8.0.20, for Linux (x86_64)
--
-- Host: localhost    Database: newsreduce
-- ------------------------------------------------------
-- Server version	8.0.20-0ubuntu0.20.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `Anchor`
--

DROP TABLE IF EXISTS `Anchor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Anchor` (
  `id` decimal(30,0) NOT NULL,
  `value` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Client`
--

DROP TABLE IF EXISTS `Client`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Client` (
  `id` decimal(30,0) NOT NULL,
  `name` varchar(32) NOT NULL,
  `httpVersion` varchar(5) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ClientCookie`
--

DROP TABLE IF EXISTS `ClientCookie`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ClientCookie` (
  `client` decimal(30,0) NOT NULL,
  `host` decimal(30,0) NOT NULL,
  `value` text,
  PRIMARY KEY (`host`,`client`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ClientHeader`
--

DROP TABLE IF EXISTS `ClientHeader`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ClientHeader` (
  `client` decimal(30,0) NOT NULL,
  `header` decimal(30,0) NOT NULL,
  PRIMARY KEY (`client`,`header`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `HTMLAttribute`
--

DROP TABLE IF EXISTS `HTMLAttribute`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `HTMLAttribute` (
  `id` decimal(30,0) NOT NULL,
  `name` decimal(30,0) DEFAULT NULL,
  `value` decimal(30,0) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `name` (`name`),
  KEY `value` (`value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `HTMLAttributeName`
--

DROP TABLE IF EXISTS `HTMLAttributeName`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `HTMLAttributeName` (
  `id` decimal(30,0) NOT NULL,
  `value` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `HTMLAttributeValue`
--

DROP TABLE IF EXISTS `HTMLAttributeValue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `HTMLAttributeValue` (
  `id` decimal(30,0) NOT NULL,
  `value` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `HTMLNode`
--

DROP TABLE IF EXISTS `HTMLNode`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `HTMLNode` (
  `id` decimal(30,0) NOT NULL,
  `tag` decimal(30,0) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `name` (`tag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `HTMLNodeAttribute`
--

DROP TABLE IF EXISTS `HTMLNodeAttribute`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `HTMLNodeAttribute` (
  `node` decimal(30,0) NOT NULL,
  `attribute` decimal(30,0) NOT NULL,
  PRIMARY KEY (`node`,`attribute`),
  KEY `tag` (`node`),
  KEY `attribute` (`attribute`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `HTMLTag`
--

DROP TABLE IF EXISTS `HTMLTag`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `HTMLTag` (
  `id` decimal(30,0) NOT NULL,
  `value` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `HTTPHeader`
--

DROP TABLE IF EXISTS `HTTPHeader`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `HTTPHeader` (
  `id` decimal(30,0) NOT NULL,
  `name` decimal(30,0) NOT NULL,
  `value` decimal(30,0) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `name` (`name`),
  KEY `value` (`value`),
  KEY `name_2` (`name`),
  KEY `value_2` (`value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `HTTPHeaderName`
--

DROP TABLE IF EXISTS `HTTPHeaderName`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `HTTPHeaderName` (
  `id` decimal(30,0) NOT NULL,
  `value` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `HTTPHeaderValue`
--

DROP TABLE IF EXISTS `HTTPHeaderValue`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `HTTPHeaderValue` (
  `id` decimal(30,0) NOT NULL,
  `value` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Host`
--

DROP TABLE IF EXISTS `Host`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Host` (
  `id` decimal(30,0) NOT NULL,
  `name` text NOT NULL,
  `throttle` smallint unsigned NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `NewsSourceWiki`
--

DROP TABLE IF EXISTS `NewsSourceWiki`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `NewsSourceWiki` (
  `resource` decimal(30,0) NOT NULL,
  PRIMARY KEY (`resource`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ResourceHTMLHead`
--

DROP TABLE IF EXISTS `ResourceHTMLHead`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ResourceHTMLHead` (
  `resource` decimal(30,0) NOT NULL,
  `node` decimal(30,0) NOT NULL,
  PRIMARY KEY (`resource`,`node`),
  KEY `resource` (`resource`),
  KEY `node` (`node`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ResourceHash`
--

DROP TABLE IF EXISTS `ResourceHash`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ResourceHash` (
  `id` decimal(30,0) NOT NULL,
  `value` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ResourceHeader`
--

DROP TABLE IF EXISTS `ResourceHeader`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ResourceHeader` (
  `resource` decimal(30,0) NOT NULL,
  `header` decimal(30,0) NOT NULL,
  PRIMARY KEY (`resource`,`header`),
  KEY `resource` (`resource`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ResourceLink`
--

DROP TABLE IF EXISTS `ResourceLink`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ResourceLink` (
  `parent` decimal(30,0) NOT NULL,
  `child` decimal(30,0) NOT NULL,
  `value` decimal(30,0) NOT NULL,
  PRIMARY KEY (`parent`,`child`),
  KEY `child` (`child`),
  KEY `parent` (`parent`),
  KEY `value` (`value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ResourceLinkHash`
--

DROP TABLE IF EXISTS `ResourceLinkHash`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ResourceLinkHash` (
  `parent` decimal(30,0) NOT NULL,
  `child` decimal(30,0) NOT NULL,
  `hash` decimal(30,0) NOT NULL,
  PRIMARY KEY (`parent`,`child`,`hash`),
  KEY `parent` (`parent`),
  KEY `child` (`child`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `ResourceSearch`
--

DROP TABLE IF EXISTS `ResourceSearch`;
/*!50001 DROP VIEW IF EXISTS `ResourceSearch`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `ResourceSearch` AS SELECT 
 1 AS `id`,
 1 AS `title`,
 1 AS `ssl`,
 1 AS `host`,
 1 AS `port`,
 1 AS `path`,
 1 AS `query`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `ResourceThrottle`
--

DROP TABLE IF EXISTS `ResourceThrottle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ResourceThrottle` (
  `resource` decimal(30,0) NOT NULL,
  `throttle` int unsigned NOT NULL,
  PRIMARY KEY (`resource`),
  KEY `throttle` (`throttle`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ResourceTitle`
--

DROP TABLE IF EXISTS `ResourceTitle`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ResourceTitle` (
  `resource` decimal(30,0) NOT NULL,
  `title` decimal(30,0) NOT NULL,
  PRIMARY KEY (`resource`,`title`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ResourceURL`
--

DROP TABLE IF EXISTS `ResourceURL`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ResourceURL` (
  `id` decimal(30,0) NOT NULL,
  `ssl` tinyint(1) NOT NULL,
  `host` decimal(30,0) NOT NULL,
  `port` smallint unsigned NOT NULL,
  `path` decimal(30,0) NOT NULL,
  `query` decimal(30,0) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `host` (`host`),
  KEY `path_i` (`path`),
  KEY `query` (`query`),
  KEY `port` (`port`),
  KEY `ssl` (`ssl`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ResourceURLPath`
--

DROP TABLE IF EXISTS `ResourceURLPath`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ResourceURLPath` (
  `id` decimal(30,0) NOT NULL,
  `value` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ResourceURLQuery`
--

DROP TABLE IF EXISTS `ResourceURLQuery`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ResourceURLQuery` (
  `id` decimal(30,0) NOT NULL,
  `value` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ResourceVersion`
--

DROP TABLE IF EXISTS `ResourceVersion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ResourceVersion` (
  `resource` decimal(30,0) NOT NULL,
  `time` bigint unsigned NOT NULL,
  `type` decimal(30,0) NOT NULL,
  `length` mediumint unsigned NOT NULL,
  PRIMARY KEY (`resource`,`time`,`type`),
  KEY `resource` (`resource`),
  KEY `time` (`time`),
  KEY `type` (`type`),
  KEY `length` (`length`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `ResourceVersionType`
--

DROP TABLE IF EXISTS `ResourceVersionType`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ResourceVersionType` (
  `id` decimal(30,0) NOT NULL,
  `filename` varchar(32) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Title`
--

DROP TABLE IF EXISTS `Title`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Title` (
  `id` decimal(30,0) NOT NULL,
  `value` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Temporary view structure for view `URLView`
--

DROP TABLE IF EXISTS `URLView`;
/*!50001 DROP VIEW IF EXISTS `URLView`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `URLView` AS SELECT 
 1 AS `resource`,
 1 AS `url`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `Vector`
--

DROP TABLE IF EXISTS `Vector`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Vector` (
  `id` decimal(30,0) NOT NULL,
  `value` blob NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `WikiCategory`
--

DROP TABLE IF EXISTS `WikiCategory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `WikiCategory` (
  `parent` decimal(30,0) NOT NULL,
  `child` decimal(30,0) NOT NULL,
  PRIMARY KEY (`parent`,`child`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `WikiPage`
--

DROP TABLE IF EXISTS `WikiPage`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `WikiPage` (
  `resource` decimal(30,0) NOT NULL,
  PRIMARY KEY (`resource`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Word`
--

DROP TABLE IF EXISTS `Word`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Word` (
  `id` decimal(30,0) NOT NULL,
  `value` text NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `WordVector`
--

DROP TABLE IF EXISTS `WordVector`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `WordVector` (
  `word` decimal(30,0) NOT NULL,
  `source` decimal(30,0) NOT NULL,
  `vector` decimal(30,0) NOT NULL,
  PRIMARY KEY (`word`,`source`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `WordVectorSource`
--

DROP TABLE IF EXISTS `WordVectorSource`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `WordVectorSource` (
  `resource` decimal(30,0) NOT NULL,
  `label` varchar(32) DEFAULT NULL,
  PRIMARY KEY (`resource`),
  UNIQUE KEY `label` (`label`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Final view structure for view `ResourceSearch`
--

/*!50001 DROP VIEW IF EXISTS `ResourceSearch`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`newsreduce`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `ResourceSearch` AS select `r`.`id` AS `id`,`t`.`value` AS `title`,`r`.`ssl` AS `ssl`,`h`.`name` AS `host`,`r`.`port` AS `port`,`p`.`value` AS `path`,`q`.`value` AS `query` from (((((`ResourceURL` `r` join `Host` `h` on((`h`.`id` = `r`.`host`))) join `ResourceURLPath` `p` on((`p`.`id` = `r`.`path`))) join `ResourceURLQuery` `q` on((`q`.`id` = `r`.`query`))) left join `ResourceTitle` `rt` on((`rt`.`resource` = `r`.`id`))) left join `Title` `t` on((`t`.`id` = `rt`.`title`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `URLView`
--

/*!50001 DROP VIEW IF EXISTS `URLView`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`newsreduce`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `URLView` AS select `u`.`id` AS `resource`,concat(if(`u`.`ssl`,'https://','http://'),`h`.`name`,if(if(`u`.`ssl`,(`u`.`port` = 443),(`u`.`port` = 80)),'',concat(':',`u`.`port`)),`p`.`value`,if(`q`.`value`,'?',''),`q`.`value`) AS `url` from (((`ResourceURL` `u` join `Host` `h` on((`h`.`id` = `u`.`host`))) join `ResourceURLPath` `p` on((`p`.`id` = `u`.`path`))) join `ResourceURLQuery` `q` on((`q`.`id` = `u`.`query`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2020-07-31 16:14:13
