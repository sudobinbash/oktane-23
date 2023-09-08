/**
 * In this example, we use stripe billing to manage subscriptions with a free and a premium sku.
 * Replace this variable with your own values
 */
const FREE_PLAN = '';
const PREMIUM_PLAN = '';

/**
 * Syncs Auth0 user with Stripe customer and subscription
 *
 * @param {Event} event - Details about the user and the context in which they are logging in.
 * @param {PostLoginAPI} api - Interface whose methods can be used to change the behavior of the login.
 */
exports.onExecutePostLogin = async (event, api) => {
  try {
    const stripe = require("stripe")(event.secrets.STRIPE_SECRET_KEY);

    //If user already has stripe_customer_id in Auth0 metadata, check for a premium subscription
    if(event.user.app_metadata.stripe_customer_id) {
      api.idToken.setCustomClaim(`stripe_customer_id`,event.user.app_metadata.stripe_customer_id);

      const subscriptions = await stripe.subscriptions.list({
        customer: event.user.app_metadata.stripe_customer_id,
        price: PREMIUM_PLAN,
      });

      if(subscriptions.data.length == 1){
        // premium subscription found. update Auth0 metadata
        const subscription = subscriptions.data[0];
        const plan = (subscription.plan.id == PREMIUM_PLAN) ? "premium" : "free";
        api.user.setAppMetadata("stripe_subscription_id", subscription.id);
        api.user.setAppMetadata("stripe_plan_id", subscription.plan.id);
        api.user.setAppMetadata("stripe_plan", plan);
        api.user.setAppMetadata("stripe_plan_status", subscription.status);
        api.idToken.setCustomClaim(`stripe_plan`, plan);
        api.idToken.setCustomClaim(`stripe_plan_status`, subscription.status);
      }
      return;
    }
    
    //No stripe_customer_id in Auth0 metadata. Check for an existing Stripe customer by email
    const existingCustomers = await stripe.customers.list({email : event.user.email});
    switch (existingCustomers.data.length){
      // No customer in Stripe. Create a customer with the free plan
      case 0:
        const newStripeCustomer = await stripe.customers.create({
          email: event.user.email,
          name: `${event.user.given_name} ${event.user.family_name}`,
          description: "Created by Auth0",
          metadata: { auth0_user_id: event.user.user_id },
        });
        api.user.setAppMetadata("stripe_customer_id", newStripeCustomer.id);
        api.idToken.setCustomClaim(`stripe_customer_id`,newStripeCustomer.id);

        const subscription = await stripe.subscriptions.create({
            customer: newStripeCustomer.id,
            items: [{ price: FREE_PLAN }],
        });
        api.user.setAppMetadata("stripe_subscription_id", subscription.id);
        api.user.setAppMetadata("stripe_plan_id", FREE_PLAN);
        api.user.setAppMetadata("stripe_plan", "free");
        api.user.setAppMetadata("stripe_plan_status", subscription.status);
        api.idToken.setCustomClaim(`stripe_plan`, 'free');
        api.idToken.setCustomClaim(`stripe_plan_status`, subscription.status);
        break;
      
      // One customer in Stripe. Sync Stripe and Auth0 metadata
      case 1:
        await stripe.customers.update(
          existingCustomers.data[0].id,
          {
            description: "Updated by Auth0",
            name: `${event.user.given_name} ${event.user.family_name}`,
            metadata: { auth0_user_id: event.user.user_id },
          }
        );
        api.user.setAppMetadata("stripe_customer_id", existingCustomers.data[0].id);
        api.idToken.setCustomClaim(`stripe_customer_id`,existingCustomers.data[0].id);

        const subscriptions = await stripe.subscriptions.list({
          customer: existingCustomers.data[0].id,
        });

        if(subscriptions.data.length == 1){
          const subscription = subscriptions.data[0];
          const plan = (subscription.plan.id == PREMIUM_PLAN) ? "premium" : "free";
          api.user.setAppMetadata("stripe_subscription_id", subscription.id);
          api.user.setAppMetadata("stripe_plan_id", subscription.plan.id);
          api.user.setAppMetadata("stripe_plan", plan);
          api.user.setAppMetadata("stripe_plan_status", subscription.status);
          api.idToken.setCustomClaim(`stripe_plan`, plan);
          api.idToken.setCustomClaim(`stripe_plan_status`, subscription.status);
        }
        break;
      // More than one stripe user. Throw an error.
      default:
        throw Error(`More than one user (${existingCustomers.data.length}) in Stripe with the email ${event.user.email}.`)
    } 
  } catch (error) {
    console.error(error.message);
    api.access.deny("We could not create your account.\n Please contact support for assistance.");
  }
};
