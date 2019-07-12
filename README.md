# cronjobs_letters
scp -r /tmp/cronjobs_letters/ xxx@172.16.204.71://tmp
cp -r /tmp/cronjobs_letters/ /app/

node /app/cronjobs_letters/send_demands.js
node /app/cronjobs_letters/demand_status.js
node /app/cronjobs_letters/generate.js
node /app/cronjobs_letters/sms_monitor.js
node /app/cronjobs_letters/demandhis_monitor.js