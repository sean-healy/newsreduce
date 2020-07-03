select r.*
	from Resource r
	inner join Host h on h.id = r.host
	left join ResourceInstance inst on inst.resource = r.id
	left join Schedule s on s.resource = r.id and s.time > $now
	inner join ResourceLinksTable l on l.child = r.id
	inner join Resource lr on lr.id = l.parent
where
	h.name = 'en.wikipedia.org'
	and r.path like '/wiki/Category:%'
	and lr.path like '/wiki/Category:%'
	and s.resource is null
	and inst.resource is null
