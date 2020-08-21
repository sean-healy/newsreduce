select distinct resource from (select distinct parent resource from ResourceLink union select distinct child resource from ResourceLink) u order by resource;
