// Importar los módulos necesarios y la API v2 de Firebase Functions
const {onCall, onRequest, HttpsError} = require("firebase-functions/v2/https");
const {defineString} = require("firebase-functions/params");
const admin = require("firebase-admin");
const cors = require("cors")({origin: true});

// Secretos gestionados por Firebase (configura con `firebase functions:secrets:set`)
const stripeSecret = defineString("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineString("STRIPE_WEBHOOK_SECRET");

// Inicializar Admin SDK
admin.initializeApp();
const db = admin.firestore();

// Endpoint de debug con CORS
exports.debugAuth = onRequest(async (req, res) => {
  // Responder preflight
  if (req.method === "OPTIONS") {
    res
        .set("Access-Control-Allow-Origin", "https://kluppy-duelos.web.app")
        .set("Access-Control-Allow-Methods", "POST, OPTIONS")
        .set("Access-Control-Allow-Headers", "Content-Type, Authorization")
        .status(204)
        .send("");
    return;
  }

  // Aplicar CORS
  await new Promise((resolve) => cors(req, res, resolve));

  const authHeader = req.get("Authorization");
  console.log(">> AUTH HEADER:", authHeader);

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(400).json({error: "Falta Authorization: Bearer <token>"});
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decoded = await admin.auth().verifyIdToken(idToken);
    console.log("✅ Token verificado:", decoded);
    return res.json({status: "OK", uid: decoded.uid, email: decoded.email});
  } catch (err) {
    console.error("❌ Error al verificar token:", err);
    return res.status(401).json({error: err.toString()});
  }
});

// Callable para testAuth
exports.testAuth = onCall(async (request) => {
  const auth = request.auth;
  if (!auth) {
    throw new HttpsError("unauthenticated", "Usuario no autenticado.");
  }
  return {
    status: "¡Éxito! La autenticación funciona.",
    email: auth.token.email,
  };
});

// Callable para setAdminClaim
exports.setAdminClaim = onRequest(async (req, res) => {
  // Manejo de CORS
  await new Promise((resolve) => cors(req, res, resolve));

  // Verificación manual del token
  const authHeader = req.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({error: "No autenticado."});
  }
  const idToken = authHeader.split("Bearer ")[1];

  try {
    // CORRECCIÓN: Simplemente verificamos el token sin asignarlo a una variable.
    // Si el token es inválido, esto lanzará un error y el 'catch' lo capturará.
    await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    return res.status(401).json({error: "Token inválido."});
  }

  // El resto de la lógica original
  const email = req.body.email;
  if (typeof email !== "string" || !email.trim()) {
    return res.status(400).json({error: "El email debe ser un string no vacío."});
  }

  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, {admin: true});
    return res.json({message: `¡Éxito! El usuario ${email} ahora es administrador.`});
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      return res.status(404).json({error: `No se encontró usuario con el email: ${email}`});
    }
    console.error(err);
    return res.status(500).json({error: "Error interno al procesar la solicitud."});
  }
});

// Webhook de Stripe con CORS
exports.stripeWebhook = onRequest(async (req, res) => {
  // Responder preflight
  if (req.method === "OPTIONS") {
    res
        .set("Access-Control-Allow-Origin", "https://kluppy-duelos.web.app")
        .set("Access-Control-Allow-Methods", "POST, OPTIONS")
        .set("Access-Control-Allow-Headers", "Content-Type, Stripe-Signature")
        .status(204)
        .send("");
    return;
  }

  // Aplicar CORS
  await new Promise((resolve) => cors(req, res, resolve));

  // Inicializar Stripe usando el secreto
  const stripeClient = require("stripe")(stripeSecret.value());
  const signature = req.headers["stripe-signature"];
  let event;
  try {
    event = stripeClient.webhooks.constructEvent(req.rawBody, signature, stripeWebhookSecret.value());
  } catch (err) {
    console.error("⚠️ Error en webhook:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const dataObject = event.data.object;
  switch (event.type) {
    case "checkout.session.completed": {
      const userId = dataObject.client_reference_id;
      await db.collection("users").doc(userId).update({
        stripeCustomerId: dataObject.customer,
        subscriptionId: dataObject.subscription,
        subscriptionStatus: "active",
      });
      break;
    }
    case "customer.subscription.updated": {
      const subscription = dataObject;
      const usersQuery = await db.collection("users").where("stripeCustomerId", "==", subscription.customer).get();
      if (!usersQuery.empty) {
        const userId = usersQuery.docs[0].id;
        await db.collection("users").doc(userId).update({
          subscriptionStatus: subscription.status,
          subscriptionEndDate: subscription.current_period_end,
        });
      }
      break;
    }
    case "customer.subscription.deleted": {
      const subscription = dataObject;
      const usersQuery = await db.collection("users").where("stripeCustomerId", "==", subscription.customer).get();
      if (!usersQuery.empty) {
        const userId = usersQuery.docs[0].id;
        await db.collection("users").doc(userId).update({subscriptionStatus: "canceled"});
      }
      break;
    }
    default:
      console.log(`Evento no manejado: ${event.type}`);
  }

  return res.status(200).send();
});
