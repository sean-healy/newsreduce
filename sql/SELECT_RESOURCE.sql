select
    r.*,
    h.throttle,
    h.name as hostname
from ResourceURL r
inner join Host h on h.id = r.host
where r.id = ?
