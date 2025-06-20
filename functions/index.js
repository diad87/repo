// Importar los módulos necesarios
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const stripe = require("stripe")("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");

// Nueva línea: Define el secreto que has guardado con `firebase functions:secrets:set`
const {defineString} = require('firebase-functions/params');
const stripeWebhookSecret = defineString('STRIPE_WEBHOOK_SECRET');


admin.initializeApp();
const db = admin.firestore();

// Esta es la función que actuará como nuestro Webhook
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  
  // 1. Verificar que la petición viene de Stripe (muy importante para la seguridad)
  const signature = req.headers["stripe-signature"];
  let event;
  try {
    // Usamos el secreto que hemos definido arriba
    event = stripe.webhooks.constructEvent(req.rawBody, signature, stripeWebhookSecret.value());
  } catch (err) {
    console.error("⚠️  Error en la verificación del webhook.", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // 2. Extraer los datos del evento
  const dataObject = event.data.object;

  // 3. Reaccionar a los diferentes tipos de eventos de Stripe
  switch (event.type) {
    
    // Evento: El usuario completa el pago por primera vez
    case "checkout.session.completed": {
      const userId = dataObject.client_reference_id; // ¡Aquí recuperamos el UID de Firebase!
      const stripeCustomerId = dataObject.customer;
      const subscriptionId = dataObject.subscription;

      // Actualizamos el documento del usuario en Firestore
      await db.collection("users").doc(userId).update({
        stripeCustomerId: stripeCustomerId,
        subscriptionId: subscriptionId,
        subscriptionStatus: "active",
        // La fecha de fin se obtiene del evento 'customer.subscription.updated'
      });
      console.log(`Usuario ${userId} ha iniciado una suscripción.`);
      break;
    }

    // Evento: La suscripción se actualiza (renovación, cancelación futura, etc.)
    case "customer.subscription.updated": {
      const subscription = dataObject;
      const stripeCustomerId = subscription.customer;

      // Buscamos al usuario por su ID de cliente de Stripe
      const usersQuery = await db.collection("users").where("stripeCustomerId", "==", stripeCustomerId).get();
      if (!usersQuery.empty) {
        const userId = usersQuery.docs[0].id;
        
        await db.collection("users").doc(userId).update({
          subscriptionStatus: subscription.status, // ej: 'active', 'past_due', 'canceled'
          subscriptionEndDate: subscription.current_period_end, // Fecha de fin en formato timestamp
        });
        console.log(`Suscripción de ${userId} actualizada a ${subscription.status}.`);
      }
      break;
    }

    // Evento: La suscripción se ha cancelado definitivamente
    case "customer.subscription.deleted": {
       const subscription = dataObject;
       const stripeCustomerId = subscription.customer;

       const usersQuery = await db.collection("users").where("stripeCustomerId", "==", stripeCustomerId).get();
       if (!usersQuery.empty) {
        const userId = usersQuery.docs[0].id;
         await db.collection("users").doc(userId).update({
           subscriptionStatus: "canceled",
         });
         console.log(`Suscripción de ${userId} cancelada.`);
       }
       break;
    }
    
    default:
      console.log(`Evento no manejado: ${event.type}`);
  }

  // Responder a Stripe para confirmar que hemos recibido el evento
  res.sendStatus(200);
});
