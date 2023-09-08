/bin/bash

# TODO: Replace the HUBSPOT_TOKEN with your own token
export HUBSPOT_TOKEN=""

# This script will create a datetime field in HubSpot with the last login
curl --location 'https://api.hubapi.com/crm/v3/properties/contacts' \
--header 'Content-Type: application/json' \
--header "Authorization: Bearer $HUBSPOT_TOKEN" \
--data '{
    "name": "last_login",
    "label": "Last Login",
    "type": "datetime",
    "fieldType": "date",
    "groupName": "contactinformation",
    "hidden": false,
    "hasUniqueValue": false,
    "formField": false
}'