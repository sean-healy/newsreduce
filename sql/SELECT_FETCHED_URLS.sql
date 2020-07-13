select
    concat(if(`ssl`, "https://", "http://"), h.name, p.value, if(q.value, concat(char(63), q.value), ""))
from ResourceURL u
inner join FetchedResource f on f.resource = u.id
inner join ResourceURLPath p on p.id = u.path
inner join ResourceURLQuery q on q.id = u.query
inner join Host h on h.id = u.host
where f.modified >= ?
