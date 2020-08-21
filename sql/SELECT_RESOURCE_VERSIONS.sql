select u.url, v.time, filename
from ResourceVersion v
inner join VersionType t on t.id = v.type and t.modified < v.time
inner join URLView u on u.resource = v.resource
left outer join ResourceRank r on r.resource = v.resource
left outer join ResourceBinaryRelation b on b.resource = v.resource
group by v.resource, v.time, t.filename
order by if(isnull(b.resource), 0, 1) desc, r.`rank` desc, v.resource, v.time;
