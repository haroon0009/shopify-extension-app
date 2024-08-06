/**
 * @typedef {import("../generated/api").RunInput} RunInput
 * @typedef {import("../generated/api").FunctionRunResult} FunctionRunResult
 */
/**
 * @type {FunctionRunResult}
 */
const NO_CHANGES = {
  operations: [],
};
/**
 * @param {RunInput} input
 * @returns {FunctionRunResult}
 */
export function run(input) {
  console.log("input", input);
  /**
   * @type {{
   * type: string,
   * paymentMethodName: string,
   * cartTotal: number,
   * codAtTop: boolean,
   * }}
   */
  const configuration = JSON.parse(
    input?.paymentCustomization?.metafield?.value ?? "{}",
  );
  let operations = [];
  // Handle the "COD at Top" functionality
  if (configuration.codAtTop) {
    console.log("configuration.codAtTop", configuration.codAtTop);
    const codPaymentMethod = input.paymentMethods.find(
      (method) => method.name === "Cash on Delivery",
    );
    // if (codPaymentMethod) {
    operations.push({
      move: {
        paymentMethodId: "gid://shopify/PaymentCustomizationPaymentMethod/2",
        //  codPaymentMethod.id,
        index: 0,
      },
    });
    // }
  }
  // Handle the "Hide" functionality
  if (configuration.type === "hide") {
    const cartTotal = parseFloat(input.cart.cost.totalAmount.amount ?? "0.0");
    if (cartTotal >= configuration.cartTotal) {
      const hidePaymentMethod = input.paymentMethods.find((method) =>
        method.name.includes(configuration.paymentMethodName),
      );
      if (hidePaymentMethod) {
        operations.push({
          hide: {
            paymentMethodId: hidePaymentMethod.id,
          },
        });
      }
    }
  }
  // Handle the "Rename" functionality
  if (configuration.type === "rename") {
    const renamePaymentMethod = input.paymentMethods.find((method) =>
      method.name.includes(configuration.paymentMethodName),
    );
    // if (renamePaymentMethod) {
    operations.push({
      rename: {
        paymentMethodId: "gid://shopify/PaymentCustomizationPaymentMethod/2",
        // renamePaymentMethod.id,
        name: configuration.paymentMethodName,
      },
    });
  }
  console.log("operation @@@ ", operations);
  // }
  // If no operations were added, return NO_CHANGES
  if (operations.length === 0) {
    return NO_CHANGES;
  }
  return {
    operations,
  };
}
