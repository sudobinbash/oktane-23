const axios = require("axios");

/**
* Creates or updates a HubSpot contact with the identity information.
*
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
*/
exports.onExecutePostLogin = async (event, api) => {
  const url = `https://api.hubapi.com/contacts/v1/contact/createOrUpdate/email/${event.user.email}/`;
  const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${event.secrets.HUBSPOT_BEARER}`
  };

  const data = {
    properties: [
      { property: 'firstname', value: event.user.given_name },
      { property: 'lastname', value: event.user.family_name },
      { property: 'phone', value: event.user.phone_number },
      { property: 'email_verified', value: event.user.email_verified },
      { property: 'user_id', value: event.user.user_id },
      { property: 'identity_type', value: event.user.identities[0].provider },
      { property: 'signed_up_from_city', value: (event.request !== undefined) ? event.request.geoip.cityName : '' },
      { property: 'signed_up_from_country', value: (event.request !== undefined) ? event.request.geoip.countryCode3 : '' },
      { property: 'login_count', value: event.stats.logins_count },
      { property: 'last_login', value: Date.now() },
    ]
  };

  try{
    await axios.post(url, JSON.stringify(data), { headers });
    api.user.setAppMetadata("last_hubspot_update", Date.now());
  }catch(error){
    //If HubSpot returns an error, we log it but don't block user access (given the integration is only for marketing)
    console.error(error.message);
    return;
  }
  
  
};
