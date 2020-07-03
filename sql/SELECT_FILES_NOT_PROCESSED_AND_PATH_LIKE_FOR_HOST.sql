select
	f.path as filePath,
	res.ssl,
	res.host,
	h.name as hostname,
	res.port,
	res.path as resPath,
	res.query
from
	Resource res
	inner join Host h on h.id = res.host
	inner join ResourceInstance inst on inst.resource = res.id
	inner join File f on f.id = inst.file
where
	not f.processed
	and res.path like $path
	and res.host = $host
