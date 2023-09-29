/**
 * Triggers form
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 * Functionality: Check if the user has added the necessary details to their profile and prompt them for those values if they have not.
 */
exports.onExecutePostLogin = async (event, api) => {
  // INITIAL CHECK
  // Confirm secrets are set
  // Confirm the user is either logging in for the first time OR has not completed filling out their profile
  // FORM_URL = https://CUSTOM_PAGE_URL/prog/universal

  // Missing secrets: skip action
  if (!event.secrets.SESSION_TOKEN_SECRET || !event.secrets.FORM_URL) {
    console.warn("Missing secrets. Skipping action.");
    return;
  }

  // Check if user has already filled out the form
  const skip_survey_prompt = event.user.app_metadata["zero_party_data_acquired"];
  if (skip_survey_prompt === true) return;

  // SETUP FORM
  // Add existing profile attributes to form if half filled in and then configure the external form for the user.
  const fave_show = event.user.user_metadata["fave_show"] ?? undefined;
  const tabs_or_spaces = event.user.user_metadata["tabs_or_spaces"] ?? undefined;
  const fave_programming_language = event.user.user_metadata["fave_language"] ?? undefined;
  const salesperson = event.user.user_metadata["salesperson"] ?? undefined;

  const theme = {
    css_variables: {
      "primary-color-rgb": "40,40,100",
      "primary-color": "rgb(40, 40, 100)",
      "page-background-color": "#c9cace",
    },
    logo_element: '<img class="ca89adc79 c69cd914d" id="prompt-logo-center" src="https://cdn.demo.okta.com/images/okta-icon.png" alt="Custom Logo" style="height: 52px;">',
    auto_generate: false,
  };

  const prog_profile = {
    title: "Before you begin",
    heading: "Tell us more about yourself!",
    lead: "<p>To help provide you the best experience possible can you please provide us some additional information we can associate with your account.",
    button_text: "Continue",
    theme: theme,
    inputs: [
      {
        label: "What's your favorite TV show?",
        type: "radio",
        metadata_key: "fave_show",
        current: fave_show,
        options: [
          "🐶 Puppy Island",
          "🐱 Pick & Scruff - cat detectives",
          "🦸🏽‍♀️ The torn cape",
          "🏰 My victorian remodel"
        ],
      },
      {
        label: "Do you prefer tabs or spaces?",
        type: "radio",
        metadata_key: "tabs_or_spaces",
        current: tabs_or_spaces,
        options: [
          "Spaces (obviously the right one) 😎",
          "Tabs ¯\_(ツ)_/¯"
        ],
      },
      {
        label: "What's your favorite programming language?",
        type: "radio",
        metadata_key: "fave_language",
        current: fave_programming_language,
        options: [
          "JavaScript 🚀",
          "Rust 🦀",
          "Golang 🐹",
          "Java ☕️",
          "Python 🐍",
          "Lua 🌙 🇧🇷",
          "BIRL 💪 🇧🇷"
        ],
      },
      {
        label: "Are you a feature thirsty sales person? ",
        type: "radio",
        metadata_key: "salesperson",
        current: salesperson,
        options: [
          "no 💪",
          "nope 🤞",
        ],
      },
    ],
  };

  // SETUP SESSION TOKEN TO SEND OVER AND SIGN WITH SHARED SECRET
  const sessionToken = api.redirect.encodeToken({
    secret: event.secrets.SESSION_TOKEN_SECRET,
    payload: {
      iss: `https://${event.request.hostname}/`,
      subject: event.user.user_id,
      audience: event.secrets.FORM_URL,
      expiresIn: "5 minutes",
      data: prog_profile,
    },
  });

  // console.log(sessionToken);
  // PERFORM REDIRECT TO EXTERNAL PAGE WITH SESSION TOKEN
  api.redirect.sendUserTo(event.secrets.FORM_URL, {
    query: {
      session_token: sessionToken,
      redirect_uri: `https://${event.request.hostname}/continue`,
    },
  });
};

// FINAL VALIDATION ON RETURN
// OnContinuePostLogin runs when the external page passes back the response and matching state param.
exports.onContinuePostLogin = async (event, api) => {
const app_metadata_values = [];
const skipped_claims = ["user_info_skipped", "state", "action"];
let decodedToken;
try {
  decodedToken = api.redirect.validateToken({
    secret: event.secrets.SESSION_TOKEN_SECRET,
    tokenParameterName: "session_token",
  });
} catch (error) {
  // console.log(error.message);
  return api.access.deny("Error occurred during redirect.");
}

var customClaims = decodedToken.other;
// console.log(customClaims);
// Set response values into the user metadata or app metadata.
for (const [key, value] of Object.entries(customClaims)) {
  console.log(key);

  if (!skipped_claims.includes(key)) {
    if (app_metadata_values.includes(key)) {
      api.user.setAppMetadata(key, value);
    } else {
      api.user.setUserMetadata(key, value);
    }
  }
}

// Check if First Name, Last Name, City not entered and flag for next time.
var zero_party_data_acquired = true;
if (
  customClaims["fave_show"] &&
  customClaims["tabs_or_spaces"] &&
  customClaims["fave_language"] &&
  customClaims["city"]
) {
  zero_party_data_acquired = false;
}
api.user.setAppMetadata("zero_party_data_acquired", zero_party_data_acquired);
};
