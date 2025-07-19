const express = require('express');
const paypal = require('@paypal/checkout-server-sdk');
require("dotenv").config();
const port = process.env.PORT;

let environment = process.env.MODE === "live" ?
  new paypal.core.LiveEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET) :
  new paypal.core.SandboxEnvironment(process.env.PAYPAL_CLIENT_ID, process.env.PAYPAL_CLIENT_SECRET);

let client = new paypal.core.PayPalHttpClient(environment);

const app = express();

app.set('view engine', 'ejs');

app.use(express.static('public'))

app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/pay', async (req, res) => {
  const request = new paypal.orders.OrdersCreateRequest();
  request.prefer("return=representation");
  request.requestBody({
    "intent": "CAPTURE",
    "purchase_units": [{
      "amount": {
        "currency_code": "USD",
        "value": "25.00"
      }
    }],
    "application_context": {
      "return_url": `${BASE_URL}/success`,
      "cancel_url": `${BASE_URL}/cancel`
    }
  });

  try {
    const order = await client.execute(request);
    const approvalLink = order.result.links.find(link => link.rel === 'approve');

    if (approvalLink) {
      res.redirect(approvalLink.href);
    } else {
      res.status(500).send("Approval link not found.");
    }
  } catch (err) {
    console.error("Error creating order:", err);
    res.status(500).send("Error creating order: " + err.message);
  }
});

app.get('/success', async (req, res) => {
  const {
    token
  } = req.query;

  if (!token) return res.status(400).send("Missing token.");

  const request = new paypal.orders.OrdersCaptureRequest(token);
  request.requestBody({});

  try {
    const capture = await client.execute(request);
    res.send('Success');
  } catch (err) {
    console.error(err);
    res.status(500).send("Error capturing payment");
  }
});

app.get('/cancel', (req, res) => res.send('Cancelled'));


app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});