"use strict";
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/**

order controller
*/
const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::order.order", ({ strapi }) => ({
  async create(ctx) {
    const { products, userName, email } = ctx.request.body;
    console.log({ products });
    try {
      const lineItems = await Promise.all(
        products.map(async (product) => {
          const item = await strapi
            .service("api::item.item")
            .findOne(product.id);
          return {
            price_data: {
              currency: "usd",
              product_data: {
                name: item.name,
              },
              unit_amount: item.price * 100,
            },
            quantity: product.count,
          };
        })
      );

      // log lineItems to check the values
      console.log("lineItems", lineItems);
      // create a stripe session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: email,
        mode: "payment",
        success_url: "http://localhost:3000/checkout/success",
        cancel_url: "http://localhost:3000",
        line_items: lineItems,
      });

      // log session to check the values
      console.log("session", session);

      // create the item

      try {
        const data = {
          userName,
          products,
          stripeSessionId: session.id,
        };
        await strapi.entityService.create("api::order.order", { data });
      } catch (error) {
        console.log("error nih", { error });
      }

      // // redirect to checkout
      return { id: session.id };
    } catch (error) {
      console.error("Error:", error);
      ctx.response.status = 500;
      return { error: { message: "There was a problem creating the charge" } };
    }
  },
}));
