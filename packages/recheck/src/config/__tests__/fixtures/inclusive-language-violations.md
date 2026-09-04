# Legacy system notes

The old replication setup used a master/slave configuration, and the slave
node has since been retired in favor of clearer terminology.

Never publish credentials to a public blacklist or add a partner domain to
a whitelist without a review from the security team.

The infrastructure diagram places every public-facing service inside a
DMZ, which the security team wants renamed to something clearer.

The submit button on the legacy form appears grayed-out until every
required field is valid, and the export button stays greyed-out until the
report finishes generating.

Ask the applicant whether he/she has already registered, or whether s/he
needs a new account created first.

Don't assume every reader is a normal person or a healthy person; write
for a broad audience instead.

Some customers are suffering from intermittent latency this week, and no
one on the support team should describe a customer as a victim of the
outage.

The onboarding guide once described a new hire as differently abled
without any further context, which the style review flagged.

A bug in the retry logic once left the export process crippled for
several hours before anyone noticed, and an earlier version of the code
could cripple the whole pipeline with a single bad request.

If a deployment goes wrong, don't nuke the entire cluster just to clear
the queue.
