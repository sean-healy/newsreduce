select
    min(priority) as priority,
    r.*,
    h.throttle,
    h.name as hostname
from Schedule s
inner join ResourceURL r on r.id = s.resource
inner join Host h on h.id = r.host
group by r.host;
