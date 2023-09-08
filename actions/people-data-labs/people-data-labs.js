const axios = require("axios");

/**
 * Using jobs levels from PDL to determine if user is eligible to a product trial
 * Doc: https://docs.peopledatalabs.com/docs/job-title-levels
 * All job levels reported by PDL: owner, partner, cxo, director, vp, entry, manager, senior, training, unpaid.
 */
const trialElibibleLevels = ["owner", "partner", "cxo", "director", "vp"]

/**
* Enriches user identity with third-party data from PeopleDataLabs and saves it to metadata.
*
* @param {Event} event - Details about the user and the context in which they are logging in.
* @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
*/
exports.onExecutePostLogin = async (event, api) => {

  //Check if the user is already enriched
  const isEnriched = event.user.app_metadata["enrichment_date"] ?? false;

  if(isEnriched){
    //if user is already enriched, send pre-fetched data
    api.idToken.setCustomClaim(`jobTitle`, event.user.app_metadata["job_title"]);
    api.idToken.setCustomClaim(`jobLevel`, event.user.app_metadata["job_level"]);
    api.idToken.setCustomClaim(`jobCompany`, event.user.app_metadata["job_company"]);
    api.idToken.setCustomClaim(`trialEligible`, event.user.app_metadata["trial_eligible"]);
  }else{
    // Enrich user in PeopleDataLabs
    const url = `https://api.peopledatalabs.com/v5/person/enrich?email=${event.user.email}`;
    const headers = { 'X-Api-Key': event.secrets.PDL_API_KEY };
    const response = await axios.get(url, { headers })

    const jobTitle = response.data.data.job_title;
    const jobLevel = response.data.data.job_title_levels;
    const jobCompany = response.data.data.job_company_name;
    
    // check trial eligibility based on the user job title level
    const isTrialEligible = jobLevel.some((level) => trialElibibleLevels.includes(level));

    // Save job title, level, and trial eligibility to metadata
    api.user.setAppMetadata("job_title", jobTitle);
    api.user.setAppMetadata("job_level", jobLevel);
    api.user.setAppMetadata("job_company", jobCompany);
    api.user.setAppMetadata("trial_eligible", isTrialEligible);
    api.user.setAppMetadata("enrichment_date", Date.now());

    //Send data to app via claim
    api.idToken.setCustomClaim(`jobTitle`, jobTitle);
    api.idToken.setCustomClaim(`jobLevel`, jobLevel);
    api.idToken.setCustomClaim(`jobCompany`, jobCompany);
    api.idToken.setCustomClaim(`trialEligible`, isTrialEligible);
  }
};
