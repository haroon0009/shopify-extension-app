import { useState, useEffect } from "react";
import {
  Banner,
  Button,
  Card,
  FormLayout,
  Layout,
  Page,
  TextField,
  RadioButton,
  Checkbox,
} from "@shopify/polaris";
import {
  Form,
  useActionData,
  useNavigation,
  useSubmit,
  useLoaderData,
} from "@remix-run/react";
import { json } from "@remix-run/node";
import { authenticate } from "../shopify.server";

export const loader = async ({ params, request }) => {
  const { id } = params;
  if (id === "new") {
    return json({
      type: "rename",
      paymentMethodName: "",
      cartTotal: "0",
      codeAtTop: false,
    });
  }
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql(
    `#graphql
        query getPaymentCustomization($id: ID!) {
          paymentCustomization(id: $id) {
            id
            metafield(namespace: "$app:payment-customization", key: "function-configuration") {
              value
            }
          }
        }`,
    {
      variables: {
        id: `gid://shopify/PaymentCustomization/${id}`,
      },
    },
  );
  const responseJson = await response.json();
  const metafield =
    responseJson.data.paymentCustomization?.metafield?.value &&
    JSON.parse(responseJson.data.paymentCustomization.metafield.value);
  return json({
    type: metafield?.type ?? "rename",
    paymentMethodName: metafield?.paymentMethodName ?? "",
    cartTotal: metafield?.cartTotal ?? "0",
    codAtTop: metafield?.codAtTop ?? false,
  });
};
export const action = async ({ params, request }) => {
  const { functionId, id } = params;
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const type = formData.get("type");
  const paymentMethodName = formData.get("paymentMethodName");
  const cartTotal = parseFloat(formData.get("cartTotal"));
  const codAtTop = formData.get("codAtTop");
  const paymentCustomizationInput = {
    functionId,
    title:
      type === "hide"
        ? `Hide ${paymentMethodName} if cart total is larger than ${cartTotal}`
        : `Rename ${paymentMethodName}`,
    enabled: true,
    metafields: [
      {
        namespace: "$app:payment-customization",
        key: "function-configuration",
        type: "json",
        value: JSON.stringify({
          type,
          paymentMethodName,
          cartTotal,
          codAtTop,
        }),
      },
    ],
  };
  const response =
    id === "new"
      ? await admin.graphql(
          `#graphql
            mutation createPaymentCustomization($input: PaymentCustomizationInput!) {
              paymentCustomizationCreate(paymentCustomization: $input) {
                paymentCustomization {
                  id
                }
                userErrors {
                  message
                }
              }
            }`,
          {
            variables: {
              input: paymentCustomizationInput,
            },
          },
        )
      : await admin.graphql(
          `#graphql
            mutation updatePaymentCustomization($id: ID!, $input: PaymentCustomizationInput!) {
              paymentCustomizationUpdate(id: $id, paymentCustomization: $input) {
                paymentCustomization {
                  id
                }
                userErrors {
                  message
                }
              }
            }`,
          {
            variables: {
              id: `gid://shopify/PaymentCustomization/${id}`,
              input: paymentCustomizationInput,
            },
          },
        );
  const responseJson = await response.json();
  const errors =
    id === "new"
      ? responseJson.data.paymentCustomizationCreate?.userErrors
      : responseJson.data.paymentCustomizationUpdate?.userErrors;
  return json({ errors });
};
// COD at top
export default function PaymentCustomization() {
  const submit = useSubmit();
  const actionData = useActionData();
  const navigation = useNavigation();
  const loaderData = useLoaderData();
  const [type, setType] = useState(loaderData.type);
  const [paymentMethodName, setPaymentMethodName] = useState(
    loaderData.paymentMethodName,
  );
  const [cartTotal, setCartTotal] = useState(loaderData.cartTotal);
  // const [codAtTop, setCodAtTop] = useState(false); // New state for the COD at top checkbox
  const [codAtTop, setCodAtTop] = useState(loaderData.codAtTop); // New state for the COD at top checkbox
  const isLoading = navigation.state === "submitting";
  const errorBanner = actionData?.errors?.length ? (
    <Layout.Section>
      <Banner
        title="There was an error creating the customization."
        status="critical"
      >
        <ul>
          {actionData.errors.map((error, index) => (
            <li key={index}>{error.message}</li>
          ))}
        </ul>
      </Banner>
    </Layout.Section>
  ) : null;
  const handleSubmit = () => {
    submit(
      {
        type,
        paymentMethodName,
        cartTotal: type === "hide" ? cartTotal : "",
        codAtTop, // Include the value of the checkbox in the submission
      },
      { method: "post" },
    );
  };
  useEffect(() => {
    if (actionData?.errors?.length === 0) {
      open("shopify:admin/settings/payments/customizations", "_top");
    }
  }, [actionData?.errors]);
  return (
    <Page
      title="Payment Customization"
      backAction={{
        content: "Payment customizations",
        onAction: () =>
          open("shopify:admin/settings/payments/customizations", "_top"),
      }}
      primaryAction={{
        content: "Save",
        loading: isLoading,
        onAction: handleSubmit,
      }}
    >
      <Layout>
        {errorBanner}
        <Layout.Section>
          <Card>
            <Form method="post">
              <FormLayout>
                <RadioButton
                  label="Rename Payment Method"
                  checked={type === "rename"}
                  onChange={() => setType("rename")}
                />
                <RadioButton
                  label="Hide Payment Method"
                  checked={type === "hide"}
                  onChange={() => setType("hide")}
                />
                {type === "rename" && (
                  <TextField
                    name="paymentMethodName"
                    type="text"
                    label="New Payment Method Name"
                    value={paymentMethodName}
                    onChange={setPaymentMethodName}
                    disabled={isLoading}
                    autoComplete="on"
                    requiredIndicator
                  />
                )}
                {type === "hide" && (
                  <>
                    <TextField
                      name="paymentMethodName"
                      type="text"
                      label="Payment Method to Hide"
                      value={paymentMethodName}
                      onChange={setPaymentMethodName}
                      disabled={isLoading}
                      autoComplete="on"
                      requiredIndicator
                    />
                    <TextField
                      name="cartTotal"
                      type="number"
                      label="Cart Total Threshold"
                      value={cartTotal}
                      onChange={setCartTotal}
                      disabled={isLoading}
                      autoComplete="on"
                      requiredIndicator
                    />
                  </>
                )}
                <Checkbox
                  label="Keep Cash on Delivery (COD) at top"
                  checked={codAtTop}
                  onChange={() => setCodAtTop(!codAtTop)} // Toggle checkbox state
                />
              </FormLayout>
            </Form>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
