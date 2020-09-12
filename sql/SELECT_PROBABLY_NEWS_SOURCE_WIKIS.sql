select url from NewsSourceWiki nsw inner join URLView u on u.resource = nsw.resource inner join ResourceRank rr on rr.resource = nsw.resource order by rr.rank desc;
